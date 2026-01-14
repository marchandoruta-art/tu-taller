import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, ROLE_LABELS } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserWithRole extends Profile {
  role?: UserRole;
}

interface AssignUserDialogProps {
  vehicleId: string;
  currentAssignedTo?: string | null;
  onAssigned: () => void;
}

export function AssignUserDialog({ vehicleId, currentAssignedTo, onAssigned }: AssignUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    // Fetch user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (profiles) {
      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role as UserRole | undefined
      }));
      setUsers(usersWithRoles);
    }
    
    setLoading(false);
  };

  const assignUser = async (userId: string | null) => {
    setAssigning(true);
    
    const { error } = await supabase
      .from('vehicles')
      .update({ assigned_to: userId })
      .eq('id', vehicleId);

    if (error) {
      toast.error('Error al asignar usuario');
    } else {
      toast.success(userId ? 'Usuario asignado correctamente' : 'Asignación eliminada');
      onAssigned();
      setOpen(false);
    }
    
    setAssigning(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Asignar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Técnico</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {/* Option to unassign */}
            <button
              onClick={() => assignUser(null)}
              disabled={assigning}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                !currentAssignedTo 
                  ? "bg-primary/10 border-2 border-primary" 
                  : "hover:bg-muted border-2 border-transparent"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Sin asignar</p>
                <p className="text-xs text-muted-foreground">Dejar sin técnico asignado</p>
              </div>
              {!currentAssignedTo && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>

            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => assignUser(user.user_id)}
                disabled={assigning}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  currentAssignedTo === user.user_id 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "hover:bg-muted border-2 border-transparent"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role ? ROLE_LABELS[user.role] : 'Usuario'}
                  </p>
                </div>
                {currentAssignedTo === user.user_id && (
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
