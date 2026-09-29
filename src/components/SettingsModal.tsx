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
  Trash2,
  Cpu,
} from 'lucide-react';
import { getActiveGeminiApiKey, setCustomGeminiApiKey, testGeminiKey } from '../lib/ai';
import { useToast } from './Toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
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
      showToast('Custom API key cleared. Using default environment key.', 'info');
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
        setStatusMessage('API Key verified! Connected to Google Gemini.');
        showToast('Google Gemini API Key activated successfully!', 'success');
        setTimeout(() => onClose(), 1000);
      } else {
        setStatus('invalid');
        setStatusMessage('Key validation failed. Please check your key at ai.google.dev.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e2a27]/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#d4e0dd]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8efed] bg-gradient-to-b from-white to-[#fbfdfd]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center">
              <Key className="w-4 h-4 text-[#3c8b7e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#183237]">Settings & AI Configuration</h3>
              <p className="text-xs text-[#5e7a76]">Manage model keys & local workspace data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5e7a76] hover:text-[#183237] hover:bg-[#f0f4f3] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#f0f7f5] border border-[#d2ebe5] text-[#1c4e48] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#3c8b7e]" />
                <span>Google Gemini AI Engine</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-[#1c4e48] border border-[#d2ebe5] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Grounded
              </span>
            </div>
            <p className="text-[#39635c] text-[11px] leading-relaxed">
              DocuMind AI uses Gemini 3.5 Flash with zero-temperature grounding for verified, hallucination-free document intelligence.
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
                <span>Get free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl bg-[#f8fbfa] border border-[#d4e0dd] font-mono text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e]/30"
            />
            <p className="text-[10px] text-[#5e7a76]">Stored securely in local browser storage.</p>
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                status === 'valid'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {status === 'valid' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTestAndSave}
              disabled={testing}
              className="flex-1 py-2 rounded-xl bg-[#1c4e48] hover:bg-[#163d38] text-white font-bold transition text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7dd3c4]" />
                  <span>Validating Key…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#7dd3c4]" />
                  <span>Save & Test Key</span>
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl bg-[#f0f4f3] hover:bg-[#e8efed] text-[#5e7a76] hover:text-red-600 font-semibold transition text-xs flex items-center gap-1.5 cursor-pointer"
              title="Clear custom API key"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
