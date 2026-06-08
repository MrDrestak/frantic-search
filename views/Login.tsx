
import React, { useState } from 'react';
import { auth } from '../services/store';
import { AlertTriangle, User, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setIsRedirecting(true);
    try {
        await auth.login();
        // Do NOT call onLogin() here. signInWithOAuth redirects the browser —
        // calling onLogin() would flash the Home page before the redirect.
        // The SIGNED_IN event fires when we return from Google and handles auth.
    } catch (e: any) {
        console.error(e);
        setIsRedirecting(false);
        let msg = "Login failed. Please try again.";
        if (e.code === 'auth/operation-not-supported-in-this-environment') {
            msg = "Login not supported in this preview environment. Please ensure you are running on a secure HTTPS connection or localhost.";
        } else if (e.message) {
            msg = e.message;
        }
        setError(msg);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mb-6 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
          <span className="text-3xl font-bold text-white">FS</span>
        </div>
        <Loader2 className="text-violet-500 animate-spin mb-3" size={32} />
        <p className="text-slate-400 text-sm">Conectando con Google...</p>
      </div>
    );
  }

  const handleGuestLogin = async () => {
      setError(null);
      try {
          await auth.loginAsGuest();
          onLogin();
      } catch (e: any) {
          console.error(e);
          setError("Guest login failed: " + e.message);
      }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-3xl font-bold text-white">FS</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Frantic Search</h1>
        <p className="text-slate-400 mb-8">The best GameHub for all TCG, like Magic: The Gathering, Pokémon, Yu-Gi-Oh! and more.</p>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 flex gap-3 items-start text-left">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-red-200 text-sm">{error}</p>
            </div>
        )}

        <button 
          onClick={handleLogin}
          className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors mb-4"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>

        <div className="flex items-center w-full my-4">
            <div className="flex-1 border-t border-slate-700"></div>
            <span className="px-3 text-slate-400 text-xs uppercase tracking-wider">Testing Options</span>
            <div className="flex-1 border-t border-slate-700"></div>
        </div>

        <button 
          onClick={handleGuestLogin}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors border border-slate-700"
        >
          <User size={18} />
          Continue as Guest (Test Mode)
        </button>

        <p className="text-xs text-slate-400 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;
