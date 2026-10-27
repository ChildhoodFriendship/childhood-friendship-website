import { Injectable, computed, signal } from '@angular/core';

export type PortalLang = 'it' | 'en';

@Injectable({ providedIn: 'root' })
export class PortalI18nService {
  /** Lingua attiva nel portale clienti: 'it' (EUR €) o 'en' (USD $) */
  readonly lang = signal<PortalLang>(this.detectInitialLang());

  readonly isEn = computed(() => this.lang() === 'en');
  readonly currencySymbol = computed(() => (this.isEn() ? '$' : '€'));
  readonly currencyCode = computed(() => (this.isEn() ? 'USD' : 'EUR'));
  readonly vatRate = computed(() => (this.isEn() ? 0 : 0.22));

  private detectInitialLang(): PortalLang {
    if (typeof window === 'undefined') return 'it';
    const params = new URLSearchParams(window.location.search);
    const qLang = params.get('lang')?.toLowerCase();
    if (qLang === 'en' || qLang === 'us') return 'en';
    if (qLang === 'it') return 'it';

    const saved = localStorage.getItem('cf_portal_lang') as PortalLang;
    if (saved === 'it' || saved === 'en') return saved;

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('en')) return 'en';
    return 'it';
  }

  setLang(l: PortalLang): void {
    this.lang.set(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cf_portal_lang', l);
    }
  }

  toggle(): void {
    this.setLang(this.lang() === 'it' ? 'en' : 'it');
  }

  formatMoney(val: number): string {
    const isEn = this.isEn();
    if (isEn) {
      return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
}
