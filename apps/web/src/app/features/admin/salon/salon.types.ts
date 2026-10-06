export type SalonBookingStatus = 'confermato' | 'in_corso' | 'completato' | 'annullato';

export interface HairProfile {
  formulaColore?: string;
  tipoCapello?: string;
  diagnosiCute?: string;
  allergie?: string;
  noteStile?: string;
}

export interface SalonClientItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  fidelityPoints: number;
  totalVisits: number;
  lastVisit: string | null;
  createdAt: string;
  hairProfile: HairProfile;
}

export interface SalonServiceItem {
  id: string;
  name: string;
  category: 'Taglio' | 'Colore' | 'Piega' | 'Trattamento' | 'Barba';
  durationMinutes: number;
  price: number;
  description: string;
}

export interface SalonEmployeeItem {
  id: string;
  name: string;
  role: string;
  bio: string;
  color: string;
  workingDays: string;
  workingHours: string;
  active: boolean;
  pin: string;
}

export interface SalonBookingItem {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  employeeId: string;
  employeeName: string;
  dateTime: string; // ISO string
  durationMinutes: number;
  price: number;
  status: SalonBookingStatus;
  notes?: string;
}
