import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { business } = useBusiness();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);

  // Handle return from payment
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setPaymentStatus('success');
      toast({
        title: 'Paiement réussi !',
        description: 'Votre abonnement est maintenant actif.',
      });
    } else if (status === 'cancelled') {
      setPaymentStatus('cancelled');
      toast({
        title: 'Paiement annulé',
        description: 'Vous pouvez réessayer quand vous le souhaitez.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const handleSubscribe = async (planId: string, planName: string, price: number) => {
    if (!business) {
      toast({
        title: 'Erreur',
        description: 'Veuillez vous connecter pour souscrire',
        variant: 'destructive',
      });
      return;
    }

    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('kartapay-checkout', {
        body: {
          planId,
          planName,
          amount: price,
          businessId: business.id,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || 'Erreur lors de la création du paiement');
      }

      // Redirect to Kartapay checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
      setLoading(null);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Paiement réussi !</h2>
            <p className="text-muted-foreground">
              Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités !
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Paiement annulé</h2>
            <p className="text-muted-foreground">
              Votre paiement a été annulé. Vous pouvez réessayer quand vous le souhaitez.
            </p>
            <Button onClick={() => setPaymentStatus(null)} className="w-full">
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  onClick={() => handleSubscribe(plan.id, plan.name, plan.price)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Choisir ce plan'
                  )}
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