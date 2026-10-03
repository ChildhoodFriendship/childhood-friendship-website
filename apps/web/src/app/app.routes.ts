import { Routes } from '@angular/router';
import { guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing-page/landing-page.component').then((m) => m.LandingPageComponent)
  },
  {
    path: 'caveau',
    title: 'Il caveau — Childhood Friendship',
    loadComponent: () => import('./landing-page/caveau/caveau.page').then((m) => m.CaveauPage)
  },
  {
    path: 'login',
    title: 'Accedi — Childhood Friendship',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'invito/:token',
    title: 'Attiva account — Childhood Friendship',
    loadComponent: () => import('./features/auth/invite.page').then((m) => m.InvitePage)
  },
  {
    path: 'admin',
    canMatch: [roleGuard('admin', 'staff')],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  },
  {
    path: 'portale',
    canMatch: [roleGuard('client')],
    loadChildren: () => import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES)
  },
  { path: '**', redirectTo: '' }
];
