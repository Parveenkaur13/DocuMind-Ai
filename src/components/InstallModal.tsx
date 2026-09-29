import React, { useMemo, useRef } from 'react';
import {
  X,
  Download,
  Laptop,
  Smartphone,
  CheckCircle2,
  Shield,
  Zap,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { useToast } from './Toast';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallModal({ isOpen, onClose }: InstallModalProps) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { showToast } = useToast();
  const instructionsRef = useRef<HTMLDivElement>(null);

  const platformInfo = useMemo(() => {
    if (typeof window === 'undefined') return { os: 'windows', browser: 'chrome' };
    const userAgent = window.navigator.userAgent.toLowerCase();

    let os: 'windows' | 'mac' | 'ios' | 'android' | 'linux' = 'windows';
    if (/iphone|ipad|ipod/.test(userAgent)) os = 'ios';
    else if (/android/.test(userAgent)) os = 'android';
    else if (/macintosh|mac os x/.test(userAgent)) os = 'mac';
    else if (/linux/.test(userAgent)) os = 'linux';

    let browser: 'chrome' | 'edge' | 'safari' | 'firefox' | 'other' = 'chrome';
    if (/edg/.test(userAgent)) browser = 'edge';
    else if (/chrome|crios/.test(userAgent)) browser = 'chrome';
    else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) browser = 'safari';
    else if (/firefox|fxios/.test(userAgent)) browser = 'firefox';

    return { os, browser };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) {
        showToast('Installing DocuMind Desktop App…', 'success');
        onClose();
      } else {
        showToast('Installation was cancelled', 'info');
      }
    } else {
      showToast('Follow the step-by-step instructions below to install in your browser', 'info');
      instructionsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#d4e0dd] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e2ece9] flex items-center justify-between bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                Install DocuMind AI App
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  Desktop & Mobile
                </span>
              </h2>
              <p className="text-xs text-[#b8d6d0]">
                Standalone app with faster loading, offline caching & full keyboard shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Action Banner */}
          {isInstalled ? (
            <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-950">DocuMind App is Already Installed!</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  You can launch it directly from your applications menu, taskbar, or home screen.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f8fbfa] to-[#eaf4f1] border border-[#d2ebe5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-bold text-sm text-[#183237] flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
                  <span>One-Click Desktop Installation</span>
                </h3>
                <p className="text-xs text-[#5e7a76] max-w-sm">
                  {canInstall
                    ? 'Browser is ready to install DocuMind as a standalone desktop application.'
                    : 'Install directly to your taskbar, desktop, or mobile device.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#1c4e48] hover:bg-[#163d38] active:bg-[#11312d] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>{canInstall ? 'Install App Now' : 'How to Install'}</span>
              </button>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#e2ece9] flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-[#3c8b7e] mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-[#183237] block">Instant Launch</strong>
                <span className="text-[#5e7a76] text-[11px]">Opens instantly without loading browser tabs.</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#e2ece9] flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-[#3c8b7e] mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-[#183237] block">Window Mode</strong>
                <span className="text-[#5e7a76] text-[11px]">Dedicated borderless window workspace.</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#e2ece9] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#3c8b7e] mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-[#183237] block">Private & Local</strong>
                <span className="text-[#5e7a76] text-[11px]">Documents and chat history stay in private storage.</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#e2ece9] flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-[#3c8b7e] mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-[#183237] block">Cross-Platform</strong>
                <span className="text-[#5e7a76] text-[11px]">Runs seamlessly on Windows, Mac, iOS, Android.</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Browser-Specific Guide */}
          <div ref={instructionsRef} className="p-4.5 rounded-2xl bg-[#f8fbfa] border border-[#d4e0dd] space-y-3 scroll-mt-4">
            <h4 className="text-xs font-bold text-[#1c4e48] uppercase tracking-wider flex items-center justify-between">
              <span>Installation Steps for your Browser</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-[#5e7a76] border border-[#d4e0dd] capitalize">
                {platformInfo.browser} on {platformInfo.os}
              </span>
            </h4>

            {platformInfo.browser === 'chrome' && (
              <ol className="text-xs text-[#28504b] space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>
                  Look at the <strong>right side of your Chrome URL address bar</strong> at the top.
                </li>
                <li>
                  Click the <strong>Install DocuMind icon</strong> (a computer monitor with down arrow <span className="font-mono bg-white px-1 py-0.2 rounded border">⊕</span>).
                </li>
                <li>
                  Click <strong>"Install"</strong> in the popup to place DocuMind on your Desktop & Taskbar.
                </li>
                <li className="text-[11px] text-[#5e7a76]">
                  <em>Alternative:</em> Click Chrome menu (<strong>⋮</strong>) → <strong>Save and share</strong> → <strong>Install DocuMind AI…</strong>
                </li>
              </ol>
            )}

            {platformInfo.browser === 'edge' && (
              <ol className="text-xs text-[#28504b] space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>
                  Look at the <strong>right side of your Edge address bar</strong>.
                </li>
                <li>
                  Click the <strong>App available icon</strong> (<span className="font-mono bg-white px-1 py-0.2 rounded border">⊞</span> or computer icon).
                </li>
                <li>
                  Click <strong>"Install"</strong> to pin DocuMind to your Windows taskbar and Start menu.
                </li>
                <li className="text-[11px] text-[#5e7a76]">
                  <em>Alternative:</em> Click Edge menu (<strong>…</strong>) → <strong>Apps</strong> → <strong>Install DocuMind AI</strong>.
                </li>
              </ol>
            )}

            {platformInfo.browser === 'safari' && platformInfo.os === 'mac' && (
              <ol className="text-xs text-[#28504b] space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>In Safari, click <strong>File</strong> in the top menu bar.</li>
                <li>Select <strong>"Add to Dock…"</strong>.</li>
                <li>Click <strong>"Add"</strong> to run DocuMind as a native Mac app from your Dock.</li>
              </ol>
            )}

            {platformInfo.os === 'ios' && (
              <ol className="text-xs text-[#28504b] space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>Tap the <strong>Share button</strong> (<span className="font-mono bg-white px-1 py-0.2 rounded border">↑</span>) in Safari's bottom toolbar.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (<span className="font-mono bg-white px-1 py-0.2 rounded border">+</span>).</li>
                <li>Tap <strong>"Add"</strong> in the top right corner.</li>
              </ol>
            )}

            {platformInfo.os === 'android' && (
              <ol className="text-xs text-[#28504b] space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>Tap the <strong>Menu button</strong> (<strong>⋮</strong>) in the top right of your browser.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Follow the prompt to install the DocuMind icon to your app drawer.</li>
              </ol>
            )}

            {platformInfo.browser === 'firefox' && (
              <div className="text-xs text-[#5e7a76] leading-relaxed">
                Firefox does not support desktop PWAs natively. For the best standalone app experience, please open DocuMind in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> and click Install!
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#e2ece9] bg-[#f8fbfa] flex items-center justify-between text-xs">
          <span className="text-[#5e7a76]">DocuMind Progressive Web Application (PWA)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#d4e0dd] hover:bg-[#eaf4f1] text-[#1c4e48] font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
