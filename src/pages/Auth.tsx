import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Store, Mail, Lock, Building2, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erreur de connexion",
            description: error.message === "Invalid login credentials" 
              ? "Email ou mot de passe incorrect" 
              : error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Bienvenue !",
            description: "Connexion réussie",
          });
          navigate('/');
        }
      } else {
        if (!businessName.trim()) {
          toast({
            title: "Erreur",
            description: "Veuillez entrer le nom de votre boutique",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, businessName);
        if (error) {
          const errorMessage = error.message.includes("already registered")
            ? "Cet email est déjà utilisé"
            : error.message;
          toast({
            title: "Erreur d'inscription",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Compte créé !",
            description: "Votre boutique est prête",
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground">
            <Store className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ankiba Business</h1>
            <p className="text-muted-foreground mt-2">
              Gérez votre boutique simplement
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isLogin ? "Connexion" : "Créer un compte"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Connectez-vous à votre boutique" 
                : "Inscrivez votre boutique gratuitement"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-base">
                    Nom de la boutique
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="Ma Boutique"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-11 h-14 text-base"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-14 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-14 text-base"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-semibold mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  isLogin ? "Se connecter" : "Créer ma boutique"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline text-base"
              >
                {isLogin 
                  ? "Pas encore de compte ? Inscrivez-vous" 
                  : "Déjà un compte ? Connectez-vous"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
