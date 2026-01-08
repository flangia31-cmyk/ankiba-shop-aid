import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

interface Subscription {
  id: string;
  status: string;
  plan_id: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  started_at: string | null;
}

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { business } = useBusiness();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activationCode, setActivationCode] = useState('');

  useEffect(() => {
    if (business) {
      fetchSubscription();
    }
  }, [business]);

  const fetchSubscription = async () => {
    if (!business) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }
      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!business || !activationCode.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un code d\'activation',
        variant: 'destructive',
      });
      return;
    }

    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-subscription', {
        body: {
          activationCode: activationCode.trim(),
          businessId: business.id,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || 'Erreur lors de l\'activation');
      }

      toast({
        title: 'Succès !',
        description: 'Votre abonnement est maintenant actif pour 1 an.',
      });
      
      setActivationCode('');
      fetchSubscription();
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Code d\'activation invalide',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isTrialExpired = () => {
    if (!subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at) < new Date();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trialDaysRemaining = getTrialDaysRemaining();
  const trialExpired = isTrialExpired();
  const isActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Abonnement</h1>
            <p className="text-sm text-muted-foreground">Gérez votre abonnement</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              {isActive ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : trialExpired ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Clock className="h-5 w-5 text-primary" />
              )}
              Statut de l'abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isActive ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold text-green-600">Abonnement actif</p>
                <p className="text-sm text-muted-foreground">
                  Expire le: {formatDate(subscription?.expires_at)}
                </p>
              </div>
            ) : subscription?.status === 'trial' ? (
              <div className="space-y-2">
                {trialExpired ? (
                  <>
                    <p className="text-lg font-semibold text-destructive">Période d'essai expirée</p>
                    <p className="text-sm text-muted-foreground">
                      Votre période d'essai gratuite est terminée.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-primary">Période d'essai</p>
                    <p className="text-sm text-muted-foreground">
                      Il vous reste <span className="font-bold">{trialDaysRemaining} jours</span> d'essai gratuit.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expire le: {formatDate(subscription?.trial_ends_at)}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground">Aucun abonnement</p>
            )}
          </CardContent>
        </Card>

        {/* Pricing Card - Show when not active */}
        {!isActive && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Abonnement Annuel</CardTitle>
              <CardDescription className="text-center">
                Accès complet à toutes les fonctionnalités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">5 000</span>
                <span className="text-xl font-semibold text-muted-foreground"> KMF</span>
                <p className="text-sm text-muted-foreground">par an</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold">Comment activer votre compte :</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Effectuez un paiement de 5 000 KMF</li>
                  <li>Contactez-nous pour recevoir votre code d'activation</li>
                  <li>Entrez le code ci-dessous pour activer votre compte</li>
                </ol>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Informations de paiement
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Montant:</span> 5 000 KMF</p>
                  <p><span className="font-medium">Durée:</span> 1 an</p>
                  <p className="text-muted-foreground mt-2">
                    Après paiement, vous recevrez un code d'activation pour activer votre compte commerçant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activation Code Card */}
        {!isActive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Activer avec un code
              </CardTitle>
              <CardDescription>
                Entrez le code d'activation reçu après votre paiement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Entrez votre code d'activation"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="text-center text-lg tracking-wider"
              />
              <Button 
                className="w-full" 
                onClick={handleActivate}
                disabled={activating || !activationCode.trim()}
              >
                {activating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activation...
                  </>
                ) : (
                  'Activer mon compte'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active subscription info */}
        {isActive && (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Compte actif</h3>
                <p className="text-sm text-muted-foreground">
                  Vous avez accès à toutes les fonctionnalités jusqu'au {formatDate(subscription?.expires_at)}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}