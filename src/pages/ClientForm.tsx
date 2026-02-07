import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateClient } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { TaxpayerType, taxpayerTypeLabels } from '@/types';
import { ArrowLeft, Loader2, Building2, Search } from 'lucide-react';

interface CNPJData {
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  email: string;
}

export default function ClientForm() {
  const navigate = useNavigate();
  const createClient = useCreateClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    trade_name: '',
    taxpayer_type: 'nao_contribuinte' as TaxpayerType,
    municipal_registration: '',
    state_registration: '',
  });
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createClient.mutateAsync({
        name: formData.name,
        cnpj: formData.cnpj,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        trade_name: formData.trade_name || null,
        taxpayer_type: formData.taxpayer_type,
        municipal_registration: formData.municipal_registration || null,
        state_registration: formData.state_registration || null,
      });
      navigate('/clients');
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const searchCNPJ = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return;
    }

    setIsSearchingCNPJ(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: 'destructive',
            title: 'CNPJ não encontrado',
            description: 'Verifique se o CNPJ está correto.',
          });
        } else {
          throw new Error('Erro ao consultar CNPJ');
        }
        return;
      }

      const data: CNPJData = await response.json();
      
      const addressParts = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio,
        data.uf,
        data.cep,
      ].filter(Boolean);
      
      let phone = '';
      if (data.ddd_telefone_1) {
        const phoneDigits = data.ddd_telefone_1.replace(/\D/g, '');
        phone = formatPhone(phoneDigits);
      }

      setFormData(prev => ({
        ...prev,
        name: data.razao_social || prev.name,
        trade_name: data.nome_fantasia || prev.trade_name,
        address: addressParts.join(', ') || prev.address,
        phone: phone || prev.phone,
        email: data.email?.toLowerCase() || prev.email,
      }));

      toast({
        title: 'Dados encontrados',
        description: 'Os dados da empresa foram preenchidos automaticamente.',
      });
    } catch (error) {
      console.error('Error fetching CNPJ:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao consultar CNPJ',
        description: 'Não foi possível buscar os dados. Tente novamente.',
      });
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formattedCNPJ = formatCNPJ(value);
    setFormData({ ...formData, cnpj: formattedCNPJ });
    
    if (formattedCNPJ.length === 18) {
      searchCNPJ(formattedCNPJ);
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate('/clients')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Novo Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleCNPJChange(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      required
                      className="pr-10"
                    />
                    {isSearchingCNPJ && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                    {!isSearchingCNPJ && formData.cnpj.length === 18 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => searchCNPJ(formData.cnpj)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os dados serão preenchidos automaticamente ao digitar o CNPJ completo
                  </p>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Nome (Razão Social) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nome (Razão Social) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Razão social da empresa"
                    required
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="trade_name">Nome Fantasia</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    placeholder="Nome fantasia da empresa"
                  />
                </div>

                {/* Tipo de Contribuinte */}
                <div className="space-y-2">
                  <Label htmlFor="taxpayer_type">Tipo de Contribuinte *</Label>
                  <Select
                    value={formData.taxpayer_type}
                    onValueChange={(value) => setFormData({ ...formData, taxpayer_type: value as TaxpayerType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(taxpayerTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>

                {/* Inscrição Municipal */}
                <div className="space-y-2">
                  <Label htmlFor="municipal_registration">Inscrição Municipal</Label>
                  <Input
                    id="municipal_registration"
                    value={formData.municipal_registration}
                    onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                    placeholder="Inscrição municipal"
                  />
                </div>

                {/* Inscrição Estadual */}
                <div className="space-y-2">
                  <Label htmlFor="state_registration">Inscrição Estadual</Label>
                  <Input
                    id="state_registration"
                    value={formData.state_registration}
                    onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                    placeholder="Inscrição estadual"
                  />
                </div>

                {/* Endereço */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/clients')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createClient.isPending || isSearchingCNPJ}
                >
                  {createClient.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Cadastrar Cliente'
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
