import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, Loader2, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { business } = useBusiness();
  const { toast } = useToast();
  
  const isEditing = Boolean(id);
  
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockQuantity, setMinStockQuantity] = useState('5');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (business) {
      fetchCategories();
      if (isEditing) {
        fetchProduct();
      }
    }
  }, [business, id]);

  const fetchCategories = async () => {
    if (!business) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    setCategories(data || []);
  };

  const fetchProduct = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Erreur",
        description: "Produit introuvable",
        variant: "destructive"
      });
      navigate('/products');
      return;
    }

    setName(data.name);
    setPurchasePrice(String(data.purchase_price));
    setSellingPrice(String(data.selling_price));
    setStockQuantity(String(data.stock_quantity));
    setMinStockQuantity(String(data.min_stock_quantity));
    setCategoryId(data.category_id || '');
  };

  const handleAddCategory = async () => {
    if (!business || !newCategoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        business_id: business.id,
        name: newCategoryName.trim()
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la catégorie",
        variant: "destructive"
      });
      return;
    }

    setCategories([...categories, data]);
    setCategoryId(data.id);
    setNewCategoryName('');
    setShowNewCategory(false);
    toast({
      title: "Catégorie ajoutée",
      description: `${data.name} a été créée`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setLoading(true);

    const productData = {
      business_id: business.id,
      name: name.trim(),
      purchase_price: parseFloat(purchasePrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      stock_quantity: parseInt(stockQuantity) || 0,
      min_stock_quantity: parseInt(minStockQuantity) || 5,
      category_id: categoryId || null
    };

    let error;

    if (isEditing) {
      const result = await supabase
        .from('products')
        .update(productData)
        .eq('id', id);
      error = result.error;
    } else {
      const result = await supabase
        .from('products')
        .insert(productData);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le produit",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: isEditing ? "Produit modifié" : "Produit ajouté",
      description: `${name} a été ${isEditing ? 'modifié' : 'ajouté'}`
    });
    navigate('/products');
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    setDeleting(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Produit supprimé",
      description: `${name} a été supprimé`
    });
    navigate('/products');
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? 'Modifier' : 'Nouveau Produit'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Nom du produit *</Label>
              <Input
                id="name"
                placeholder="Ex: Riz 25kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Catégorie</Label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nouvelle catégorie"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-12"
                  />
                  <Button type="button" onClick={handleAddCategory} className="h-12">
                    Ajouter
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowNewCategory(false)}
                    className="h-12"
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12 text-base flex-1">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowNewCategory(true)}
                    className="h-12 w-12"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-base">Prix d'achat</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  placeholder="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="h-14 text-base"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice" className="text-base">Prix de vente *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  placeholder="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="h-14 text-base"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockQuantity" className="text-base">Stock actuel</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  placeholder="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="h-14 text-base"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStockQuantity" className="text-base">Stock minimum</Label>
                <Input
                  id="minStockQuantity"
                  type="number"
                  placeholder="5"
                  value={minStockQuantity}
                  onChange={(e) => setMinStockQuantity(e.target.value)}
                  className="h-14 text-base"
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full h-14 text-lg font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            isEditing ? 'Modifier le produit' : 'Ajouter le produit'
          )}
        </Button>

        {isEditing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                type="button"
                variant="destructive"
                className="w-full h-14 text-lg font-semibold"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-5 w-5" />
                    Supprimer le produit
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le produit "{name}" sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </form>
    </div>
  );
}
