import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Products() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { business } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const showLowStock = searchParams.get('filter') === 'low-stock';

  useEffect(() => {
    if (business) {
      fetchProducts();
      fetchCategories();
    }
  }, [business]);

  const fetchProducts = async () => {
    if (!business) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!business) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    setCategories(data || []);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesLowStock = !showLowStock || product.stock_quantity <= product.min_stock_quantity;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  const isLowStock = (product: Product) => {
    return product.stock_quantity <= product.min_stock_quantity;
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {showLowStock ? 'Stock Bas' : 'Mes Produits'}
        </h1>
        <Button onClick={() => navigate('/products/new')} size="icon" className="h-12 w-12">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 text-base"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className="flex-shrink-0"
          >
            Tout
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className="flex-shrink-0"
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Products List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">Aucun produit</p>
            <p className="text-muted-foreground">
              {search ? 'Aucun résultat trouvé' : 'Ajoutez votre premier produit'}
            </p>
          </div>
          {!search && (
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(product => (
            <Card 
              key={product.id}
              className="border-0 shadow-md cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(product.selling_price)}
                    </p>
                  </div>

                  {/* Stock Badge */}
                  <div className="flex flex-col items-end gap-1">
                    {isLowStock(product) && (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    )}
                    <Badge 
                      variant={isLowStock(product) ? 'destructive' : 'secondary'}
                      className="text-sm"
                    >
                      {product.stock_quantity} en stock
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
