import { Routes } from '@angular/router';
import { PortalShellComponent } from './portal-shell.component';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    component: PortalShellComponent,
    children: [
      { path: '', title: 'I tuoi progetti — Childhood Friendship', loadComponent: () => import('./portal-projects.page').then((m) => m.PortalProjectsPage) },
      { path: 'progetti/:projectId', title: 'Progetto — Childhood Friendship', loadComponent: () => import('./portal-project.page').then((m) => m.PortalProjectPage) },
      { path: 'progetti/:projectId/documenti/:docId', title: 'Documento — Childhood Friendship', loadComponent: () => import('./portal-document.page').then((m) => m.PortalDocumentPage) },
      { path: 'account', title: 'Account — Childhood Friendship', loadComponent: () => import('../account/account.page').then((m) => m.AccountPage) }
    ]
  }
];
