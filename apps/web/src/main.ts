import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
}

// iOS Safari ignora user-scalable=no: blocca il pizzico (gesture*) e il doppio tap per zoomare
if (typeof document !== 'undefined') {
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  }
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => {
  console.error(error);
});
