import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ClientDto, InviteCreatedDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { ModalComponent } from '../../../shared/modal.component';

/** Normalizza automaticamente un URL o handle social aggiungendo https:// se manca. */
function sanitizeUrl(val: string | null | undefined, domainPrefix?: string): string | null {
  if (!val) return null;
  let s = val.trim();
  if (!s) return null;
  // Se è un handle tipo @brand e abbiamo il dominio prefix
  if (domainPrefix && s.startsWith('@')) {
    return `https://${domainPrefix}/${s.slice(1)}`;
  }
  if (domainPrefix && !s.includes('.') && !s.includes('/')) {
    return `https://${domainPrefix}/${s}`;
  }
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  return s;
}

@Component({
  selector: 'cf-clients-page',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, ModalComponent],
  template: `
    <div class="page">


      <div class="toolbar row-between" style="margin-bottom: 16px;">
        <input
          class="input"
          style="max-width: 360px"
          placeholder="Cerca per nome, referente o P.IVA…"
          [(ngModel)]="q"
          (ngModelChange)="onSearch()"
          aria-label="Cerca clienti" /><button class="btn btn-primary" (click)="open()">+ Nuovo cliente</button>

      </div>

      <section class="card card-tight">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Referente</th>
                <th>Contatti</th>
                <th>Progetti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td>
                    <strong>{{ c.name }}</strong>
                    @if (c.vatNumber) {
                      <br /><span class="muted small mono">P.IVA {{ c.vatNumber }}</span>
                    }
                  </td>
                  <td>{{ c.contactName ?? '—' }}</td>
                  <td class="small">
                    @if (c.contactEmail) {
                      <a [href]="'mailto:' + c.contactEmail">{{ c.contactEmail }}</a><br />
                    }
                    {{ c.contactPhone || '—' }}
                  </td>
                  <td class="mono">
                    @if (c.projectCount) {
                      <a [routerLink]="['/admin/progetti']" [queryParams]="{ q: c.name }" title="Vedi progetti cliente">
                        <strong>{{ c.projectCount }}</strong>
                      </a>
                    } @else {
                      <span class="muted">0</span>
                    }
                  </td>
                  <td class="actions">
                    <button class="btn btn-ghost btn-sm" (click)="createProjectFor(c)" title="Crea un nuovo progetto per questo cliente">
                      + Progetto
                    </button>
                    @if (auth.isAdmin()) {
                      <button class="btn btn-ghost btn-sm" (click)="openInvite(c)">Invita al portale</button>
                    }
                    <button class="btn btn-ghost btn-sm" (click)="open(c)">Modifica</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="empty">
                      <strong>Nessun cliente registrato</strong>
                      Crea il primo cliente cliccando su "+ Nuovo cliente".
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- MODALE CREAZIONE / MODIFICA CLIENTE ESSENZIALE -->
    <cf-modal [(open)]="formOpen" [title]="editing() ? 'Modifica: ' + editing()!.name : 'Nuovo cliente'" [wide]="true">
      <form id="client-form" class="stack" [formGroup]="form" (ngSubmit)="save()">
        
        <!-- BLOCCO 1: DATI ESSENZIALI (Sempre visibili e prioritari) -->
        <div class="form-grid">
          <label class="field full">
            <span>Ragione sociale / Azienda *</span>
            <input class="input" formControlName="name" placeholder="Es. Sissy HairStyle, Studio Rossi..." autofocus />
          </label>

          <label class="field">
            <span>Nome Referente</span>
            <input class="input" formControlName="contactName" placeholder="Es. Silvia, Marco..." />
          </label>

          <label class="field">
            <span>Telefono Referente</span>
            <input class="input" type="tel" formControlName="contactPhone" placeholder="Es. +39 351 848 0133" />
          </label>

          <label class="field full">
            <span>Email Referente</span>
            <input class="input" type="email" formControlName="contactEmail" placeholder="referente@azienda.it" />
          </label>

          <label class="field">
            <span>Partita IVA / Cod. Fiscale</span>
            <input class="input mono" formControlName="vatNumber" placeholder="Es. 05241890281" />
          </label>

          <label class="field">
            <span>Sede / Indirizzo</span>
            <input class="input" formControlName="address" placeholder="Es. Via Roma 52, Arzergrande (PD)" />
          </label>
        </div>

        <!-- TOGGLE DETTAGLI OPZIONALI: Nessun passaggio obbligato, aperto solo se serve -->
        <div class="optional-toggle-row">
          <button type="button" class="btn btn-ghost btn-sm toggle-btn" (click)="showExtraDetails.set(!showExtraDetails())">
            {{ showExtraDetails() ? '▴ Nascondi dettagli opzionali' : '▾ Mostra altri dettagli (Orari, Sito, Social, Note)' }}
          </button>
        </div>

        @if (showExtraDetails()) {
          <div class="extra-section stack-sm">
            <div class="form-grid">
              <label class="field">
                <span>Orari di apertura</span>
                <input class="input" formControlName="openingHours" placeholder="Es. Mar-Sab 08:30-20:00" />
              </label>

              <label class="field">
                <span>Sito web attuale</span>
                <input class="input" formControlName="oldWebsite" placeholder="azienda.it" />
              </label>
            </div>

            <fieldset class="fs" formGroupName="socialLinks">
              <legend>Canali Social (opzionale)</legend>
              <div class="form-grid">
                <label class="field"><span>Instagram</span><input class="input" formControlName="instagram" placeholder="@profilo o link" /></label>
                <label class="field"><span>Facebook</span><input class="input" formControlName="facebook" placeholder="facebook.com/..." /></label>
                <label class="field"><span>TikTok</span><input class="input" formControlName="tiktok" placeholder="@profilo" /></label>
                <label class="field"><span>LinkedIn</span><input class="input" formControlName="linkedin" placeholder="linkedin.com/in/..." /></label>
              </div>
            </fieldset>

            <fieldset class="fs">
              <legend>Altri recapiti secondari</legend>
              <div class="stack-sm" formArrayName="contacts">
                @for (g of contacts.controls; track $index; let i = $index) {
                  <div class="row" [formGroupName]="i">
                    <input class="input" style="width: 130px" formControlName="tipo" placeholder="Tipo (es. PEC)" />
                    <input class="input grow" formControlName="valore" placeholder="Recapito..." />
                    <button type="button" class="btn btn-ghost btn-sm icon-btn" (click)="contacts.removeAt(i)" aria-label="Rimuovi">✕</button>
                  </div>
                }
                <button type="button" class="btn btn-sm" style="align-self: flex-start" (click)="addContact()">+ Altro contatto</button>
              </div>
            </fieldset>

            <label class="field full">
              <span>Note interne studio</span>
              <textarea class="textarea" rows="2" formControlName="notes" placeholder="Note operative, preferenze cliente..."></textarea>
            </label>
          </div>
        }

      </form>

      <div modal-footer class="modal-foot">
        @if (editing() && auth.isAdmin()) {
          <button class="btn btn-danger" style="margin-right: auto" (click)="remove()">Elimina</button>
        }
        <button class="btn btn-ghost" (click)="formOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="client-form" [disabled]="saving()">
          {{ saving() ? 'Salvataggio...' : (editing() ? 'Aggiorna cliente' : 'Crea cliente') }}
        </button>
      </div>
    </cf-modal>

    <!-- MODALE INVITO AL PORTALE -->
    <cf-modal [(open)]="inviteOpen" title="Invita al portale clienti">
      @if (inviteLink(); as link) {
        <div class="stack">
          <p>Invito creato. Invia questo link al cliente: è valido 72 ore e funziona una sola volta. <strong>Non verrà più mostrato.</strong></p>
          <div class="row"><input class="input grow mono" [value]="link" readonly aria-label="Link invito" /><button class="btn" (click)="copy(link)">Copia</button></div>
        </div>
      } @else {
        <form id="invite-form" class="stack" (ngSubmit)="invite()">
          <p class="muted">Il referente di <strong>{{ inviteFor()?.name }}</strong> potrà seguire i progetti, approvare documenti e inviare messaggi.</p>
          <label class="field"><span>Email referente</span><input class="input" type="email" name="email" [(ngModel)]="inviteEmail" required /></label>
        </form>
      }
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="inviteOpen.set(false)">Chiudi</button>
        @if (!inviteLink()) { <button class="btn btn-primary" type="submit" form="invite-form">Crea invito</button> }
      </div>
    </cf-modal>
  `,
  styles: `
    .fs {
      border: 1px solid var(--cf-color-border);
      border-radius: var(--cf-radius-sm);
      padding: 10px 12px 12px;
      margin: 0;
    }
    legend {
      font-size: 11px;
      font-weight: 600;
      color: var(--cf-color-text-muted);
      padding: 0 4px;
    }
    .optional-toggle-row {
      display: flex;
      justify-content: center;
      padding: 4px 0;
      border-top: 1px dashed var(--cf-color-border);
      border-bottom: 1px dashed var(--cf-color-border);
      margin: 4px 0;
    }
    .toggle-btn {
      color: var(--cf-color-violet-light);
      font-size: 12px;
      font-weight: 600;
    }
    .extra-section {
      padding-top: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsPage implements OnInit {
  readonly nuovo = input<string>();
  readonly id = input<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly items = signal<ClientDto[]>([]);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<ClientDto | null>(null);
  protected readonly saving = signal(false);
  protected readonly showExtraDetails = signal(false);

  protected readonly inviteOpen = signal(false);
  protected readonly inviteFor = signal<ClientDto | null>(null);
  protected readonly inviteLink = signal<string | null>(null);
  protected inviteEmail = '';
  protected q = '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  // Form essenziale senza blocchi invalidanti inutili
  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    vatNumber: [''],
    address: [''],
    openingHours: [''],
    contactName: [''],
    contactEmail: [''],
    contactPhone: [''],
    oldWebsite: [''],
    notes: [''],
    socialLinks: this.fb.group({
      instagram: [''],
      facebook: [''],
      tiktok: [''],
      linkedin: ['']
    }),
    contacts: this.fb.array<FormGroup<{ tipo: FormControl<string>; valore: FormControl<string> }>>([])
  });

  protected get contacts(): FormArray { return this.form.controls.contacts; }

  async ngOnInit(): Promise<void> {
    await this.load();
    if (this.nuovo()) this.open();
    const id = this.id();
    if (id) {
      const c = this.items().find((x) => x.id === id);
      if (c) this.open(c);
    }
  }

  private contactGroup(tipo = '', valore = '') {
    return this.fb.group({
      tipo: [tipo, Validators.required],
      valore: [valore, Validators.required]
    });
  }

  protected addContact(): void {
    this.form.controls.contacts.push(this.contactGroup());
  }

  protected onSearch(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 250);
  }

  private async load(): Promise<void> {
    try {
      this.items.set(await this.api.get<ClientDto[]>('/clients', { q: this.q.trim() }));
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected open(c?: ClientDto): void {
    this.editing.set(c ?? null);
    this.form.controls.contacts.clear();
    for (const x of c?.contacts ?? []) {
      this.form.controls.contacts.push(this.contactGroup(x.tipo, x.valore));
    }
    const s = c?.socialLinks ?? {};
    
    // Se modifichiamo un cliente con dati extra già presenti, mostriamo la sezione espansa
    const hasExtras = !!(c?.openingHours || c?.oldWebsite || c?.notes || (c?.contacts?.length ?? 0) > 0 ||
      s['instagram'] || s['facebook'] || s['tiktok'] || s['linkedin']);
    this.showExtraDetails.set(hasExtras);

    this.form.reset({
      name: c?.name ?? '',
      vatNumber: c?.vatNumber ?? '',
      address: c?.address ?? '',
      openingHours: c?.openingHours ?? '',
      contactName: c?.contactName ?? '',
      contactEmail: c?.contactEmail ?? '',
      contactPhone: c?.contactPhone ?? '',
      oldWebsite: c?.oldWebsite ?? '',
      notes: c?.notes ?? '',
      socialLinks: {
        instagram: s['instagram'] ?? '',
        facebook: s['facebook'] ?? '',
        tiktok: s['tiktok'] ?? '',
        linkedin: s['linkedin'] ?? ''
      }
    });
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    const rawName = this.form.controls.name.value.trim();
    if (!rawName) {
      this.toast.error('Inserisci la ragione sociale del cliente');
      return;
    }

    const v = this.form.getRawValue();
    const blankToNull = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);

    // Sanitizzazione automatica e trasparente degli URL e handle social
    const website = sanitizeUrl(v.oldWebsite);
    const instagram = sanitizeUrl(v.socialLinks.instagram, 'instagram.com');
    const facebook = sanitizeUrl(v.socialLinks.facebook, 'facebook.com');
    const tiktok = sanitizeUrl(v.socialLinks.tiktok, 'tiktok.com');
    const linkedin = sanitizeUrl(v.socialLinks.linkedin, 'linkedin.com/in');

    const body = {
      name: rawName,
      vatNumber: blankToNull(v.vatNumber),
      address: blankToNull(v.address),
      openingHours: blankToNull(v.openingHours),
      contactName: blankToNull(v.contactName),
      contactEmail: blankToNull(v.contactEmail),
      contactPhone: blankToNull(v.contactPhone),
      oldWebsite: website,
      notes: blankToNull(v.notes),
      contacts: v.contacts.filter((c) => c.tipo.trim() && c.valore.trim()),
      socialLinks: {
        instagram,
        facebook,
        tiktok,
        linkedin
      }
    };

    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        await this.api.patch(`/clients/${editing.id}`, body);
        this.toast.success(`Cliente "${rawName}" aggiornato con successo!`);
      } else {
        const created = await this.api.post<ClientDto>('/clients', body);
        this.toast.success(`Cliente "${rawName}" creato con successo!`);
      }
      this.formOpen.set(false);
      await this.load();
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  protected createProjectFor(c: ClientDto): void {
    void this.router.navigate(['/admin/progetti'], { queryParams: { nuovo: 1, clientId: c.id } });
  }

  protected async remove(): Promise<void> {
    const c = this.editing();
    if (!c || !(await this.confirm.ask(`Eliminare ${c.name}? Possibile solo se non ha progetti collegati.`, { danger: true, confirmLabel: 'Elimina' }))) {
      return;
    }
    try {
      await this.api.delete(`/clients/${c.id}`);
      this.formOpen.set(false);
      this.toast.success(`Cliente ${c.name} eliminato`);
      await this.load();
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected openInvite(c: ClientDto): void {
    this.inviteFor.set(c);
    this.inviteEmail = c.contactEmail ?? '';
    this.inviteLink.set(null);
    this.inviteOpen.set(true);
  }

  protected async invite(): Promise<void> {
    const c = this.inviteFor();
    if (!c) return;
    try {
      const r = await this.api.post<InviteCreatedDto>('/users/invites', { email: this.inviteEmail.trim(), role: 'client', clientId: c.id });
      this.inviteLink.set(r.acceptUrl);
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Link copiato');
    } catch {
      this.toast.error('Copia non consentita');
    }
  }
}
