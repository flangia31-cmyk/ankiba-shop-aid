import { useState, useEffect } from 'react';
import { Search, Filter, Package, Phone, MapPin, Store, X, Shirt, Smartphone, Home, Utensils, Dumbbell, Sparkles, Baby, Car, BookOpen, Gift, Laptop, Watch, Headphones, Camera, Gamepad2, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  image_url: string | null;
  category_id: string | null;
  business_id: string;
}

interface Business {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface ProductWithBusiness extends Product {
  business: Business;
}

// Category icon mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Vêtements': Shirt,
  'Électronique': Smartphone,
  'Maison': Home,
  'Alimentation': Utensils,
  'Sport': Dumbbell,
  'Beauté': Sparkles,
  'Bébé': Baby,
  'Auto': Car,
  'Livres': BookOpen,
  'Cadeaux': Gift,
  'Informatique': Laptop,
  'Montres': Watch,
  'Audio': Headphones,
  'Photo': Camera,
  'Jeux': Gamepad2,
};

const getIconForCategory = (categoryName: string) => {
  // Try to find a matching icon
  for (const [key, Icon] of Object.entries(categoryIcons)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(categoryName.toLowerCase())) {
      return Icon;
    }
  }
  return ShoppingBag; // Default icon
};

export default function Catalogue() {
  const [products, setProducts] = useState<ProductWithBusiness[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBusiness | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          business:businesses(id, name, phone, address)
        `)
        .gt('stock_quantity', 0)
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      // Transform the data to flatten the business relationship
      const transformedData = (data || []).map(item => ({
        ...item,
        business: item.business as unknown as Business
      }));

      setProducts(transformedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Remove duplicates by name
      const uniqueCategories = (data || []).reduce((acc: Category[], curr) => {
        if (!acc.find(c => c.name === curr.name)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + ' FC';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      categories.find(c => c.id === product.category_id)?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategoryNames = [...new Set(categories.map(c => c.name))];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Catalogue</h1>
              <p className="text-sm text-muted-foreground">Découvrez nos produits</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters dropdown */}
          {showFilters && (
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {uniqueCategoryNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCategory('all')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Visual Categories */}
      {uniqueCategoryNames.length > 0 && (
        <div className="bg-card border-b border-border py-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 px-4">
              {/* All category */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex flex-col items-center gap-2 min-w-[70px] transition-all ${
                  selectedCategory === 'all' 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-muted hover:bg-accent'
                }`}>
                  <Package className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium truncate max-w-[70px]">Tout</span>
              </button>

              {/* Category buttons */}
              {uniqueCategoryNames.map((name) => {
                const IconComponent = getIconForCategory(name);
                const isSelected = selectedCategory === name;
                
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(name)}
                    className={`flex flex-col items-center gap-2 min-w-[70px] transition-all ${
                      isSelected 
                        ? 'text-primary' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                        : 'bg-muted hover:bg-accent'
                    }`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium truncate max-w-[70px]">{name}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">Aucun produit trouvé</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Essayez une autre recherche' : 'Aucun produit disponible'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 text-xs">
                    {product.stock_quantity} en stock
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-primary font-bold mt-1">{formatPrice(product.selling_price)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Store className="h-3 w-3" />
                    {product.business?.name || 'Vendeur'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Image */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Price and Stock */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(selectedProduct.selling_price)}
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedProduct.stock_quantity} en stock
                </Badge>
              </div>

              {/* Seller Info */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Informations du vendeur
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedProduct.business?.name || 'Non disponible'}</span>
                    </div>
                    
                    {selectedProduct.business?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`tel:${selectedProduct.business.phone}`}
                          className="text-primary hover:underline"
                        >
                          {selectedProduct.business.phone}
                        </a>
                      </div>
                    )}
                    
                    {selectedProduct.business?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{selectedProduct.business.address}</span>
                      </div>
                    )}
                  </div>

                  {selectedProduct.business?.phone && (
                    <Button 
                      className="w-full mt-2"
                      asChild
                    >
                      <a href={`tel:${selectedProduct.business.phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Contacter le vendeur
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}