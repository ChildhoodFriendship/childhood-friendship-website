import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'cf-login-page',
  imports: [LogoComponent, ReactiveFormsModule, RouterLink],
  template: `
    <main class="app-root auth-card card">
      <a class="brand" routerLink="/"><cf-logo class="brand-mark" /> Childhood Friendship</a>
      <div>
        <h1>Accedi</h1>
        <p class="muted">Area riservata per il team e i clienti.</p>
      </div>
      @if (scaduta()) { <div class="alert alert-warn">La sessione è scaduta, accedi di nuovo.</div> }
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label class="field">
          <span>Email</span>
          <input class="input" type="email" formControlName="email" autocomplete="username" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input class="input" type="password" formControlName="password" autocomplete="current-password" required />
        </label>
        <button class="btn btn-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Accesso…' : 'Accedi' }}</button>
      </form>
      <p class="muted small">Non hai un account? L'accesso è solo su invito: contatta il tuo referente.</p>
    </main>
  `,
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  readonly next = input<string>();
  readonly scaduta = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Inserisci email e password'); return; }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.auth.login(email, password);
      const next = this.next();
      const home = this.auth.homeFor(user);
      await this.router.navigateByUrl(next && next.startsWith(home) ? next : home);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
