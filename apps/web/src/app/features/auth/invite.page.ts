import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

@Component({
  selector: 'cf-invite-page',
  imports: [LogoComponent, ReactiveFormsModule, RouterLink],
  template: `
    <main class="app-root auth-card card">
      <a class="brand" routerLink="/"><cf-logo class="brand-mark" /> Childhood Friendship</a>
      @if (invalid()) {
        <h1>Invito non valido</h1>
        <p class="muted">Il link è scaduto o è già stato usato. Chiedi al tuo referente un nuovo invito.</p>
        <a class="btn" routerLink="/login">Vai al login</a>
      } @else {
        <div>
          <h1>Attiva il tuo account</h1>
          <p class="muted">{{ email() ? 'Account per ' + email() : 'Verifica invito…' }}</p>
        </div>
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field">
            <span>Nome e cognome</span>
            <input class="input" formControlName="name" autocomplete="name" required />
          </label>
          <label class="field">
            <span>Scegli una password</span>
            <input class="input" type="password" formControlName="password" autocomplete="new-password" required />
            <span class="hint">Almeno 10 caratteri con maiuscola, minuscola e numero.</span>
          </label>
          <label class="field">
            <span>Ripeti la password</span>
            <input class="input" type="password" formControlName="confirm" autocomplete="new-password" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="loading() || !email()">Attiva account</button>
        </form>
      }
    </main>
  `,
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvitePage implements OnInit {
  readonly token = input.required<string>();
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly email = signal<string | null>(null);
  protected readonly invalid = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.pattern(STRONG)]],
    confirm: ['', Validators.required]
  });

  async ngOnInit(): Promise<void> {
    try {
      const info = await this.api.get<{ email: string }>(`/auth/invite/${encodeURIComponent(this.token())}`);
      this.email.set(info.email);
    } catch {
      this.invalid.set(true);
    }
  }

  protected async submit(): Promise<void> {
    const v = this.form.getRawValue();
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Controlla nome e requisiti della password'); return; }
    if (v.password !== v.confirm) { this.error.set('Le password non coincidono'); return; }
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.acceptInvite(this.token(), v.name, v.password);
      await this.router.navigateByUrl(this.auth.homeFor(user));
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
