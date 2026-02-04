import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Client, Vehicle, statusLabels, statusColors } from '@/types';
import { Building2, Car, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
  vehicles: Vehicle[];
}

const badgeVariants: Record<string, string> = {
  warning: 'bg-warning/10 text-warning border-warning/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function ClientCard({ client, vehicles }: ClientCardProps) {
  const navigate = useNavigate();

  const statusCounts = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingCount = statusCounts['aguardando_entrada'] || 0;

  return (
    <Card 
      className="shadow-card transition-all duration-200 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in"
      onClick={() => navigate(`/clients/${client.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <p className="text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge className={cn("text-xs", badgeVariants.warning)}>
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{client.address}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{client.phone}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 pt-2 border-t">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{vehicles.length} veículo{vehicles.length !== 1 ? 's' : ''}</span>
          </div>

          {vehicles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge 
                  key={status} 
                  variant="outline"
                  className={cn("text-xs", badgeVariants[statusColors[status as keyof typeof statusColors]])}
                >
                  {statusLabels[status as keyof typeof statusLabels]}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
