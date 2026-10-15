import { useEffect, useRef, useState } from 'react';
import { fetchProposalImage } from '@/api/proposalApi';
import type { Proposal } from '@/types/proposal.types';

/**
 * SOW images live in GridFS behind auth, so an <img src> can't load them
 * directly. Each one is fetched once as a blob and shown through an object URL
 * (same-origin, so html2canvas can also paint it into the PDF).
 */
export function useProposalImages(proposal: Proposal | null) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const owned = useRef<string[]>([]);
  const mounted = useRef(true);
  const id = proposal?._id;

  const fileIds =
    proposal?.sow.sections.flatMap((s) => s.attachments.filter((a) => a.type === 'image').map((a) => a.fileId)) ?? [];
  const key = fileIds.join(',');

  useEffect(() => {
    if (!id) return;
    for (const fileId of key ? key.split(',') : []) {
      if (!fileId || requested.current.has(fileId)) continue;
      requested.current.add(fileId);
      fetchProposalImage(id, fileId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          owned.current.push(url);
          if (mounted.current) setUrls((m) => ({ ...m, [fileId]: url }));
        })
        .catch(() => requested.current.delete(fileId));
    }
  }, [id, key]);

  useEffect(() => {
    mounted.current = true;
    const list = owned.current;
    return () => {
      mounted.current = false;
      list.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return urls;
}
