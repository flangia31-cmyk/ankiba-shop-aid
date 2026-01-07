import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Store, LogOut, Loader2, Save, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { business, refetch } = useBusiness();
  const { toast } = useToast();
  
  const [businessName, setBusinessName] = useState(business?.name || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [address, setAddress] = useState(business?.address || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!business) return;

    setSaving(true);

    const { error } = await supabase
      .from('businesses')
      .update({
        name: businessName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null
      })
      .eq('id', business.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Modifications enregistrées",
      description: "Vos informations ont été mises à jour"
    });
    refetch();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>

      {/* Business Info */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5" />
            Ma Boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de la boutique</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro de téléphone"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse de la boutique"
              className="h-12"
            />
          </div>
          <Button 
            onClick={handleSave}
            className="w-full h-12"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Enregistrer
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/subscription">
            <Button variant="outline" className="w-full h-12 justify-between">
              Gérer mon abonnement
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="h-12 bg-secondary"
            />
          </div>
          <Button 
            variant="destructive"
            onClick={handleSignOut}
            className="w-full h-12"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
