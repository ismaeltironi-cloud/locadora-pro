import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import logo from '@/assets/logo.ico';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    checkIfBootstrapNeeded();
  }, []);

  const checkIfBootstrapNeeded = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        method: 'POST',
        body: { checkOnly: true },
      });

      if (error) {
        // If function fails, assume bootstrap needed
        setIsBootstrap(true);
      } else if (data?.exists) {
        setIsBootstrap(false);
      } else {
        setIsBootstrap(true);
      }
    } catch (error) {
      console.error('Error checking bootstrap:', error);
      // Try a direct query instead
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      setIsBootstrap(!profiles || profiles.length === 0);
    } finally {
      setCheckingBootstrap(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        body: { email, password, fullName, username },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Administrador criado',
        description: 'Agora você pode fazer login com suas credenciais.',
      });

      setIsBootstrap(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar admin',
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Lookup email by username via secure RPC
      const { data, error: lookupError } = await supabase.rpc('get_email_for_login', {
        _username: username.toLowerCase().trim(),
      });

      if (lookupError || !data || data.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: 'Usuário não encontrado',
        });
        setIsLoading(false);
        return;
      }

      // Sign in with the email
      const { error } = await supabase.auth.signInWithPassword({
        email: data[0].email,
        password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials'
            ? 'Usuário ou senha incorretos'
            : error.message,
        });
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: 'Erro desconhecido',
      });
    }

    setIsLoading(false);
  };

  if (loading || checkingBootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isBootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-card animate-fade-in">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full gradient-hero">
              <UserPlus className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Configuração Inicial</CardTitle>
              <CardDescription>
                Crie o primeiro usuário administrador do sistema
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bootstrapUsername">Usuário</Label>
                <Input
                  id="bootstrapUsername"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Administrador'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-card animate-fade-in">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full overflow-hidden">
            <img src={logo} alt="Urso Auto Service" className="h-16 w-16 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Urso Auto Service</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="seu.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
