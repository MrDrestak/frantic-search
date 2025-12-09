
import React, { useState } from 'react';
import { auth } from '../services/store';
import { AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
        await auth.login();
        onLogin();
    } catch (e: any) {
        console.error(e);
        let msg = "Login failed. Please try again.";
        if (e.code === 'auth/operation-not-supported-in-this-environment') {
            msg = "Login not supported in this preview environment. Please ensure you are running on a secure HTTPS connection or localhost.";
        } else if (e.message) {
            msg = e.message;
        }
        setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-3xl font-bold text-white">L</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">LotusExchange</h1>
        <p className="text-slate-400 mb-8">The premium marketplace for Magic: The Gathering collectors.</p>

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

        <p className="text-xs text-slate-500 mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;
