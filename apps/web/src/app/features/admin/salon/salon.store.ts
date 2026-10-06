import { Injectable, computed, signal } from '@angular/core';
import type {
  SalonBookingItem,
  SalonBookingStatus,
  SalonClientItem,
  SalonEmployeeItem,
  SalonServiceItem,
  HairProfile
} from './salon.types';

const STORAGE_KEY = 'cf_sissy_salon_data_v1';

const DEFAULT_SERVICES: SalonServiceItem[] = [
  { id: 'SV1', name: 'Taglio Donna', category: 'Taglio', durationMinutes: 45, price: 28, description: 'Consulenza, shampoo specifico e taglio personalizzato.' },
  { id: 'SV2', name: 'Taglio Uomo', category: 'Taglio', durationMinutes: 30, price: 20, description: 'Taglio con forbice o macchinetta, rifinitura e shampoo.' },
  { id: 'SV3', name: 'Colore Completo', category: 'Colore', durationMinutes: 90, price: 60, description: 'Colore completo con prodotti professionali e copertura totale.' },
  { id: 'SV4', name: 'Balayage Glamour', category: 'Colore', durationMinutes: 150, price: 110, description: 'Schiaritura a mano libera sfumata per effetto naturale e luminoso.' },
  { id: 'SV5', name: 'Piega Gloss', category: 'Piega', durationMinutes: 30, price: 18, description: 'Piega personalizzata con phon, spazzola e finish lucidante.' },
  { id: 'SV6', name: 'Trattamento Ristrutturante Botox', category: 'Trattamento', durationMinutes: 40, price: 25, description: 'Ricostruzione profonda alla cheratina e acido ialuronico.' },
  { id: 'SV7', name: 'Rifinitura Barba Tradizionale', category: 'Barba', durationMinutes: 20, price: 15, description: 'Rifinitura, panno caldo e sagomatura barba a rasoio.' }
];

const DEFAULT_EMPLOYEES: SalonEmployeeItem[] = [
  { id: 'EM1', name: 'Silvia (Sissy)', role: 'Titolare · Master Hair Stylist', bio: 'L\'anima del salone. Esperta di look totali e consulenze d\'immagine.', color: '#a855f7', workingDays: 'Mar–Sab', workingHours: '08:30–20:00', active: true, pin: '2026' },
  { id: 'EM2', name: 'Giada', role: 'Colorista Senior', bio: 'Maga delle sfumature, del Balayage e delle tonalizzazioni armocromatiche.', color: '#ec4899', workingDays: 'Mar–Sab', workingHours: '08:30–19:30', active: true, pin: '1234' },
  { id: 'EM3', name: 'Marco', role: 'Barber & Stylist Uomo', bio: 'Specializzato in sfumature razor fade e cura della barba all\'italiana.', color: '#3b82f6', workingDays: 'Mer–Sab', workingHours: '10:00–20:00', active: true, pin: '1234' }
];

