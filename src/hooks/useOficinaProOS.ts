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

export function useOficinaProOS(plates: string[]) {
  return useQuery({
    queryKey: ['oficina-pro-os', plates],
    queryFn: async () => {
      if (!plates.length) return {};

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
          body: JSON.stringify({ plates }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch OS');
      }

      const { orders } = await response.json();

      // Index by plate for easy lookup
      const byPlate: Record<string, OficinaProOS[]> = {};
      for (const order of orders) {
        const plate = order.veiculo_placa?.toUpperCase();
        if (plate) {
          if (!byPlate[plate]) byPlate[plate] = [];
          byPlate[plate].push(order);
        }
      }
      return byPlate;
    },
    enabled: plates.length > 0,
    staleTime: 60_000,
  });
}
