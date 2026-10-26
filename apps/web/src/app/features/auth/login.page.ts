import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'cf-login-page',
  imports: [LogoComponent, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="app-root auth-card card">
      <a class="brand" routerLink="/"><cf-logo class="brand-mark" /> Childhood Friendship</a>

      @if (showForgot()) {
        <div>
          <h1>Recupera password</h1>
          <p class="muted">Inserisci l'email associata al tuo account.</p>
        </div>

        @if (forgotSent()) {
          <div class="alert alert-success">
            Ti abbiamo inviato un'email con il link per reimpostare la tua password. Controlla la tua casella di posta!
          </div>
          <button class="btn btn-primary" type="button" (click)="toggleForgot(false)">Torna al login</button>
        } @else {
          @if (forgotError()) { <div class="alert alert-error" role="alert">{{ forgotError() }}</div> }
          <form (ngSubmit)="submitForgot()" novalidate>
            <label class="field">
              <span>Email dell'account</span>
              <input class="input" type="email" [(ngModel)]="forgotEmail" name="forgotEmail" autocomplete="username" required autofocus />
            </label>
            <button class="btn btn-primary" type="submit" [disabled]="forgotLoading()">
              {{ forgotLoading() ? 'Invio in corso…' : 'Invia link di recupero' }}
            </button>
            <button class="btn btn-ghost" type="button" (click)="toggleForgot(false)">← Annulla e torna al login</button>
          </form>
        }
      } @else {
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
            <div class="field-head-row">
              <span>Password</span>
              <button type="button" class="btn-link" (click)="toggleForgot(true)">Password dimenticata?</button>
            </div>
            <input class="input" type="password" formControlName="password" autocomplete="current-password" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Accesso…' : 'Accedi' }}</button>
        </form>

        <p class="muted small">Non hai ancora una password o un account? Se hai inviato una richiesta, riceverai a breve l'invito dal nostro team.</p>
      }
    </main>
  `,
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  readonly email = input<string>();
  readonly next = input<string>();
  readonly scaduta = input<string>();

  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly showForgot = signal(false);
  protected readonly forgotEmail = signal('');
  protected readonly forgotLoading = signal(false);
  protected readonly forgotSent = signal(false);
  protected readonly forgotError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor() {
    effect(() => {
      const em = this.email();
      if (em) {
        this.form.patchValue({ email: em });
        this.forgotEmail.set(em);
      }
    });
  }

  protected toggleForgot(open: boolean): void {
    this.showForgot.set(open);
    this.forgotError.set(null);
    this.forgotSent.set(false);
    if (open && !this.forgotEmail()) {
      this.forgotEmail.set(this.form.getRawValue().email);
    }
  }

  protected async submitForgot(): Promise<void> {
    const em = this.forgotEmail().trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      this.forgotError.set('Inserisci un indirizzo email valido');
      return;
    }
    this.forgotLoading.set(true);
    this.forgotError.set(null);
    try {
      await this.api.post('/auth/forgot-password', { email: em });
      this.forgotSent.set(true);
    } catch (err) {
      this.forgotError.set((err as Error).message);
    } finally {
      this.forgotLoading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Inserisci email e password');
      return;
    }
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
