export type AppRole = 'admin' | 'manager' | 'viewer';
export type VehicleStatus = 'aguardando_entrada' | 'check_in' | 'check_out' | 'cancelado';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  can_view: boolean;
  can_edit: boolean;
  can_checkin: boolean;
  can_checkout: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  cnpj: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  client_id: string;
  plate: string;
  model: string;
  status: VehicleStatus;
  defect_description: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  created_by: string | null;
  needs_tow: boolean;
  km: number | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  photo_url: string;
  photo_type: 'checkin' | 'checkout';
  taken_at: string;
  taken_by: string | null;
  created_at: string;
}

export interface UserWithRole extends Profile {
  user_role?: UserRole;
}

export const statusLabels: Record<VehicleStatus, string> = {
  aguardando_entrada: 'Aguardando Entrada',
  check_in: 'Veículo em Atendimento',
  check_out: 'Atendimento Finalizado',
  cancelado: 'Cancelado',
};

export const statusColors: Record<VehicleStatus, string> = {
  aguardando_entrada: 'warning',
  check_in: 'primary',
  check_out: 'success',
  cancelado: 'destructive',
};
