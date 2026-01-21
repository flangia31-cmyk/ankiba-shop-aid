import { useState, useEffect } from 'react';
import { Search, Package, Phone, MapPin, Store, X, Shirt, Smartphone, Home, Utensils, Dumbbell, Sparkles, Baby, Car, BookOpen, Gift, Laptop, Watch, Headphones, Camera, Gamepad2, ShoppingBag, TrendingUp, Flame, Star, Heart, ChevronRight, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ProductImageGallery from '@/components/ProductImageGallery';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
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
  additionalImages?: string[];
}

// Category icon mapping with colors
const categoryConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'Vêtements': { icon: Shirt, color: 'from-pink-500 to-rose-500' },
  'Électronique': { icon: Smartphone, color: 'from-blue-500 to-cyan-500' },
  'Maison': { icon: Home, color: 'from-amber-500 to-orange-500' },
  'Alimentation': { icon: Utensils, color: 'from-green-500 to-emerald-500' },
  'Sport': { icon: Dumbbell, color: 'from-purple-500 to-violet-500' },
  'Beauté': { icon: Sparkles, color: 'from-pink-400 to-fuchsia-500' },
  'Bébé': { icon: Baby, color: 'from-sky-400 to-blue-500' },
  'Auto': { icon: Car, color: 'from-slate-500 to-gray-600' },
  'Livres': { icon: BookOpen, color: 'from-amber-600 to-yellow-500' },
  'Cadeaux': { icon: Gift, color: 'from-red-500 to-pink-500' },
  'Informatique': { icon: Laptop, color: 'from-indigo-500 to-blue-600' },
  'Montres': { icon: Watch, color: 'from-yellow-500 to-amber-500' },
  'Audio': { icon: Headphones, color: 'from-violet-500 to-purple-600' },
  'Photo': { icon: Camera, color: 'from-teal-500 to-cyan-500' },
  'Jeux': { icon: Gamepad2, color: 'from-red-500 to-orange-500' },
};

const getConfigForCategory = (categoryName: string) => {
  for (const [key, config] of Object.entries(categoryConfig)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(categoryName.toLowerCase())) {
      return config;
    }
  }
  return { icon: ShoppingBag, color: 'from-gray-500 to-slate-500' };
};

export default function Catalogue() {
  const [products, setProducts] = useState<ProductWithBusiness[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBusiness | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
        .eq('is_visible', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      const transformedData = (data || []).map(item => ({
        ...item,
        business: item.business as unknown as Business,
        additionalImages: [] as string[],
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

  const fetchProductImages = async (productId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId)
      .order('display_order');
    
    return (data || []).map(img => img.image_url);
  };

  const handleProductSelect = async (product: ProductWithBusiness) => {
    const additionalImages = await fetchProductImages(product.id);
    setSelectedProduct({ ...product, additionalImages });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  const calculateDiscount = (originalPrice: number, sellingPrice: number) => {
    if (originalPrice <= sellingPrice) return 0;
    return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      categories.find(c => c.id === product.category_id)?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategoryNames = [...new Set(categories.map(c => c.name))];
  const featuredProducts = products.slice(0, 6);
  const newArrivals = products.slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Modern Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-3 space-y-3">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-medium">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">AnkibaShop</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Trouvez tout ici</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className={`relative transition-all duration-200 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="pl-11 pr-4 h-11 rounded-xl bg-muted/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        {uniqueCategoryNames.length > 0 && (
          <div className="px-4 pb-3">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'gradient-primary text-white shadow-medium'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Tout
                </button>
                {uniqueCategoryNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(name)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      selectedCategory === name
                        ? 'gradient-primary text-white shadow-medium'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 space-y-6">
        {/* Promo Banner */}
        {!searchQuery && selectedCategory === 'all' && (
          <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 shadow-strong">
            <div className="relative z-10">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-2">
                <Flame className="w-3 h-3 mr-1" /> Offre Spéciale
              </Badge>
              <h2 className="text-xl font-bold text-white mb-1">
                Jusqu'à -50% sur tout
              </h2>
              <p className="text-white/80 text-sm mb-3">
                Découvrez nos meilleures offres du moment
              </p>
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold">
                Explorer
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -right-4 -bottom-12 w-24 h-24 bg-white/10 rounded-full" />
          </div>
        )}

        {/* Categories Grid */}
        {!searchQuery && selectedCategory === 'all' && uniqueCategoryNames.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">Catégories</h2>
              <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
                Voir tout <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {uniqueCategoryNames.slice(0, 8).map((name) => {
                const config = getConfigForCategory(name);
                const IconComponent = config.icon;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(name)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all hover:scale-105 active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-soft`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center line-clamp-1">{name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Flash Sales Section */}
        {!searchQuery && selectedCategory === 'all' && featuredProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Tendances</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
                Voir tout <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {featuredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="flex-shrink-0 w-36 overflow-hidden cursor-pointer border-0 shadow-soft hover:shadow-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Package className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                      )}
                      <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft hover:bg-white transition-colors">
                        <Heart className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </div>
                    <CardContent className="p-2.5">
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1.5">{product.name}</h3>
                      <p className="text-primary font-bold text-sm">{formatPrice(product.selling_price)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-muted-foreground">4.8</span>
                        <span className="text-xs text-muted-foreground">• {product.stock_quantity} dispo</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </section>
        )}

        {/* Products Grid */}
        <section>
          {(searchQuery || selectedCategory !== 'all') && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">
                {searchQuery ? `Résultats pour "${searchQuery}"` : selectedCategory}
              </h2>
              <span className="text-sm text-muted-foreground">{filteredProducts.length} produits</span>
            </div>
          )}
          
          {!searchQuery && selectedCategory === 'all' && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Pour vous</h2>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-soft animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <CardContent className="p-3">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Aucun produit trouvé</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Essayez une autre recherche' : 'Aucun produit disponible dans cette catégorie'}
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const discount = calculateDiscount(product.purchase_price * 1.5, product.selling_price);
                return (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden cursor-pointer border-0 shadow-soft hover:shadow-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <button 
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft hover:bg-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                      {discount > 0 && (
                        <Badge className="absolute top-2 left-2 gradient-primary border-0 text-white text-xs font-semibold">
                          -{discount}%
                        </Badge>
                      )}
                      {product.stock_quantity <= 5 && (
                        <Badge variant="secondary" className="absolute bottom-2 left-2 bg-black/70 text-white border-0 text-xs">
                          Stock limité
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-2">{product.name}</h3>
                      <div className="space-y-1">
                        <p className="text-primary font-bold">{formatPrice(product.selling_price)}</p>
                        {discount > 0 && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(Math.round(product.purchase_price * 1.5))}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-muted-foreground">4.8</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {product.business?.name?.split(' ')[0] || 'Vendeur'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-t-3xl">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-left">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="p-4 space-y-4">
              {/* Product Image Gallery */}
              <ProductImageGallery
                mainImage={selectedProduct.image_url}
                additionalImages={selectedProduct.additionalImages || []}
                productName={selectedProduct.name}
              />

              {/* Price and Stock */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(selectedProduct.selling_price)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">127 vendus</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {selectedProduct.stock_quantity} en stock
                </Badge>
              </div>

              {/* Seller Info */}
              <Card className="border-0 shadow-soft bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    {selectedProduct.business?.name || 'Vendeur'}
                  </h4>
                  
                  <div className="space-y-2 text-sm">
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
                      className="w-full gradient-primary border-0 shadow-medium"
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
