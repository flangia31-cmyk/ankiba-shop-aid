import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 5000,
    currency: 'XOF',
    period: 'mois',
    features: [
      'Jusqu\'à 100 produits',
      'Gestion des ventes',
      'Rapports basiques',
      'Support par email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15000,
    currency: 'XOF',
    period: 'mois',
    popular: true,
    features: [
      'Produits illimités',
      'Gestion des ventes',
      'Rapports avancés',
      'Gestion des clients',
      'Support prioritaire',
      'Exports Excel/PDF',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 35000,
    currency: 'XOF',
    period: 'mois',
    features: [
      'Tout de Pro',
      'Multi-boutiques',
      'API Access',
      'Support dédié',
      'Formation personnalisée',
      'Intégrations personnalisées',
    ],
  },
];

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      // Get Kartapay auth token
      const { data, error } = await supabase.functions.invoke('kartapay-auth');
      
      if (error || !data.success) {
        throw new Error(data?.error || 'Erreur d\'authentification Kartapay');
      }

      toast({
        title: 'Redirection vers le paiement...',
        description: 'Vous allez être redirigé vers Kartapay',
      });

      // For now, show success - full payment integration would require Kartapay checkout API
      console.log('Kartapay auth successful:', data);
      
      toast({
        title: 'Connexion Kartapay réussie',
        description: 'L\'intégration du paiement est en cours de configuration.',
      });

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Abonnement</h1>
            <p className="text-sm text-muted-foreground">Choisissez votre plan</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="text-center mb-6">
          <Crown className="h-12 w-12 text-primary mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-foreground">Passez au niveau supérieur</h2>
          <p className="text-muted-foreground">Débloquez toutes les fonctionnalités</p>
        </div>

        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Populaire
                  </span>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <span className="text-2xl font-bold">
                    {plan.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{plan.currency}/{plan.period}</span>
                  </span>
                </CardTitle>
                <CardDescription>
                  Facturé mensuellement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? 'Chargement...' : 'Choisir ce plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Paiement sécurisé via Kartapay. Annulez à tout moment.
        </p>
      </main>
    </div>
  );
}
