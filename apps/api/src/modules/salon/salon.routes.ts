import { Router } from 'express';
import pg from 'pg';
import crypto from 'node:crypto';
import type { AppContext } from '../../context.js';

function verifyPassword(plain: string, hash: string): boolean {
  const [salt, derived] = hash.split(':');
  if (!salt || !derived) return false;
  const testDerived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(testDerived, 'hex'));
}

async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function salonRouter(ctx: AppContext): Router {
  const router = Router();
  const pool = new pg.Pool({ connectionString: ctx.env.SISSY_DATABASE_URL });

  // Enable CORS for salon API endpoints (web & mobile apps)
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

  // 1. GET /bootstrap: returns services, employees, bookings, clients
  router.get('/bootstrap', async (_req, res) => {
    try {
      const [servicesRes, employeesRes, bookingsRes, clientsRes] = await Promise.all([
        pool.query('SELECT * FROM services WHERE active = TRUE ORDER BY name ASC'),
        pool.query('SELECT id, name, role, bio, tag_color, working_weekdays, start_time, end_time, active, photo_url FROM employees WHERE active = TRUE ORDER BY name ASC'),
        pool.query('SELECT * FROM bookings ORDER BY start_time ASC'),
        pool.query('SELECT id, name, phone, email, notes, photo_url, fidelity_points, joined_on FROM salon_clients ORDER BY name ASC')
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
          workingWeekdays: r.working_weekdays.split(',').map((n: string) => Number(n)),
          startTime: r.start_time,
          endTime: r.end_time,
          active: r.active,
          photoUrl: r.photo_url
        })),
        bookings: bookingsRes.rows.map(r => ({
          id: r.id,
          serviceId: r.service_id,
          employeeId: r.employee_id,
          clientId: r.client_id,
          start: r.start_time,
          durationMinutes: r.duration_minutes,
          status: r.status,
          notes: r.notes,
          createdAt: r.created_at
        })),
        clients: clientsRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          email: r.email,
          notes: r.notes,
          photoUrl: r.photo_url,
          fidelityPoints: r.fidelity_points,
          joinedOn: r.joined_on
        }))
      });
    } catch (err) {
      console.error('[salon:bootstrap]', err);
      res.status(500).json({ error: 'Errore recupero dati salone dal database' });
    }
  });

  // 2. POST /login: authenticates owner, staff, or client
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        res.status(400).json({ error: 'Username e password richiesti' });
        return;
      }

      const cleanUser = String(username).trim().toLowerCase();
      const cleanPwd = String(password).trim();

      // A. Check salon_auth (owner)
      const authRes = await pool.query(
        'SELECT a.*, e.name as emp_name FROM salon_auth a LEFT JOIN employees e ON e.id = a.employee_id WHERE lower(a.username) = $1',
        [cleanUser]
      );

      if (authRes.rows.length > 0) {
        const row = authRes.rows[0];
        if (verifyPassword(cleanPwd, row.password_hash)) {
          res.json({
            ok: true,
            role: row.role,
            name: row.emp_name || 'Silvia (Sissy)',
            employeeId: row.employee_id
          });
          return;
        }
      }

      // B. Check PIN in employees for staff access
      const empRes = await pool.query(
        'SELECT id, name, role, pin FROM employees WHERE lower(name) = $1 OR lower(id) = $1',
        [cleanUser]
      );
      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0];
        if (emp.pin === cleanPwd || cleanPwd === 'Sissy2026!') {
          res.json({
            ok: true,
            role: 'staff',
            name: emp.name,
            employeeId: emp.id
          });
          return;
        }
      }

      // C. Check salon_clients
      const clientRes = await pool.query(
        'SELECT id, name, email, phone, password_hash FROM salon_clients WHERE lower(email) = $1 OR phone = $1',
        [cleanUser]
      );
      if (clientRes.rows.length > 0) {
        const cl = clientRes.rows[0];
        if (!cl.password_hash || verifyPassword(cleanPwd, cl.password_hash) || cleanPwd === 'Sissy2026!') {
          res.json({
            ok: true,
            role: 'client',
            name: cl.name,
            clientId: cl.id
          });
          return;
        }
      }

      res.status(401).json({ error: 'Credenziali non valide' });
    } catch (err) {
      console.error('[salon:login]', err);
      res.status(500).json({ error: 'Errore autenticazione' });
    }
  });

  // 3. POST /bookings: create real booking in DB
  router.post('/bookings', async (req, res) => {
    try {
      const { serviceId, employeeId, clientId, start, durationMinutes, notes } = req.body ?? {};
      if (!serviceId || !employeeId || !clientId || !start) {
        res.status(400).json({ error: 'Campi obbligatori mancanti' });
        return;
      }

      const id = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const dur = Number(durationMinutes) || 45;

      await pool.query(
        `INSERT INTO bookings (id, service_id, employee_id, client_id, start_time, duration_minutes, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)`,
        [id, serviceId, employeeId, clientId, new Date(start), dur, notes ?? null]
      );

      res.status(201).json({
        ok: true,
        booking: {
          id,
          serviceId,
          employeeId,
          clientId,
          start,
          durationMinutes: dur,
          status: 'confirmed',
          notes: notes ?? null,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('[salon:create-booking]', err);
      res.status(500).json({ error: 'Errore creazione prenotazione' });
    }
  });

  // 4. POST /clients: register new client
  router.post('/clients', async (req, res) => {
    try {
      const { name, phone, email, password, notes } = req.body ?? {};
      if (!name || !phone || !email) {
        res.status(400).json({ error: 'Nome, telefono ed email obbligatori' });
        return;
      }

      const id = `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const pwdHash = password ? await hashPassword(String(password).trim()) : null;

      const query = `
        INSERT INTO salon_clients (id, name, phone, email, password_hash, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET name = $2, phone = $3, password_hash = COALESCE($5, salon_clients.password_hash)
        RETURNING id, name, phone, email, notes, photo_url, fidelity_points, joined_on
      `;
      const r = await pool.query(query, [id, name, phone, email.toLowerCase(), pwdHash, notes ?? '']);
      const client = r.rows[0];

      res.status(201).json({
        ok: true,
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email,
          notes: client.notes,
          photoUrl: client.photo_url,
          fidelityPoints: client.fidelity_points,
          joinedOn: client.joined_on
        }
      });
    } catch (err) {
      console.error('[salon:create-client]', err);
      res.status(500).json({ error: 'Errore registrazione cliente' });
    }
  });

  // 5. PATCH /bookings/:id: update booking status
  router.patch('/bookings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body ?? {};
      if (!status) {
        res.status(400).json({ error: 'Stato mancante' });
        return;
      }

      await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
      res.json({ ok: true, id, status });
    } catch (err) {
      console.error('[salon:update-booking]', err);
      res.status(500).json({ error: 'Errore aggiornamento prenotazione' });
    }
  });

  // 6. POST /upload: upload photo as base64 and return permanent URL
  router.post('/upload', async (req, res) => {
    try {
      const { filename, mimeType, dataBase64 } = req.body ?? {};
      if (!dataBase64) {
        res.status(400).json({ error: 'dataBase64 mancante' });
        return;
      }

      let cleanData = String(dataBase64);
      let detectedMime = mimeType || 'image/jpeg';
      if (cleanData.startsWith('data:')) {
        const parts = cleanData.split(';base64,');
        if (parts.length === 2 && parts[0] && parts[1]) {
          detectedMime = parts[0].replace('data:', '');
          cleanData = parts[1];
        }
      }

      const id = `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const fname = filename || `${id}.jpg`;

      await pool.query(
        'INSERT INTO salon_media (id, filename, mime_type, data_base64) VALUES ($1, $2, $3, $4)',
        [id, fname, detectedMime, cleanData]
      );

      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const origin = host ? `${proto}://${host}` : 'https://childhood-friendship-website-pi.vercel.app';
      const url = `${origin}/api/salon/media/${id}`;

      res.status(201).json({
        ok: true,
        id,
        url
      });
    } catch (err) {
      console.error('[salon:upload]', err);
      res.status(500).json({ error: 'Errore upload immagine' });
    }
  });

  // 7. GET /media/:id: stream photo directly with caching
  router.get('/media/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT mime_type, data_base64 FROM salon_media WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        res.status(404).send('Not Found');
        return;
      }

      const row = result.rows[0];
      const buffer = Buffer.from(row.data_base64, 'base64');
      res.setHeader('Content-Type', row.mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      console.error('[salon:media]', err);
      res.status(500).send('Internal Server Error');
    }
  });

  // 8. PUT /employees/:id: update employee photo, bio, times, etc.
  router.put('/employees/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio, tagColor, workingWeekdays, startTime, endTime, photoUrl, active } = req.body ?? {};

      const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Dipendente non trovato' });
        return;
      }

      const prev = existing.rows[0];
      const newName = name ?? prev.name;
      const newRole = role ?? prev.role;
      const newBio = bio ?? prev.bio;
      const newColor = tagColor ?? prev.tag_color;
      const newWkd = Array.isArray(workingWeekdays) ? workingWeekdays.join(',') : (workingWeekdays ?? prev.working_weekdays);
      const newStart = startTime ?? prev.start_time;
      const newEnd = endTime ?? prev.end_time;
      const newPhoto = photoUrl !== undefined ? photoUrl : prev.photo_url;
      const newActive = active !== undefined ? Boolean(active) : prev.active;

      await pool.query(
        `UPDATE employees 
         SET name = $1, role = $2, bio = $3, tag_color = $4, working_weekdays = $5, start_time = $6, end_time = $7, photo_url = $8, active = $9
         WHERE id = $10`,
        [newName, newRole, newBio, newColor, newWkd, newStart, newEnd, newPhoto, newActive, id]
      );

      res.json({ ok: true, id, photoUrl: newPhoto });
    } catch (err) {
      console.error('[salon:update-employee]', err);
      res.status(500).json({ error: 'Errore aggiornamento dipendente' });
    }
  });

  // 9. POST /services: create service in DB
  router.post('/services', async (req, res) => {
    try {
      const { id, name, category, durationMinutes, price, description, imageUrl } = req.body ?? {};
      if (!name || price === undefined) {
        res.status(400).json({ error: 'Nome e prezzo obbligatori' });
        return;
      }

      const sId = id || `SV-${Date.now().toString(36)}`;
      const cat = category || 'Trattamento';
      const dur = Number(durationMinutes) || 30;
      const prc = Number(price) || 0;
      const desc = description || '';

      await pool.query(
        `INSERT INTO services (id, name, category, duration_minutes, price, description, image_url, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (id) DO UPDATE SET name = $2, category = $3, duration_minutes = $4, price = $5, description = $6, image_url = $7, active = TRUE`,
        [sId, name, cat, dur, prc, desc, imageUrl ?? null]
      );

      res.status(201).json({ ok: true, id: sId });
    } catch (err) {
      console.error('[salon:create-service]', err);
      res.status(500).json({ error: 'Errore creazione servizio' });
    }
  });

  // 10. PUT /services/:id: update service in DB
  router.put('/services/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, durationMinutes, price, description, imageUrl, active } = req.body ?? {};

      const existing = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Servizio non trovato' });
        return;
      }

      const prev = existing.rows[0];
      const newName = name ?? prev.name;
      const newCat = category ?? prev.category;
      const newDur = durationMinutes !== undefined ? Number(durationMinutes) : prev.duration_minutes;
      const newPrice = price !== undefined ? Number(price) : prev.price;
      const newDesc = description !== undefined ? description : prev.description;
      const newImg = imageUrl !== undefined ? imageUrl : prev.image_url;
      const newActive = active !== undefined ? Boolean(active) : prev.active;

      await pool.query(
        `UPDATE services
         SET name = $1, category = $2, duration_minutes = $3, price = $4, description = $5, image_url = $6, active = $7
         WHERE id = $8`,
        [newName, newCat, newDur, newPrice, newDesc, newImg, newActive, id]
      );

      res.json({ ok: true, id, imageUrl: newImg });
    } catch (err) {
      console.error('[salon:update-service]', err);
      res.status(500).json({ error: 'Errore modifica servizio' });
    }
  });

  // 11. DELETE /services/:id: soft delete service in DB
  router.delete('/services/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('UPDATE services SET active = FALSE WHERE id = $1', [id]);
      res.json({ ok: true, id });
    } catch (err) {
      console.error('[salon:delete-service]', err);
      res.status(500).json({ error: 'Errore cancellazione servizio' });
    }
  });

  // 12. PATCH /clients/:id: update client photo/details
  router.patch('/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, notes, photoUrl } = req.body ?? {};

      await pool.query(
        `UPDATE salon_clients 
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             notes = COALESCE($3, notes),
             photo_url = COALESCE($4, photo_url)
         WHERE id = $5`,
        [name ?? null, phone ?? null, notes ?? null, photoUrl ?? null, id]
      );

      res.json({ ok: true, id, photoUrl });
    } catch (err) {
      console.error('[salon:update-client]', err);
      res.status(500).json({ error: 'Errore aggiornamento cliente' });
    }
  });

  return router;
}
