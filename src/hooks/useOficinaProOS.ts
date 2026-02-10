import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OficinaProVehicle {
  id?: string;
  placa?: string;
  modelo?: string;
  marca?: string;
  ano?: number;
  cor?: string;
  chassi?: string;
  [key: string]: unknown;
}

export interface OficinaProClient {
  id?: string;
  nome?: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
  [key: string]: unknown;
}

export interface OficinaProOS {
  id?: string;
  numero?: string;
  status?: string;
  cliente_nome?: string;
  veiculo_placa?: string;
  descricao_defeito?: string;
  tipo_servico?: string;
  km?: string;
  combustivel?: string;
  data_entrada?: string;
  data_conclusao?: string;
  checkin_at?: string;
  checkout_at?: string;
  checkin_photo_url?: string;
  checkout_photo_url?: string;
  observacoes?: string;
  vehicle_id?: string;
  client_id?: string;
  vehicle?: OficinaProVehicle;
  client?: OficinaProClient;
  [key: string]: unknown;
}

interface UseOficinaProOSOptions {
  plates?: string[];
  status?: string;
  osId?: string;
}

async function callOficinaProAPI(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-oficina-pro-os`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch OS');
  }

  return response.json();
}

export function useOficinaProOS(options: UseOficinaProOSOptions = {}) {
  const { plates, status } = options;
  const enabled = !!(status || (plates && plates.length > 0));

  return useQuery({
    queryKey: ['oficina-pro-os', { plates, status }],
    queryFn: async () => {
      const body: Record<string, unknown> = {};
      if (status) body.status = status;
      if (plates && plates.length > 0) body.plates = plates;

      const data = await callOficinaProAPI(body);
      return data.orders as OficinaProOS[];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useOficinaProOSDetail(osId: string | undefined) {
  return useQuery({
    queryKey: ['oficina-pro-os-detail', osId],
    queryFn: async () => {
      const data = await callOficinaProAPI({ os_id: osId });
      return data.order as OficinaProOS;
    },
    enabled: !!osId,
    staleTime: 30_000,
  });
}

export async function updateOficinaProOSStatus(osId: string, newStatus: string) {
  const data = await callOficinaProAPI({
    os_id: osId,
    action: 'update_status',
    new_status: newStatus,
  });
  return data.order as OficinaProOS;
}

export async function uploadOficinaProPhoto(
  osId: string,
  photoBase64: string,
  type: 'checkin' | 'checkout',
  contentType = 'image/jpeg'
) {
  const data = await callOficinaProAPI({
    os_id: osId,
    action: type === 'checkin' ? 'checkin_photo' : 'checkout_photo',
    photo_base64: photoBase64,
    content_type: contentType,
  });
  return data as { order: OficinaProOS; photo_url: string };
}
