import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ClipboardList, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  tasks: { text: string; done?: boolean }[];
  created_at: string;
}

export default function TaskTemplates() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { organizationId } = useOrganization();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tasksText, setTasksText] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = role === 'admin' || role === 'oficina';

  useEffect(() => {
    if (!canManage) {
      navigate('/');
      return;
    }
    fetchTemplates();
  }, [canManage]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('task_templates')
      .select('id, name, tasks, created_at')
      .order('name', { ascending: true });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setTasksText('');
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setTasksText((t.tasks || []).map((x) => x.text).join('\n'));
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !user || !organizationId) return;
    const tasks = tasksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));
    if (tasks.length === 0) {
      toast.error('Añade al menos una tarea');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('task_templates')
        .update({ name: name.trim(), tasks: JSON.parse(JSON.stringify(tasks)) })
        .eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error('Error al guardar');
      toast.success('Plantilla actualizada');
    } else {
      const { error } = await supabase
        .from('task_templates')
        .insert([{
          name: name.trim(),
          tasks: JSON.parse(JSON.stringify(tasks)),
          organization_id: organizationId,
          created_by: user.id,
        }]);
      setSaving(false);
      if (error) return toast.error('Error al crear');
      toast.success('Plantilla creada');
    }
    setOpen(false);
    fetchTemplates();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (error) return toast.error('Error al eliminar');
    toast.success('Plantilla eliminada');
    fetchTemplates();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Plantillas de tareas</h1>
              <p className="text-sm text-muted-foreground">Listas reutilizables para aplicar en cualquier vehículo</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <ClipboardList className="h-10 w-10 mx-auto opacity-60" />
              <p>Aún no hay plantillas. Crea la primera para acelerar trabajos recurrentes como ITV, cambios de aceite o pre-entregas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará la plantilla "{t.name}". Los vehículos donde ya se aplicó no se ven afectados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(t.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {(t.tasks || []).map((task, idx) => (
                      <li key={idx}>{task.text}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
              <DialogDescription>Una tarea por línea.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Nombre</Label>
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Revisión ITV" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-tasks">Tareas</Label>
                <Textarea
                  id="tpl-tasks"
                  rows={8}
                  value={tasksText}
                  onChange={(e) => setTasksText(e.target.value)}
                  placeholder={'Revisar luces\nFrenos delanteros\nEstado neumáticos\nDirección y suspensión'}
                />
              </div>
              <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
