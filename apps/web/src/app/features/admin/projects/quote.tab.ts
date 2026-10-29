import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BillingAdminComponent } from './billing-admin.component';
import { QuoteEditorComponent } from './quote-editor.component';

/**
 * Sezione a parte dedicata al Preventivo:
 * tipologia di progetto, voci con prezzi, acconto e canone.
 */
@Component({
  selector: 'cf-quote-tab',
  imports: [QuoteEditorComponent, BillingAdminComponent],
  template: `
    <div class="quote-tab-container">
      <cf-quote-editor />
      <cf-billing-admin />
    </div>
  `,
  styles: `
    .quote-tab-container {
      max-width: 860px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteTab {}
