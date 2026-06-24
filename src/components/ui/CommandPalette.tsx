import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Car, Search, Calendar, Settings, Loader2, Archive, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, VehicleStatus } from '@/lib/types';

interface SearchResult {
  id: string;
  type: 'vehicle' | 'archive' | 'page';
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Vista general del taller', href: '/', icon: Car },
  { id: 'vehicles', type: 'page', title: 'Vehículos', subtitle: 'Lista de vehículos', href: '/vehicles', icon: Car },
  { id: 'plate-history', type: 'page', title: 'Buscar Matrícula', subtitle: 'Histórico completo por matrícula', href: '/plate-history', icon: Search },
  { id: 'calendar', type: 'page', title: 'Calendario de Entregas', subtitle: 'Entregas programadas', href: '/calendar', icon: Calendar },
  { id: 'appointments', type: 'page', title: 'Citas Previas', subtitle: 'Gestión de citas', href: '/appointments', icon: Calendar },
  { id: 'settings', type: 'page', title: 'Ajustes', subtitle: 'Configuración', href: '/settings', icon: Settings },
];

const normalizePlate = (value: string) => value.trim().toUpperCase().replace(/[\s-]/g, '');

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [vehicles, setVehicles] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search vehicles when query changes
  useEffect(() => {
    if (!open) return;
    if (query.length < 2) {
      setVehicles([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const searchTerm = `%${query.trim()}%`;
      const normalizedPlate = normalizePlate(query);
      const normalizedPlateTerm = `%${normalizedPlate}%`;

      const [vehiclesRes, archivesRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, plate, brand, model, status, archived, owner:owners(name)')
          .or(`plate.ilike.${searchTerm},plate.ilike.${normalizedPlateTerm},brand.ilike.${searchTerm},model.ilike.${searchTerm}`)
          .order('archived', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('vehicle_archives')
          .select('id, vehicle_id, plate, brand, model, archived_at, vehicle_snapshot, owner_snapshot')
          .or(`plate.ilike.${searchTerm},plate.ilike.${normalizedPlateTerm},brand.ilike.${searchTerm},model.ilike.${searchTerm}`)
          .order('archived_at', { ascending: false })
          .limit(5),
      ]);

      const liveResults = (vehiclesRes.data || []).map((v: any) => {
        const label = v.archived ? 'Histórico archivado' : 'En taller';
        return {
            id: v.id,
            type: 'vehicle' as const,
            title: v.plate,
            subtitle: `${label} · ${v.brand} ${v.model}${v.owner?.name ? ` · ${v.owner.name}` : ''} — ${STATUS_LABELS[v.status as VehicleStatus] || v.status}`,
            href: `/vehicles/${v.id}`,
            icon: v.archived ? Archive : Car,
          };
      });

      const archiveResults = (archivesRes.data || []).map((a: any) => {
        const snapshot = a.vehicle_snapshot || {};
        const owner = a.owner_snapshot || {};
        return {
          id: `archive-${a.id}`,
          type: 'archive' as const,
          title: a.plate,
          subtitle: `Histórico eliminado · ${a.brand} ${a.model}${owner?.name ? ` · ${owner.name}` : ''}${snapshot.status ? ` — ${STATUS_LABELS[snapshot.status as VehicleStatus] || snapshot.status}` : ''}`,
          href: `/plate-history?plate=${encodeURIComponent(a.plate)}`,
          icon: Trash2,
        };
      });

      const seen = new Set<string>();
      setVehicles([...liveResults, ...archiveResults].filter((result) => {
        const key = `${result.type}-${result.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 12));
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  const filteredPages = query.length > 0
    ? PAGES.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : PAGES;

  const allResults = [...vehicles, ...filteredPages];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por matrícula, marca, modelo o página..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-[320px] overflow-y-auto py-2">
          {allResults.length === 0 && query.length > 1 && !loading && (
            <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
          )}

          {vehicles.length > 0 && (
            <div className="px-2 pb-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Vehículos e histórico</p>
              {vehicles.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors',
                    selectedIndex === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  <r.icon className="h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.title}</p>
                    <p className={cn('text-xs truncate', selectedIndex === i ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{r.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredPages.length > 0 && (
            <div className="px-2 pb-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Páginas</p>
              {filteredPages.map((r, i) => {
                const idx = vehicles.length + i;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors',
                      selectedIndex === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <r.icon className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className={cn('text-xs truncate', selectedIndex === idx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{r.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd> Navegar</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> Ir</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> Cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
