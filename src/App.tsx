import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { OnlineStatusProvider } from "@/hooks/useOnlineStatus";

import { RealtimeNotificationListener } from "@/components/notifications/RealtimeNotificationListener";
import { AuthCallback } from "@/components/auth/AuthCallback";
import Index from "./pages/Index";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import TimeLogs from "./pages/TimeLogs";
import Notifications from "./pages/Notifications";
import AdminAttendance from "./pages/AdminAttendance";
import AdminData from "./pages/AdminData";
import Productivity from "./pages/Productivity";
import Alerts from "./pages/Alerts";
import CalendarPage from "./pages/Calendar";
import UserManagement from "./pages/UserManagement";
import InstallApp from "./pages/InstallApp";
import Settings from "./pages/Settings";
import RepairHistory from "./pages/RepairHistory";
import PlateHistory from "./pages/PlateHistory";
import ClientHistory from "./pages/ClientHistory";
import Appointments from "./pages/Appointments";
import Workload from "./pages/Workload";
import Onboarding from "./pages/Onboarding";
import OrganizationSettings from "./pages/OrganizationSettings";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AvisoLegal from "./pages/legal/AvisoLegal";
import PoliticaPrivacidad from "./pages/legal/PoliticaPrivacidad";
import PoliticaCookies from "./pages/legal/PoliticaCookies";
import TerminosCondiciones from "./pages/legal/TerminosCondiciones";
import ContratoEncargado from "./pages/legal/ContratoEncargado";
import TextosLegales from "./pages/legal/TextosLegales";
import LegalIndex from "./pages/legal/LegalIndex";
import TaskTemplates from "./pages/TaskTemplates";
import PortalView from "./pages/PortalView";
import AppointmentConfirm from "./pages/AppointmentConfirm";
import AdminAudit from "./pages/AdminAudit";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Disable browser's native scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <OnlineStatusProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RealtimeNotificationListener />
            <BrowserRouter>
              <ScrollToTop />
              <AuthCallback />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/organization" element={<OrganizationSettings />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/vehicles/:id" element={<VehicleDetail />} />
                <Route path="/time-logs" element={<TimeLogs />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/admin/attendance" element={<AdminAttendance />} />
                <Route path="/admin/productivity" element={<Productivity />} />
                <Route path="/admin/alerts" element={<Alerts />} />
                <Route path="/admin/data" element={<AdminData />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/install" element={<InstallApp />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/repair-history" element={<RepairHistory />} />
                <Route path="/plate-history" element={<PlateHistory />} />
                <Route path="/clients/:ownerId" element={<ClientHistory />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/admin/workload" element={<Workload />} />
                <Route path="/settings/templates" element={<TaskTemplates />} />
                <Route path="/c/:token" element={<PortalView />} />
                <Route path="/cita/:token" element={<AppointmentConfirm />} />
                <Route path="/admin/audit" element={<AdminAudit />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/legal" element={<LegalIndex />} />
                <Route path="/aviso-legal" element={<AvisoLegal />} />
                <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
                <Route path="/politica-cookies" element={<PoliticaCookies />} />
                <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
                <Route path="/contrato-encargado" element={<ContratoEncargado />} />
                <Route path="/textos-legales" element={<TextosLegales />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OnlineStatusProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
