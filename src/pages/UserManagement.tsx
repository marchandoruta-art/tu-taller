import { useState, useEffect, forwardRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Profile, UserRole, ROLE_LABELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Trash2, Edit, Loader2, Shield } from 'lucide-react';

interface UserWithRole extends Profile {
  role?: UserRole;
}

const UserManagement = forwardRef<HTMLDivElement>((_, ref) => {
  const { role } = useAuth();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '' });
  const [newRole, setNewRole] = useState<UserRole>('mecanico');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [role, navigate]);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data?.map((r) => [r.user_id, r.role as UserRole]));
      
      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map((profile) => ({
        ...profile,
        role: rolesMap.get(profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error('Completa todos los campos');
      return;
    }

    if (!organizationId) {
      toast.error('No se encontró la organización');
      return;
    }

    setProcessing(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: newUser.fullName },
        },
      });

      if (error) throw error;

      // After signup, update the profile and role with organization_id
      if (authData.user) {
        // Wait for trigger to create profile and role, then update them
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update profile with organization_id
        await supabase
          .from('profiles')
          .update({ organization_id: organizationId })
          .eq('user_id', authData.user.id);
        
        // Update role with organization_id
        await supabase
          .from('user_roles')
          .update({ organization_id: organizationId })
          .eq('user_id', authData.user.id);
      }

      toast.success('Usuario creado correctamente');
      setShowNewUserDialog(false);
      setNewUser({ email: '', password: '', fullName: '' });
      
      // Refresh users list
      setTimeout(() => fetchUsers(), 500);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success('Rol actualizado correctamente');
      setShowEditRoleDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(`¿Estás seguro de eliminar a ${user.full_name}?`)) return;

    try {
      // Delete profile (will cascade to user_roles due to foreign key)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast.success('Usuario eliminado correctamente');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'oficina':
        return 'default';
      case 'chapista':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div ref={ref} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra los usuarios y sus roles</p>
          </div>
          
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="Nombre del usuario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <Button 
                  onClick={handleCreateUser} 
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Crear Usuario
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Usuarios Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role ? ROLE_LABELS[user.role] : 'Sin rol'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role || 'mecanico');
                            setShowEditRoleDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Rol de {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mecanico">Mecánico</SelectItem>
                    <SelectItem value="chapista">Chapista</SelectItem>
                    <SelectItem value="oficina">Oficina</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleUpdateRole} 
                className="w-full"
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
});

UserManagement.displayName = 'UserManagement';

export default UserManagement;
