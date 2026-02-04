import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClient } from '@/hooks/useClients';
import { useCreateVehicle, useVehicleByPlate } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2, Car, Info } from 'lucide-react';

export default function VehicleForm() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: client, isLoading: clientLoading } = useClient(clientId!);
  const createVehicle = useCreateVehicle();
  
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
  });

  const [debouncedPlate, setDebouncedPlate] = useState('');
  
  // Debounce plate input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlate(formData.plate);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.plate]);

  const { data: existingVehicle, isLoading: searchingVehicle } = useVehicleByPlate(debouncedPlate);

  // Auto-fill model if vehicle exists
  useEffect(() => {
    if (existingVehicle && formData.model === '') {
      setFormData(prev => ({ ...prev, model: existingVehicle.model }));
    }
  }, [existingVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createVehicle.mutateAsync({
        client_id: clientId!,
        plate: formData.plate.toUpperCase(),
        model: formData.model,
        status: 'aguardando_entrada',
        created_by: user?.id || null,
      });
      navigate(`/clients/${clientId}`);
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatPlate = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  };

  if (clientLoading) {
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
          onClick={() => navigate(`/clients/${clientId}`)}
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
                <p className="text-sm text-muted-foreground">Cliente: {client?.name}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Veículo encontrado na base de dados. O modelo foi preenchido automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Fiat Uno 2020"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/clients/${clientId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createVehicle.isPending}
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
