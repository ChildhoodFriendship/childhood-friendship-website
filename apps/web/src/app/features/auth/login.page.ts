import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

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
        <div class="auth-tabs" role="tablist">
          <button type="button" class="tab-btn" [class.active]="mode() === 'login'" (click)="setMode('login')">Accedi</button>
          <button type="button" class="tab-btn" [class.active]="mode() === 'register'" (click)="setMode('register')">Registrati</button>
        </div>

        @if (mode() === 'login') {
          <div>
            <h1>Accedi</h1>
            <p class="muted">Area riservata per clienti e collaboratori.</p>
          </div>

          @if (scaduta()) { <div class="alert alert-warn">La sessione è scaduta, accedi di nuovo.</div> }
          @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

          <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" novalidate>
            <label class="field">
              <span>Email</span>
              <input class="input" type="email" formControlName="email" autocomplete="username" placeholder="nome@azienda.it" required />
            </label>
            <div class="field">
              <div class="field-head-row">
                <label for="login-password">Password</label>
                <button type="button" class="btn-link" (click)="toggleForgot(true)">Password dimenticata?</button>
              </div>
              <input id="login-password" class="input" type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••••" required />
            </div>
            <button class="btn btn-primary" type="submit" [disabled]="loading()">
              {{ loading() ? 'Accesso in corso…' : 'Accedi' }}
            </button>
          </form>

          <p class="muted small">Non hai ancora un account? Clicca sulla scheda <strong>Registrati</strong> in alto per crearlo subito.</p>
        } @else {
          <div>
            <h1>Crea il tuo Account</h1>
            <p class="muted">Accedi subito al tuo spazio riservato per seguire progetti e preventivi.</p>
          </div>

          @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

          <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" novalidate>
            <label class="field">
              <span>Nome e cognome</span>
              <input class="input" formControlName="name" autocomplete="name" placeholder="Es. Mario Rossi" required />
            </label>
            <label class="field">
              <span>Email</span>
              <input class="input" type="email" formControlName="email" autocomplete="email" placeholder="nome@azienda.it" required />
            </label>
            <label class="field">
              <span>Scegli una password</span>
              <input class="input" type="password" formControlName="password" autocomplete="new-password" required />
              <span class="pwd-hint">Minimo 10 caratteri con maiuscola, minuscola e numero.</span>
            </label>
            <label class="field">
              <span>Ripeti la password</span>
              <input class="input" type="password" formControlName="confirm" autocomplete="new-password" required />
            </label>
            <button class="btn btn-primary" type="submit" [disabled]="loading()">
              {{ loading() ? 'Creazione account…' : 'Crea Account e Accedi' }}
            </button>
          </form>

          <p class="muted small">Hai già una password? Clicca sulla scheda <strong>Accedi</strong> in alto.</p>
        }
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
  readonly modeParam = input<string>(undefined, { alias: 'mode' });

  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly showForgot = signal(false);
  protected readonly forgotEmail = signal('');
  protected readonly forgotLoading = signal(false);
  protected readonly forgotSent = signal(false);
  protected readonly forgotError = signal<string | null>(null);

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected readonly registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(STRONG)]],
    confirm: ['', Validators.required]
  });

  constructor() {
    effect(() => {
      const em = this.email();
      if (em) {
        this.loginForm.patchValue({ email: em });
        this.registerForm.patchValue({ email: em });
        this.forgotEmail.set(em);
      }
    });

    effect(() => {
      const m = this.modeParam();
      if (m === 'register' || m === 'registrati') {
        this.mode.set('register');
      }
    });
  }

  protected setMode(m: 'login' | 'register'): void {
    this.mode.set(m);
    this.error.set(null);
  }

  protected toggleForgot(open: boolean): void {
    this.showForgot.set(open);
    this.forgotError.set(null);
    this.forgotSent.set(false);
    if (open && !this.forgotEmail()) {
      this.forgotEmail.set(this.loginForm.getRawValue().email || this.registerForm.getRawValue().email);
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

  protected async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Inserisci email e password');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.loginForm.getRawValue();
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

  protected async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      if (this.registerForm.get('password')?.hasError('pattern')) {
        this.error.set('La password deve avere almeno 10 caratteri, una maiuscola, una minuscola e un numero.');
      } else {
        this.error.set('Compila tutti i campi correttamente.');
      }
      return;
    }
    const val = this.registerForm.getRawValue();
    if (val.password !== val.confirm) {
      this.error.set('Le password non coincidono');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.register(val.name, val.email, val.password);
      this.toast.success(`Benvenuto, ${user.name.split(' ')[0]}! Il tuo account è attivo.`);
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
