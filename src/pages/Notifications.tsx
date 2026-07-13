import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Bell, Check, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification } from '@/lib/types';

function extractWhatsAppLink(message: string): { text: string; url: string } | null {
  const match = message.match(/(https:\/\/wa\.me\/[^\s]+)/);
  if (!match) return null;
  const text = message.replace(/\.?\s*Enviar WhatsApp:\s*https:\/\/wa\.me\/[^\s]+/, '').replace(/https:\/\/wa\.me\/[^\s]+/, '').trim();
  return { text, url: match[1] };
}

const TYPE_LABELS: Record<string, string> = {
  vehicle_finished: 'Vehículo terminado',
  pickup_overdue: 'Recogida pendiente',
  new_message: 'Nuevo mensaje',
  appointment_reminder: 'Recordatorio de cita',
  appointment_confirmed: 'Cita confirmada',
  appointment_cancelled: 'Cita cancelada',
  client_approval: 'Aprobación cliente',
  attendance_alert: 'Fichaje',
  stuck_vehicle: 'Vehículo estancado',
};

interface Group {
  key: string;
  type: string;
  vehicleId?: string;
  latestAt: string;
  items: Notification[];
  unread: number;
}

function groupNotifications(list: Notification[]): Group[] {
  const map = new Map<string, Group>();
  for (const n of list) {
    const key = `${n.type}::${n.vehicle_id || 'none'}`;
    let g = map.get(key);
    if (!g) {
      g = { key, type: n.type, vehicleId: n.vehicle_id, latestAt: n.created_at, items: [], unread: 0 };
      map.set(key, g);
    }
    g.items.push(n);
    if (!n.read) g.unread += 1;
    if (new Date(n.created_at) > new Date(g.latestAt)) g.latestAt = n.created_at;
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', ids);
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupNotifications(notifications);

  const toggle = (key: string) => setOpenKeys((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Marcar todas
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Agrupadas por tipo y vehículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tienes notificaciones</p>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => {
                  const isOpen = !!openKeys[g.key];
                  const label = TYPE_LABELS[g.type] || g.type;
                  const latest = g.items[0];
                  return (
                    <Collapsible key={g.key} open={isOpen} onOpenChange={() => toggle(g.key)}>
                      <div
                        className={`rounded-lg border transition-colors ${
                          g.unread > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2 p-3">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {g.items.length} {g.items.length === 1 ? 'mensaje' : 'mensajes'}
                              </span>
                              {g.unread > 0 && (
                                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                                  {g.unread} nuevas
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">{latest.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(g.latestAt), "d 'de' MMMM, HH:mm", { locale: es })}
                            </p>
                          </div>
                          {g.unread > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(g.items.filter((i) => !i.read).map((i) => i.id));
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <CollapsibleContent>
                          <div className="border-t border-border/50 p-3 space-y-2">
                            {g.items.map((n) => {
                              const wa = extractWhatsAppLink(n.message);
                              return (
                                <div
                                  key={n.id}
                                  className={`p-3 rounded border ${
                                    n.read ? 'bg-background border-border' : 'bg-primary/5 border-primary/20'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${n.read ? 'text-muted-foreground' : ''}`}>
                                        {wa ? wa.text : n.message}
                                      </p>
                                      {wa && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                          onClick={() => window.open(wa.url, '_blank')}
                                        >
                                          <MessageCircle className="mr-2 h-4 w-4" />
                                          WhatsApp
                                        </Button>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(n.created_at), "d MMM, HH:mm", { locale: es })}
                                      </p>
                                    </div>
                                    {!n.read && (
                                      <Button variant="ghost" size="sm" onClick={() => markAsRead([n.id])}>
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
