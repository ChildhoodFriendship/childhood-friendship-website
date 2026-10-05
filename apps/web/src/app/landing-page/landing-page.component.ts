import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ContactSectionComponent } from './contact/contact-section.component';
import { CursorComponent } from './cursor/cursor.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { HeroComponent } from './hero/hero.component';
import { ManifestoComponent } from './manifesto/manifesto.component';
import { MethodComponent } from './method/method.component';
import { OutroComponent } from './outro/outro.component';
import { PointerService } from './pointer.service';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { SceneComponent } from './scene/scene.component';
import { ServicesComponent } from './services/services.component';

@Component({
  selector: 'cf-landing-page',
  imports: [ContactSectionComponent, CursorComponent, FooterComponent, HeaderComponent, HeroComponent, ManifestoComponent, MethodComponent, OutroComponent, PortfolioComponent, SceneComponent, ServicesComponent],
  providers: [PointerService],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  host: { '[class.custom-cursor]': 'customCursor' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  protected readonly customCursor = typeof window !== 'undefined'
    && window.matchMedia('(pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** La scena 3D richiede WebGL; con "riduci movimento" resta una sola inquadratura statica. */
  protected readonly use3d = typeof window !== 'undefined' && (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') ?? c.getContext('webgl')); } catch { return false; }
  })();
  protected readonly sceneOn = signal(false);
}
