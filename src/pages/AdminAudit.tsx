import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/exportCsv';
import { Profile } from '@/lib/types';

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  vehicle_deleted: '🗑️ Vehículo borrado',
  vehicle_reassigned: '🔄 Reasignación',
  client_approval_response: '📬 Respuesta cliente',
};

export default function AdminAudit() {
  const { role } = useAuth();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (role !== 'admin') { navigate('/'); return; }
    if (!organizationId) return;
    fetch();
  }, [role, organizationId]);

  const fetch = async () => {
    setLoading(true);
    const [aRes, pRes] = await Promise.all([
      supabase.from('audit_log').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('*').eq('organization_id', organizationId),
    ]);
    setEntries((aRes.data as any) || []);
    setProfiles((pRes.data as any) || []);
    setLoading(false);
  };

  const getName = (id: string | null) => id ? profiles.find(p => p.user_id === id)?.full_name || 'Usuario' : 'Sistema';

  const filtered = useMemo(() => entries.filter(e => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (userFilter !== 'all' && e.user_id !== userFilter) return false;
    if (from && new Date(e.created_at) < new Date(from)) return false;
    if (to && new Date(e.created_at) > new Date(to + 'T23:59:59')) return false;
    return true;
  }), [entries, actionFilter, userFilter, from, to]);

  const exportCsv = () => {
    downloadCsv('log-auditoria', filtered, [
      { key: 'created_at', label: 'Fecha', value: (r) => format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss') },
      { key: 'user', label: 'Usuario', value: (r) => getName(r.user_id) },
      { key: 'action', label: 'Acción', value: (r) => ACTION_LABELS[r.action] || r.action },
      { key: 'entity', label: 'Entidad', value: (r) => `${r.entity_type}:${r.entity_id || ''}` },
      { key: 'details', label: 'Detalles', value: (r) => JSON.stringify(r.details) },
    ]);
  };

  const actionOptions = Array.from(new Set(entries.map(e => e.action)));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary"/> Log de auditoría
            </h1>
            <p className="text-sm text-muted-foreground">Registro de acciones importantes en el taller</p>
          </div>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4"/> Exportar
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4"/>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="Acción"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actionOptions.map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue placeholder="Usuario"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Desde"/>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Hasta"/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Eventos ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No hay eventos que coincidan.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((e) => (
                  <div key={e.id} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ACTION_LABELS[e.action] || e.action}</Badge>
                        <span className="text-sm font-medium">{getName(e.user_id)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "d MMM yyyy, HH:mm:ss", { locale: es })}
                      </span>
                    </div>
                    {e.details && Object.keys(e.details).length > 0 && (
                      <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(e.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
