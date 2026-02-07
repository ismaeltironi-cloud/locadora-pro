import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateClient } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import {
  PersonType,
  TaxpayerType,
  Gender,
  MaritalStatus,
  taxpayerTypeLabels,
  genderLabels,
  maritalStatusLabels,
} from '@/types';
import { ArrowLeft, Loader2, Building2, User, Search, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  const [personType, setPersonType] = useState<PersonType>('juridica');

  // Pessoa Jurídica fields
  const [pjData, setPjData] = useState({
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

  // Pessoa Física fields
  const [pfData, setPfData] = useState({
    name: '',
    cpf: '',
    rg: '',
    birth_date: undefined as Date | undefined,
    gender: '' as Gender | '',
    marital_status: '' as MaritalStatus | '',
    phone: '',
    email: '',
    address: '',
  });

  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2')
      .slice(0, 14);
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
    if (cleanCNPJ.length !== 14) return;

    setIsSearchingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({ variant: 'destructive', title: 'CNPJ não encontrado', description: 'Verifique se o CNPJ está correto.' });
        } else {
          throw new Error('Erro ao consultar CNPJ');
        }
        return;
      }

      const data: CNPJData = await response.json();
      const addressParts = [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf, data.cep].filter(Boolean);
      let phone = '';
      if (data.ddd_telefone_1) {
        phone = formatPhone(data.ddd_telefone_1.replace(/\D/g, ''));
      }

      setPjData(prev => ({
        ...prev,
        name: data.razao_social || prev.name,
        trade_name: data.nome_fantasia || prev.trade_name,
        address: addressParts.join(', ') || prev.address,
        phone: phone || prev.phone,
        email: data.email?.toLowerCase() || prev.email,
      }));

      toast({ title: 'Dados encontrados', description: 'Os dados da empresa foram preenchidos automaticamente.' });
    } catch (error) {
      console.error('Error fetching CNPJ:', error);
      toast({ variant: 'destructive', title: 'Erro ao consultar CNPJ', description: 'Não foi possível buscar os dados. Tente novamente.' });
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formattedCNPJ = formatCNPJ(value);
    setPjData({ ...pjData, cnpj: formattedCNPJ });
    if (formattedCNPJ.length === 18) {
      searchCNPJ(formattedCNPJ);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (personType === 'juridica') {
        await createClient.mutateAsync({
          person_type: 'juridica',
          name: pjData.name,
          cnpj: pjData.cnpj,
          address: pjData.address || null,
          phone: pjData.phone || null,
          email: pjData.email || null,
          trade_name: pjData.trade_name || null,
          taxpayer_type: pjData.taxpayer_type,
          municipal_registration: pjData.municipal_registration || null,
          state_registration: pjData.state_registration || null,
          cpf: null,
          rg: null,
          birth_date: null,
          gender: null,
          marital_status: null,
        });
      } else {
        await createClient.mutateAsync({
          person_type: 'fisica',
          name: pfData.name,
          cnpj: null,
          cpf: pfData.cpf,
          rg: pfData.rg || null,
          birth_date: pfData.birth_date ? format(pfData.birth_date, 'yyyy-MM-dd') : null,
          gender: (pfData.gender as Gender) || null,
          marital_status: (pfData.marital_status as MaritalStatus) || null,
          address: pfData.address || null,
          phone: pfData.phone || null,
          email: pfData.email || null,
          trade_name: null,
          taxpayer_type: null,
          municipal_registration: null,
          state_registration: null,
        });
      }
      navigate('/clients');
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {personType === 'juridica' ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <CardTitle>Novo Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Person Type Tabs */}
            <Tabs value={personType} onValueChange={(v) => setPersonType(v as PersonType)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="juridica">
                  <Building2 className="mr-2 h-4 w-4" />
                  Pessoa Jurídica
                </TabsTrigger>
                <TabsTrigger value="fisica">
                  <User className="mr-2 h-4 w-4" />
                  Pessoa Física
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              {personType === 'juridica' ? (
                /* ========== PESSOA JURÍDICA ========== */
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <div className="relative">
                      <Input
                        id="cnpj"
                        value={pjData.cnpj}
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
                      {!isSearchingCNPJ && pjData.cnpj.length === 18 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => searchCNPJ(pjData.cnpj)}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dados preenchidos automaticamente ao digitar o CNPJ completo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pj-phone">Telefone</Label>
                    <Input
                      id="pj-phone"
                      value={pjData.phone}
                      onChange={(e) => setPjData({ ...pjData, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pj-name">Nome (Razão Social) *</Label>
                    <Input
                      id="pj-name"
                      value={pjData.name}
                      onChange={(e) => setPjData({ ...pjData, name: e.target.value })}
                      placeholder="Razão social da empresa"
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="trade_name">Nome Fantasia</Label>
                    <Input
                      id="trade_name"
                      value={pjData.trade_name}
                      onChange={(e) => setPjData({ ...pjData, trade_name: e.target.value })}
                      placeholder="Nome fantasia da empresa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Contribuinte *</Label>
                    <Select
                      value={pjData.taxpayer_type}
                      onValueChange={(v) => setPjData({ ...pjData, taxpayer_type: v as TaxpayerType })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(taxpayerTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pj-email">Email</Label>
                    <Input
                      id="pj-email"
                      type="email"
                      value={pjData.email}
                      onChange={(e) => setPjData({ ...pjData, email: e.target.value })}
                      placeholder="contato@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipal_registration">Inscrição Municipal</Label>
                    <Input
                      id="municipal_registration"
                      value={pjData.municipal_registration}
                      onChange={(e) => setPjData({ ...pjData, municipal_registration: e.target.value })}
                      placeholder="Inscrição municipal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state_registration">Inscrição Estadual</Label>
                    <Input
                      id="state_registration"
                      value={pjData.state_registration}
                      onChange={(e) => setPjData({ ...pjData, state_registration: e.target.value })}
                      placeholder="Inscrição estadual"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pj-address">Endereço</Label>
                    <Input
                      id="pj-address"
                      value={pjData.address}
                      onChange={(e) => setPjData({ ...pjData, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              ) : (
                /* ========== PESSOA FÍSICA ========== */
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={pfData.cpf}
                      onChange={(e) => setPfData({ ...pfData, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={pfData.rg}
                      onChange={(e) => setPfData({ ...pfData, rg: e.target.value.replace(/\D/g, '') })}
                      placeholder="Apenas números"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pf-name">Nome Completo *</Label>
                    <Input
                      id="pf-name"
                      value={pfData.name}
                      onChange={(e) => setPfData({ ...pfData, name: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !pfData.birth_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pfData.birth_date
                            ? format(pfData.birth_date, "dd/MM/yyyy", { locale: ptBR })
                            : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pfData.birth_date}
                          onSelect={(date) => setPfData({ ...pfData, birth_date: date })}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={ptBR}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select
                      value={pfData.gender}
                      onValueChange={(v) => setPfData({ ...pfData, gender: v as Gender })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(genderLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado Civil</Label>
                    <Select
                      value={pfData.marital_status}
                      onValueChange={(v) => setPfData({ ...pfData, marital_status: v as MaritalStatus })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(maritalStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pf-phone">Telefone</Label>
                    <Input
                      id="pf-phone"
                      value={pfData.phone}
                      onChange={(e) => setPfData({ ...pfData, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pf-email">Email</Label>
                    <Input
                      id="pf-email"
                      type="email"
                      value={pfData.email}
                      onChange={(e) => setPfData({ ...pfData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pf-address">Endereço</Label>
                    <Input
                      id="pf-address"
                      value={pfData.address}
                      onChange={(e) => setPfData({ ...pfData, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/clients')} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={createClient.isPending || isSearchingCNPJ}>
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
