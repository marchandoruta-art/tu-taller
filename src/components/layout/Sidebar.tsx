import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { ROLE_LABELS } from '@/lib/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Car,
  LayoutDashboard,
  Clock,
  LogOut,
  Wrench,
  Bell,
  Users,
  PanelLeftClose,
  PanelLeft,
  Download,
  CalendarClock,
  Database,
  Settings,
  BarChart3,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Building2,
  Scale,
  Archive,
  Search,
  ClipboardList,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { usePendingAssignedCount } from '@/hooks/usePendingAssignedCount';
import { useActiveTimersCount } from '@/hooks/useActiveTimersCount';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Vehículos', href: '/vehicles', icon: Car, badgeKey: 'pending' as const },
  { name: 'Buscar Matrícula', href: '/plate-history', icon: Search },
  { name: 'Archivados', href: '/repair-history', icon: Archive },
  { name: 'Entregas', href: '/calendar', icon: Calendar },
  { name: 'Citas Previas', href: '/appointments', icon: CalendarCheck },
  { name: 'Registro Tiempo', href: '/time-logs', icon: Clock },
  { name: 'Notificaciones', href: '/notifications', icon: Bell },
  { name: 'Instalar App', href: '/install', icon: Download },
];

const adminNavigation = [
  { name: 'Trabajo en Curso', href: '/admin/active-work', icon: Timer, badgeKey: 'active' as const },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Mi Taller', href: '/organization', icon: Building2 },
  { name: 'Carga Trabajo', href: '/admin/workload', icon: Users },
  { name: 'Control Horario', href: '/admin/attendance', icon: CalendarClock },
  { name: 'Productividad', href: '/admin/productivity', icon: BarChart3 },
  { name: 'Alertas', href: '/admin/alerts', icon: AlertTriangle },
  { name: 'Gestión Datos', href: '/admin/data', icon: Database },
  { name: 'Log Auditoría', href: '/admin/audit', icon: ShieldCheck },
  { name: 'Legal', href: '/legal', icon: Scale },
  { name: 'Plantillas Tareas', href: '/settings/templates', icon: ClipboardList },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, role, signOut } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();
  const pendingCount = usePendingAssignedCount();
  const activeTimersCount = useActiveTimersCount();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">
                {organization?.name || 'TallerPro'}
              </h1>
              <p className="text-xs text-muted-foreground">Gestión</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-10 flex items-center justify-center"
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const badge = item.badgeKey === 'pending' && pendingCount > 0 ? pendingCount : 0;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      collapsed && 'justify-center px-2'
                    )
                  }
                  title={collapsed ? `${item.name}${badge ? ` (${badge} pendientes)` : ''}` : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                    {badge > 0 && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {badge > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center leading-none">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {role === 'admin' && (
            <div className="pt-4">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Admin
                </p>
              )}
              <div className="space-y-1">
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        collapsed && 'justify-center px-2'
                      )
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {role === 'oficina' && (
            <div className="pt-4 space-y-1">
              <NavLink
                to="/settings/templates"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? 'Plantillas' : undefined}
              >
                <ClipboardList className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Plantillas Tareas</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-border p-2">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-2 px-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {profile?.full_name ? getInitials(profile.full_name) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {role ? ROLE_LABELS[role] : 'Usuario'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  className="flex-1 justify-start text-muted-foreground hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : '??'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={signOut}
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