const now = new Date();
const todayISO = (hour: number, minute: number, dayOffset = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const DEFAULT_CLIENTS: SalonClientItem[] = [
  {
    id: 'CL1',
    name: 'Giulia Bianchi',
    phone: '+39 333 111 2233',
    email: 'giulia.bianchi@email.it',
    fidelityPoints: 140,
    totalVisits: 8,
    lastVisit: todayISO(10, 0, -14),
    createdAt: todayISO(9, 0, -220),
    hairProfile: {
      formulaColore: 'Base 6.1 (30g) + 20vol (30g) · Tonalizzante 9.21 su lunghezze',
      tipoCapello: 'Fusto medio, leggermente ondulato',
      diagnosiCute: 'Cute normale, fusto trattato con tendenza a secchezza sulle punte',
      allergie: 'Nessuna allergia nota all\'ammoniaca',
      noteStile: 'Preferisce piega mossa morbida a onde con piastra larga'
    }
  },
  {
    id: 'CL2',
    name: 'Francesca Neri',
    phone: '+39 347 555 8899',
    email: 'francesca.neri@email.it',
    fidelityPoints: 210,
    totalVisits: 12,
    lastVisit: todayISO(14, 30, -30),
    createdAt: todayISO(10, 0, -180),
    hairProfile: {
      formulaColore: 'Balayage biondo sabbia con Decolorante Clay 20vol + Olaplex No.1',
      tipoCapello: 'Capello fine, decolorato',
      diagnosiCute: 'Sensibile, usare shampoo lenitivo alla camomilla',
      allergie: 'Sensibilità a profumazioni sintetiche forti',
      noteStile: 'Sfumatura fredda, non dorata; tonalizzante cenere'
    }
  },
  {
    id: 'CL3',
    name: 'Luca Ferrari',
    phone: '+39 320 444 1122',
    email: 'luca.ferrari@email.it',
    fidelityPoints: 45,
    totalVisits: 3,
    lastVisit: todayISO(11, 0, -21),
    createdAt: todayISO(11, 0, -60),
    hairProfile: {
      formulaColore: 'Naturale castano scuro (nessun colore)',
      tipoCapello: 'Spesso, liscio',
      diagnosiCute: 'Sana',
      allergie: 'Nessuna',
      noteStile: 'Sfumatura laterale 1.5mm a salire, forbice sopra e riga naturale a sinistra'
    }
  },
  {
    id: 'CL4',
    name: 'Elena Rossi',
    phone: '+39 338 998 7766',
    email: 'elena.rossi@email.it',
    fidelityPoints: 85,
    totalVisits: 5,
    lastVisit: todayISO(16, 0, -45),
    createdAt: todayISO(14, 0, -120),
    hairProfile: {
      formulaColore: 'Colore rame intenso 7.44 con attivatore 20vol',
      tipoCapello: 'Riccio naturale, porosità media',
      diagnosiCute: 'Secca, applicare siero idratante pre-piega',
      allergie: 'Nessuna',
      noteStile: 'Diffusore con crema ricci definizione'
    }
  }
];

const DEFAULT_BOOKINGS: SalonBookingItem[] = [
  {
    id: 'BK1',
    clientId: 'CL1',
    clientName: 'Giulia Bianchi',
    clientPhone: '+39 333 111 2233',
    serviceId: 'SV1',
    serviceName: 'Taglio Donna',
    employeeId: 'EM1',
    employeeName: 'Silvia (Sissy)',
    dateTime: todayISO(9, 30, 0),
    durationMinutes: 45,
    price: 28,
    status: 'in_corso',
    notes: 'Scalatura leggera davanti e piega mossa'
  },
  {
    id: 'BK2',
    clientId: 'CL2',
    clientName: 'Francesca Neri',
    clientPhone: '+39 347 555 8899',
    serviceId: 'SV4',
    serviceName: 'Balayage Glamour',
    employeeId: 'EM2',
    employeeName: 'Giada',
    dateTime: todayISO(11, 0, 0),
    durationMinutes: 150,
    price: 110,
    status: 'confermato',
    notes: 'Ritocco sfumatura biondo sabbia + tonalizzante'
  },
  {
    id: 'BK3',
    clientId: 'CL3',
    clientName: 'Luca Ferrari',
    clientPhone: '+39 320 444 1122',
    serviceId: 'SV2',
    serviceName: 'Taglio Uomo',
    employeeId: 'EM3',
    employeeName: 'Marco',
    dateTime: todayISO(15, 0, 0),
    durationMinutes: 30,
    price: 20,
    status: 'confermato',
    notes: 'Taglio e rifinitura contorni'
  },
  {
    id: 'BK4',
    clientId: 'CL4',
    clientName: 'Elena Rossi',
    clientPhone: '+39 338 998 7766',
    serviceId: 'SV3',
    serviceName: 'Colore Completo',
    employeeId: 'EM1',
    employeeName: 'Silvia (Sissy)',
    dateTime: todayISO(16, 30, 0),
    durationMinutes: 90,
    price: 60,
    status: 'confermato',
    notes: 'Rifacimento radici rame'
  },
  {
    id: 'BK5',
    clientId: 'CL1',
    clientName: 'Giulia Bianchi',
    clientPhone: '+39 333 111 2233',
    serviceId: 'SV6',
    serviceName: 'Trattamento Ristrutturante Botox',
    employeeId: 'EM2',
    employeeName: 'Giada',
    dateTime: todayISO(10, 30, 1),
    durationMinutes: 40,
    price: 25,
    status: 'confermato',
    notes: 'Maschera intensiva rigenerante'
  }
];

@Injectable({ providedIn: 'root' })
export class SalonStore {
  readonly services = signal<SalonServiceItem[]>([]);
  readonly employees = signal<SalonEmployeeItem[]>([]);
  readonly clients = signal<SalonClientItem[]>([]);
  readonly bookings = signal<SalonBookingItem[]>([]);

  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly selectedEmployeeFilter = signal<string>('all');

  constructor() {
    this.loadFromStorage();
  }

  // -----------------------------------------------------------------------
  // Computeds
  // -----------------------------------------------------------------------
  readonly bookingsForSelectedDate = computed(() => {
    const dateStr = this.selectedDate();
    const filter = this.selectedEmployeeFilter();
    return this.bookings()
      .filter((b) => b.dateTime.startsWith(dateStr))
      .filter((b) => filter === 'all' || b.employeeId === filter)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  });

  readonly todayBookings = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.bookings()
      .filter((b) => b.dateTime.startsWith(todayStr))
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  });

  readonly stats = computed(() => {
    const today = this.todayBookings();
    const totalToday = today.length;
    const completedToday = today.filter((b) => b.status === 'completato').length;
    const revenueToday = today
      .filter((b) => b.status !== 'annullato')
      .reduce((sum, b) => sum + b.price, 0);
    const activeClientsCount = this.clients().length;

    return {
      totalToday,
      completedToday,
      revenueToday,
      activeClientsCount
    };
  });

  // -----------------------------------------------------------------------
  // Storage & Persistence
  // -----------------------------------------------------------------------
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.services.set(parsed.services || DEFAULT_SERVICES);
        this.employees.set(parsed.employees || DEFAULT_EMPLOYEES);
        this.clients.set(parsed.clients || DEFAULT_CLIENTS);
        this.bookings.set(parsed.bookings || DEFAULT_BOOKINGS);
        return;
      }
    } catch {
      // Fallback
    }

    this.services.set(DEFAULT_SERVICES);
    this.employees.set(DEFAULT_EMPLOYEES);
    this.clients.set(DEFAULT_CLIENTS);
    this.bookings.set(DEFAULT_BOOKINGS);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          services: this.services(),
          employees: this.employees(),
          clients: this.clients(),
          bookings: this.bookings()
        })
      );
    } catch {
      // ignore
    }
  }

  // -----------------------------------------------------------------------
  // Actions: Prenotazioni
  // -----------------------------------------------------------------------
  addBooking(booking: Omit<SalonBookingItem, 'id'>): SalonBookingItem {
    const id = `BK${Date.now().toString().slice(-5)}`;
    const newBooking: SalonBookingItem = { ...booking, id };
    this.bookings.update((list) => [newBooking, ...list]);
    this.saveToStorage();
    return newBooking;
  }

  updateBookingStatus(id: string, status: SalonBookingStatus): void {
    this.bookings.update((list) =>
      list.map((b) => (b.id === id ? { ...b, status } : b))
    );
    this.saveToStorage();
  }

  deleteBooking(id: string): void {
    this.bookings.update((list) => list.filter((b) => b.id !== id));
    this.saveToStorage();
  }

  // -----------------------------------------------------------------------
  // Actions: Clienti Salone
  // -----------------------------------------------------------------------
  addClient(data: Omit<SalonClientItem, 'id' | 'createdAt' | 'fidelityPoints' | 'totalVisits' | 'lastVisit'>): SalonClientItem {
    const id = `CL${Date.now().toString().slice(-4)}`;
    const newClient: SalonClientItem = {
      ...data,
      id,
      fidelityPoints: 10,
      totalVisits: 0,
      lastVisit: null,
      createdAt: new Date().toISOString()
    };
    this.clients.update((list) => [newClient, ...list]);
    this.saveToStorage();
    return newClient;
  }

  updateClient(id: string, partial: Partial<SalonClientItem>): void {
    this.clients.update((list) =>
      list.map((c) => (c.id === id ? { ...c, ...partial } : c))
    );
    this.saveToStorage();
  }

  updateHairProfile(clientId: string, profile: HairProfile): void {
    this.clients.update((list) =>
      list.map((c) =>
        c.id === clientId ? { ...c, hairProfile: { ...c.hairProfile, ...profile } } : c
      )
    );
    this.saveToStorage();
  }

  // -----------------------------------------------------------------------
  // Actions: Servizi
  // -----------------------------------------------------------------------
  addService(service: Omit<SalonServiceItem, 'id'>): SalonServiceItem {
    const id = `SV${Date.now().toString().slice(-4)}`;
    const newService: SalonServiceItem = { ...service, id };
    this.services.update((list) => [...list, newService]);
    this.saveToStorage();
    return newService;
  }

  updateService(id: string, partial: Partial<SalonServiceItem>): void {
    this.services.update((list) =>
      list.map((s) => (s.id === id ? { ...s, ...partial } : s))
    );
    this.saveToStorage();
  }

  deleteService(id: string): void {
    this.services.update((list) => list.filter((s) => s.id !== id));
    this.saveToStorage();
  }

  // Reset demo
  resetToDefaults(): void {
    this.services.set(DEFAULT_SERVICES);
    this.employees.set(DEFAULT_EMPLOYEES);
    this.clients.set(DEFAULT_CLIENTS);
    this.bookings.set(DEFAULT_BOOKINGS);
    this.saveToStorage();
  }
}
