import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LEAD_SERVICES, type LeadService } from '@cf/shared/catalog';
import { Api } from '../../core/api';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';
type StepId = 'service' | 'timing' | 'budget' | 'project' | 'who' | 'contact';

interface Choice { readonly value: string; readonly label: string; readonly hint?: string; }

const SERVICES: readonly Choice[] = [
  { value: 'landing', label: 'Un sito o una landing page', hint: 'Presentarti e farti trovare' },
  { value: 'webapp', label: 'Una web app o un gestionale', hint: 'Processi, aree riservate, dashboard' },
  { value: 'mobile', label: 'Un’app mobile', hint: 'iOS e Android' },
  { value: 'manutenzione', label: 'Seguire un progetto esistente', hint: 'Manutenzione ed evoluzione' },
  { value: 'altro', label: 'Non lo so ancora', hint: 'Ne parliamo insieme' }
];
const TIMINGS: readonly Choice[] = [
  { value: 'Prima possibile', label: 'Prima possibile' },
  { value: 'Entro 1-3 mesi', label: 'Entro 1-3 mesi' },
  { value: 'Più avanti', label: 'Più avanti, sto pianificando' },
  { value: 'Sto esplorando', label: 'Sto solo esplorando' }
];
const BUDGETS: readonly Choice[] = [
  { value: 'Fino a 500 €', label: 'Fino a 500 €' },
  { value: '500 – 2.000 €', label: '500 – 2.000 €' },
  { value: 'Oltre 2.000 €', label: 'Oltre 2.000 €' },
  { value: 'Da definire', label: 'Da definire insieme' }
];

interface Step { readonly id: StepId; readonly title: string; readonly short: string; }
const STEPS: readonly Step[] = [
  { id: 'service', title: 'Cosa vuoi costruire?', short: 'Progetto' },
  { id: 'timing', title: 'Quando ti servirebbe?', short: 'Tempi' },
  { id: 'budget', title: 'Hai già un budget in mente?', short: 'Budget' },
  { id: 'project', title: 'Raccontaci l’idea in due righe.', short: 'Idea' },
  { id: 'who', title: 'Piacere! Come ti chiami?', short: 'Tu' },
  { id: 'contact', title: 'Dove ti rispondiamo?', short: 'Contatti' }
];
const KEYS = 'ABCDE';

interface Answers {
  service: string; timing: string; budget: string; message: string;
  name: string; company: string; email: string; phone: string; privacy: boolean; website: string;
}
const EMPTY: Answers = { service: '', timing: '', budget: '', message: '', name: '', company: '', email: '', phone: '', privacy: false, website: '' };

/**
 * Form contatti a quiz: una domanda per schermata, barra di avanzamento, scelte rapide con tasti A-E,
 * Invio per proseguire. Le risposte finiscono nell'area admin (sezione Lead).
 */
@Component({
  selector: 'cf-contact-section',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' }
})
export class ContactSectionComponent {
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly steps = STEPS;
  protected readonly keys = KEYS;
  protected readonly choices: Record<'service' | 'timing' | 'budget', readonly Choice[]> = { service: SERVICES, timing: TIMINGS, budget: BUDGETS };
  protected readonly index = signal(0);
  protected readonly direction = signal<'fwd' | 'back'>('fwd');
  protected readonly step = computed(() => STEPS[this.index()]);
  /** Avanzamento della barra: la domanda corrente conta a metà. */
  protected readonly progress = computed(() => this.submission() === 'success' ? 100 : Math.round((this.index() / STEPS.length) * 100));
  protected readonly answers = signal<Answers>({ ...EMPTY });
  protected readonly error = signal('');
  protected readonly submission = signal<SubmissionState>('idle');
  protected readonly serverError = signal('');
  protected readonly summary = computed(() => {
    const a = this.answers();
    return [SERVICES.find((s) => s.value === a.service)?.label, a.timing, a.budget].filter((x): x is string => !!x);
  });
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected set<K extends keyof Answers>(key: K, value: Answers[K]): void {
    this.answers.update((a) => ({ ...a, [key]: value }));
    this.error.set('');
  }

  protected value(e: Event): string { return (e.target as HTMLInputElement).value; }

  protected list(key: 'service' | 'timing' | 'budget'): readonly Choice[] { return this.choices[key]; }
  protected isPicked(key: 'service' | 'timing' | 'budget', value: string): boolean { return this.answers()[key] === value; }

