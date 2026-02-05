import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Car, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  Plus,
  Loader2,
  Wrench,
  Truck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statusLabels, statusColors } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = clientsLoading || vehiclesLoading;

  // Normalize CNPJ for search (remove formatting)
  const normalizeCNPJ = (value: string) => value.replace(/\D/g, '');

  // Calculate stats
  const totalVehicles = vehicles?.length || 0;
  const aguardandoEntrada = vehicles?.filter(v => v.status === 'aguardando_entrada').length || 0;
  const checkInCount = vehicles?.filter(v => v.status === 'check_in').length || 0;
  const checkOutCount = vehicles?.filter(v => v.status === 'check_out').length || 0;
  const cancelledCount = vehicles?.filter(v => v.status === 'cancelado').length || 0;

  // Filter vehicles awaiting pickup (aguardando_entrada)
  const vehiclesAwaitingPickup = vehicles?.filter(v => {
    const matchesStatus = v.status === 'aguardando_entrada';
    
    if (!searchTerm) return matchesStatus;
    
    const normalizedSearch = normalizeCNPJ(searchTerm);
    const client = clients?.find(c => c.id === v.client_id);
    const normalizedCNPJ = client ? normalizeCNPJ(client.cnpj) : '';
    
    return matchesStatus && (
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizedCNPJ.includes(normalizedSearch)
    );
  }) || [];

  // Get vehicles in service (check_in status)
  const vehiclesInService = vehicles?.filter(v => {
    const matchesStatus = v.status === 'check_in';
    
    if (!searchTerm) return matchesStatus;
    
    const normalizedSearch = normalizeCNPJ(searchTerm);
    const client = clients?.find(c => c.id === v.client_id);
    const normalizedCNPJ = client ? normalizeCNPJ(client.cnpj) : '';
    
    return matchesStatus && (
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizedCNPJ.includes(normalizedSearch)
    );
  }) || [];

  const badgeVariants: Record<string, string> = {
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    primary: 'bg-blue-100 text-blue-800 border-blue-300',
    success: 'bg-green-100 text-green-800 border-green-300',
    destructive: 'bg-red-100 text-red-800 border-red-300',
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
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
          {canEdit && (
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total de Veículos"
            value={totalVehicles}
            icon={<Car className="h-6 w-6" />}
            variant="default"
          />
          <StatCard
            title="Aguardando Entrada"
            value={aguardandoEntrada}
            icon={<Clock className="h-6 w-6" />}
            variant="warning"
          />
          <StatCard
            title="Veículo em Atendimento"
            value={checkInCount}
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="primary"
          />
          <StatCard
            title="Atendimento Finalizado"
            value={checkOutCount}
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="success"
          />
          <StatCard
            title="Cancelados"
            value={cancelledCount}
            icon={<XCircle className="h-6 w-6" />}
            variant="destructive"
          />
        </div>

        {/* Search and filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Veículos Aguardando Entrada</h2>
        </div>

        {/* Vehicles awaiting pickup grid */}
        {vehiclesAwaitingPickup.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehiclesAwaitingPickup.map(vehicle => {
              const client = clients?.find(c => c.id === vehicle.client_id);
              return (
                <Card 
                  key={vehicle.id}
                  className="shadow-card cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                  onClick={() => navigate(`/clients/${vehicle.client_id}/vehicles/${vehicle.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                          <Car className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-semibold">{vehicle.plate}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant="outline"
                          className={cn("text-xs", badgeVariants[statusColors[vehicle.status]])}
                        >
                          {statusLabels[vehicle.status]}
                        </Badge>
                        {vehicle.needs_tow && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                            <Truck className="h-3 w-3 mr-1" />
                            Guincho
                          </Badge>
                        )}
                      </div>
                    </div>
                    {client && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground truncate">{client.name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12">
            <Clock className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum veículo aguardando entrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado.' : 'Todos os veículos foram processados.'}
            </p>
          </div>
        )}

        {/* Section title - Vehicles in service */}
        <div className="flex items-center gap-2 mt-8">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Veículos em Atendimento</h2>
        </div>

        {/* Vehicles in service grid */}
        {vehiclesInService.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehiclesInService.map(vehicle => {
              const client = clients?.find(c => c.id === vehicle.client_id);
              return (
                <Card 
                  key={vehicle.id}
                  className="shadow-card cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                  onClick={() => navigate(`/clients/${vehicle.client_id}/vehicles/${vehicle.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{vehicle.plate}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant="outline"
                          className={cn("text-xs", badgeVariants[statusColors[vehicle.status]])}
                        >
                          {statusLabels[vehicle.status]}
                        </Badge>
                        {vehicle.needs_tow && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                            <Truck className="h-3 w-3 mr-1" />
                            Guincho
                          </Badge>
                        )}
                      </div>
                    </div>
                    {client && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground truncate">{client.name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8">
            <Wrench className="h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-base font-medium">Nenhum veículo em atendimento</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado.' : 'Não há veículos sendo atendidos no momento.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
