import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Plus,
  ShoppingCart
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayAmount: number;
  lowStockCount: number;
  totalProducts: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayAmount: 0,
    lowStockCount: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      fetchStats();
    }
  }, [business]);

  const fetchStats = async () => {
    if (!business) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's sales
    const { data: salesData } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('business_id', business.id)
      .gte('created_at', today.toISOString());

    const todaySales = salesData?.length || 0;
    const todayAmount = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

    // Fetch products stats
    const { data: productsData } = await supabase
      .from('products')
      .select('stock_quantity, min_stock_quantity')
      .eq('business_id', business.id);

    const totalProducts = productsData?.length || 0;
    const lowStockCount = productsData?.filter(
      p => p.stock_quantity <= p.min_stock_quantity
    ).length || 0;

    setStats({
      todaySales,
      todayAmount,
      lowStockCount,
      totalProducts
    });
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour 👋
        </h1>
        <p className="text-muted-foreground">
          {business?.name || 'Ma Boutique'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => navigate('/sales/new')}
          className="h-20 flex-col gap-2 text-base font-semibold"
          size="lg"
        >
          <ShoppingCart className="w-6 h-6" />
          Nouvelle Vente
        </Button>
        <Button 
          onClick={() => navigate('/products/new')}
          variant="secondary"
          className="h-20 flex-col gap-2 text-base font-semibold"
          size="lg"
        >
          <Plus className="w-6 h-6" />
          Ajouter Produit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Aujourd'hui</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ventes</p>
                  <p className="text-xl font-bold text-foreground">{stats.todaySales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-success/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recettes</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatPrice(stats.todayAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Inventaire</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Package className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Produits</p>
                  <p className="text-xl font-bold text-foreground">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-md cursor-pointer ${stats.lowStockCount > 0 ? 'bg-warning/10' : ''}`}
            onClick={() => navigate('/products?filter=low-stock')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.lowStockCount > 0 ? 'bg-warning/20' : 'bg-secondary'}`}>
                  <AlertTriangle className={`w-6 h-6 ${stats.lowStockCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock bas</p>
                  <p className="text-xl font-bold text-foreground">{stats.lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
