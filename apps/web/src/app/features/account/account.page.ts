import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ROLE_LABELS } from '../../shared/labels';

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

@Component({
  selector: 'cf-account-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" style="max-width: 720px">
      <header class="page-header"><div><span class="eyebrow">Account</span><h1>Il tuo profilo</h1></div></header>
      @let u = auth.user();
      <section class="card stack-sm">
        <div><strong>{{ u?.name }}</strong></div>
        <div class="muted">{{ u?.email }} · {{ u ? roles[u.role] : '' }}</div>
      </section>
      <section class="card stack">
        <h2>Cambia password</h2>
        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <label class="field"><span>Password attuale</span><input class="input" type="password" formControlName="currentPassword" autocomplete="current-password" /></label>
          <label class="field"><span>Nuova password</span><input class="input" type="password" formControlName="newPassword" autocomplete="new-password" />
            <span class="hint">Almeno 10 caratteri con maiuscola, minuscola e numero. Le altre sessioni verranno chiuse.</span></label>
          <div class="form-actions"><button class="btn btn-primary" [disabled]="saving()">Aggiorna password</button></div>
        </form>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly roles = ROLE_LABELS;
  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.pattern(STRONG)]]
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Controlla i requisiti della password'); return; }
    this.saving.set(true);
    try {
      await this.api.post('/auth/password', this.form.getRawValue());
      this.form.reset();
      this.toast.success('Password aggiornata');
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.saving.set(false);
    }
  }
}
