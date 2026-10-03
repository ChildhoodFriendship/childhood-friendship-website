import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from './about/about-section.component';
import { ContactSectionComponent } from './contact/contact-section.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { HeroSectionComponent } from './hero/hero-section.component';
import { HeroStaticComponent } from './hero-static/hero-static.component';
import { PricingSectionComponent } from './pricing/pricing-section.component';
import { ProcessSectionComponent } from './process/process-section.component';
import { ServicesSectionComponent } from './services/services-section.component';
import { TrustBarComponent } from './trust-bar/trust-bar.component';

/** La scena 3D ha senso solo su desktop con WebGL e senza preferenza per animazioni ridotte. */
function canUse3dHero(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches) return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

@Component({
  selector: 'cf-landing-page',
  imports: [
    AboutSectionComponent,
    ContactSectionComponent,
    FooterComponent,
    HeaderComponent,
    HeroSectionComponent,
    HeroStaticComponent,
    PricingSectionComponent,
    ProcessSectionComponent,
    ServicesSectionComponent,
    TrustBarComponent
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  protected readonly use3dHero = canUse3dHero();
}
