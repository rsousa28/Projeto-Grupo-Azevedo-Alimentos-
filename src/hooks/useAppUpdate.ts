// Detecta quando uma versão nova do sistema foi publicada e avisa quem está com o app aberto.
// Aba aberta há dias (ou o app instalado no celular) continua rodando o código antigo até recarregar;
// aqui comparamos o script principal desta página com o do index.html publicado.
import React, { useEffect, useRef } from 'react';
import NotificationCard from '../components/notifications/NotificationCard';
import { systemNotification } from '../lib/notifications';
import { useToast } from '../contexts/ToastContext';

const CHECK_EVERY_MS = 5 * 60 * 1000;
const SCRIPT_RE = /\/assets\/index-[\w-]+\.js/;

function currentBundle(): string | null {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'));
  for (const s of scripts) {
    const m = s.src.match(SCRIPT_RE);
    if (m) return m[0];
  }
  return null;
}

async function publishedBundle(): Promise<string | null> {
  // "__fresh" faz o service worker deixar passar direto para a rede (ver public/sw.js)
  const res = await fetch(`/index.html?__fresh=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.text()).match(SCRIPT_RE)?.[0] ?? null;
}

export function useAppUpdate() {
  const { showCustomToast } = useToast();
  const notified = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const running = currentBundle();
    if (!running) return;

    const check = async () => {
      if (notified.current || document.visibilityState !== 'visible') return;
      try {
        const latest = await publishedBundle();
        if (!latest || latest === running) return;
        notified.current = true;
        const card = systemNotification(
          'Nova versão disponível',
          'Atualize para carregar as últimas melhorias do sistema. Leva só um segundo.',
          'info',
          '/',
        );
        showCustomToast(
          (dismiss) =>
            React.createElement(NotificationCard, {
              notification: { ...card, actionLabel: 'Atualizar agora' },
              onDismiss: dismiss,
              onOpen: () => window.location.reload(),
            }),
          10 * 60 * 1000,
        );
      } catch {
        // Sem rede: tenta de novo no próximo ciclo
      }
    };

    const onVisible = () => document.visibilityState === 'visible' && check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    check();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [showCustomToast]);
}
