import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { AuthForm } from '@/components/auth/AuthForm';
import Dashboard from './Dashboard';
import Onboarding from './Onboarding';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // User is authenticated but doesn't have an organization yet
  if (!hasOrganization) {
    return <Onboarding />;
  }

  return <Dashboard />;
};

export default Index;
