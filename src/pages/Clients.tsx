import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail,
  Loader2
} from 'lucide-react';

export default function Clients() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: clients, isLoading } = useClients();
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize CNPJ for search (remove formatting)
  const normalizeCNPJ = (value: string) => value.replace(/\D/g, '');

  const filteredClients = clients?.filter(client => {
    const normalizedSearch = normalizeCNPJ(searchTerm);
    const normalizedCNPJ = normalizeCNPJ(client.cnpj);
    
    return client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      normalizedCNPJ.includes(normalizedSearch) ||
      client.cnpj.includes(searchTerm);
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
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Gerencie os clientes cadastrados</p>
          </div>
          {canEdit && (
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Novo Cliente
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Clients list */}
        {filteredClients.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map(client => (
              <Card 
                key={client.id}
                className="shadow-card cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado para a busca.' : 'Cadastre o primeiro cliente para começar.'}
            </p>
            {canEdit && !searchTerm && (
              <Button className="mt-4" onClick={() => navigate('/clients/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Cliente
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
