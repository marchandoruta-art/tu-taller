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
import { useTranslation } from 'react-i18next';

interface Template {
  id: string;
  name: string;
  tasks: { text: string; done?: boolean }[];
  created_at: string;
}

export default function TaskTemplates() {
  const { t } = useTranslation();
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
      toast.error(t('adminUI.taskTemplates.toast.atLeastOneTask'));
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('task_templates')
        .update({ name: name.trim(), tasks: JSON.parse(JSON.stringify(tasks)) })
        .eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error(t('adminUI.taskTemplates.toast.saveError'));
      toast.success(t('adminUI.taskTemplates.toast.updated'));
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
      if (error) return toast.error(t('adminUI.taskTemplates.toast.createError'));
      toast.success(t('adminUI.taskTemplates.toast.created'));
    }
    setOpen(false);
    fetchTemplates();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (error) return toast.error(t('adminUI.taskTemplates.toast.deleteError'));
    toast.success(t('adminUI.taskTemplates.toast.deleted'));
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
              <h1 className="text-2xl font-bold">{t('adminUI.taskTemplates.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('adminUI.taskTemplates.subtitle')}</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> {t('adminUI.taskTemplates.new')}
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <ClipboardList className="h-10 w-10 mx-auto opacity-60" />
              <p>{t('adminUI.taskTemplates.emptyState')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
                  <CardTitle className="text-lg">{tpl.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tpl)}>
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
                          <AlertDialogTitle>{t('adminUI.taskTemplates.confirmDeleteTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('adminUI.taskTemplates.confirmDeleteDescription', { name: tpl.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('adminUI.taskTemplates.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(tpl.id)}>{t('adminUI.adminData.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {(tpl.tasks || []).map((task, idx) => (
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
              <DialogTitle>{editing ? t('adminUI.taskTemplates.editTitle') : t('adminUI.taskTemplates.newTitle')}</DialogTitle>
              <DialogDescription>{t('adminUI.taskTemplates.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">{t('adminUI.taskTemplates.name')}</Label>
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('adminUI.taskTemplates.namePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-tasks">{t('adminUI.taskTemplates.tasks')}</Label>
                <Textarea
                  id="tpl-tasks"
                  rows={8}
                  value={tasksText}
                  onChange={(e) => setTasksText(e.target.value)}
                  placeholder={t('adminUI.taskTemplates.tasksPlaceholder')}
                />
              </div>
              <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('adminUI.adminData.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
