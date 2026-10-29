import { Injectable, inject, signal } from '@angular/core';
import type { BillingSummaryDto } from '@cf/shared/types';
import { Api } from '../../core/api';

export interface ContractState {
  signed: boolean;
  version: string;
  signature: { signerName: string; signerEmail: string; signedAt: string; signatureHash: string; signerIp: string } | null;
}

/**
 * Stato economico e contrattuale del progetto per il portale: una sola lettura condivisa
 * da riepilogo, pagamenti e contratto. Nessun dato viene salvato nel browser.
 */
@Injectable({ providedIn: 'root' })
export class PortalBillingStore {
  private readonly api = inject(Api);
  readonly summary = signal<BillingSummaryDto | null>(null);
  readonly contract = signal<ContractState | null>(null);
  readonly loading = signal(false);
  private loadedFor: string | null = null;

  async load(projectId: string, force = false): Promise<void> {
    if (!force && this.loadedFor === projectId && this.summary()) return;
    this.loadedFor = projectId;
    this.loading.set(true);
    try {
      const [summary, contract] = await Promise.all([
        this.api.get<BillingSummaryDto>(`/projects/${projectId}/billing/summary`),
        this.api.get<ContractState>(`/projects/${projectId}/contract`)
      ]);
      if (this.loadedFor !== projectId) return;
      this.summary.set(summary);
      this.contract.set(contract);
    } finally {
      this.loading.set(false);
    }
  }
}
