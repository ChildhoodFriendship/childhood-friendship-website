import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'cf-contact-section',
  standalone: true,
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactSectionComponent {
  protected readonly formspreeEndpoint = environment.formspreeEndpoint;
  protected readonly submissionState = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');

  protected async submitContactForm(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    this.submissionState.set('submitting');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Formspree request failed with status ${response.status}`);
      }

      form.reset();
      this.submissionState.set('success');
    } catch {
      this.submissionState.set('error');
    }
  }
}
