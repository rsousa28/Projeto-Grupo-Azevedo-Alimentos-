import React, { useEffect, useState } from 'react';
import { Download, Share2, PlusSquare, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTutorial, setShowIosTutorial] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt in this session
    const isDismissed = sessionStorage.getItem('pwa_install_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // Check if already in standalone mode (installed)
    const isStandalone = 
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      return;
    }

    // Handle BeforeInstallPrompt for Android / Desktop Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS Device Safari
    const ua = window.navigator.userAgent;
    const isIphone = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);

    if (isIphone && !isStandalone) {
      setIsIos(true);
      // Give a slight delay before showing to ensure optimal page load perception
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native standard prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sessionStorage.setItem('pwa_install_dismissed', 'true');
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      // Display iOS Safari guided installation manual inside a sub-modal/sheet
      setShowIosTutorial(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        {/* Main PWA Invitation Banner */}
        <motion.div
          key="install-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-gray-900 border border-gray-800 text-white p-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-3"
          id="pwa-install-invitation"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl flex-shrink-0 flex items-center justify-center">
                <Download className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-semibold text-sm tracking-tight text-gray-100">
                  Instalar Aplicativo
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Adicione o painel do Grupo Azevedo à sua tela de início para acesso rápido e modo offline.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Dispensar sugestão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end mt-1">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Agora não
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              {isIos ? 'Ver Tutorial' : 'Instalar Agora'}
            </button>
          </div>
        </motion.div>

        {/* Guided iOS Tutorial sheet to assist Apple users */}
        {showIosTutorial && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 text-white shadow-2xl relative"
              id="pwa-ios-tutorial-sheet"
            >
              <button
                onClick={() => setShowIosTutorial(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                aria-label="Fechar tutorial"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 bg-blue-600/10 text-blue-400 flex items-center justify-center rounded-2xl mb-4">
                  <Info className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-bold text-lg text-gray-100">Adicionar à Tela de Início</h3>
                <p className="text-xs text-gray-400 mt-2 mb-6">
                  Siga estas instruções rápidas no Safari para fixar o app no seu iPhone ou iPad:
                </p>
              </div>

              <div className="space-y-4 text-xs font-medium text-gray-300">
                <div className="flex items-center gap-3.5 bg-gray-800/40 p-3 rounded-xl border border-gray-800/60">
                  <span className="w-6 h-6 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div className="flex-1 leading-normal flex items-center gap-1.5">
                    Toque no botão de compartilhar <Share2 className="w-4 h-4 text-blue-400 inline" /> na barra de navegação do Safari.
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-gray-800/40 p-3 rounded-xl border border-gray-800/60">
                  <span className="w-6 h-6 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div className="flex-1 leading-normal">
                    Role as opções para baixo até encontrar a opção <span className="text-white font-semibold">"Adicionar à Tela de Início"</span>.
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-gray-800/40 p-3 rounded-xl border border-gray-800/60">
                  <span className="w-6 h-6 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div className="flex-1 leading-normal flex items-center gap-1.5">
                    Toque em <span className="text-white font-semibold">"Adicionar"</span> <PlusSquare className="w-4 h-4 text-blue-400 inline" /> no canto superior direito para confirmar.
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIosTutorial(false);
                  setIsVisible(false);
                  sessionStorage.setItem('pwa_install_dismissed', 'true');
                }}
                className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg"
              >
                Entendi, obrigado!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
