import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, Users, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';

const navItems = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/products', icon: Package, label: 'Produits' },
  { path: '/sales', icon: ShoppingCart, label: 'Ventes' },
  { path: '/customers', icon: Users, label: 'Clients' },
  { path: '/settings', icon: Settings, label: 'Réglages' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useRole();

  // Don't show nav on auth page, catalogue, or when creating new sale
  const hiddenPaths = ['/auth', '/sales/new', '/catalogue'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const items = isAdmin 
    ? [...navItems, { path: '/admin', icon: Shield, label: 'Admin' }]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map(item => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mb-1",
                isActive && "text-primary"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
