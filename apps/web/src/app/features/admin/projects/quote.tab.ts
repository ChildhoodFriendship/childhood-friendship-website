import { ChangeDetectionStrategy, Component } from '@angular/core';
import { QuoteEditorComponent } from './quote-editor.component';

/**
 * Sezione a parte dedicata al Preventivo:
 * tipologia di progetto, voci con prezzi, acconto e canone.
 */
@Component({
  selector: 'cf-quote-tab',
  imports: [QuoteEditorComponent],
  template: `
    <div class="quote-tab-container">
      <cf-quote-editor />
    </div>
  `,
  styles: `
    .quote-tab-container {
      max-width: 860px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteTab {}
