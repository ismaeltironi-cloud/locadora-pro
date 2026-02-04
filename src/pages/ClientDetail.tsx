import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClient } from '@/hooks/useClients';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { statusLabels, statusColors, VehicleStatus } from '@/types';
import { 
  ArrowLeft, 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Car,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

const badgeVariants: Record<string, string> = {
  warning: 'bg-warning/10 text-warning border-warning/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: client, isLoading: clientLoading } = useClient(id!);
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles(id);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isLoading = clientLoading || vehiclesLoading;

  const filteredVehicles = vehicles?.filter(vehicle => {
    const matchesSearch = searchTerm === '' ||
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Cliente não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/clients')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {/* Client Info */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{client.name}</CardTitle>
                  <p className="text-muted-foreground">CNPJ: {client.cnpj}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm sm:col-span-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Veículos ({vehicles?.length || 0})
            </h2>
            {canEdit && (
              <Button onClick={() => navigate(`/clients/${id}/vehicles/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Veículo
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aguardando_entrada">Aguardando Entrada</SelectItem>
                <SelectItem value="check_in">Check-in Realizado</SelectItem>
                <SelectItem value="check_out">Check-out Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicles Grid */}
          {filteredVehicles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map(vehicle => (
                <Card 
                  key={vehicle.id}
                  className="shadow-card cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                  onClick={() => navigate(`/clients/${id}/vehicles/${vehicle.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <Car className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">{vehicle.plate}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={cn("text-xs", badgeVariants[statusColors[vehicle.status]])}
                      >
                        {statusLabels[vehicle.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12">
              <Car className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhum veículo encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum resultado encontrado para os filtros aplicados.' 
                  : 'Cadastre o primeiro veículo para este cliente.'}
              </p>
              {canEdit && !searchTerm && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => navigate(`/clients/${id}/vehicles/new`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Veículo
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
