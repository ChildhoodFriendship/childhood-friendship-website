import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
}

bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => {
  console.error(error);
});
