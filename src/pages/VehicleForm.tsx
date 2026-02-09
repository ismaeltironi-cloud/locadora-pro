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
import { ArrowLeft, Loader2, Car, Info } from 'lucide-react';

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
  const selectedClient = isFromDashboard 
    ? clients?.find(c => c.id === selectedClientId)
    : client;

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
      <div className="p-6">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => isFromDashboard ? navigate('/') : navigate(`/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Novo Veículo</CardTitle>
                {selectedClient && (
                  <p className="text-sm text-muted-foreground">Cliente: {selectedClient.name}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isFromDashboard && (
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select
                    value={formData.selected_client_id}
                    onValueChange={(value) => setFormData({ ...formData, selected_client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - {c.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="plate">Placa *</Label>
                <Input
                  id="plate"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: formatPlate(e.target.value) })}
                  placeholder="ABC1234"
                  required
                  maxLength={7}
                />
                {searchingVehicle && debouncedPlate.length >= 7 && (
                  <p className="text-sm text-muted-foreground">Buscando veículo...</p>
                )}
              </div>

              {existingVehicle && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Veículo encontrado na base de dados. Os campos foram preenchidos automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ex: Fiat"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Uno"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="Ex: 2020"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Ex: Prata"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="km">KM</Label>
                <Input
                  id="km"
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  placeholder="Ex: 50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chassis">Chassi</Label>
                <Input
                  id="chassis"
                  value={formData.chassis}
                  onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
                  placeholder="Ex: 9BWZZZ377VT004251"
                  maxLength={17}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => isFromDashboard ? navigate('/') : navigate(`/clients/${clientId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createVehicle.isPending || (isFromDashboard && !selectedClientId)}
                >
                  {createVehicle.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Cadastrar Veículo'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
