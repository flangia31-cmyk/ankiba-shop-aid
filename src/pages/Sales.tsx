import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Sale {
  id: string;
  total_amount: number;
  payment_type: string;
  created_at: string;
  customer: {
    name: string;
  } | null;
}

export default function Sales() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      fetchSales();
    }
  }, [business]);

  const fetchSales = async () => {
    if (!business) return;

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching sales:', error);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM 'à' HH:mm", { locale: fr });
  };

  // Group sales by date
  const groupedSales = sales.reduce((groups, sale) => {
    const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(sale);
    return groups;
  }, {} as Record<string, Sale[]>);

  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return "Aujourd'hui";
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return "Hier";
    }
    return format(date, 'd MMMM yyyy', { locale: fr });
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mes Ventes</h1>
        <Button onClick={() => navigate('/sales/new')} size="icon" className="h-12 w-12">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">Aucune vente</p>
            <p className="text-muted-foreground">
              Enregistrez votre première vente
            </p>
          </div>
          <Button onClick={() => navigate('/sales/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle vente
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSales).map(([date, daySales]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{formatGroupDate(date)}</span>
              </div>
              
              {daySales.map(sale => (
                <Card 
                  key={sale.id}
                  className="border-0 shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {formatPrice(sale.total_amount)}
                          </span>
                          <Badge 
                            variant={sale.payment_type === 'cash' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {sale.payment_type === 'cash' ? 'Comptant' : 'Crédit'}
                          </Badge>
                        </div>
                        {sale.customer && (
                          <p className="text-sm text-muted-foreground">
                            {sale.customer.name}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(sale.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
