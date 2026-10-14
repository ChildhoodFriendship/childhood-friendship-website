import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards';
import { AdminShellComponent } from './admin-shell.component';

const t = (s: string) => `${s} — Admin CF`;

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', title: t('Dashboard'), loadComponent: () => import('./dashboard.page').then((m) => m.DashboardPage) },
      { path: 'progetti', title: t('Progetti'), loadComponent: () => import('./projects/projects-list.page').then((m) => m.ProjectsListPage) },
      {
        path: 'progetti/:projectId',
        loadComponent: () => import('./projects/project-detail.page').then((m) => m.ProjectDetailPage),
        children: [
          { path: '', title: t('Progetto'), loadComponent: () => import('./projects/overview.tab').then((m) => m.OverviewTab) },
          { path: 'checklist', title: t('Checklist'), loadComponent: () => import('./projects/checklist.tab').then((m) => m.ChecklistTab) },
          { path: 'documenti', title: t('Documenti'), loadComponent: () => import('./projects/documents.tab').then((m) => m.DocumentsTab) },
          { path: 'documenti/:docId', title: t('Documento'), loadComponent: () => import('./projects/document-editor.page').then((m) => m.DocumentEditorPage) },
          { path: 'marketing', title: t('Marketing'), loadComponent: () => import('./projects/marketing.tab').then((m) => m.MarketingTab) },
          { path: 'messaggi', title: t('Messaggi'), loadComponent: () => import('./projects/messages.tab').then((m) => m.MessagesTab) },
          { path: 'materiali', title: t('Materiali'), loadComponent: () => import('./projects/files.tab').then((m) => m.FilesTab) },
          { path: 'accessi', title: t('Accessi'), loadComponent: () => import('./projects/credentials.tab').then((m) => m.CredentialsTab) }
        ]
      },
      { path: 'clienti', title: t('Clienti'), loadComponent: () => import('./clients/clients.page').then((m) => m.ClientsPage) },
      { path: 'lead', title: t('Lead'), loadComponent: () => import('./leads/leads.page').then((m) => m.LeadsPage) },
      { path: 'utenti', title: t('Utenti'), canMatch: [roleGuard('admin')], loadComponent: () => import('./users/users.page').then((m) => m.UsersPage) },
      { path: 'log', title: t('Registro attività'), canMatch: [roleGuard('admin')], loadComponent: () => import('./audit/audit.page').then((m) => m.AuditPage) },
      { path: 'account', title: t('Account'), loadComponent: () => import('../account/account.page').then((m) => m.AccountPage) }
    ]
  }
];
