import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { revealPassword } from '@/api/vaultApi';
import { apiError, copyText, REVEAL_MS } from '@/lib/vault';

/**
 * One account's password, held only in this component's state — never in
 * Redux. Revealing shows it for 30 s; it is dropped on hide and on unmount.
 * Every reveal and copy goes through the API, which writes the access log.
 */
export function useRevealedPassword(entryId: string) {
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reveal' | 'copy' | null>(null);
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    setPassword(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimer();
    };
  }, []);

  // A different account in the same component: forget the old password.
  useEffect(() => hide, [entryId, hide]);

  const toggle = useCallback(async () => {
    if (password !== null) {
      hide();
      return;
    }
    setBusy('reveal');
    try {
      const res = await revealPassword(entryId, 'reveal');
      if (!mounted.current) return;
      setPassword(res.data.password);
      clearTimer();
      timer.current = window.setTimeout(() => {
        if (mounted.current) setPassword(null);
      }, REVEAL_MS);
    } catch (e) {
      toast.error(apiError(e, 'Could not reveal the password'));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [entryId, password, hide]);

  const copy = useCallback(async () => {
    setBusy('copy');
    try {
      const res = await revealPassword(entryId, 'copy');
      await copyText(res.data.password, 'Password copied');
    } catch (e) {
      toast.error(apiError(e, 'Could not copy the password'));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [entryId]);

  return { password, busy, toggle, copy, hide };
}
