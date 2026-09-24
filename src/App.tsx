import { useAuth } from '@/lib/auth-context';
import { AuthScreen } from '@/components/AuthScreen';
import { Workspace } from '@/components/Workspace';
import { FileText, Loader2 } from 'lucide-react';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1c4e48] flex items-center justify-center text-white">
            <FileText className="w-6 h-6" />
          </div>
          <Loader2 className="w-5 h-5 text-[#3c8b7e] animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <Workspace />;
}

export default App;
