import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { getActiveGeminiApiKey, setCustomGeminiApiKey, testGeminiKey } from '../lib/ai';
import { useToast } from './Toast';

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ open, onClose }: ApiKeyModalProps) {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (open) {
      const current = getActiveGeminiApiKey();
      setApiKey(current);
      setStatus('idle');
      setStatusMessage('');
    }
  }, [open]);

  const handleTestAndSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setCustomGeminiApiKey('');
      setStatus('idle');
      showToast('Custom API key cleared. Using default key.', 'info');
      onClose();
      return;
    }

    setTesting(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      const isValid = await testGeminiKey(trimmed);
      if (isValid) {
        setCustomGeminiApiKey(trimmed);
        setStatus('valid');
        setStatusMessage('API Key verified! Connected to Google Gemini 3.8 Flash.');
        showToast('Google Gemini API Key activated successfully!', 'success');
        setTimeout(() => onClose(), 1200);
      } else {
        setStatus('invalid');
        setStatusMessage('Invalid API key or quota exceeded. Please check your key at ai.google.dev.');
        showToast('API Key validation failed', 'error');
      }
    } catch {
      setStatus('invalid');
      setStatusMessage('Network error while testing key. Please check your connection.');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    setApiKey('');
    setCustomGeminiApiKey('');
    setStatus('idle');
    setStatusMessage('');
    showToast('Reset to default key', 'info');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e2a27]/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#d4e0dd] animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed] bg-gradient-to-b from-white to-[#fbfdfd]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="display text-base font-bold text-[#183237]">AI Model API Settings</h3>
              <p className="text-xs text-[#5e7a76]">Configure your Google Gemini API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#f0f7f5] border border-[#d2ebe5] text-xs text-[#1c4e48] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#3c8b7e]" />
              <span>Full Model Precision & Unlimited Quota</span>
            </div>
            <p className="text-[#39635c] leading-relaxed text-[11px]">
              The shared free demo key can occasionally hit Google's per-minute quota limits. Adding your own free API key from Google AI Studio provides 100% reliable, zero-latency Gemini 3.8 Flash reasoning.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#183237] flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-[#3c8b7e] hover:underline flex items-center gap-1"
              >
                <span>Get a free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2.5 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] text-xs font-mono text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] transition"
              />
            </div>
            <p className="text-[10px] text-[#5e7a76]">Your key is stored securely in your browser's local storage.</p>
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                status === 'valid'
                  ? 'bg-[#ecfdf3] border-[#bbf7d0] text-[#15803d]'
                  : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
              }`}
            >
              {status === 'valid' ? (
                <CheckCircle2 className="w-4 h-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTestAndSave}
              disabled={testing}
              className="flex-1 py-2.5 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-semibold transition text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7dd3c4]" />
                  <span>Validating Key with Gemini…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#7dd3c4]" />
                  <span>Save & Activate Key</span>
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2.5 rounded-xl bg-[#f0f4f3] hover:bg-[#e8efed] text-[#5e7a76] font-semibold transition text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
