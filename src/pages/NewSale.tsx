import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Search, 
  Package, 
  Plus, 
  Minus, 
  ShoppingCart,
  Trash2,
  Loader2,
  User
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export default function NewSale() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  useEffect(() => {
    if (business) {
      fetchProducts();
      fetchCustomers();
    }
  }, [business]);

  const fetchProducts = async () => {
    if (!business) return;

    const { data } = await supabase
      .from('products')
      .select('id, name, selling_price, stock_quantity')
      .eq('business_id', business.id)
      .gt('stock_quantity', 0)
      .order('name');

    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    if (!business) return;

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    setCustomers(data || []);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({
          title: "Stock insuffisant",
          description: `Seulement ${product.stock_quantity} disponible(s)`,
          variant: "destructive"
        });
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.product.stock_quantity) {
          toast({
            title: "Stock insuffisant",
            description: `Maximum ${item.product.stock_quantity} disponible(s)`,
            variant: "destructive"
          });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity, 
    0
  );

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = async () => {
    if (!business || !newCustomerName.trim()) return;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        name: newCustomerName.trim()
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le client",
        variant: "destructive"
      });
      return;
    }

    setCustomers([...customers, data]);
    setSelectedCustomerId(data.id);
    setNewCustomerName('');
    setShowNewCustomer(false);
  };

  const handleSubmit = async () => {
    if (!business || cart.length === 0) return;

    if (paymentType === 'credit' && !selectedCustomerId) {
      toast({
        title: "Client requis",
        description: "Sélectionnez un client pour une vente à crédit",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        business_id: business.id,
        customer_id: selectedCustomerId || null,
        total_amount: cartTotal,
        payment_type: paymentType
      })
      .select()
      .single();

    if (saleError) {
      setLoading(false);
      toast({
        title: "Erreur",
        description: "Impossible de créer la vente",
        variant: "destructive"
      });
      return;
    }

    // Create sale items
    const saleItems = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.selling_price,
      total_price: item.product.selling_price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    setLoading(false);

    if (itemsError) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement des articles",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Vente enregistrée !",
      description: `Total: ${formatPrice(cartTotal)}`
    });
    navigate('/sales');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex-1">
            Nouvelle Vente
          </h1>
          {cart.length > 0 && (
            <Button 
              onClick={() => setShowCart(true)}
              className="relative"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {formatPrice(cartTotal)}
              <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center">
                {cartItemsCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 text-base"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4 pt-0 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {search ? 'Aucun produit trouvé' : 'Aucun produit en stock'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product.id === product.id);
              return (
                <Card 
                  key={product.id}
                  className={`border-0 shadow-md cursor-pointer active:scale-[0.98] transition-all ${cartItem ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="w-full h-20 rounded-lg bg-secondary flex items-center justify-center mb-2">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-primary">
                        {formatPrice(product.selling_price)}
                      </span>
                      {cartItem && (
                        <Badge className="h-6 w-6 p-0 flex items-center justify-center">
                          {cartItem.quantity}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Stock: {product.stock_quantity}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sheet */}
      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Panier ({cartItemsCount} articles)</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-280px)]">
            {cart.map(item => (
              <Card key={item.product.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.product.selling_price)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border space-y-4">
            {/* Payment Type */}
            <div className="flex gap-2">
              <Button
                variant={paymentType === 'cash' ? 'default' : 'outline'}
                className="flex-1 h-12"
                onClick={() => setPaymentType('cash')}
              >
                Comptant
              </Button>
              <Button
                variant={paymentType === 'credit' ? 'default' : 'outline'}
                className="flex-1 h-12"
                onClick={() => setPaymentType('credit')}
              >
                Crédit
              </Button>
            </div>

            {/* Customer Selection (for credit) */}
            {paymentType === 'credit' && (
              <div className="space-y-2">
                {showNewCustomer ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nom du client"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="h-12"
                    />
                    <Button onClick={handleAddCustomer} className="h-12">
                      Ajouter
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewCustomer(false)}
                      className="h-12"
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-12 flex-1">
                        <User className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Sélectionner un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowNewCustomer(true)}
                      className="h-12 w-12"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Total and Submit */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(cartTotal)}
                </p>
              </div>
              <Button 
                onClick={handleSubmit}
                className="h-14 px-8 text-lg font-semibold"
                disabled={loading || cart.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Valider la vente'
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <Button 
            onClick={() => setShowCart(true)}
            className="w-full h-14 text-lg font-semibold shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Voir le panier ({cartItemsCount}) - {formatPrice(cartTotal)}
          </Button>
        </div>
      )}
    </div>
  );
}
