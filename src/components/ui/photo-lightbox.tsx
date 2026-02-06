import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

export function PhotoLightbox({ open, onOpenChange, src, alt = 'Foto' }: PhotoLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-2 bg-black/90 border-none">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[85vh] object-contain rounded"
        />
      </DialogContent>
    </Dialog>
  );
}
