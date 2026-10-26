import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
  selector: 'cf-reset-password-page',
  imports: [LogoComponent, ReactiveFormsModule, RouterLink],
  template: `
    <main class="app-root auth-card card">
      <a class="brand" routerLink="/"><cf-logo class="brand-mark" /> Childhood Friendship</a>
      @if (invalid()) {
        <h1>Link non valido o scaduto</h1>
        <p class="muted">Il link di reimpostazione password è scaduto o è già stato utilizzato.</p>
        <a class="btn btn-primary" routerLink="/login">Torna al login</a>
      } @else if (success()) {
        <div>
          <h1>Password aggiornata! 🎉</h1>
          <p class="muted">La tua nuova password è attiva. Ora puoi effettuare l'accesso.</p>
        </div>
        <a class="btn btn-primary" routerLink="/login" [queryParams]="{ email: email() }">Accedi ora</a>
      } @else {
        <div>
          <h1>Reimposta password</h1>
          <p class="muted">{{ email() ? 'Account: ' + email() : 'Verifica link in corso…' }}</p>
        </div>
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field">
            <span>Nuova password</span>
            <input class="input" type="password" formControlName="password" autocomplete="new-password" required />
            <span class="hint">Almeno 8 caratteri con maiuscola, minuscola e un numero.</span>
          </label>
          <label class="field">
            <span>Ripeti nuova password</span>
            <input class="input" type="password" formControlName="confirm" autocomplete="new-password" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="loading() || !email()">Salva nuova password</button>
        </form>
      }
    </main>
  `,
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  readonly token = input.required<string>();
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly email = signal<string | null>(null);
  protected readonly invalid = signal(false);
  protected readonly loading = signal(false);
  protected readonly success = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(STRONG)]],
    confirm: ['', Validators.required]
  });

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.api.get<{ ok: boolean; email: string; name: string }>(`/auth/reset-password/${encodeURIComponent(this.token())}`);
      this.email.set(res.email);
    } catch {
      this.invalid.set(true);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('La password deve avere almeno 8 caratteri con una maiuscola, una minuscola e un numero.');
      return;
    }
    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.error.set('Le password non coincidono');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.api.post('/auth/reset-password', { token: this.token(), password });
      this.success.set(true);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
