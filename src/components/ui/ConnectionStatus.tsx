import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function ConnectionStatus() {
  const { isOnline } = useOnlineStatus();
  const { isSyncing, pendingCount, syncAllPending } = useOfflineSync();

  return (
    <div className={cn(
      "fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300",
      isOnline 
        ? pendingCount > 0 
          ? "bg-yellow-500/90 text-white" 
          : "bg-green-500/90 text-white"
        : "bg-red-500/90 text-white"
    )}>
      {isOnline ? (
        pendingCount > 0 ? (
          <>
            <Cloud className="h-4 w-4" />
            <span className="text-sm font-medium">{pendingCount} pendientes</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0 hover:bg-white/20"
              onClick={() => syncAllPending()}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Online</span>
          </>
        )
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            Sin conexión {pendingCount > 0 && `(${pendingCount} pendientes)`}
          </span>
        </>
      )}
    </div>
  );
}
