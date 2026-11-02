import React from 'react';
import { Loader2, ImagePlus } from 'lucide-react';

export default function VariantImagePicker({ imageUrl, uploading, onUpload, onClear }) {
  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <div className="relative">
          <img src={imageUrl} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center"
          >✕</button>
        </div>
      ) : (
        <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-secondary">
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            : <ImagePlus className="w-4 h-4 text-muted-foreground" />
          }
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
      <div>
        <p className="text-xs font-medium text-foreground">Foto de esta variante</p>
        <p className="text-[11px] text-muted-foreground">Opcional — útil para diferenciar por color o modelo</p>
      </div>
    </div>
  );
}