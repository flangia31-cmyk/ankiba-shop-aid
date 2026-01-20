import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientNav() {
  const location = useLocation();
  
  // Only show on catalogue page (now also the home page)
  if (location.pathname !== '/catalogue' && location.pathname !== '/') {
    return null;
  }

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/', active: true },
    { icon: Search, label: 'Explorer', path: '/catalogue', active: false },
    { icon: Heart, label: 'Favoris', path: '/catalogue', active: false },
    { icon: User, label: 'Vendeur', path: '/auth', active: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.active || location.pathname === item.path;
          const IconComponent = item.icon;
          
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <IconComponent className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-all",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
