import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import * as teleSalesApi from '@/api/teleSalesApi';
import { cn } from '@/lib/utils';

// Product images live in GridFS behind the auth-protected /api/files route, so
// a plain <img src> can't load them. Fetch as a blob and show an object URL.
// Kept tiny and revoked on unmount to avoid leaking memory across a catalog.
const cache = new Map<string, string>();

export function StoredImage({ fileId, alt, className }: { fileId: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(cache.get(fileId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(fileId)) { setSrc(cache.get(fileId)!); return; }
    teleSalesApi.downloadFile(fileId)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        cache.set(fileId, url);
        setSrc(url);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [fileId]);

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-container text-on-surface-variant', className)}>
        <ImageOff className="w-5 h-5 opacity-40" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-container text-on-surface-variant', className)}>
        <Loader2 className="w-4 h-4 animate-spin opacity-50" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={cn('object-cover', className)} />;
}
