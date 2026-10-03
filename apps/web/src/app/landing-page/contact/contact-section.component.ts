import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LEAD_SERVICES, type LeadService } from '@cf/shared/catalog';
import { Api } from '../../core/api';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const SERVICE_LABELS: Record<LeadService, string> = {
  landing: 'Landing page / sito vetrina',
  webapp: 'Web app',
  mobile: 'App mobile',
  manutenzione: 'Manutenzione di un progetto esistente',
  altro: 'Altro / non lo so ancora'
};

/** Form contatti: le richieste finiscono nell'area admin (sezione Lead), non più su Formspree. */
@Component({
  selector: 'cf-contact-section',
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactSectionComponent {
  private readonly api = inject(Api);
  protected readonly services = LEAD_SERVICES.map((value) => ({ value, label: SERVICE_LABELS[value] }));
  protected readonly submissionState = signal<SubmissionState>('idle');
  protected readonly errorMessage = signal('');

  protected async submitContactForm(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    this.submissionState.set('submitting');
    try {
      await this.api.post('/public/leads', {
        name: text('name'),
        email: text('email'),
        phone: text('phone') || null,
        company: text('company') || null,
        service: text('service') || 'altro',
        message: text('message'),
        privacyAccepted: data.get('privacy') === 'on',
        website: text('website') || undefined
      });
      form.reset();
      this.submissionState.set('success');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Riprova tra poco.');
      this.submissionState.set('error');
    }
  }
}