  /** Scelta rapida: seleziona e passa alla domanda dopo con un attimo di respiro. */
  protected pick(key: 'service' | 'timing' | 'budget', value: string): void {
    this.set(key, value);
    // l'avanzamento parte da un timer (anche da tastiera): chiede esplicitamente un nuovo rendering
    setTimeout(() => { this.next(); this.cdr.markForCheck(); }, 260);
  }

  protected next(): void {
    const msg = this.validate(this.step().id);
    if (msg) { this.error.set(msg); return; }
    if (this.index() === STEPS.length - 1) { void this.submit(); return; }
    this.direction.set('fwd');
    this.index.update((i) => i + 1);
    this.focusStep();
  }

  protected back(): void {
    if (this.index() === 0) return;
    this.error.set('');
    this.direction.set('back');
    this.index.update((i) => i - 1);
    this.focusStep();
  }

  protected goTo(i: number): void {
    if (i >= this.index()) return; // si torna solo indietro: avanti si va rispondendo
    this.direction.set('back');
    this.index.set(i);
    this.error.set('');
    this.focusStep();
  }

  protected restart(): void {
    this.answers.set({ ...EMPTY });
    this.index.set(0);
    this.submission.set('idle');
  }

  protected onKey(e: KeyboardEvent): void {
    if (this.submission() === 'success' || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    // le scorciatoie valgono quando il quiz è a schermo e il focus non è in un altro campo della pagina
    const inside = this.host.contains(target);
    if (!inside) {
      if (target !== document.body && target.closest('input, textarea, select, [contenteditable]')) return;
      const r = (this.host.querySelector('.quiz') ?? this.host).getBoundingClientRect();
      if (r.top > window.innerHeight * 0.75 || r.bottom < window.innerHeight * 0.25) return;
    }
    const typing = target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox');
    const id = this.step().id;
    if ((id === 'service' || id === 'timing' || id === 'budget') && !typing) {
      const k = KEYS.indexOf(e.key.toUpperCase());
      const list = this.choices[id];
      if (k >= 0 && k < list.length) { e.preventDefault(); this.pick(id, list[k].value); return; }
    }
    // Invio prosegue (nel testo lungo serve Ctrl/⌘ + Invio, quindi lì lo lasciamo andare a capo)
    if (e.key === 'Enter' && inside && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON' && target.tagName !== 'A') {
      e.preventDefault();
      this.next();
    }
  }

  protected onTextareaKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.next(); }
  }

  private validate(id: StepId): string {
    const a = this.answers();
    switch (id) {
      case 'service': return a.service ? '' : 'Scegli un’opzione per continuare.';
      case 'timing': return a.timing ? '' : 'Scegli un’opzione per continuare.';
      case 'budget': return a.budget ? '' : 'Scegli un’opzione per continuare.';
      case 'project': return a.message.trim().length >= 10 ? '' : 'Bastano un paio di frasi (almeno 10 caratteri).';
      case 'who': return a.name.trim().length >= 2 ? '' : 'Dicci almeno il tuo nome.';
      case 'contact':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) return 'Inserisci un’email valida.';
        return a.privacy ? '' : 'Conferma di aver letto l\'informativa privacy per inviare la richiesta.';
    }
  }

  private focusStep(): void {
    // dopo il cambio di schermata porta il focus sul primo campo utile
    setTimeout(() => this.body()?.nativeElement.querySelector<HTMLElement>('input:not([type=checkbox]), textarea, .choice')?.focus({ preventScroll: true }), 60);
  }

  private async submit(): Promise<void> {
    const a = this.answers();
    this.submission.set('submitting');
    this.serverError.set('');
    const message = `${a.message.trim()}\n\n— Tempistiche: ${a.timing}\n— Budget: ${a.budget}`;
    try {
      await this.api.post('/public/leads', {
        name: a.name.trim(),
        email: a.email.trim(),
        phone: a.phone.trim() || null,
        company: a.company.trim() || null,
        service: (LEAD_SERVICES as readonly string[]).includes(a.service) ? (a.service as LeadService) : 'altro',
        message,
        privacyAccepted: a.privacy,
        website: a.website || undefined
      });
      this.submission.set('success');
    } catch (err) {
      this.serverError.set(err instanceof Error ? err.message : 'Riprova tra poco.');
      this.submission.set('error');
    }
  }
}
