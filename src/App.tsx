import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OnlineStatusProvider } from "@/hooks/useOnlineStatus";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { RealtimeNotificationListener } from "@/components/notifications/RealtimeNotificationListener";
import Index from "./pages/Index";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import TimeLogs from "./pages/TimeLogs";
import Notifications from "./pages/Notifications";
import AdminAttendance from "./pages/AdminAttendance";
import AdminData from "./pages/AdminData";
import UserManagement from "./pages/UserManagement";
import InstallApp from "./pages/InstallApp";
import Settings from "./pages/Settings";
import RepairHistory from "./pages/RepairHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnlineStatusProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConnectionStatus />
          <RealtimeNotificationListener />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/vehicles/:id" element={<VehicleDetail />} />
              <Route path="/time-logs" element={<TimeLogs />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/data" element={<AdminData />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/install" element={<InstallApp />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/repair-history" element={<RepairHistory />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OnlineStatusProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
