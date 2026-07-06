import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ActiveTimerBanner } from '@/components/timer/ActiveTimerBanner';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setMobileOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={cn(
        isMobile && !mobileOpen && "hidden",
        isMobile && mobileOpen && "block"
      )}>
        <Sidebar 
          collapsed={isMobile ? false : collapsed} 
          onToggle={handleToggle} 
        />
      </div>

      {/* Main content */}
      <main 
        className={cn(
          "transition-all duration-300 min-h-screen",
          isMobile ? "pl-0" : (collapsed ? "pl-16" : "pl-64")
        )}
      >
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileOpen(true)}
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold">Autos Formentera</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                  window.dispatchEvent(event);
                }}
                title="Buscar (Cmd+K)"
              >
                <Search className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
        )}
        
        <div className="p-4 md:p-6 pb-20">{children}</div>
      </main>
      <ActiveTimerBanner />
      <CommandPalette />
    </div>
  );
}
