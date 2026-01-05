import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Business {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

interface BusinessContextType {
  business: Business | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching business:', error);
    }

    setBusiness(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBusiness();
  }, [user]);

  return (
    <BusinessContext.Provider value={{ business, loading, refetch: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
