import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';
import { useVehicles } from '@/hooks/useVehicles';
import { useUsers } from '@/hooks/useUsers';
import { statusLabels } from '@/types';
import { FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const { data: clients } = useClients();
  const { data: vehicles, isLoading } = useVehicles();
  const { data: users } = useUsers();
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredVehicles = vehicles?.filter(v => {
    const matchesClient = selectedClient === 'all' || v.client_id === selectedClient;
    const matchesUser = selectedUser === 'all' || v.created_by === selectedUser;
    return matchesClient && matchesUser;
  }) || [];

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(26, 86, 219);
      doc.text('Relatório de Veículos', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });

      let yOffset = 28;
      if (selectedClient !== 'all') {
        const client = clients?.find(c => c.id === selectedClient);
        doc.text(`Cliente: ${client?.name || 'N/A'}`, pageWidth / 2, yOffset + 6, { align: 'center' });
        yOffset += 6;
      }
      if (selectedUser !== 'all') {
        const user = users?.find(u => u.id === selectedUser);
        doc.text(`Usuário: ${user?.full_name || 'N/A'}`, pageWidth / 2, yOffset + 6, { align: 'center' });
        yOffset += 6;
      }

      // Summary
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Resumo', 14, 45);

      const summary = {
        total: filteredVehicles.length,
        aguardando: filteredVehicles.filter(v => v.status === 'aguardando_entrada').length,
        checkin: filteredVehicles.filter(v => v.status === 'check_in').length,
        checkout: filteredVehicles.filter(v => v.status === 'check_out').length,
        cancelado: filteredVehicles.filter(v => v.status === 'cancelado').length,
      };

      autoTable(doc, {
        startY: 50,
        head: [['Total', 'Aguardando', 'Em Atendimento', 'Finalizados', 'Cancelado']],
        body: [[summary.total, summary.aguardando, summary.checkin, summary.checkout, summary.cancelado]],
        theme: 'grid',
        headStyles: { fillColor: [26, 86, 219] },
      });

      // Per-user summary
      const userVehicleCounts: Record<string, number> = {};
      filteredVehicles.forEach(v => {
        const userId = v.created_by || 'unknown';
        userVehicleCounts[userId] = (userVehicleCounts[userId] || 0) + 1;
      });

      const userSummaryData = Object.entries(userVehicleCounts).map(([userId, count]) => {
        const user = users?.find(u => u.id === userId);
        return [user?.full_name || 'Não identificado', count];
      });

      if (userSummaryData.length > 0) {
        doc.setFontSize(12);
        doc.text('Veículos por Usuário', 14, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Usuário', 'Quantidade']],
          body: userSummaryData,
          theme: 'grid',
          headStyles: { fillColor: [26, 86, 219] },
        });
      }

      // Vehicles table
      doc.setFontSize(12);
      doc.text('Veículos', 14, (doc as any).lastAutoTable.finalY + 15);

      const vehicleData = filteredVehicles.map(v => [
        v.plate,
        v.model,
        clients?.find(c => c.id === v.client_id)?.name || 'N/A',
        statusLabels[v.status],
        v.checkin_at ? format(new Date(v.checkin_at), 'dd/MM/yyyy HH:mm') : '-',
        v.checkout_at ? format(new Date(v.checkout_at), 'dd/MM/yyyy HH:mm') : '-',
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Placa', 'Modelo', 'Cliente', 'Status', 'Check-in', 'Check-out']],
        body: vehicleData,
        theme: 'striped',
        headStyles: { fillColor: [26, 86, 219] },
        styles: { fontSize: 9 },
      });

      // Save
      doc.save(`relatorio-veiculos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Exporte relatórios em PDF</p>
        </div>

        <Card className="shadow-card max-w-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Relatório de Veículos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Filtrar por cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filtrar por usuário</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                O relatório incluirá {filteredVehicles.length} veículo(s) com informações de check-in e check-out.
              </p>
              <Button onClick={generatePDF} disabled={isGenerating || filteredVehicles.length === 0}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
