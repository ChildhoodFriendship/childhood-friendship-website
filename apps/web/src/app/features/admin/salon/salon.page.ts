import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../shared/badge.component';
import { ModalComponent } from '../../../shared/modal.component';
import { ToastService } from '../../../core/toast.service';
import { SalonStore } from './salon.store';
import type { HairProfile, SalonBookingItem, SalonBookingStatus, SalonClientItem, SalonServiceItem } from './salon.types';

type SalonTab = 'panoramica' | 'agenda' | 'clienti' | 'servizi' | 'staff' | 'app_sissy';

@Component({
  selector: 'cf-salon-page',
  imports: [DatePipe, FormsModule, RouterLink, BadgeComponent, ModalComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Modulo Salone · Sissy HairStyle</span>
          <h1>Gestione Salone & Clienti</h1>
          <p>Controllo completo appuntamenti, schede tecniche colore, listino e sincronizzazione app mobile.</p>
        </div>
        <div class="row">
          <button type="button" class="btn btn-ghost" (click)="openClientModal()">+ Nuovo Cliente</button>
          <button type="button" class="btn btn-primary" (click)="openBookingModal()">+ Nuovo Appuntamento</button>
        </div>
      </header>

      <!-- Navigazione Tab -->
      <nav class="tabs" aria-label="Sezioni salone">
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'panoramica'" (click)="currentTab.set('panoramica')">
          ◧ Panoramica
        </button>
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'agenda'" (click)="currentTab.set('agenda')">
          📅 Agenda & Appuntamenti ({{ store.bookings().length }})
        </button>
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'clienti'" (click)="currentTab.set('clienti')">
          👥 Clienti & Schede Tecniche ({{ store.clients().length }})
        </button>
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'servizi'" (click)="currentTab.set('servizi')">
          ✂ Listino Servizi ({{ store.services().length }})
        </button>
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'staff'" (click)="currentTab.set('staff')">
          💈 Staff ({{ store.employees().length }})
        </button>
        <button type="button" class="tab-btn" [class.active]="currentTab() === 'app_sissy'" (click)="currentTab.set('app_sissy')">
          📱 App Mobile Sissy
        </button>
      </nav>

      <!-- TAB 1: PANORAMICA -->
      @if (currentTab() === 'panoramica') {
        <section class="grid" aria-label="Indicatori salone">
          <div class="card stat">
            <span class="muted">Appuntamenti Oggi</span>
            <strong>{{ store.stats().totalToday }}</strong>
          </div>
          <div class="card stat">
            <span class="muted">Incasso Stimato Oggi</span>
            <strong class="color-violet">€ {{ store.stats().revenueToday }}</strong>
          </div>
          <div class="card stat">
            <span class="muted">Clienti Registrati</span>
            <strong>{{ store.stats().activeClientsCount }}</strong>
          </div>
          <div class="card stat">
            <span class="muted">Completati Oggi</span>
            <strong class="color-green">{{ store.stats().completedToday }} / {{ store.stats().totalToday }}</strong>
          </div>
        </section>

        <div class="grid-2">
          <!-- Feed Appuntamenti Oggi -->
          <section class="card">
            <div class="row-between">
              <h2>Agenda di Oggi</h2>
              <button class="btn btn-ghost btn-sm" (click)="currentTab.set('agenda')">Vedi tutta l'agenda →</button>
            </div>
            @for (b of store.todayBookings(); track b.id) {
              <div class="booking-row">
                <div class="time-box mono">
                  <strong>{{ b.dateTime | date: 'HH:mm' }}</strong>
                  <small class="muted">{{ b.durationMinutes }}m</small>
                </div>
                <div class="grow truncate">
                  <div class="row-sm">
                    <strong>{{ b.clientName }}</strong>
                    <span class="muted">con {{ b.employeeName }}</span>
                  </div>
                  <div class="small muted">{{ b.serviceName }} · € {{ b.price }}</div>
                  @if (b.notes) { <div class="small text-italic text-note">"{{ b.notes }}"</div> }
                </div>
                <div class="actions-col">
                  <cf-badge [label]="statusLabel(b.status)" [tone]="statusTone(b.status)" />
                  <div class="quick-status-row">
                    @if (b.status === 'confermato') {
                      <button class="btn btn-ghost btn-xs" (click)="updateStatus(b.id, 'in_corso')">In corso</button>
                      <button class="btn btn-ghost btn-xs" (click)="updateStatus(b.id, 'completato')">Fatto</button>
                    } @else if (b.status === 'in_corso') {
                      <button class="btn btn-primary btn-xs" (click)="updateStatus(b.id, 'completato')">Completa</button>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <p class="muted">Nessun appuntamento in programma per oggi.</p>
                <button class="btn btn-primary btn-sm" (click)="openBookingModal()">+ Inserisci appuntamento</button>
              </div>
            }
          </section>

          <!-- Box Connessione App Mobile Sissy -->
          <div class="stack">
            <section class="card app-bridge-card">
              <div class="row-between">
                <h2>Stato App Sissy HairStyle</h2>
                <span class="badge badge-green">● Sincronizzata</span>
              </div>
              <p class="small muted">
                L'applicazione Flutter mobile di Sissy HairStyle è collegata a questo ambiente.
                Le prenotazioni effettuate da clienti tramite l'app o il bot NLP affluiscono direttamente in questo pannello.
              </p>
              <div class="app-info-grid">
                <div class="info-item">
                  <span class="muted small">Versione App</span>
                  <strong>v1.0.0 (Release 2026)</strong>
                </div>
                <div class="info-item">
                  <span class="muted small">Autenticazione Titolare</span>
                  <strong class="color-green">PIN & Password Attivi</strong>
                </div>
                <div class="info-item">
                  <span class="muted small">Clienti con Scheda</span>
                  <strong>{{ store.clients().length }} Schede Tecniche</strong>
                </div>
                <div class="info-item">
                  <span class="muted small">Review Booster NFC</span>
                  <strong class="color-violet">Pronto per attivazione</strong>
                </div>
              </div>
              <div class="row" style="margin-top: 12px">
                <button class="btn btn-secondary btn-sm" (click)="currentTab.set('app_sissy')">Dettagli App & QR Code</button>
                <a class="btn btn-ghost btn-sm" routerLink="/admin/progetti">Apri Scheda Progetto Studio ↗</a>
              </div>
            </section>

            <!-- Card Ultimi Clienti -->
            <section class="card">
              <div class="row-between">
                <h2>Ultimi Clienti con Scheda</h2>
                <button class="btn btn-ghost btn-sm" (click)="currentTab.set('clienti')">Tutti i clienti →</button>
              </div>
              @for (c of store.clients().slice(0, 3); track c.id) {
                <div class="line pointer" (click)="viewClientDetail(c)">
                  <span class="avatar-mini" aria-hidden="true">{{ getInitials(c.name) }}</span>
                  <div class="grow truncate">
                    <strong>{{ c.name }}</strong>
                    <div class="small muted">{{ c.phone }} · {{ c.hairProfile.tipoCapello || 'Profilo base' }}</div>
                  </div>
                  <cf-badge [label]="c.fidelityPoints + ' pt'" tone="violet" />
                </div>
              }
            </section>
          </div>
        </div>
      }

      <!-- TAB 2: AGENDA & APPUNTAMENTI -->
      @if (currentTab() === 'agenda') {
        <section class="card">
          <div class="agenda-controls">
            <div class="row">
              <label class="field inline-field">
                <span class="small muted">Data:</span>
                <input type="date" class="input input-sm" [ngModel]="store.selectedDate()" (ngModelChange)="store.selectedDate.set($event)" />
              </label>
              <button class="btn btn-ghost btn-sm" (click)="setToday()">Oggi</button>
              <button class="btn btn-ghost btn-sm" (click)="setTomorrow()">Domani</button>
            </div>
            <div class="row">
              <label class="field inline-field">
                <span class="small muted">Stylist:</span>
                <select class="input input-sm" [ngModel]="store.selectedEmployeeFilter()" (ngModelChange)="store.selectedEmployeeFilter.set($event)">
                  <option value="all">Tutti gli stylist</option>
                  @for (emp of store.employees(); track emp.id) {
                    <option [value]="emp.id">{{ emp.name }}</option>
                  }
                </select>
              </label>
              <button class="btn btn-primary btn-sm" (click)="openBookingModal()">+ Nuovo Appuntamento</button>
            </div>
          </div>

          <div class="table-wrap" style="margin-top: 16px">
            <table class="table">
              <thead>
                <tr>
                  <th>Orario</th>
                  <th>Cliente</th>
                  <th>Servizio</th>
                  <th>Stylist</th>
                  <th>Prezzo</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                @for (b of store.bookingsForSelectedDate(); track b.id) {
                  <tr>
                    <td class="mono">
                      <strong>{{ b.dateTime | date: 'HH:mm' }}</strong>
                      <br /><span class="muted small">{{ b.durationMinutes }} min</span>
                    </td>
                    <td>
                      <strong>{{ b.clientName }}</strong>
                      <br /><span class="muted small">{{ b.clientPhone }}</span>
                    </td>
                    <td>
                      {{ b.serviceName }}
                      @if (b.notes) { <br /><span class="muted small text-italic">"{{ b.notes }}"</span> }
                    </td>
                    <td>
                      <span class="staff-tag">{{ b.employeeName }}</span>
                    </td>
                    <td class="mono">€ {{ b.price }}</td>
                    <td>
                      <cf-badge [label]="statusLabel(b.status)" [tone]="statusTone(b.status)" />
                    </td>
                    <td class="actions">
                      @if (b.status !== 'completato') {
                        <button class="btn btn-ghost btn-sm" (click)="updateStatus(b.id, 'completato')" title="Segna come completato">✓</button>
                      }
                      @if (b.status !== 'annullato') {
                        <button class="btn btn-ghost btn-sm" (click)="updateStatus(b.id, 'annullato')" title="Annulla">✕</button>
                      }
                      <button class="btn btn-ghost btn-sm danger" (click)="removeBooking(b.id)" title="Elimina">🗑</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7">
                      <div class="empty">
                        <strong>Nessun appuntamento per questa data</strong>
                        Seleziona un'altra data o aggiungi una nuova prenotazione.
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- TAB 3: CLIENTI & SCHEDE TECNICHE -->
      @if (currentTab() === 'clienti') {
        <section class="card">
          <div class="row-between">
            <input
              class="input"
              style="max-width: 380px"
              placeholder="Cerca cliente per nome, telefono o tipo capello…"
              [(ngModel)]="searchClientQuery"
            />
            <button class="btn btn-primary" (click)="openClientModal()">+ Nuovo Cliente Salone</button>
          </div>

          <div class="clients-grid" style="margin-top: 18px">
            @for (c of filteredClients(); track c.id) {
              <div class="card client-card">
                <div class="client-card-header">
                  <div class="avatar-circle">{{ getInitials(c.name) }}</div>
                  <div class="grow">
                    <h3>{{ c.name }}</h3>
                    <div class="small muted">{{ c.phone }} · {{ c.email }}</div>
                  </div>
                  <cf-badge [label]="c.fidelityPoints + ' Punti'" tone="violet" />
                </div>

                <div class="hair-profile-box">
                  <div class="profile-badge">SCHEDA TECNICA CAPELLI</div>
                  <div class="profile-field">
                    <span class="muted small">Formula Colore:</span>
                    <strong class="formula-text">{{ c.hairProfile.formulaColore || 'Nessuna formula registrata' }}</strong>
                  </div>
                  <div class="profile-field">
                    <span class="muted small">Tipo Capello:</span>
                    <span>{{ c.hairProfile.tipoCapello || 'Non specificato' }}</span>
                  </div>
                  @if (c.hairProfile.allergie) {
                    <div class="profile-field alert-text">
                      <span class="small">⚠ Note/Allergie:</span>
                      <span>{{ c.hairProfile.allergie }}</span>
                    </div>
                  }
                </div>

                <div class="client-card-footer">
                  <div class="small muted">
                    Visite totali: <strong class="color-text">{{ c.totalVisits }}</strong>
                    @if (c.lastVisit) { · Ultima: {{ c.lastVisit | date: 'd MMM y' }} }
                  </div>
                  <div class="row-sm">
                    <button class="btn btn-ghost btn-sm" (click)="viewClientDetail(c)">Modifica Scheda</button>
                    <button class="btn btn-primary btn-sm" (click)="bookForClient(c)">Prenota</button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty">Nessun cliente trovato per la ricerca.</div>
            }
          </div>
        </section>
      }

      <!-- TAB 4: LISTINO SERVIZI -->
      @if (currentTab() === 'servizi') {
        <section class="card">
          <div class="row-between">
            <h2>Listino Servizi e Trattamenti</h2>
            <button class="btn btn-primary" (click)="openServiceModal()">+ Nuovo Servizio</button>
          </div>
          <div class="table-wrap" style="margin-top: 16px">
            <table class="table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Servizio</th>
                  <th>Categoria</th>
                  <th>Durata</th>
                  <th>Prezzo Listino</th>
                  <th>Descrizione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                @for (s of store.services(); track s.id) {
                  <tr>
                    <td class="mono small">{{ s.id }}</td>
                    <td><strong>{{ s.name }}</strong></td>
                    <td><span class="category-pill">{{ s.category }}</span></td>
                    <td class="mono">{{ s.durationMinutes }} min</td>
                    <td class="mono"><strong>€ {{ s.price }}</strong></td>
                    <td class="small muted">{{ s.description }}</td>
                    <td class="actions">
                      <button class="btn btn-ghost btn-sm" (click)="editService(s)">Modifica</button>
                      <button class="btn btn-ghost btn-sm danger" (click)="deleteService(s.id)">Elimina</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- TAB 5: STAFF -->
      @if (currentTab() === 'staff') {
        <div class="grid-2">
          @for (emp of store.employees(); track emp.id) {
            <section class="card employee-card">
              <div class="row-between">
                <div class="row">
                  <div class="emp-avatar" [style.background-color]="emp.color">{{ getInitials(emp.name) }}</div>
                  <div>
                    <h3>{{ emp.name }}</h3>
                    <div class="small muted">{{ emp.role }}</div>
                  </div>
                </div>
                <span class="badge badge-green">In servizio</span>
              </div>
              <p class="small muted text-italic" style="margin-top: 10px">"{{ emp.bio }}"</p>
              <div class="emp-details-grid">
                <div>
                  <span class="small muted">Giorni di presenza:</span>
                  <br /><strong>{{ emp.workingDays }}</strong>
                </div>
                <div>
                  <span class="small muted">Fascia oraria:</span>
                  <br /><strong>{{ emp.workingHours }}</strong>
                </div>
                <div>
                  <span class="small muted">Codice PIN Team:</span>
                  <br /><code class="mono">{{ emp.pin }}</code>
                </div>
                <div>
                  <span class="small muted">Appuntamenti odierni:</span>
                  <br /><strong>{{ countEmployeeBookings(emp.id) }}</strong>
                </div>
              </div>
            </section>
          }
        </div>
      }

      <!-- TAB 6: HUB APP MOBILE SISSY -->
      @if (currentTab() === 'app_sissy') {
        <section class="card">
          <div class="row-between">
            <div>
              <h2>Integrazione Sissy HairStyle App</h2>
              <p class="muted">Gestione e supervisione del client mobile / web dedicato al cliente finale e allo staff del salone.</p>
            </div>
            <span class="badge badge-green">Stato: Pronto & Convalidato</span>
          </div>

          <div class="grid-2" style="margin-top: 20px">
            <div class="card app-card-inner">
              <h3>📱 Applicazione Mobile & PWA</h3>
              <p class="small muted">Sviluppata in Flutter con supporto iOS, Android e Web. Permette ai clienti di:</p>
              <ul class="feature-bullets small">
                <li>Prenotare servizi in autonomia 24/7 con selezione stylist (Sissy, Giada, Marco)</li>
                <li>Chat e assistente NLP per prenotazione intelligente</li>
                <li>Consultare lo storico dei tagli e vedere i punti fedeltà</li>
                <li>Ricevere notifiche push per promemoria appuntamenti</li>
              </ul>
              <div class="app-security-box">
                <strong>🔒 Sicurezza Team & Titolare</strong>
                <p class="small">L'accesso riservato al team è protetto da password titolare (<code>Sissy2026!</code>) e PIN staff dipendenti.</p>
              </div>
            </div>

            <div class="card app-card-inner">
              <h3>⚡ Sincronizzazione Studio Childhood Friendship</h3>
              <p class="small muted">
                Il gestionale web di Childhood Friendship fa da backend master per la gestione dei clienti, delle prenotazioni e delle schede tecniche del colore.
              </p>
              <div class="sync-actions-box">
                <button class="btn btn-secondary" (click)="resetDemoData()">Ripristina Dati Iniziali Demo</button>
                <a class="btn btn-primary" routerLink="/admin/progetti">Apri Progetto Studio Sissy</a>
              </div>
              <div class="note-box small muted" style="margin-top: 14px">
                Repository locale: <code>C:\\Users\\User\\Desktop\\sissy_hairstyle</code>
              </div>
            </div>
          </div>
        </section>
      }

    </div>

    <!-- MODALE NUOVO APPUNTAMENTO -->
    <cf-modal [(open)]="bookingModalOpen" title="Nuovo Appuntamento Salone">
      <form (ngSubmit)="saveBooking()" class="form-grid">
        <label class="field full">
          <span>Cliente *</span>
          <select class="input" [(ngModel)]="newBookingClientId" name="clientId" required>
            <option value="">Seleziona cliente...</option>
            @for (c of store.clients(); track c.id) {
              <option [value]="c.id">{{ c.name }} ({{ c.phone }})</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Servizio *</span>
          <select class="input" [(ngModel)]="newBookingServiceId" name="serviceId" (ngModelChange)="onServiceSelect($event)" required>
            <option value="">Seleziona servizio...</option>
            @for (s of store.services(); track s.id) {
              <option [value]="s.id">{{ s.name }} — €{{ s.price }} ({{ s.durationMinutes }}m)</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Stylist / Operatore *</span>
          <select class="input" [(ngModel)]="newBookingEmployeeId" name="employeeId" required>
            <option value="">Seleziona stylist...</option>
            @for (emp of store.employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.name }} ({{ emp.role }})</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Data *</span>
          <input type="date" class="input" [(ngModel)]="newBookingDate" name="bookingDate" required />
        </label>

        <label class="field">
          <span>Ora *</span>
          <input type="time" class="input" [(ngModel)]="newBookingTime" name="bookingTime" required />
        </label>

        <label class="field full">
          <span>Note Tecniche / Preferenze</span>
          <input class="input" [(ngModel)]="newBookingNotes" name="bookingNotes" placeholder="es. Vuole riflessante freddo, scalatura leggera..." />
        </label>

        <div modal-footer class="modal-foot">
          <button type="button" class="btn btn-ghost" (click)="bookingModalOpen.set(false)">Annulla</button>
          <button type="submit" class="btn btn-primary">Conferma Appuntamento</button>
        </div>
      </form>
    </cf-modal>

    <!-- MODALE SCHEDA CLIENTE & PROFILO CAPELLI -->
    <cf-modal [(open)]="clientModalOpen" [title]="editingClient() ? 'Scheda Tecnica: ' + editingClient()!.name : 'Nuovo Cliente Salone'" [wide]="true">
      @if (editingClient(); as cl) {
        <form (ngSubmit)="saveClient()" class="form-grid">
          <label class="field">
            <span>Nome e Cognome *</span>
            <input class="input" [(ngModel)]="cl.name" name="clName" required />
          </label>
          <label class="field">
            <span>Telefono Cellulare *</span>
            <input class="input" [(ngModel)]="cl.phone" name="clPhone" required />
          </label>
          <label class="field">
            <span>Email</span>
            <input type="email" class="input" [(ngModel)]="cl.email" name="clEmail" />
          </label>
          <label class="field">
            <span>Punti Fedeltà</span>
            <input type="number" class="input" [(ngModel)]="cl.fidelityPoints" name="clPoints" />
          </label>

          <fieldset class="full fs">
            <legend>Scheda Tecnica Capelli & Diagnosi</legend>
            <div class="form-grid">
              <label class="field full">
                <span>Formula Colore / Tonalizzazione</span>
                <textarea class="textarea" rows="2" [(ngModel)]="cl.hairProfile.formulaColore" name="formulaColore" placeholder="es. Base 6.1 (30g) + 20vol (30g) · Sfumatura 9.21"></textarea>
              </label>
              <label class="field">
                <span>Tipologia Capello</span>
                <input class="input" [(ngModel)]="cl.hairProfile.tipoCapello" name="tipoCapello" placeholder="es. Fusto fine trattato, riccio naturale..." />
              </label>
              <label class="field">
                <span>Diagnosi Cute</span>
                <input class="input" [(ngModel)]="cl.hairProfile.diagnosiCute" name="diagnosiCute" placeholder="es. Cute sensibile, secca, forfora..." />
              </label>
              <label class="field full">
                <span>Allergie / Intolleranze</span>
                <input class="input" [(ngModel)]="cl.hairProfile.allergie" name="allergie" placeholder="es. Nessuna / Reazione a profumazioni o ammoniaca" />
              </label>
              <label class="field full">
                <span>Note di Styling & Preferenze</span>
                <input class="input" [(ngModel)]="cl.hairProfile.noteStile" name="noteStile" placeholder="es. Preferisce piega a onde morbide, no lacca forte" />
              </label>
            </div>
          </fieldset>

          <div modal-footer class="modal-foot">
            <button type="button" class="btn btn-ghost" (click)="clientModalOpen.set(false)">Chiudi</button>
            <button type="submit" class="btn btn-primary">Salva Scheda Tecnica</button>
          </div>
        </form>
      }
    </cf-modal>

    <!-- MODALE SERVIZIO -->
    <cf-modal [(open)]="serviceModalOpen" title="Gestione Servizio Listino">
      <form (ngSubmit)="saveService()" class="form-grid">
        <label class="field full">
          <span>Nome Servizio *</span>
          <input class="input" [(ngModel)]="editingServiceName" name="sName" required />
        </label>
        <label class="field">
          <span>Categoria</span>
          <select class="input" [(ngModel)]="editingServiceCategory" name="sCategory">
            <option value="Taglio">Taglio</option>
            <option value="Colore">Colore</option>
            <option value="Piega">Piega</option>
            <option value="Trattamento">Trattamento</option>
            <option value="Barba">Barba</option>
          </select>
        </label>
        <label class="field">
          <span>Durata (minuti)</span>
          <input type="number" class="input" [(ngModel)]="editingServiceDuration" name="sDuration" required />
        </label>
        <label class="field">
          <span>Prezzo (€)</span>
          <input type="number" class="input" [(ngModel)]="editingServicePrice" name="sPrice" required />
        </label>
        <label class="field full">
          <span>Descrizione per il cliente</span>
          <textarea class="textarea" rows="2" [(ngModel)]="editingServiceDescription" name="sDesc"></textarea>
        </label>

        <div modal-footer class="modal-foot">
          <button type="button" class="btn btn-ghost" (click)="serviceModalOpen.set(false)">Annulla</button>
          <button type="submit" class="btn btn-primary">Salva Servizio</button>
        </div>
      </form>
    </cf-modal>
  `,
  styles: `
    .tab-btn {
      background: none;
      border: none;
      color: var(--cf-color-text-muted);
      font-weight: 600;
      padding: 10px 14px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      background: var(--cf-color-surface);
      color: var(--cf-color-text);
    }
    .tab-btn.active {
      background: var(--cf-violet-soft);
      color: var(--cf-color-text);
      font-weight: 700;
    }
    .color-violet { color: #c084fc; }
    .color-green { color: #4ade80; }
    .booking-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--cf-color-border);
    }
    .booking-row:last-child { border-bottom: none; }
    .time-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 54px;
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--cf-color-surface-raised);
    }
    .actions-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .quick-status-row {
      display: flex;
      gap: 4px;
    }
    .btn-xs {
      padding: 2px 6px;
      font-size: 11px;
      height: 22px;
      border-radius: 4px;
    }
    .text-note {
      color: #cbd5e1;
      font-size: 12px;
      margin-top: 2px;
    }
    .empty-state {
      padding: 24px 0;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .app-bridge-card {
      border: 1px solid rgba(168, 85, 247, 0.3);
      background: linear-gradient(180deg, rgba(168, 85, 247, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%);
    }
    .app-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 14px;
      padding: 12px;
      border-radius: 8px;
      background: var(--cf-color-surface);
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .avatar-mini {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--cf-color-surface-raised);
      font-size: 11px;
      font-weight: 700;
      flex: none;
    }
    .pointer { cursor: pointer; }
    .agenda-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .inline-field {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      margin: 0;
    }
    .input-sm {
      padding: 4px 8px;
      height: 32px;
      font-size: 13px;
    }
    .staff-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--cf-color-surface-raised);
      font-size: 12px;
      font-weight: 600;
    }
    .clients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .client-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }
    .client-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-circle {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--cf-color-violet);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      flex: none;
    }
    .hair-profile-box {
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--cf-color-surface);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .profile-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--cf-color-violet-light);
    }
    .profile-field {
      display: flex;
      flex-direction: column;
      gap: 1px;
      font-size: 13px;
    }
    .formula-text {
      color: #f1f5f9;
      font-size: 12px;
    }
    .alert-text {
      color: #f87171;
    }
    .client-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--cf-color-border);
    }
    .category-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--cf-color-surface-raised);
    }
    .employee-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .emp-avatar {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
    }
    .emp-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
      padding: 12px;
      border-radius: 8px;
      background: var(--cf-color-surface);
    }
    .app-card-inner {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .feature-bullets {
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .app-security-box {
      margin-top: 8px;
      padding: 10px;
      border-radius: 6px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .sync-actions-box {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .note-box {
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--cf-color-surface);
    }
    .danger { color: #f87171; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalonPage {
  protected readonly store = inject(SalonStore);
  private readonly toast = inject(ToastService);

  readonly currentTab = signal<SalonTab>('panoramica');
  readonly searchClientQuery = signal<string>('');

  // Modali
  readonly bookingModalOpen = signal(false);
  readonly clientModalOpen = signal(false);
  readonly serviceModalOpen = signal(false);

  // Form Appuntamento
  newBookingClientId = '';
  newBookingServiceId = '';
  newBookingEmployeeId = '';
  newBookingDate = new Date().toISOString().split('T')[0];
  newBookingTime = '10:00';
  newBookingNotes = '';

  // Form Cliente
  editingClient = signal<SalonClientItem | null>(null);

  // Form Servizio
  editingServiceId: string | null = null;
  editingServiceName = '';
  editingServiceCategory: 'Taglio' | 'Colore' | 'Piega' | 'Trattamento' | 'Barba' = 'Taglio';
  editingServiceDuration = 45;
  editingServicePrice = 28;
  editingServiceDescription = '';

  readonly filteredClients = computed(() => {
    const q = this.searchClientQuery().toLowerCase().trim();
    if (!q) return this.store.clients();
    return this.store.clients().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.hairProfile.formulaColore && c.hairProfile.formulaColore.toLowerCase().includes(q)) ||
        (c.hairProfile.tipoCapello && c.hairProfile.tipoCapello.toLowerCase().includes(q))
    );
  });

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  statusLabel(status: SalonBookingStatus): string {
    switch (status) {
      case 'confermato': return 'Confermato';
      case 'in_corso': return 'In corso';
      case 'completato': return 'Completato';
      case 'annullato': return 'Annullato';
    }
  }

  statusTone(status: SalonBookingStatus): 'green' | 'violet' | 'neutral' | 'red' {
    switch (status) {
      case 'confermato': return 'violet';
      case 'in_corso': return 'green';
      case 'completato': return 'neutral';
      case 'annullato': return 'red';
    }
  }

  setToday(): void {
    this.store.selectedDate.set(new Date().toISOString().split('T')[0]);
  }

  setTomorrow(): void {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    this.store.selectedDate.set(d.toISOString().split('T')[0]);
  }

  countEmployeeBookings(employeeId: string): number {
    return this.store.todayBookings().filter((b) => b.employeeId === employeeId).length;
  }

  updateStatus(id: string, status: SalonBookingStatus): void {
    this.store.updateBookingStatus(id, status);
    this.toast.success(`Stato aggiornato a ${this.statusLabel(status)}`);
  }

  removeBooking(id: string): void {
    if (confirm('Confermi la cancellazione dell\'appuntamento?')) {
      this.store.deleteBooking(id);
      this.toast.success('Appuntamento eliminato');
    }
  }

  // Booking Modal
  openBookingModal(): void {
    this.newBookingClientId = this.store.clients()[0]?.id || '';
    this.newBookingServiceId = this.store.services()[0]?.id || '';
    this.newBookingEmployeeId = this.store.employees()[0]?.id || '';
    this.newBookingDate = this.store.selectedDate();
    this.newBookingTime = '10:00';
    this.newBookingNotes = '';
    this.bookingModalOpen.set(true);
  }

  bookForClient(client: SalonClientItem): void {
    this.openBookingModal();
    this.newBookingClientId = client.id;
  }

  onServiceSelect(serviceId: string): void {
    // Aggiornamento reattivo opzionale
  }

  saveBooking(): void {
    const client = this.store.clients().find((c) => c.id === this.newBookingClientId);
    const service = this.store.services().find((s) => s.id === this.newBookingServiceId);
    const employee = this.store.employees().find((e) => e.id === this.newBookingEmployeeId);

    if (!client || !service || !employee) {
      this.toast.success('Compila tutti i campi obbligatori');
      return;
    }

    const dateTime = `${this.newBookingDate}T${this.newBookingTime}:00.000Z`;

    this.store.addBooking({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      serviceId: service.id,
      serviceName: service.name,
      employeeId: employee.id,
      employeeName: employee.name,
      dateTime,
      durationMinutes: service.durationMinutes,
      price: service.price,
      status: 'confermato',
      notes: this.newBookingNotes || undefined
    });

    this.bookingModalOpen.set(false);
    this.toast.success(`Appuntamento per ${client.name} fissato con successo!`);
  }

  // Client Modal
  openClientModal(): void {
    this.editingClient.set({
      id: '',
      name: '',
      phone: '',
      email: '',
      fidelityPoints: 10,
      totalVisits: 0,
      lastVisit: null,
      createdAt: new Date().toISOString(),
      hairProfile: {
        formulaColore: '',
        tipoCapello: '',
        diagnosiCute: '',
        allergie: '',
        noteStile: ''
      }
    });
    this.clientModalOpen.set(true);
  }

  viewClientDetail(client: SalonClientItem): void {
    // Clona per editing sicuro
    this.editingClient.set(JSON.parse(JSON.stringify(client)));
    this.clientModalOpen.set(true);
  }

  saveClient(): void {
    const cl = this.editingClient();
    if (!cl || !cl.name || !cl.phone) {
      this.toast.success('Nome e Telefono sono obbligatori');
      return;
    }

    if (cl.id) {
      this.store.updateClient(cl.id, cl);
      this.toast.success(`Scheda tecnica di ${cl.name} aggiornata`);
    } else {
      this.store.addClient({
        name: cl.name,
        phone: cl.phone,
        email: cl.email,
        hairProfile: cl.hairProfile
      });
      this.toast.success(`Nuovo cliente ${cl.name} registrato`);
    }

    this.clientModalOpen.set(false);
  }

  // Service Modal
  openServiceModal(): void {
    this.editingServiceId = null;
    this.editingServiceName = '';
    this.editingServiceCategory = 'Taglio';
    this.editingServiceDuration = 45;
    this.editingServicePrice = 28;
    this.editingServiceDescription = '';
    this.serviceModalOpen.set(true);
  }

  editService(service: SalonServiceItem): void {
    this.editingServiceId = service.id;
    this.editingServiceName = service.name;
    this.editingServiceCategory = service.category;
    this.editingServiceDuration = service.durationMinutes;
    this.editingServicePrice = service.price;
    this.editingServiceDescription = service.description;
    this.serviceModalOpen.set(true);
  }

  saveService(): void {
    if (!this.editingServiceName) {
      this.toast.success('Inserisci il nome del servizio');
      return;
    }

    if (this.editingServiceId) {
      this.store.updateService(this.editingServiceId, {
        name: this.editingServiceName,
        category: this.editingServiceCategory,
        durationMinutes: this.editingServiceDuration,
        price: this.editingServicePrice,
        description: this.editingServiceDescription
      });
      this.toast.success('Servizio aggiornato');
    } else {
      this.store.addService({
        name: this.editingServiceName,
        category: this.editingServiceCategory,
        durationMinutes: this.editingServiceDuration,
        price: this.editingServicePrice,
        description: this.editingServiceDescription
      });
      this.toast.success('Nuovo servizio aggiunto al listino');
    }

    this.serviceModalOpen.set(false);
  }

  deleteService(serviceId: string): void {
    if (confirm('Confermi l\'eliminazione del servizio dal listino?')) {
      this.store.deleteService(serviceId);
      this.toast.success('Servizio eliminato');
    }
  }

  resetDemoData(): void {
    if (confirm('Ripristinare tutti i dati predefiniti del salone Sissy?')) {
      this.store.resetToDefaults();
      this.toast.success('Dati del salone ripristinati');
    }
  }
}
