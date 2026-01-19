import { Link, useLocation } from 'react-router-dom';
import { Search, Store, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientNav() {
  const location = useLocation();
  
  // Only show on catalogue page (now also the home page)
  if (location.pathname !== '/catalogue' && location.pathname !== '/') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <Link
          to="/catalogue"
          className={cn(
            "flex flex-col items-center justify-center w-20 h-full transition-colors",
            "text-primary"
          )}
        >
          <Store className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Catalogue</span>
        </Link>
        
        <Link
          to="/auth"
          className={cn(
            "flex flex-col items-center justify-center w-20 h-full transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <LogIn className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Vendeur</span>
        </Link>
      </div>
    </nav>
  );
}
