import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, Check, Shield, Users, Key, ArrowLeft, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';

interface ActivationCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by_business_id: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
  amount: number;
  duration_months: number;
}

interface Business {
  id: string;
  name: string;
  phone: string | null;
  user_id: string;
}

interface Subscription {
  id: string;
  business_id: string;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useRole();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, businessesRes, subsRes] = await Promise.all([
        supabase.from('activation_codes' as any).select('*').order('created_at', { ascending: false }),
        supabase.from('businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
      ]);

      if (codesRes.data) setCodes(codesRes.data as any);
      if (businessesRes.data) setBusinesses(businessesRes.data as any);
      if (subsRes.data) setSubscriptions(subsRes.data as any);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createCode = async (planType: 'monthly' | 'annual') => {
    const code = generateCode();
    const amount = planType === 'monthly' ? 1000 : 10000;
    const durationMonths = planType === 'monthly' ? 1 : 12;
    
    const { error } = await supabase
      .from('activation_codes' as any)
      .insert({ 
        code,
        amount,
        duration_months: durationMonths
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le code",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Code créé",
      description: `Code ${planType === 'monthly' ? 'mensuel' : 'annuel'} (${amount} FC) créé`
    });
    
    fetchData();
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase
      .from('activation_codes' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Code supprimé",
      description: "Le code a été supprimé"
    });
    
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getBusinessName = (businessId: string | null) => {
    if (!businessId) return 'N/A';
    const business = businesses.find(b => b.id === businessId);
    return business?.name || 'Inconnu';
  };

  const getSubscription = (businessId: string) => {
    return subscriptions.find(s => s.business_id === businessId);
  };

  const getExpiringSubscriptions = () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return subscriptions.filter(sub => {
      const expiryDate = sub.status === 'trial' ? sub.trial_ends_at : sub.expires_at;
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      return expiry > now && expiry <= sevenDaysFromNow;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 hover:bg-green-700">Actif</Badge>;
      case 'trial':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Essai</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Administration</h1>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Expiring Subscriptions Alert */}
        {getExpiringSubscriptions().length > 0 && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-500/10">
            <Bell className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Abonnements expirant bientôt
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {getExpiringSubscriptions().map(sub => {
                const business = businesses.find(b => b.id === sub.business_id);
                const expiryDate = sub.status === 'trial' ? sub.trial_ends_at : sub.expires_at;
                const daysLeft = Math.ceil((new Date(expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={sub.id} className="flex items-center justify-between">
                    <span className="font-medium">{business?.name || 'Inconnu'}</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-500">
                      {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                    </Badge>
                  </div>
                );
              })}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{businesses.length}</p>
              <p className="text-sm text-muted-foreground">Vendeurs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Key className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{codes.filter(c => !c.is_used).length}</p>
              <p className="text-sm text-muted-foreground">Codes disponibles</p>
            </CardContent>
          </Card>
        </div>

        {/* Activation Codes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Codes d'activation</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'annual')}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">1 000 FC/mois</SelectItem>
                  <SelectItem value="annual">10 000 FC/an</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => createCode(selectedPlan)}>
                <Plus className="h-4 w-4 mr-1" />
                Créer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {codes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun code créé
              </p>
            ) : (
              codes.map((code) => (
                <div 
                  key={code.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{code.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(code.code)}
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {code.is_used ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Utilisé par: {getBusinessName(code.used_by_business_id)}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Disponible
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {code.amount?.toLocaleString() || '10 000'} FC / {code.duration_months === 1 ? '1 mois' : '1 an'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {!code.is_used && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteCode(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Businesses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendeurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {businesses.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun vendeur inscrit
              </p>
            ) : (
              businesses.map((business) => {
                const sub = getSubscription(business.id);
                return (
                  <div 
                    key={business.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{business.name}</p>
                      {business.phone && (
                        <p className="text-sm text-muted-foreground">{business.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {sub && getStatusBadge(sub.status)}
                      {sub?.trial_ends_at && sub.status === 'trial' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expire le {new Date(sub.trial_ends_at).toLocaleDateString()}
                        </p>
                      )}
                      {sub?.expires_at && sub.status === 'active' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Jusqu'au {new Date(sub.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
