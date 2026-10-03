import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let seq = 0;

/**
 * Logo "Legame": due moduli intrecciati (amicizia + costruzione).
 * L'intreccio usa maschere SVG, quindi funziona su qualsiasi sfondo.
 */
@Component({
  selector: 'cf-logo',
  template: `
    <svg viewBox="18 18 164 164" role="img" [attr.aria-label]="label()" [attr.aria-hidden]="label() ? null : true">
      <defs>
        <mask [attr.id]="'cfl-a' + uid" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          <path d="M126 48 V102" stroke="#000" stroke-width="40" />
        </mask>
        <mask [attr.id]="'cfl-b' + uid" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          <path d="M74 98 V152" stroke="#000" stroke-width="40" />
        </mask>
      </defs>
      <rect x="30" y="30" width="96" height="96" rx="28" fill="none" stroke="#7C3AED" stroke-width="24" [attr.mask]="'url(#cfl-b' + uid + ')'" />
      <rect x="74" y="74" width="96" height="96" rx="28" fill="none" [attr.stroke]="tone() === 'light' ? '#08060D' : '#F4F0FF'" stroke-width="24" [attr.mask]="'url(#cfl-a' + uid + ')'" />
    </svg>
  `,
  styles: `:host { display: inline-block; line-height: 0; } svg { width: 100%; height: 100%; display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoComponent {
  /** `dark` = logo per sfondi scuri (anello chiaro), `light` = per sfondi chiari. */
  readonly tone = input<'dark' | 'light'>('dark');
  readonly label = input<string>('');
  protected readonly uid = ++seq;
}
