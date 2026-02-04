import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, UserWithRole, AppRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles as Profile[]).map((profile) => ({
        ...profile,
        user_role: (roles as UserRole[]).find((r) => r.user_id === profile.id),
      }));

      return usersWithRoles;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      can_view,
      can_edit,
      can_checkin,
      can_checkout,
    }: {
      userId: string;
      role: AppRole;
      can_view: boolean;
      can_edit: boolean;
      can_checkin: boolean;
      can_checkout: boolean;
    }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('user_roles')
          .update({ role, can_view, can_edit, can_checkin, can_checkout })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role, can_view, can_edit, can_checkin, can_checkout })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Permissões atualizadas',
        description: 'As permissões do usuário foram atualizadas com sucesso.',
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

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      username,
      role,
      can_view,
      can_edit,
      can_checkin,
      can_checkout,
    }: {
      email: string;
      password: string;
      fullName: string;
      username: string;
      role: AppRole;
      can_view: boolean;
      can_edit: boolean;
      can_checkin: boolean;
      can_checkout: boolean;
    }) => {
      // Call edge function to create user (requires admin privileges)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          username,
          role,
          can_view,
          can_edit,
          can_checkin,
          can_checkout,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: error.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : error.message,
      });
    },
  });
}
