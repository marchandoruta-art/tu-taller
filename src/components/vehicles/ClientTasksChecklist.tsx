import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export interface ClientTask {
  text: string;
  done: boolean;
}

interface ClientTasksChecklistProps {
  vehicleId: string;
  tasks: ClientTask[];
  clientDescription?: string;
  onUpdate: (tasks: ClientTask[]) => void;
}

export function ClientTasksChecklist({ vehicleId, tasks, clientDescription, onUpdate }: ClientTasksChecklistProps) {
  const [newTask, setNewTask] = useState('');
  const [saving, setSaving] = useState(false);

  const saveTasks = async (updated: ClientTask[]) => {
    setSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ client_tasks: JSON.parse(JSON.stringify(updated)) })
      .eq('id', vehicleId);
    setSaving(false);
    if (error) {
      toast.error('Error al guardar tareas');
      return false;
    }
    onUpdate(updated);
    return true;
  };

  const addTask = async () => {
    const text = newTask.trim();
    if (!text) return;
    const updated = [...tasks, { text, done: false }];
    const ok = await saveTasks(updated);
    if (ok) setNewTask('');
  };

  const toggleTask = async (index: number) => {
    const updated = tasks.map((t, i) => i === index ? { ...t, done: !t.done } : t);
    await saveTasks(updated);
  };

  const removeTask = async (index: number) => {
    const updated = tasks.filter((_, i) => i !== index);
    await saveTasks(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Trabajos Solicitados
          </CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground font-medium">
              {doneCount}/{totalCount} ({progress}%)
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Show original description if exists and no tasks yet */}
        {clientDescription && totalCount === 0 && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
            {clientDescription}
          </p>
        )}

        {/* Task list */}
        {tasks.map((task, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              task.done ? 'bg-primary/5' : 'bg-muted/50'
            }`}
          >
            <Checkbox
              checked={task.done}
              onCheckedChange={() => toggleTask(index)}
              disabled={saving}
            />
            <span className={`flex-1 text-sm ${task.done ? 'line-through text-muted-foreground' : ''}`}>
              {task.text}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeTask(index)}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {/* Add new task */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva tarea... (Enter para añadir)"
            className="flex-1"
            disabled={saving}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={addTask}
            disabled={saving || !newTask.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
