import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const { isActive, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Pages that don't require active subscription
  const allowedWithoutSubscription = ['/subscription', '/settings'];
  const isAllowedPage = allowedWithoutSubscription.includes(location.pathname);

  if (authLoading || businessLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no business yet, allow access (they might be setting up)
  if (!business) {
    return <>{children}</>;
  }

  // If subscription is not active and trying to access restricted pages
  if (!isActive && !isAllowedPage) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}