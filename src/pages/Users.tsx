import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUsers, useUpdateUserRole, useCreateUser } from '@/hooks/useUsers';
import { AppRole, UserWithRole } from '@/types';
import { 
  Plus, 
  Search, 
  UserCog, 
  Shield,
  Eye,
  Edit,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  viewer: 'Visualizador',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-accent/10 text-accent border-accent/20',
  viewer: 'bg-muted text-muted-foreground border-muted',
};

export default function Users() {
  const { data: users, isLoading } = useUsers();
  const updateUserRole = useUpdateUserRole();
  const createUser = useCreateUser();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    role: 'viewer' as AppRole,
    can_view: true,
    can_edit: false,
    can_checkin: false,
    can_checkout: false,
  });

  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'viewer' as AppRole,
    can_view: true,
    can_edit: false,
    can_checkin: false,
    can_checkout: false,
  });

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleEditClick = (user: UserWithRole) => {
    setEditUser(user);
    setEditForm({
      role: user.user_role?.role || 'viewer',
      can_view: user.user_role?.can_view ?? true,
      can_edit: user.user_role?.can_edit ?? false,
      can_checkin: user.user_role?.can_checkin ?? false,
      can_checkout: user.user_role?.can_checkout ?? false,
    });
  };

  const handleEditSave = async () => {
    if (editUser) {
      await updateUserRole.mutateAsync({
        userId: editUser.id,
        ...editForm,
      });
      setEditUser(null);
    }
  };

  const handleCreateUser = async () => {
    await createUser.mutateAsync(createForm);
    setCreateDialogOpen(false);
    setCreateForm({
      email: '',
      password: '',
      fullName: '',
      role: 'viewer',
      can_view: true,
      can_edit: false,
      can_checkin: false,
      can_checkout: false,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários e permissões</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users list */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map(user => (
            <Card 
              key={user.id}
              className="shadow-card cursor-pointer transition-all hover:shadow-card-hover"
              onClick={() => handleEditClick(user)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <UserCog className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge 
                      variant="outline"
                      className={roleColors[user.user_role?.role || 'viewer']}
                    >
                      {roleLabels[user.user_role?.role || 'viewer']}
                    </Badge>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {user.user_role?.can_view && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Eye className="h-3 w-3" /> Ver
                        </Badge>
                      )}
                      {user.user_role?.can_edit && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Edit className="h-3 w-3" /> Editar
                        </Badge>
                      )}
                      {user.user_role?.can_checkin && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <LogIn className="h-3 w-3" /> Check-in
                        </Badge>
                      )}
                      {user.user_role?.can_checkout && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <LogOut className="h-3 w-3" /> Check-out
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Permissões</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{editUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{editUser?.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: AppRole) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label>Permissões</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Visualizar</span>
                  </div>
                  <Switch
                    checked={editForm.can_view}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, can_view: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Editar</span>
                  </div>
                  <Switch
                    checked={editForm.can_edit}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, can_edit: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Check-in</span>
                  </div>
                  <Switch
                    checked={editForm.can_checkin}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, can_checkin: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Check-out</span>
                  </div>
                  <Switch
                    checked={editForm.can_checkout}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, can_checkout: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSave} disabled={updateUserRole.isPending}>
                {updateUserRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nome completo *</Label>
                <Input
                  id="create-name"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Senha *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value: AppRole) => setCreateForm({ ...createForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label>Permissões</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Visualizar</span>
                  <Switch
                    checked={createForm.can_view}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, can_view: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Editar</span>
                  <Switch
                    checked={createForm.can_edit}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, can_edit: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Check-in</span>
                  <Switch
                    checked={createForm.can_checkin}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, can_checkin: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Check-out</span>
                  <Switch
                    checked={createForm.can_checkout}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, can_checkout: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={createUser.isPending || !createForm.email || !createForm.password || !createForm.fullName}
              >
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
