import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, User, Phone, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  credit_balance: number;
}

export default function Customers() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) {
      fetchCustomers();
    }
  }, [business]);

  const fetchCustomers = async () => {
    if (!business) return;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleAddCustomer = async () => {
    if (!business || !newName.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        name: newName.trim(),
        phone: newPhone.trim() || null
      });

    setSaving(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le client",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Client ajouté",
      description: `${newName} a été ajouté`
    });
    setNewName('');
    setNewPhone('');
    setDialogOpen(false);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.includes(search)
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
  };

  const totalCredit = customers.reduce((sum, c) => sum + Number(c.credit_balance), 0);

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mes Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-12 w-12">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  placeholder="Nom du client"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  placeholder="Numéro de téléphone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button 
                onClick={handleAddCustomer}
                className="w-full h-12"
                disabled={saving || !newName.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Ajouter le client'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Summary */}
      {totalCredit > 0 && (
        <Card className="border-0 shadow-md bg-warning/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total des crédits</span>
              <span className="text-lg font-bold text-warning">
                {formatPrice(totalCredit)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 text-base"
        />
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">Aucun client</p>
            <p className="text-muted-foreground">
              {search ? 'Aucun résultat trouvé' : 'Ajoutez votre premier client'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => (
            <Card 
              key={customer.id}
              className="border-0 shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {customer.name}
                    </h3>
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                  {customer.credit_balance > 0 && (
                    <Badge variant="secondary" className="bg-warning/20 text-warning">
                      {formatPrice(customer.credit_balance)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
