import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, VehiclePhoto, VehicleStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function useVehicles(clientId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['vehicles', clientId],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (Vehicle & { client: any })[];
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, client:clients(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Vehicle & { client: any };
    },
    enabled: !!id,
  });
}

export function useVehicleByPlate(plate: string) {
  return useQuery({
    queryKey: ['vehicle-plate', plate],
    queryFn: async () => {
      if (!plate || plate.length < 7) return null;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('plate', plate.toUpperCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Vehicle | null;
    },
    enabled: !!plate && plate.length >= 7,
  });
}

export function useVehiclePhotos(vehicleId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('photos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_photos',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId, queryClient]);

  return useQuery({
    queryKey: ['vehicle-photos', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_photos')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      return data as VehiclePhoto[];
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'checkin_at' | 'checkout_at'>) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          ...vehicle,
          plate: vehicle.plate.toUpperCase(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Veículo cadastrado',
        description: 'O veículo foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: error.message,
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...vehicle }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          ...vehicle,
          plate: vehicle.plate?.toUpperCase(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', data.id] });
      toast({
        title: 'Veículo atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    },
  });
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VehicleStatus }) => {
      const updateData: Partial<Vehicle> = { status };
      
      if (status === 'check_in') {
        updateData.checkin_at = new Date().toISOString();
      } else if (status === 'check_out') {
        updateData.checkout_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', data.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error.message,
      });
    },
  });
}

export function useAddVehiclePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      photoUrl,
      photoType,
      takenBy,
    }: {
      vehicleId: string;
      photoUrl: string;
      photoType: 'checkin' | 'checkout';
      takenBy: string;
    }) => {
      const { data, error } = await supabase
        .from('vehicle_photos')
        .insert({
          vehicle_id: vehicleId,
          photo_url: photoUrl,
          photo_type: photoType,
          taken_by: takenBy,
          taken_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', data.vehicle_id] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar foto',
        description: error.message,
      });
    },
  });
}
