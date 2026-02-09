import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClient, useClients } from '@/hooks/useClients';
import { useCreateVehicle, useVehicleByPlate } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Info, X } from 'lucide-react';

export default function VehicleForm() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: client, isLoading: clientLoading } = useClient(clientId || '');
  const { data: clients, isLoading: clientsLoading } = useClients();
  const createVehicle = useCreateVehicle();
  
  const [formData, setFormData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    chassis: '',
    km: '',
    selected_client_id: clientId || '',
  });

  const [debouncedPlate, setDebouncedPlate] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlate(formData.plate);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.plate]);

  const { data: existingVehicle, isLoading: searchingVehicle } = useVehicleByPlate(debouncedPlate);

  useEffect(() => {
    if (existingVehicle) {
      setFormData(prev => ({ 
        ...prev, 
        brand: prev.brand === '' && existingVehicle.brand ? existingVehicle.brand : prev.brand,
        model: prev.model === '' ? existingVehicle.model : prev.model,
        year: prev.year === '' && existingVehicle.year ? String(existingVehicle.year) : prev.year,
        color: prev.color === '' && existingVehicle.color ? existingVehicle.color : prev.color,
        chassis: prev.chassis === '' && existingVehicle.chassis ? existingVehicle.chassis : prev.chassis,
        km: prev.km === '' && existingVehicle.km ? String(existingVehicle.km) : prev.km,
      }));
    }
  }, [existingVehicle]);

  useEffect(() => {
    if (clientId) {
      setFormData(prev => ({ ...prev, selected_client_id: clientId }));
    }
  }, [clientId]);

  const isFromDashboard = !clientId;
  const selectedClientId = formData.selected_client_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    try {
      await createVehicle.mutateAsync({
        client_id: selectedClientId,
        plate: formData.plate.toUpperCase(),
        brand: formData.brand || null,
        model: formData.model,
        year: formData.year ? parseInt(formData.year, 10) : null,
        color: formData.color || null,
        chassis: formData.chassis || null,
        km: formData.km ? parseInt(formData.km, 10) : null,
        defect_description: null,
        needs_tow: false,
        status: 'aguardando_entrada',
        created_by: user?.id || null,
      });
      if (isFromDashboard) {
        navigate('/');
      } else {
        navigate(`/clients/${clientId}`);
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatPlate = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  };

  const handleClose = () => {
    if (isFromDashboard) {
      navigate('/');
    } else {
      navigate(`/clients/${clientId}`);
    }
  };

  const isLoading = clientId ? clientLoading : clientsLoading;

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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-lg shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-bold">Novo Veículo</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Placa - full width */}
              <div className="space-y-1.5">
                <Label htmlFor="plate" className="font-semibold">Placa *</Label>
                <Input
                  id="plate"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: formatPlate(e.target.value) })}
                  placeholder=""
                  required
                  maxLength={7}
                  className="ring-2 ring-primary/50 focus-visible:ring-primary"
                />
                {searchingVehicle && debouncedPlate.length >= 7 && (
                  <p className="text-sm text-muted-foreground">Buscando veículo...</p>
                )}
              </div>

              {existingVehicle && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Veículo encontrado. Campos preenchidos automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Marca + Modelo - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brand" className="font-semibold">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model" className="font-semibold">Modelo *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Ano + Cor + KM - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="font-semibold">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="font-semibold">Cor</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="km" className="font-semibold">KM</Label>
                  <Input
                    id="km"
                    type="number"
                    value={formData.km}
                    onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  />
                </div>
              </div>

              {/* Chassi - full width */}
              <div className="space-y-1.5">
                <Label htmlFor="chassis" className="font-semibold">Chassi</Label>
                <Input
                  id="chassis"
                  value={formData.chassis}
                  onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
                  placeholder="EX: 9BWZZZ377VT004251"
                  maxLength={17}
                />
              </div>

              {/* Cliente - always visible */}
              <div className="space-y-1.5">
                <Label htmlFor="client" className="font-semibold">Cliente</Label>
                <Select
                  value={formData.selected_client_id}
                  onValueChange={(value) => setFormData({ ...formData, selected_client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Salvar button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                disabled={createVehicle.isPending || !selectedClientId}
              >
                {createVehicle.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
