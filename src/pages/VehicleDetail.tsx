import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useVehicle, useVehiclePhotos, useUpdateVehicle, useUpdateVehicleStatus, useAddVehiclePhoto } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { statusLabels, statusColors, VehicleStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Loader2, 
  Car, 
  Camera,
  Clock,
  CheckCircle2,
  XCircle,
  Image,
  Edit,
  Ban,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const badgeVariants: Record<string, string> = {
  warning: 'bg-warning/10 text-warning border-warning/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function VehicleDetail() {
  const { clientId, vehicleId } = useParams<{ clientId: string; vehicleId: string }>();
  const navigate = useNavigate();
  const { user, canEdit, canCheckin, canCheckout, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId!);
  const { data: photos, isLoading: photosLoading } = useVehiclePhotos(vehicleId!);
  
  const updateVehicle = useUpdateVehicle();
  const updateStatus = useUpdateVehicleStatus();
  const addPhoto = useAddVehiclePhoto();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manualCheckinDialogOpen, setManualCheckinDialogOpen] = useState(false);
  const [photoType, setPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  const [isUploading, setIsUploading] = useState(false);
  const [isManualCheckin, setIsManualCheckin] = useState(false);
  const [editForm, setEditForm] = useState({ plate: '', model: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = vehicleLoading || photosLoading;
  const isLocked = vehicle?.status === 'check_out' || vehicle?.status === 'cancelado';

  const handleEditClick = () => {
    if (vehicle) {
      setEditForm({ plate: vehicle.plate, model: vehicle.model });
      setEditDialogOpen(true);
    }
  };

  const handleEditSave = async () => {
    if (vehicle) {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        plate: editForm.plate,
        model: editForm.model,
      });
      setEditDialogOpen(false);
    }
  };

  const handlePhotoCapture = (type: 'checkin' | 'checkout') => {
    setPhotoType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vehicle || !user) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicle.id}/${photoType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(fileName);

      await addPhoto.mutateAsync({
        vehicleId: vehicle.id,
        photoUrl: urlData.publicUrl,
        photoType,
        takenBy: user.id,
      });

      // Update vehicle status
      const newStatus: VehicleStatus = photoType === 'checkin' ? 'check_in' : 'check_out';
      await updateStatus.mutateAsync({ id: vehicle.id, status: newStatus });

      toast({
        title: photoType === 'checkin' ? 'Check-in realizado' : 'Check-out realizado',
        description: 'A foto foi registrada com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = async () => {
    if (vehicle) {
      await updateStatus.mutateAsync({ id: vehicle.id, status: 'cancelado' });
      toast({
        title: 'Veículo cancelado',
        description: 'O status do veículo foi alterado para cancelado.',
      });
    }
  };

  const handleManualCheckin = async () => {
    if (!vehicle) return;
    
    setIsManualCheckin(true);
    try {
      await updateStatus.mutateAsync({ id: vehicle.id, status: 'check_in' });
      toast({
        title: 'Check-in manual realizado',
        description: 'O status do veículo foi alterado para check-in sem registro de foto.',
      });
      setManualCheckinDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao realizar check-in',
        description: error.message,
      });
    } finally {
      setIsManualCheckin(false);
    }
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

  if (!vehicle) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Veículo não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  const checkinPhotos = photos?.filter(p => p.photo_type === 'checkin') || [];
  const checkoutPhotos = photos?.filter(p => p.photo_type === 'checkout') || [];

  const canDoCheckin = canCheckin && vehicle.status === 'aguardando_entrada';
  const canDoCheckout = canCheckout && vehicle.status === 'check_in';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Vehicle Info */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Car className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{vehicle.plate}</CardTitle>
                  <p className="text-muted-foreground">{vehicle.model}</p>
                </div>
              </div>
              <Badge 
                variant="outline"
                className={cn("text-sm", badgeVariants[statusColors[vehicle.status]])}
              >
                {statusLabels[vehicle.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicle.checkin_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Check-in: {format(new Date(vehicle.checkin_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {vehicle.checkout_at && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Check-out: {format(new Date(vehicle.checkout_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isLocked && (
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                {canEdit && (
                  <Button variant="outline" onClick={handleEditClick}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Veículo
                  </Button>
                )}
                {canDoCheckin && (
                  <Button onClick={() => handlePhotoCapture('checkin')} disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Realizar Check-in
                  </Button>
                )}
                {isAdmin && vehicle.status === 'aguardando_entrada' && (
                  <Button 
                    variant="secondary" 
                    onClick={() => setManualCheckinDialogOpen(true)}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Check-in Manual
                  </Button>
                )}
                {canDoCheckout && (
                  <Button onClick={() => handlePhotoCapture('checkout')} disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Realizar Check-out
                  </Button>
                )}
                {(isAdmin || canEdit) && vehicle.status !== 'cancelado' && (
                  <Button variant="destructive" onClick={handleCancel}>
                    <Ban className="mr-2 h-4 w-4" />
                    Cancelar Veículo
                  </Button>
                )}
              </div>
            )}

            {isLocked && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Este veículo está bloqueado para edição.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Image className="h-5 w-5" />
            Histórico de Fotos
          </h2>

          {/* Check-in Photos */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Fotos de Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              {checkinPhotos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {checkinPhotos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt="Check-in"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                        <p className="text-white text-sm">
                          {format(new Date(photo.taken_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma foto de check-in registrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Check-out Photos */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Fotos de Check-out</CardTitle>
            </CardHeader>
            <CardContent>
              {checkoutPhotos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {checkoutPhotos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt="Check-out"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                        <p className="text-white text-sm">
                          {format(new Date(photo.taken_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma foto de check-out registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Veículo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-plate">Placa</Label>
                <Input
                  id="edit-plate"
                  value={editForm.plate}
                  onChange={(e) => setEditForm({ ...editForm, plate: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <Input
                  id="edit-model"
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSave} disabled={updateVehicle.isPending}>
                {updateVehicle.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Check-in Dialog */}
        <Dialog open={manualCheckinDialogOpen} onOpenChange={setManualCheckinDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check-in Manual</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                Você está prestes a realizar o check-in manual do veículo <strong>{vehicle.plate}</strong> sem registro de foto.
              </p>
              <p className="text-sm text-warning mt-2">
                ⚠️ Esta ação é exclusiva para administradores e deve ser usada apenas em casos excepcionais.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualCheckinDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleManualCheckin} disabled={isManualCheckin}>
                {isManualCheckin ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                Confirmar Check-in
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
