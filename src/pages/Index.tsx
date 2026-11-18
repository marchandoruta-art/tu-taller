import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import Dashboard from './Dashboard';
import Onboarding from './Onboarding';
import Landing from './Landing';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();

  // Post-login redirect: honor ?next=<same-origin relative path>
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.replace(next);
    }
  }, [user]);

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sin sesión, la raíz es la página pública. Si venía con ?next= (por
  // ejemplo desde el consentimiento OAuth) es que quería entrar: va al login
  // con el mismo destino.
  if (!user) {
    if (window.location.search.includes('next=')) {
      return <Navigate to={`/entrar${window.location.search}`} replace />;
    }
    return <Landing />;
  }

  // User is authenticated but doesn't have an organization yet
  if (!hasOrganization) {
    return <Onboarding />;
  }

  return <Dashboard />;
};

export default Index;

