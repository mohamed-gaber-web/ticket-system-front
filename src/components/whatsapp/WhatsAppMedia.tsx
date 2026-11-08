import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { getWhatsAppMedia } from '@/api/whatsappApi';
import type { WhatsAppMessage } from '@/types/whatsapp.types';

/** Image / video / audio / file of a WhatsApp message, fetched with the auth header. */
export function WhatsAppMedia({ message }: { message: WhatsAppMessage }) {
  const media = message.media;
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const inline = media?.kind === 'image' || media?.kind === 'sticker' || media?.kind === 'video' || media?.kind === 'audio';

  useEffect(() => {
    if (!media?.fileId || !inline) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getWhatsAppMedia(message._id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message._id, media?.fileId, inline]);

  if (!media?.kind) return null;

  if (!media.fileId || failed) {
    return <p className="text-xs italic opacity-70">[{media.kind}{media.fileName ? `: ${media.fileName}` : ''} — not available]</p>;
  }

  const openFile = async () => {
    const blob = await getWhatsAppMedia(message._id);
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = media.fileName || 'whatsapp-file';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  };

  if (!inline) {
    return (
      <button type="button" onClick={openFile} className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-left text-sm hover:bg-black/10 max-w-[260px]">
        <FileText className="w-5 h-5 shrink-0" />
        <span className="truncate">{media.fileName || 'Document'}</span>
      </button>
    );
  }

  if (!url) return <Loader2 className="w-5 h-5 animate-spin opacity-60 my-2" />;
  if (media.kind === 'video') return <video src={url} controls className="max-w-[260px] rounded-lg" />;
  if (media.kind === 'audio') return <audio src={url} controls className="max-w-[260px]" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={media.fileName ?? 'image'} className={media.kind === 'sticker' ? 'w-28 h-28' : 'max-w-[260px] max-h-[320px] rounded-lg object-cover'} />
    </a>
  );
}
