import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Loader2, Building2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding() {
  const { user, profile } = useAuth();
  const { refetch } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgName.trim()) return;

    setLoading(true);
    try {
      const slug = generateSlug(orgName) + '-' + Date.now().toString(36);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update user_roles with organization_id and make user admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ organization_id: org.id, role: 'admin' })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      await refetch();
      toast.success('¡Taller creado correctamente!');
      navigate('/');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error('Error al crear el taller', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setLoading(true);
    try {
      // Find organization by slug (invite code)
      const { data: org, error: findError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', inviteCode.trim().toLowerCase())
        .single();

      if (findError || !org) {
        toast.error('Código de invitación no válido');
        setLoading(false);
        return;
      }

      // Update profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update user_roles with organization_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      await refetch();
      toast.success(`¡Te has unido a ${org.name}!`);
      navigate('/');
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error('Error al unirse al taller', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">¡Bienvenido, {profile?.full_name}!</CardTitle>
            <CardDescription>
              Configura tu espacio de trabajo para comenzar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Crear Taller
              </TabsTrigger>
              <TabsTrigger value="join" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Unirse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Crea tu propio taller</p>
                  <p className="text-xs text-muted-foreground">
                    Serás el administrador y podrás invitar a tu equipo después.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nombre del Taller</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ej: Taller García"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Taller
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Únete a un taller existente</p>
                  <p className="text-xs text-muted-foreground">
                    Pide el código de invitación al administrador del taller.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Código de Invitación</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="taller-garcia-abc123"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unirse al Taller
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
