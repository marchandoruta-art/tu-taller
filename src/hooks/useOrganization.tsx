import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  loading: boolean;
  hasOrganization: boolean;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async () => {
    if (!user || !profile) {
      setOrganization(null);
      setLoading(false);
      return;
    }

    try {
      // Get organization_id from profile using RPC to avoid RLS issues
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();

        if (orgData) {
          setOrganization(orgData as Organization);
        }
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrganization();
    }
  }, [user, profile, authLoading]);

  const organizationId = organization?.id || null;
  const hasOrganization = !!organization;

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizationId,
        loading: loading || authLoading,
        hasOrganization,
        refetch: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
