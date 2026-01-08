import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';

interface Subscription {
  id: string;
  business_id: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  activation_code: string | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  isActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!business) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [business]);

  const getTrialDaysRemaining = (): number => {
    if (!subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const checkIsTrialExpired = (): boolean => {
    if (!subscription) return true;
    if (subscription.status === 'active') return false;
    if (!subscription.trial_ends_at) return true;
    return new Date(subscription.trial_ends_at) < new Date();
  };

  const checkIsActive = (): boolean => {
    if (!subscription) return false;
    if (subscription.status === 'active') {
      // Check if not expired
      if (subscription.expires_at) {
        return new Date(subscription.expires_at) > new Date();
      }
      return true;
    }
    if (subscription.status === 'trial') {
      return !checkIsTrialExpired();
    }
    return false;
  };

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscription, 
        loading, 
        isActive: checkIsActive(),
        isTrialExpired: checkIsTrialExpired(),
        trialDaysRemaining: getTrialDaysRemaining(),
        refetch: fetchSubscription 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}