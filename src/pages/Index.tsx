import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import ClientCard from '@/components/dashboard/ClientCard';
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
  Users
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = clientsLoading || vehiclesLoading;

  // Calculate stats
  const totalVehicles = vehicles?.length || 0;
  const aguardandoEntrada = vehicles?.filter(v => v.status === 'aguardando_entrada').length || 0;
  const checkInCount = vehicles?.filter(v => v.status === 'check_in').length || 0;
  const checkOutCount = vehicles?.filter(v => v.status === 'check_out').length || 0;
  const cancelledCount = vehicles?.filter(v => v.status === 'cancelado').length || 0;

  // Filter clients with pending vehicles and search
  const filteredClients = clients?.filter(client => {
    const clientVehicles = vehicles?.filter(v => v.client_id === client.id) || [];
    const hasPending = clientVehicles.some(v => v.status === 'aguardando_entrada');
    
    const matchesSearch = searchTerm === '' || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj.includes(searchTerm);

    return hasPending && matchesSearch;
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
            title="Check-in Realizado"
            value={checkInCount}
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="primary"
          />
          <StatCard
            title="Check-out Realizado"
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
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Por Cliente (Aguardando Retirada)</h2>
        </div>

        {/* Clients grid */}
        {filteredClients.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                vehicles={vehicles?.filter(v => v.client_id === client.id) || []}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum cliente com pendências</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado para a busca.' : 'Todos os veículos foram processados.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
