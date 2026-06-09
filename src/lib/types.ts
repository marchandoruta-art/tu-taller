export type UserRole = 'mecanico' | 'chapista' | 'oficina' | 'admin';

// Owner can be null for non-admin users due to RLS
export type VehicleWithOwner = Vehicle & { owner: Owner | null };

export type VehicleStatus = 'recibido' | 'presupuestar' | 'presupuestado' | 'en_reparacion' | 'pendiente_piezas' | 'terminado' | 'facturado' | 'entregado';

export type VehiclePriority = 'baja' | 'normal' | 'alta' | 'urgente';

export const PRIORITY_LABELS: Record<VehiclePriority, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const PRIORITY_ORDER: Record<VehiclePriority, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baja: 3,
};

export interface Owner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dni?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  client_description?: string;
  work_summary?: string;
  status: VehicleStatus;
  priority?: VehiclePriority;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  owner?: Owner;
  time_logs?: TimeLog[];
  parts?: Part[];
  // Reception fields
  fuel_level?: number;
  mileage?: number;
  exterior_damages?: unknown;
  interior_check?: unknown;
  client_belongings?: string;
  reception_notes?: string;
  client_signature?: string;
  reception_date?: string;
  deposit_receipt_generated?: boolean;
  // Archive fields
  delivered_at?: string;
  archived?: boolean;
}

export interface TimeLog {
  id: string;
  vehicle_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  total_minutes: number;
  notes?: string;
}

export interface Part {
  id: string;
  vehicle_id: string;
  name: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
  reference?: string;
  added_by?: string;
  created_at: string;
}

export interface VehicleAnomaly {
  id: string;
  vehicle_id: string;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface VehicleFile {
  id: string;
  vehicle_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface VehicleMessage {
  id: string;
  vehicle_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  vehicle_id?: string;
  user_id?: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  recibido: 'Recibido',
  presupuestar: 'Presupuestar',
  presupuestado: 'Presupuestado',
  en_reparacion: 'En Reparación',
  pendiente_piezas: 'Pendiente Piezas',
  terminado: 'Terminado',
  facturado: 'Facturado',
  entregado: 'Entregado',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  mecanico: 'Mecánico',
  chapista: 'Chapista',
  oficina: 'Oficina',
  admin: 'Administrador',
};
