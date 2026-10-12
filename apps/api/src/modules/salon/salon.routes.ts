import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import type { AppContext } from '../../context.js';
import { hashPassword, isTeam, safeEqual, salonTokens, verifyPassword, type SalonUser } from './salon.auth.js';

const BOOKING_STATUSES = new Set(['confirmed', 'completed', 'cancelled']);
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function deny(res: Response, status: 401 | 403, msg = status === 401 ? 'Accesso richiesto' : 'Operazione non consentita'): void {
  res.status(status).json({ error: msg });
}

function mapClient(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    photoUrl: r.photo_url,
    fidelityPoints: r.fidelity_points,
    joinedOn: r.joined_on
  };
}

export function salonRouter(ctx: AppContext): Router {
  const router = Router();
  const pool = new pg.Pool({ connectionString: ctx.env.SISSY_DATABASE_URL });
  const tokens = salonTokens(ctx.env.JWT_SECRET);

  // CORS per l'app mobile/web del salone (auth via header Bearer, niente cookie).
  router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.env.NODE_ENV === 'test' ? 10_000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Troppi tentativi di accesso, riprova tra qualche minuto.' }
  });

  /** Utente autenticato dalla richiesta (header `Authorization: Bearer <token>`), o null. */
  const userOf = (req: Parameters<typeof tokens.fromRequest>[0]): SalonUser | null => tokens.fromRequest(req);

  // 1. GET /bootstrap — catalogo pubblico; i dati personali solo a chi ne ha diritto.
  //    pubblico: servizi, staff, occupazione agenda (senza cliente/note) · cliente: + sé stesso e le proprie prenotazioni · team: tutto.
  router.get('/bootstrap', async (req, res) => {
    try {
      const user = userOf(req);
      const team = isTeam(user);
      const ownClientId = user?.role === 'client' ? user.clientId ?? null : null;

      const [servicesRes, employeesRes, bookingsRes, clientsRes] = await Promise.all([
        pool.query('SELECT * FROM services WHERE active = TRUE ORDER BY name ASC'),
        pool.query('SELECT id, name, role, bio, tag_color, working_weekdays, start_time, end_time, active, photo_url FROM employees WHERE active = TRUE ORDER BY name ASC'),
        pool.query('SELECT * FROM bookings ORDER BY start_time ASC'),
        team
          ? pool.query('SELECT id, name, phone, email, notes, photo_url, fidelity_points, joined_on FROM salon_clients ORDER BY name ASC')
          : ownClientId
            ? pool.query('SELECT id, name, phone, email, notes, photo_url, fidelity_points, joined_on FROM salon_clients WHERE id = $1', [ownClientId])
            : Promise.resolve({ rows: [] as Record<string, unknown>[] })
      ]);

      res.json({
        services: servicesRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          durationMinutes: r.duration_minutes,
          price: Number(r.price),
          description: r.description,
          imageUrl: r.image_url
        })),
        employees: employeesRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          bio: r.bio,
          tagColor: r.tag_color,
          workingWeekdays: String(r.working_weekdays ?? '').split(',').filter(Boolean).map(Number),
          startTime: r.start_time,
          endTime: r.end_time,
          active: r.active,
          photoUrl: r.photo_url
        })),
        bookings: bookingsRes.rows.map(r => {
          const visible = team || (ownClientId !== null && r.client_id === ownClientId);
          return {
            id: r.id,
            serviceId: r.service_id,
            employeeId: r.employee_id,
            clientId: visible ? r.client_id : '',
            start: r.start_time,
            durationMinutes: r.duration_minutes,
            status: r.status,
            notes: visible ? r.notes : null,
            createdAt: r.created_at
          };
        }),
        clients: clientsRes.rows.map(mapClient)
      });
    } catch (err) {
      console.error('[salon:bootstrap]', err);
      res.status(500).json({ error: 'Errore recupero dati salone dal database' });
    }
  });

  // 2. POST /login — titolare (salon_auth), staff (PIN), cliente (email/telefono + password). Restituisce un token.
  router.post('/login', loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        res.status(400).json({ error: 'Username e password richiesti' });
        return;
      }
      const cleanUser = String(username).trim().toLowerCase();
      const cleanPwd = String(password).trim();

      const authRes = await pool.query(
        'SELECT a.*, e.name as emp_name FROM salon_auth a LEFT JOIN employees e ON e.id = a.employee_id WHERE lower(a.username) = $1',
        [cleanUser]
      );
      const owner = authRes.rows[0];
      if (owner && verifyPassword(cleanPwd, owner.password_hash)) {
        const role = owner.role === 'staff' ? 'staff' : 'owner';
        res.json({
          ok: true,
          role,
          name: owner.emp_name || 'Titolare',
          employeeId: owner.employee_id,
          token: tokens.sign({ role, employeeId: owner.employee_id ?? null })
        });
        return;
      }

      const empRes = await pool.query(
        'SELECT id, name, pin FROM employees WHERE active = TRUE AND (lower(name) = $1 OR lower(id) = $1)',
        [cleanUser]
      );
      const emp = empRes.rows[0];
      if (emp && emp.pin && safeEqual(String(emp.pin), cleanPwd)) {
        res.json({ ok: true, role: 'staff', name: emp.name, employeeId: emp.id, token: tokens.sign({ role: 'staff', employeeId: emp.id }) });
        return;
      }

      const clientRes = await pool.query(
        'SELECT id, name, password_hash FROM salon_clients WHERE lower(email) = $1 OR phone = $1',
        [cleanUser]
      );
      const cl = clientRes.rows[0];
      if (cl && verifyPassword(cleanPwd, cl.password_hash)) {
        res.json({ ok: true, role: 'client', name: cl.name, clientId: cl.id, token: tokens.sign({ role: 'client', clientId: cl.id }) });
        return;
      }

      res.status(401).json({ error: 'Credenziali non valide' });
    } catch (err) {
      console.error('[salon:login]', err);
      res.status(500).json({ error: 'Errore autenticazione' });
    }
  });

  // 3. POST /bookings — cliente (solo per sé) o team. Rifiuta slot già occupati per lo stesso stylist.
  router.post('/bookings', async (req, res) => {
    try {
      const user = userOf(req);
      if (!user) { deny(res, 401); return; }
      const { serviceId, employeeId, start, durationMinutes, notes } = req.body ?? {};
      const clientId = user.role === 'client' ? user.clientId : req.body?.clientId;
      const startDate = new Date(start);
      if (!serviceId || !employeeId || !clientId || !start || Number.isNaN(startDate.getTime())) {
        res.status(400).json({ error: 'Campi obbligatori mancanti' });
        return;
      }
      const dur = Math.min(Math.max(Number(durationMinutes) || 45, 5), 600);

      const clash = await pool.query(
        `SELECT 1 FROM bookings
          WHERE employee_id = $1 AND status <> 'cancelled'
            AND start_time < $2::timestamptz + make_interval(mins => $3)
            AND start_time + make_interval(mins => duration_minutes) > $2::timestamptz
          LIMIT 1`,
        [employeeId, startDate, dur]
      );
      if (clash.rows.length > 0) {
        res.status(409).json({ error: 'Orario non più disponibile' });
        return;
      }

      const id = newId('bk');
      await pool.query(
        `INSERT INTO bookings (id, service_id, employee_id, client_id, start_time, duration_minutes, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)`,
        [id, serviceId, employeeId, clientId, startDate, dur, notes ?? null]
      );

      res.status(201).json({
        ok: true,
        booking: { id, serviceId, employeeId, clientId, start: startDate.toISOString(), durationMinutes: dur, status: 'confirmed', notes: notes ?? null, createdAt: new Date().toISOString() }
      });
    } catch (err) {
      console.error('[salon:create-booking]', err);
      res.status(500).json({ error: 'Errore creazione prenotazione' });
    }
  });

  // 4. POST /clients — registrazione pubblica (email nuova → 409 se già esiste) oppure anagrafica dal team.
  router.post('/clients', async (req, res) => {
    try {
      const user = userOf(req);
      const { name, phone, email, password, notes } = req.body ?? {};
      if (!name || !phone || !email) {
        res.status(400).json({ error: 'Nome, telefono ed email obbligatori' });
        return;
      }
      const cleanEmail = String(email).trim().toLowerCase();
      const pwd = password ? String(password).trim() : '';
      if (pwd && pwd.length < 6) {
        res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
        return;
      }

      const existing = await pool.query('SELECT id FROM salon_clients WHERE lower(email) = $1', [cleanEmail]);
      if (existing.rows.length > 0 && !isTeam(user)) {
        res.status(409).json({ error: 'Esiste già un account con questa email: accedi.' });
        return;
      }

      let row: Record<string, unknown>;
      if (existing.rows.length > 0) {
        const r = await pool.query(
          `UPDATE salon_clients SET name = $1, phone = $2, notes = COALESCE($3, notes) WHERE id = $4
           RETURNING id, name, phone, email, notes, photo_url, fidelity_points, joined_on`,
          [name, phone, notes ?? null, existing.rows[0].id]
        );
        row = r.rows[0];
      } else {
        const r = await pool.query(
          `INSERT INTO salon_clients (id, name, phone, email, password_hash, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, phone, email, notes, photo_url, fidelity_points, joined_on`,
          [newId('cl'), name, phone, cleanEmail, pwd ? hashPassword(pwd) : null, notes ?? '']
        );
        row = r.rows[0];
      }

      res.status(201).json({
        ok: true,
        client: mapClient(row),
        // Chi si registra dall'app riceve subito la sessione cliente per prenotare.
        token: isTeam(user) ? undefined : tokens.sign({ role: 'client', clientId: String(row.id) })
      });
    } catch (err) {
      console.error('[salon:create-client]', err);
      res.status(500).json({ error: 'Errore registrazione cliente' });
    }
  });

  // 5. PATCH /bookings/:id — team: stato e orario · cliente: solo annullare le proprie.
  router.patch('/bookings/:id', async (req, res) => {
    try {
      const user = userOf(req);
      if (!user) { deny(res, 401); return; }
      const { id } = req.params;
      const { status, start } = req.body ?? {};
      if (!status && !start) {
        res.status(400).json({ error: 'Stato mancante' });
        return;
      }
      if (status && !BOOKING_STATUSES.has(status)) {
        res.status(400).json({ error: 'Stato non valido' });
        return;
      }

      const found = await pool.query('SELECT client_id FROM bookings WHERE id = $1', [id]);
      if (found.rows.length === 0) {
        res.status(404).json({ error: 'Prenotazione non trovata' });
        return;
      }
      if (!isTeam(user)) {
        if (found.rows[0].client_id !== user.clientId || status !== 'cancelled' || start) { deny(res, 403); return; }
      }

      const startDate = start ? new Date(start) : null;
      if (startDate && Number.isNaN(startDate.getTime())) {
        res.status(400).json({ error: 'Orario non valido' });
        return;
      }
      await pool.query(
        'UPDATE bookings SET status = COALESCE($1, status), start_time = COALESCE($2, start_time) WHERE id = $3',
        [status ?? null, startDate, id]
      );
      res.json({ ok: true, id, status });
    } catch (err) {
      console.error('[salon:update-booking]', err);
      res.status(500).json({ error: 'Errore aggiornamento prenotazione' });
    }
  });

  // 6. POST /upload — foto (max 3 MB, solo immagini) per utenti autenticati; restituisce l'URL permanente.
  router.post('/upload', async (req, res) => {
    try {
      if (!userOf(req)) { deny(res, 401); return; }
      const { filename, mimeType, dataBase64 } = req.body ?? {};
      if (!dataBase64) {
        res.status(400).json({ error: 'dataBase64 mancante' });
        return;
      }

      let cleanData = String(dataBase64);
      let detectedMime = String(mimeType || 'image/jpeg');
      if (cleanData.startsWith('data:')) {
        const parts = cleanData.split(';base64,');
        if (parts.length === 2 && parts[0] && parts[1]) {
          detectedMime = parts[0].replace('data:', '');
          cleanData = parts[1];
        }
      }
      if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(detectedMime)) {
        res.status(400).json({ error: 'Formato immagine non supportato' });
        return;
      }
      if (Buffer.byteLength(cleanData, 'base64') > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: 'Immagine troppo grande (max 3 MB)' });
        return;
      }

      const id = newId('med');
      const fname = String(filename || `${id}.jpg`).slice(0, 120);
      await pool.query(
        'INSERT INTO salon_media (id, filename, mime_type, data_base64) VALUES ($1, $2, $3, $4)',
        [id, fname, detectedMime, cleanData]
      );

      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const origin = host ? `${proto}://${host}` : 'https://childhood-friendship-website-pi.vercel.app';
      res.status(201).json({ ok: true, id, url: `${origin}/api/salon/media/${id}` });
    } catch (err) {
      console.error('[salon:upload]', err);
      res.status(500).json({ error: 'Errore upload immagine' });
    }
  });

  // 7. GET /media/:id — immagini pubbliche (foto servizi/staff), caricabili anche dall'app web su altro dominio.
  router.get('/media/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT mime_type, data_base64 FROM salon_media WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).send('Not Found');
        return;
      }
      const row = result.rows[0];
      const buffer = Buffer.from(row.data_base64, 'base64');
      res.setHeader('Content-Type', row.mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      console.error('[salon:media]', err);
      res.status(500).send('Internal Server Error');
    }
  });

  // 8. PUT /employees/:id — titolare su tutti, dipendente solo sul proprio profilo.
  router.put('/employees/:id', async (req, res) => {
    try {
      const user = userOf(req);
      const { id } = req.params;
      if (!user) { deny(res, 401); return; }
      if (!(user.role === 'owner' || (user.role === 'staff' && user.employeeId === id))) { deny(res, 403); return; }
      const { name, role, bio, tagColor, workingWeekdays, startTime, endTime, photoUrl, active } = req.body ?? {};

      const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        if (user.role !== 'owner' || !name || !role) {
          res.status(404).json({ error: 'Dipendente non trovato' });
          return;
        }
        // Nuovo dipendente creato dal titolare: PIN casuale a 6 cifre (mai il default '1234').
        const pin = String(100000 + (crypto.randomInt(900000)));
        await pool.query(
          `INSERT INTO employees (id, name, role, bio, tag_color, working_weekdays, start_time, end_time, active, pin, photo_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id, name, role, bio ?? '', tagColor ?? '#a855f7',
            Array.isArray(workingWeekdays) ? workingWeekdays.join(',') : (workingWeekdays ?? '2,3,4,5,6'),
            startTime ?? '08:30', endTime ?? '20:00', active !== undefined ? Boolean(active) : true, pin, photoUrl ?? null
          ]
        );
        res.status(201).json({ ok: true, id, photoUrl: photoUrl ?? null, pin });
        return;
      }
      const prev = existing.rows[0];
      const ownerOnly = user.role === 'owner';
      await pool.query(
        `UPDATE employees
         SET name = $1, role = $2, bio = $3, tag_color = $4, working_weekdays = $5, start_time = $6, end_time = $7, photo_url = $8, active = $9
         WHERE id = $10`,
        [
          name ?? prev.name,
          ownerOnly ? (role ?? prev.role) : prev.role,
          bio ?? prev.bio,
          tagColor ?? prev.tag_color,
          ownerOnly && workingWeekdays !== undefined ? (Array.isArray(workingWeekdays) ? workingWeekdays.join(',') : workingWeekdays) : prev.working_weekdays,
          ownerOnly ? (startTime ?? prev.start_time) : prev.start_time,
          ownerOnly ? (endTime ?? prev.end_time) : prev.end_time,
          photoUrl !== undefined ? photoUrl : prev.photo_url,
          ownerOnly && active !== undefined ? Boolean(active) : prev.active,
          id
        ]
      );
      res.json({ ok: true, id, photoUrl: photoUrl !== undefined ? photoUrl : prev.photo_url });
    } catch (err) {
      console.error('[salon:update-employee]', err);
      res.status(500).json({ error: 'Errore aggiornamento dipendente' });
    }
  });

  // 9. POST /services — crea o aggiorna (titolare).
  router.post('/services', async (req, res) => {
    try {
      if (userOf(req)?.role !== 'owner') { deny(res, userOf(req) ? 403 : 401); return; }
      const { id, name, category, durationMinutes, price, description, imageUrl } = req.body ?? {};
      if (!name || price === undefined) {
        res.status(400).json({ error: 'Nome e prezzo obbligatori' });
        return;
      }
      const sId = id || `SV-${Date.now().toString(36)}`;
      await pool.query(
        `INSERT INTO services (id, name, category, duration_minutes, price, description, image_url, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (id) DO UPDATE SET name = $2, category = $3, duration_minutes = $4, price = $5, description = $6, image_url = $7, active = TRUE`,
        [sId, name, category || 'Trattamento', Number(durationMinutes) || 30, Number(price) || 0, description || '', imageUrl ?? null]
      );
      res.status(201).json({ ok: true, id: sId });
    } catch (err) {
      console.error('[salon:create-service]', err);
      res.status(500).json({ error: 'Errore creazione servizio' });
    }
  });

  // 10. PUT /services/:id — modifica (titolare).
  router.put('/services/:id', async (req, res) => {
    try {
      if (userOf(req)?.role !== 'owner') { deny(res, userOf(req) ? 403 : 401); return; }
      const { id } = req.params;
      const { name, category, durationMinutes, price, description, imageUrl, active } = req.body ?? {};
      const existing = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Servizio non trovato' });
        return;
      }
      const prev = existing.rows[0];
      const newImg = imageUrl !== undefined ? imageUrl : prev.image_url;
      await pool.query(
        `UPDATE services
         SET name = $1, category = $2, duration_minutes = $3, price = $4, description = $5, image_url = $6, active = $7
         WHERE id = $8`,
        [
          name ?? prev.name,
          category ?? prev.category,
          durationMinutes !== undefined ? Number(durationMinutes) : prev.duration_minutes,
          price !== undefined ? Number(price) : prev.price,
          description !== undefined ? description : prev.description,
          newImg,
          active !== undefined ? Boolean(active) : prev.active,
          id
        ]
      );
      res.json({ ok: true, id, imageUrl: newImg });
    } catch (err) {
      console.error('[salon:update-service]', err);
      res.status(500).json({ error: 'Errore modifica servizio' });
    }
  });

  // 11. DELETE /services/:id — disattivazione (titolare).
  router.delete('/services/:id', async (req, res) => {
    try {
      if (userOf(req)?.role !== 'owner') { deny(res, userOf(req) ? 403 : 401); return; }
      await pool.query('UPDATE services SET active = FALSE WHERE id = $1', [req.params.id]);
      res.json({ ok: true, id: req.params.id });
    } catch (err) {
      console.error('[salon:delete-service]', err);
      res.status(500).json({ error: 'Errore cancellazione servizio' });
    }
  });

  // 12. PATCH /clients/:id — team su tutti, cliente solo sul proprio profilo.
  router.patch('/clients/:id', async (req, res) => {
    try {
      const user = userOf(req);
      const { id } = req.params;
      if (!user) { deny(res, 401); return; }
      if (!isTeam(user) && user.clientId !== id) { deny(res, 403); return; }
      const { name, phone, notes, photoUrl } = req.body ?? {};
      await pool.query(
        `UPDATE salon_clients
         SET name = COALESCE($1, name), phone = COALESCE($2, phone), notes = COALESCE($3, notes), photo_url = COALESCE($4, photo_url)
         WHERE id = $5`,
        [name ?? null, phone ?? null, isTeam(user) ? notes ?? null : null, photoUrl ?? null, id]
      );
      res.json({ ok: true, id, photoUrl });
    } catch (err) {
      console.error('[salon:update-client]', err);
      res.status(500).json({ error: 'Errore aggiornamento cliente' });
    }
  });

  return router;
}
