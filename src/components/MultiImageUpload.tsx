import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X, GripVertical } from 'lucide-react';

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isNew?: boolean;
}

interface MultiImageUploadProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
}

export default function MultiImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 5 
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newImages: ImageItem[] = filesToAdd.map((file) => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      url: URL.createObjectURL(file),
      file,
      isNew: true,
    }));

    onImagesChange([...images, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove?.isNew && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
          >
            <img
              src={image.url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {/* Move buttons */}
              {index > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, index - 1)}
                >
                  <GripVertical className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Remove button */}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => removeImage(image.id)}
            >
              <X className="h-3 w-3" />
            </Button>

            {/* Position indicator */}
            {index === 0 && (
              <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                Principal
              </span>
            )}
          </div>
        ))}

        {/* Add button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-muted/50 transition-colors"
          >
            {images.length === 0 ? (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ajouter</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {images.length}/{maxImages}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length === 0 
          ? `Ajoutez jusqu'à ${maxImages} photos du produit. La première sera l'image principale.`
          : `${images.length} sur ${maxImages} images. La première image est l'image principale.`
        }
      </p>
    </div>
  );
}
