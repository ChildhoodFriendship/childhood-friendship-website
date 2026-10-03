import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ClientDto, InviteCreatedDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { ModalComponent } from '../../../shared/modal.component';

const urlOrEmpty = Validators.pattern(/^(https?:\/\/.+)?$/);

@Component({
  selector: 'cf-clients-page',
  imports: [FormsModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div><span class="eyebrow">Anagrafica</span><h1>Clienti</h1><p>{{ items().length }} clienti</p></div>
        <button class="btn btn-primary" (click)="open()">+ Nuovo cliente</button>
      </header>
      <input class="input" style="max-width: 360px" placeholder="Cerca per nome o P.IVA…" [(ngModel)]="q" (ngModelChange)="onSearch()" aria-label="Cerca clienti" />
      <section class="card card-tight"><div class="table-wrap"><table class="table">
        <thead><tr><th>Cliente</th><th>Referente</th><th>Contatti</th><th>Progetti</th><th></th></tr></thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr>
              <td><strong>{{ c.name }}</strong>@if (c.vatNumber) { <br /><span class="muted small mono">P.IVA {{ c.vatNumber }}</span> }</td>
              <td>{{ c.contactName ?? '—' }}</td>
              <td class="small">@if (c.contactEmail) { <a [href]="'mailto:' + c.contactEmail">{{ c.contactEmail }}</a><br /> }{{ c.contactPhone }}</td>
              <td class="mono">{{ c.projectCount ?? 0 }}</td>
              <td class="actions">
                @if (auth.isAdmin()) { <button class="btn btn-ghost btn-sm" (click)="openInvite(c)">Invita al portale</button> }
                <button class="btn btn-ghost btn-sm" (click)="open(c)">Modifica</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="5"><div class="empty"><strong>Nessun cliente</strong>Crea il primo cliente o convertine uno dai lead.</div></td></tr> }
        </tbody>
      </table></div></section>
    </div>

    <cf-modal [(open)]="formOpen" [title]="editing() ? editing()!.name : 'Nuovo cliente'" [wide]="true">
      <form id="client-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()">
        <label class="field full"><span>Ragione sociale *</span><input class="input" formControlName="name" /></label>
        <label class="field"><span>Partita IVA</span><input class="input" formControlName="vatNumber" /></label>
        <label class="field"><span>Orari</span><input class="input" formControlName="openingHours" placeholder="Lun-Ven 9-18" /></label>
        <label class="field full"><span>Indirizzo</span><input class="input" formControlName="address" /></label>
        <label class="field"><span>Referente</span><input class="input" formControlName="contactName" /></label>
        <label class="field"><span>Email referente</span><input class="input" type="email" formControlName="contactEmail" /></label>
        <label class="field"><span>Telefono referente</span><input class="input" formControlName="contactPhone" /></label>
        <label class="field"><span>Sito precedente</span><input class="input" formControlName="oldWebsite" placeholder="https://" /></label>
        <fieldset class="full fs" formGroupName="socialLinks">
          <legend>Social</legend>
          <div class="form-grid">
            <label class="field"><span>Instagram</span><input class="input" formControlName="instagram" placeholder="https://" /></label>
            <label class="field"><span>Facebook</span><input class="input" formControlName="facebook" placeholder="https://" /></label>
            <label class="field"><span>TikTok</span><input class="input" formControlName="tiktok" placeholder="https://" /></label>
            <label class="field"><span>LinkedIn</span><input class="input" formControlName="linkedin" placeholder="https://" /></label>
          </div>
        </fieldset>
        <fieldset class="full fs">
          <legend>Altri contatti aziendali</legend>
          <div class="stack-sm" formArrayName="contacts">
            @for (g of contacts.controls; track $index; let i = $index) {
              <div class="row" [formGroupName]="i">
                <input class="input" style="width: 140px" formControlName="tipo" placeholder="Tipo" aria-label="Tipo contatto" />
                <input class="input grow" formControlName="valore" placeholder="Valore" aria-label="Valore contatto" />
                <button type="button" class="btn btn-ghost btn-sm icon-btn" (click)="contacts.removeAt(i)" aria-label="Rimuovi">✕</button>
              </div>
            }
            <button type="button" class="btn btn-sm" style="align-self: flex-start" (click)="addContact()">+ Contatto</button>
          </div>
        </fieldset>
        <label class="field full"><span>Note interne</span><textarea class="textarea" rows="3" formControlName="notes"></textarea></label>
      </form>
      <div modal-footer class="modal-foot">
        @if (editing() && auth.isAdmin()) { <button class="btn btn-danger" style="margin-right: auto" (click)="remove()">Elimina</button> }
        <button class="btn btn-ghost" (click)="formOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="client-form" [disabled]="saving()">Salva</button>
      </div>
    </cf-modal>

    <cf-modal [(open)]="inviteOpen" title="Invita al portale clienti">
      @if (inviteLink(); as link) {
        <div class="stack">
          <p>Invito creato. Invia questo link al cliente: è valido 72 ore e funziona una sola volta. <strong>Non verrà più mostrato.</strong></p>
          <div class="row"><input class="input grow mono" [value]="link" readonly aria-label="Link invito" /><button class="btn" (click)="copy(link)">Copia</button></div>
        </div>
      } @else {
        <form id="invite-form" class="stack" (ngSubmit)="invite()">
          <p class="muted">Il referente di <strong>{{ inviteFor()?.name }}</strong> potrà seguire i progetti, approvare documenti e scriverti.</p>
          <label class="field"><span>Email</span><input class="input" type="email" name="email" [(ngModel)]="inviteEmail" required /></label>
        </form>
      }
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="inviteOpen.set(false)">Chiudi</button>
        @if (!inviteLink()) { <button class="btn btn-primary" type="submit" form="invite-form">Crea invito</button> }
      </div>
    </cf-modal>
  `,
  styles: `.fs { border: 1px solid var(--cf-color-border); border-radius: var(--cf-radius-sm); padding: 12px 14px 14px; margin: 0; }
    legend { font-size: 12px; font-weight: 600; color: var(--cf-color-text-muted); padding: 0 6px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsPage implements OnInit {
  readonly nuovo = input<string>();
  readonly id = input<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly items = signal<ClientDto[]>([]);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<ClientDto | null>(null);
  protected readonly saving = signal(false);
  protected readonly inviteOpen = signal(false);
  protected readonly inviteFor = signal<ClientDto | null>(null);
  protected readonly inviteLink = signal<string | null>(null);
  protected inviteEmail = '';
  protected q = '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly form = this.fb.group({
    name: ['', Validators.required], vatNumber: [''], address: [''], openingHours: [''], contactName: [''],
    contactEmail: ['', Validators.email], contactPhone: [''], oldWebsite: ['', urlOrEmpty], notes: [''],
    socialLinks: this.fb.group({ instagram: ['', urlOrEmpty], facebook: ['', urlOrEmpty], tiktok: ['', urlOrEmpty], linkedin: ['', urlOrEmpty] }),
    contacts: this.fb.array<FormGroup<{ tipo: FormControl<string>; valore: FormControl<string> }>>([])
  });
  protected get contacts(): FormArray { return this.form.controls.contacts; }

  async ngOnInit(): Promise<void> {
    await this.load();
    if (this.nuovo()) this.open();
    const id = this.id();
    if (id) { const c = this.items().find((x) => x.id === id); if (c) this.open(c); }
  }

  private contactGroup(tipo = '', valore = '') { return this.fb.group({ tipo: [tipo, Validators.required], valore: [valore, Validators.required] }); }
  protected addContact(): void { this.form.controls.contacts.push(this.contactGroup()); }

  protected onSearch(): void { clearTimeout(this.timer); this.timer = setTimeout(() => void this.load(), 300); }

  private async load(): Promise<void> {
    try { this.items.set(await this.api.get<ClientDto[]>('/clients', { q: this.q.trim() })); } catch (err) { this.toast.error(err); }
  }

  protected open(c?: ClientDto): void {
    this.editing.set(c ?? null);
    this.form.controls.contacts.clear();
    for (const x of c?.contacts ?? []) this.form.controls.contacts.push(this.contactGroup(x.tipo, x.valore));
    const s = c?.socialLinks ?? {};
    this.form.reset({
      name: c?.name ?? '', vatNumber: c?.vatNumber ?? '', address: c?.address ?? '', openingHours: c?.openingHours ?? '',
      contactName: c?.contactName ?? '', contactEmail: c?.contactEmail ?? '', contactPhone: c?.contactPhone ?? '',
      oldWebsite: c?.oldWebsite ?? '', notes: c?.notes ?? '',
      socialLinks: { instagram: s['instagram'] ?? '', facebook: s['facebook'] ?? '', tiktok: s['tiktok'] ?? '', linkedin: s['linkedin'] ?? '' }
    });
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Controlla i campi (URL con https://, email valida)'); return; }
    const v = this.form.getRawValue();
    const blankToNull = (x: string) => (x.trim() ? x.trim() : null);
    const body = {
      name: v.name.trim(), vatNumber: blankToNull(v.vatNumber), address: blankToNull(v.address), openingHours: blankToNull(v.openingHours),
      contactName: blankToNull(v.contactName), contactEmail: blankToNull(v.contactEmail), contactPhone: blankToNull(v.contactPhone),
      oldWebsite: blankToNull(v.oldWebsite), notes: blankToNull(v.notes), contacts: v.contacts,
      socialLinks: Object.fromEntries(Object.entries(v.socialLinks).map(([k, val]) => [k, blankToNull(val)]))
    };
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) await this.api.patch(`/clients/${editing.id}`, body); else await this.api.post('/clients', body);
      this.formOpen.set(false);
      this.toast.success('Cliente salvato');
      await this.load();
    } catch (err) { this.toast.error(err); } finally { this.saving.set(false); }
  }

  protected async remove(): Promise<void> {
    const c = this.editing();
    if (!c || !(await this.confirm.ask(`Eliminare ${c.name}? Possibile solo se non ha progetti.`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try { await this.api.delete(`/clients/${c.id}`); this.formOpen.set(false); await this.load(); } catch (err) { this.toast.error(err); }
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
    } catch (err) { this.toast.error(err); }
  }

  protected async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.toast.success('Link copiato'); } catch { this.toast.error('Copia non consentita'); }
  }
}
