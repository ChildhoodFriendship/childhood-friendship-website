import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatMoney } from '@cf/shared/billing';
import type { BillingSummaryDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { ProjectStore } from './project.store';

interface ContractInfo { signed: boolean; version: string; signature: { signerName: string; signedAt: string } | null }

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Incassi, fatture e firma del contratto per il team.
 * - Bonifico: registrato qui (importo al netto del bollo + bollo).
 * - Fattura: si emette sul servizio di fatturazione elettronica e qui si registrano numero, data e PDF
 *   assegnati da quel servizio (attivo solo con P.IVA nel profilo aziendale).
 */
@Component({
  selector: 'cf-billing-admin',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="card stack">
      <div class="row-between">
        <h2>Contratto, incassi e fatture</h2>
        @if (summary(); as s) {
          <span class="muted small">{{ s.company.vatLabel }} · pagamenti online {{ s.paymentsEnabled ? 'attivi' : 'non attivi' }}</span>
        }
      </div>

      <p class="small">
        Contratto:
        @if (contract()?.signed) {
          <strong class="text-green">firmato</strong> da {{ contract()?.signature?.signerName }} il {{ contract()?.signature?.signedAt | date: 'dd/MM/yyyy HH:mm' }}
        } @else {
          <strong class="text-amber">non ancora firmato</strong> (il cliente lo firma dal portale, sezione Documenti)
        }
      </p>

      <h3>Incassi</h3>
      @for (p of summary()?.payments ?? []; track p.id) {
        <div class="line">
          <span>{{ p.tranche }} · {{ p.provider }} · {{ p.status }}{{ p.paidAt ? ' · ' + (p.paidAt | date: 'dd/MM/yyyy') : '' }}</span>
          <strong class="font-mono">{{ money(p.amountCents) }}</strong>
        </div>
      } @empty { <p class="muted small">Nessun incasso registrato.</p> }

      <details>
        <summary>Registra un bonifico ricevuto</summary>
        <div class="grid">
          <label class="field"><span>Tranche</span>
            <select class="input" [(ngModel)]="pay.tranche"><option value="acconto">Acconto</option><option value="saldo">Saldo</option><option value="canone">Canone</option><option value="altro">Altro</option></select>
          </label>
          <label class="field"><span>Compenso incassato (senza bollo)</span><input class="input" type="number" min="0" step="0.01" [(ngModel)]="pay.net" /></label>
          <label class="field"><span>Bollo addebitato</span><input class="input" type="number" min="0" step="0.01" [(ngModel)]="pay.stamp" /></label>
          <label class="field"><span>Data accredito</span><input class="input" type="date" [(ngModel)]="pay.paidAt" /></label>
          <label class="field wide"><span>Riferimento (CRO / causale)</span><input class="input" [(ngModel)]="pay.reference" /></label>
        </div>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="recordPayment()">Registra incasso</button>
      </details>

      <h3>Fatture</h3>
      @for (i of summary()?.invoices ?? []; track i.id) {
        <div class="line">
          <span>n. {{ i.number }} del {{ i.issueDate | date: 'dd/MM/yyyy' }} · {{ i.status }}@if (i.pdfUrl) { · <a [href]="i.pdfUrl" target="_blank" rel="noopener">PDF</a> }</span>
          <strong class="font-mono">{{ money(i.amountCents) }}</strong>
        </div>
      } @empty { <p class="muted small">Nessuna fattura registrata.</p> }

      @if (summary()?.invoicingEnabled) {
        <details>
          <summary>Registra una fattura emessa</summary>
          <p class="muted small">Emetti la fattura sul servizio di fatturazione elettronica, poi riporta qui numero e data che ti ha assegnato e il link al PDF.</p>
          <div class="grid">
            <label class="field"><span>Numero</span><input class="input" [(ngModel)]="inv.number" placeholder="es. 1/2026" /></label>
            <label class="field"><span>Data</span><input class="input" type="date" [(ngModel)]="inv.issueDate" /></label>
            <label class="field"><span>Totale fattura</span><input class="input" type="number" min="0" step="0.01" [(ngModel)]="inv.amount" /></label>
            <label class="field"><span>Incasso collegato</span>
              <select class="input" [(ngModel)]="inv.paymentId">
                <option [ngValue]="null">—</option>
                @for (p of summary()?.payments ?? []; track p.id) { <option [ngValue]="p.id">{{ p.tranche }} · {{ money(p.amountCents) }}</option> }
              </select>
            </label>
            <label class="field wide"><span>Link PDF (dal servizio di fatturazione)</span><input class="input" type="url" [(ngModel)]="inv.pdfUrl" /></label>
          </div>
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="recordInvoice()">Registra fattura</button>
        </details>
      } @else {
        <p class="note small">Fatturazione non attiva: compila P.IVA, codice fiscale e sede in <code>packages/shared/src/company.ts</code> appena apri la partita IVA.</p>
      }
    </section>
  `,
  styles: `
    .line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--cf-color-border); font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 12px 0; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .wide { grid-column: 1 / -1; }
    details summary { cursor: pointer; font-weight: 600; }
    .note { padding: 10px 12px; border: 1px solid var(--cf-color-border); border-radius: 10px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillingAdminComponent {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly store = inject(ProjectStore);
  protected readonly summary = signal<BillingSummaryDto | null>(null);
  protected readonly contract = signal<ContractInfo | null>(null);
  protected readonly busy = signal(false);
  private readonly currency = computed(() => this.summary()?.currency ?? 'EUR');

  protected pay = { tranche: 'acconto', net: null as number | null, stamp: 0, paidAt: today(), reference: '' };
  protected inv = { number: '', issueDate: today(), amount: null as number | null, paymentId: null as string | null, pdfUrl: '' };

  constructor() {
    effect(() => { const id = this.store.id(); if (id) void this.load(id); });
  }

  protected money(cents: number): string { return formatMoney(cents, this.currency()); }

  private async load(id: string): Promise<void> {
    try {
      const [s, c] = await Promise.all([
        this.api.get<BillingSummaryDto>(`/projects/${id}/billing/summary`),
        this.api.get<ContractInfo>(`/projects/${id}/contract`)
      ]);
      this.summary.set(s);
      this.contract.set(c);
    } catch (err) { this.toast.error(err); }
  }

  protected async recordPayment(): Promise<void> {
    const net = Math.round(Number(this.pay.net) * 100);
    if (!Number.isFinite(net) || net <= 0) { this.toast.error('Importo non valido'); return; }
    this.busy.set(true);
    try {
      await this.api.post(`/projects/${this.store.id()}/billing/payments`, {
        tranche: this.pay.tranche, method: 'bonifico', netCents: net,
        stampDutyCents: Math.round(Number(this.pay.stamp || 0) * 100), paidAt: this.pay.paidAt, reference: this.pay.reference || null
      });
      this.toast.success('Incasso registrato');
      this.pay = { ...this.pay, net: null, reference: '' };
      await Promise.all([this.load(this.store.id()), this.store.refresh()]);
    } catch (err) { this.toast.error(err); } finally { this.busy.set(false); }
  }

  protected async recordInvoice(): Promise<void> {
    const amount = Math.round(Number(this.inv.amount) * 100);
    if (!this.inv.number.trim() || !Number.isFinite(amount) || amount <= 0) { this.toast.error('Numero e importo richiesti'); return; }
    this.busy.set(true);
    try {
      await this.api.post(`/projects/${this.store.id()}/billing/invoices`, {
        number: this.inv.number.trim(), issueDate: this.inv.issueDate, amountCents: amount,
        paymentId: this.inv.paymentId, pdfUrl: this.inv.pdfUrl || null
      });
      this.toast.success('Fattura registrata: il cliente la vede nel portale');
      this.inv = { number: '', issueDate: today(), amount: null, paymentId: null, pdfUrl: '' };
      await this.load(this.store.id());
    } catch (err) { this.toast.error(err); } finally { this.busy.set(false); }
  }
}
