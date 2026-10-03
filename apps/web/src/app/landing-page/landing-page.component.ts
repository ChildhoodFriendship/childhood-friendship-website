import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from './about/about-section.component';
import { ContactSectionComponent } from './contact/contact-section.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { HeroSectionComponent } from './hero/hero-section.component';
import { PricingSectionComponent } from './pricing/pricing-section.component';
import { ProcessSectionComponent } from './process/process-section.component';
import { ServicesSectionComponent } from './services/services-section.component';
import { TrustBarComponent } from './trust-bar/trust-bar.component';

@Component({
  selector: 'cf-landing-page',
  standalone: true,
  imports: [
    AboutSectionComponent,
    ContactSectionComponent,
    FooterComponent,
    HeaderComponent,
    HeroSectionComponent,
    PricingSectionComponent,
    ProcessSectionComponent,
    ServicesSectionComponent,
    TrustBarComponent
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {}
