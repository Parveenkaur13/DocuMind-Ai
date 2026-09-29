import { useState } from 'react';
import { FileText, Sparkles, ShieldCheck, Search, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export function AuthScreen() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f4f7f7]">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#1c4e48] via-[#23605a] to-[#0e2a27] text-white relative overflow-hidden">
        <div className="absolute inset-0 paper-grid opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="display text-xl font-700">DocuMind AI</span>
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <h1 className="display text-4xl font-700 leading-tight">
            Chat with your documents.<br />Get grounded answers.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Upload any document and ask questions in natural language. Every response is verified with exact citations from your files, powered by Google Gemini and RAG.
          </p>
          <div className="space-y-4 max-w-md">
            {[
              { icon: Search, title: 'Instant Semantic Search', desc: 'Find relevant answers across all your documents in seconds.' },
              { icon: Sparkles, title: 'Gemini RAG Intelligence', desc: 'Grounded question answering with source citations.' },
              { icon: ShieldCheck, title: 'Secure & Private Storage', desc: 'Supabase database with owner-scoped row-level security.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/12 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="font-600">{f.title}</div>
                  <div className="text-white/65 text-sm">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/40 text-sm">DocuMind AI Knowledge Assistant</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#1c4e48] flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <span className="display text-xl font-700 text-[#1c4e48]">DocuMind AI</span>
          </div>
          <h2 className="display text-2xl font-700 text-[#183237] mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-[#5e7a76] text-sm mb-6">
            {mode === 'signin' ? 'Sign in to access your document knowledge base.' : 'Start chatting with your documents in seconds.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-600 text-[#183237] mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#d4e0dd] bg-white text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-[#183237] mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#d4e0dd] bg-white text-[#183237] focus:outline-none focus:ring-2 focus:ring-[#3c8b7e] focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="text-sm text-[#c0413b] bg-[#fbe9e8] border border-[#f0c5c2] rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-[#1c4e48] text-white font-600 hover:bg-[#163d38] transition disabled:opacity-50"
            >
              {busy ? 'Connecting…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e8efed]" />
            <span className="text-xs text-[#5e7a76] uppercase font-600 tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#e8efed]" />
          </div>

          <button
            onClick={() => continueAsGuest()}
            type="button"
            className="w-full py-2.5 px-4 rounded-lg border border-[#3c8b7e] text-[#1c4e48] bg-[#f0f7f5] hover:bg-[#e0ede9] font-600 transition text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
            Continue as Guest (Instant Access)
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-sm text-[#5e7a76] mt-5">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-[#3c8b7e] font-600 hover:underline">
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
