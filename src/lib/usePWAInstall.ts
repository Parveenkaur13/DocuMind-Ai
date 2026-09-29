import { useState, useEffect, useCallback } from 'react';

// Extend window interface for beforeinstallprompt
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Module-level singleton state so event is captured as early as possible
// and never lost across component re-renders or unmounts.
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
let globalCanInstall = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  const checkInstalled = (): boolean => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    return Boolean(isStandalone);
  };

  globalIsInstalled = checkInstalled();

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chromium 67 and earlier from automatically showing the prompt
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    globalCanInstall = true;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalCanInstall = false;
    globalIsInstalled = true;
    notifyListeners();
  });

  try {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    standaloneMedia.addEventListener('change', (e) => {
      globalIsInstalled = e.matches;
      notifyListeners();
    });
  } catch {
    // Safely ignore on older browsers
  }
}

export function usePWAInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) {
      return false;
    }
    try {
      await globalDeferredPrompt.prompt();
      const choiceResult = await globalDeferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        globalDeferredPrompt = null;
        globalCanInstall = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to invoke native install prompt:', err);
      return false;
    }
  }, []);

  return {
    canInstall: globalCanInstall && !globalIsInstalled,
    hasPrompt: Boolean(globalDeferredPrompt),
    isInstalled: globalIsInstalled,
    promptInstall,
  };
}
