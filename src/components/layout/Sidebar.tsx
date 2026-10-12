import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { puedeGestionar } from '@/lib/permisos';
import { usePropietarioPlataforma } from '@/hooks/usePropietarioPlataforma';
import { useOrganization } from '@/hooks/useOrganization';
import { useLabels } from '@/hooks/useLabels';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Car,
  LayoutDashboard,
  Clock,
  LogOut,
  Wrench,
  Bell,
  BellRing,
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
  FileSpreadsheet,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { usePendingAssignedCount } from '@/hooks/usePendingAssignedCount';
import { useActiveTimersCount } from '@/hooks/useActiveTimersCount';

const navigation = [
  { key: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { key: 'nav.vehicles', href: '/vehicles', icon: Car, badgeKey: 'pending' as const },
  { key: 'nav.plateSearch', href: '/plate-history', icon: Search },
  { key: 'nav.archived', href: '/repair-history', icon: Archive },
  { key: 'nav.deliveries', href: '/calendar', icon: Calendar },
  { key: 'nav.appointments', href: '/appointments', icon: CalendarCheck },
  { key: 'nav.timeLogs', href: '/time-logs', icon: Clock },
  { key: 'nav.notifications', href: '/notifications', icon: Bell },
  { key: 'nav.installApp', href: '/install', icon: Download },
];

// Reparto acordado con el cliente: la oficina gestiona el taller, pero los
// ajustes, las cuentas de la gente y el fichaje de la plantilla son de admin.
const adminNavigation = [
  { key: 'nav.activeWork', href: '/admin/active-work', icon: Timer, badgeKey: 'active' as const },
  { key: 'nav.users', href: '/users', icon: Users, soloAdmin: true },
  { key: 'nav.myWorkshop', href: '/organization', icon: Building2, soloAdmin: true },
  { key: 'nav.workload', href: '/admin/workload', icon: Users },
  { key: 'nav.attendance', href: '/admin/attendance', icon: CalendarClock, soloAdmin: true },
  { key: 'nav.productivity', href: '/admin/productivity', icon: BarChart3 },
  { key: 'nav.alerts', href: '/admin/alerts', icon: AlertTriangle },
  { key: 'nav.dataManagement', href: '/admin/data', icon: Database },
  { key: 'nav.importData', href: '/admin/import', icon: FileSpreadsheet },
  { key: 'nav.reminders', href: '/reminders', icon: BellRing },
  { key: 'nav.auditLog', href: '/admin/audit', icon: ShieldCheck },
  { key: 'nav.legal', href: '/legal', icon: Scale },
  { key: 'nav.taskTemplates', href: '/settings/templates', icon: ClipboardList },
  { key: 'nav.settings', href: '/settings', icon: Settings, soloAdmin: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, role, signOut } = useAuth();
  const { organization } = useOrganization();
  const { esPropietario } = usePropietarioPlataforma();
  const location = useLocation();
  const pendingCount = usePendingAssignedCount();
  const activeTimersCount = useActiveTimersCount();
  const { t } = useTranslation();
  const labels = useLabels();

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
              <p className="text-xs text-muted-foreground">{t('nav.management')}</p>
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
                  key={item.key}
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
                  title={collapsed ? `${t(item.key)}${badge ? ` (${t('nav.pendingCount', { count: badge })})` : ''}` : undefined}
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
                      <span className="flex-1">{t(item.key)}</span>
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

          {esPropietario && (
            <div className="pt-4">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('plataformaUI.titulo')}
                </p>
              )}
              <NavLink
                to="/propietario"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? t('plataformaUI.titulo') : undefined}
              >
                <Crown className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{t('plataformaUI.subtitulo')}</span>}
              </NavLink>
            </div>
          )}

          {puedeGestionar(role) && (
            <div className="pt-4">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('nav.admin')}
                </p>
              )}
              <div className="space-y-1">
                {adminNavigation
                  .filter((item) => role === 'admin' || !(item as any).soloAdmin)
                  .map((item) => {
                  const badge =
                    (item as any).badgeKey === 'active' && activeTimersCount > 0
                      ? activeTimersCount
                      : 0;
                  return (
                    <NavLink
                      key={item.key}
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
                      title={collapsed ? `${t(item.key)}${badge ? ` (${t('nav.activeCount', { count: badge })})` : ''}` : undefined}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon className={cn('h-5 w-5', badge > 0 && 'text-primary animate-pulse')} />
                        {badge > 0 && collapsed && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{t(item.key)}</span>
                          {badge > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center leading-none animate-pulse">
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
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
                    {role ? labels.role(role) : ''}
                  </p>
                </div>
              </div>
              <div className="px-1 pb-2">
                <LanguageSelector compact />
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  className="flex-1 justify-start text-muted-foreground hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.signOut')}
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
                title={t('nav.signOut')}
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
