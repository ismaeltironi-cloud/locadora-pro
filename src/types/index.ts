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

export type TaxpayerType = 'contribuinte_icms' | 'contribuinte_isento' | 'nao_contribuinte';
export type PersonType = 'fisica' | 'juridica';
export type Gender = 'masculino' | 'feminino';
export type MaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

export const taxpayerTypeLabels: Record<TaxpayerType, string> = {
  contribuinte_icms: 'Contribuinte ICMS',
  contribuinte_isento: 'Contribuinte Isento',
  nao_contribuinte: 'Não Contribuinte',
};

export const genderLabels: Record<Gender, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
};

export const maritalStatusLabels: Record<MaritalStatus, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União Estável',
};

export interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  trade_name: string | null;
  taxpayer_type: TaxpayerType | null;
  municipal_registration: string | null;
  state_registration: string | null;
  person_type: PersonType;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: Gender | null;
  marital_status: MaritalStatus | null;
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
