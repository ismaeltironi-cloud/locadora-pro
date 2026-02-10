import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useOficinaProOSDetail, uploadOficinaProPhoto, updateOficinaProOSStatus } from '@/hooks/useOficinaProOS';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Car,
  User,
  Wrench,
  Calendar,
  Gauge,
  Fuel,
  CheckCircle2,
  Camera,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabelsOS: Record<string, string> = {
  aberta: 'Aberta',
  finalizada: 'Finalizada',
  cancelado: 'Cancelado',
};

const statusColorsOS: Record<string, string> = {
  aberta: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  finalizada: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
};

export default function OSDetail() {
  const { osId } = useParams<{ osId: string }>();
  const navigate = useNavigate();
  const { canCheckin, canCheckout, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const checkinInputRef = useRef<HTMLInputElement>(null);
  const checkoutInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: os, isLoading } = useOficinaProOSDetail(osId);

  const handlePhotoCapture = async (file: File, type: 'checkin' | 'checkout') => {
    if (!osId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // remove data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await uploadOficinaProPhoto(osId, base64, type, file.type);

      queryClient.invalidateQueries({ queryKey: ['oficina-pro-os'] });
      queryClient.invalidateQueries({ queryKey: ['oficina-pro-os-detail', osId] });

      toast({
        title: type === 'checkin' ? 'Check-in realizado!' : 'Check-out realizado!',
        description: 'Foto enviada e status atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar foto.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Admin manual status update (without photo)
  const statusMutation = useMutation({
    mutationFn: ({ newStatus }: { newStatus: string }) =>
      updateOficinaProOSStatus(osId!, newStatus),
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['oficina-pro-os'] });
      queryClient.invalidateQueries({ queryKey: ['oficina-pro-os-detail', osId] });
      toast({
        title: 'Status atualizado!',
        description: `Status atualizado para ${statusLabelsOS[newStatus] || newStatus}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasCheckinPhoto = !!os?.checkin_photo_url;
  const hasCheckoutPhoto = !!os?.checkout_photo_url;
  const canDoCheckin = (isAdmin || canCheckin) && os?.status === 'aberta' && !hasCheckinPhoto;
  const canDoCheckout = (isAdmin || canCheckout) && os?.status === 'aberta' && hasCheckinPhoto && !hasCheckoutPhoto;
  // Admin can force status change without photo
  const canAdminManualCheckout = isAdmin && os?.status === 'aberta' && hasCheckinPhoto && !hasCheckoutPhoto;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!os) {
    return (
      <AppLayout>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Ordem de serviço não encontrada.</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const vehicle = os.vehicle;
  const client = os.client;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Hidden file inputs for camera */}
        <input
          ref={checkinInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoCapture(file, 'checkin');
            e.target.value = '';
          }}
        />
        <input
          ref={checkoutInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoCapture(file, 'checkout');
            e.target.value = '';
          }}
        />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">OS {os.numero || '—'}</h1>
                <Badge
                  variant="outline"
                  className={cn('text-sm', statusColorsOS[os.status || ''] || '')}
                >
                  {statusLabelsOS[os.status || ''] || os.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {os.tipo_servico || 'Serviço'} • Entrada: {os.data_entrada || '—'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {canDoCheckin && (
              <Button
                onClick={() => checkinInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                Check-in (Foto)
              </Button>
            )}
            {canDoCheckout && (
              <Button
                onClick={() => checkoutInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                Check-out (Foto)
              </Button>
            )}
            {/* Admin manual checkout without photo */}
            {canAdminManualCheckout && (
              <Button
                onClick={() => statusMutation.mutate({ newStatus: 'finalizada' })}
                disabled={statusMutation.isPending}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                {statusMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Finalizar (sem foto)
              </Button>
            )}
          </div>
        </div>

        {/* Photos section */}
        {(hasCheckinPhoto || hasCheckoutPhoto) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {hasCheckinPhoto && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-blue-600" />
                    Foto Check-in
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={os.checkin_photo_url}
                    alt="Foto de check-in"
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                </CardContent>
              </Card>
            )}
            {hasCheckoutPhoto && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-green-600" />
                    Foto Check-out
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={os.checkout_photo_url}
                    alt="Foto de check-out"
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Vehicle info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-5 w-5 text-primary" />
                Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Placa" value={vehicle?.placa || '—'} />
              <InfoRow label="Modelo" value={vehicle?.modelo || '—'} />
              <InfoRow label="Marca" value={vehicle?.marca || '—'} />
              <InfoRow label="Ano" value={vehicle?.ano?.toString() || '—'} />
              <InfoRow label="Cor" value={vehicle?.cor || '—'} />
              <InfoRow label="Chassi" value={vehicle?.chassi || '—'} />
            </CardContent>
          </Card>

          {/* Client info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Nome" value={client?.nome || '—'} />
              <InfoRow label="CPF/CNPJ" value={client?.cpf_cnpj || '—'} />
              <InfoRow label="Telefone" value={client?.telefone || '—'} />
              <InfoRow label="E-mail" value={client?.email || '—'} />
            </CardContent>
          </Card>
        </div>

        {/* OS details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-primary" />
              Detalhes da Ordem de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Tipo de Serviço" value={os.tipo_servico || '—'} icon={<Wrench className="h-4 w-4" />} />
              <InfoRow label="KM" value={os.km || '—'} icon={<Gauge className="h-4 w-4" />} />
              <InfoRow label="Combustível" value={os.combustivel || '—'} icon={<Fuel className="h-4 w-4" />} />
              <InfoRow label="Data Entrada" value={os.data_entrada || '—'} icon={<Calendar className="h-4 w-4" />} />
              <InfoRow label="Data Conclusão" value={os.data_conclusao || '—'} icon={<CheckCircle2 className="h-4 w-4" />} />
            </div>

            {os.descricao_defeito && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descrição do Defeito</p>
                  <p className="text-sm">{os.descricao_defeito}</p>
                </div>
              </>
            )}

            {os.observacoes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{os.observacoes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
