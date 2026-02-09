import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OficinaProOS {
  id?: string;
  numero?: string;
  status?: string;
  cliente_nome?: string;
  veiculo_placa?: string;
  [key: string]: unknown;
}

interface UseOficinaProOSOptions {
  plates?: string[];
  status?: string;
}

export function useOficinaProOS(options: UseOficinaProOSOptions = {}) {
  const { plates, status } = options;
  const enabled = !!(status || (plates && plates.length > 0));

  return useQuery({
    queryKey: ['oficina-pro-os', { plates, status }],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const body: Record<string, unknown> = {};
      if (status) body.status = status;
      if (plates && plates.length > 0) body.plates = plates;

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

      const { orders } = await response.json();
      return orders as OficinaProOS[];
    },
    enabled,
    staleTime: 60_000,
  });
}
