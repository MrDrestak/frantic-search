
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './views/Login';
import Binders from './views/Binders';
import BinderDetail from './views/BinderDetail';
import MarketMatch from './views/MarketMatch';
import Profile from './views/Profile';
import Showcase from './views/Showcase';
import { auth } from './services/store';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize page from localStorage or default to dashboard
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('lotus_last_page') || 'dashboard';
  });
  
  const [selectedBinderId, setSelectedBinderId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // Check for persistent session on mount
  useEffect(() => {
    const unsubscribe = auth.subscribe((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigation = (page: string) => {
      setCurrentPage(page);
      localStorage.setItem('lotus_last_page', page);
      setSelectedBinderId(null);
      setViewingProfileId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mb-6 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
              <span className="text-3xl font-bold text-white">L</span>
          </div>
          <Loader2 className="text-violet-500 animate-spin" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    // Priority: Viewing a specific profile (other than mine, usually from Market)
    if (viewingProfileId) {
        return (
            <Profile 
                viewingUserId={viewingProfileId} 
                onBack={() => {
                    setViewingProfileId(null);
                    // If we were in showcase, go back to showcase, else market
                    if (currentPage === 'showcase') {
                         handleNavigation('showcase');
                    } else {
                         handleNavigation('market');
                    }
                }} 
            />
        );
    }

    if (currentPage === 'dashboard') {
      if (selectedBinderId) {
        return (
          <BinderDetail 
            binderId={selectedBinderId} 
            onBack={() => setSelectedBinderId(null)} 
          />
        );
      }
      return <Binders onSelectBinder={setSelectedBinderId} />;
    }
    
    if (currentPage === 'market') {
      return <MarketMatch 
          onOpenChat={(userId) => {
             console.log("Open chat with", userId);
             handleNavigation('messages'); // Placeholder navigation
          }} 
          onViewProfile={(userId) => {
              setViewingProfileId(userId);
          }}
      />;
    }

    if (currentPage === 'showcase') {
        return <Showcase onViewProfile={(userId) => setViewingProfileId(userId)} />;
    }

    if (currentPage === 'messages') {
        return (
            <div className="p-8 text-center text-slate-500">
                <h2 className="text-2xl text-white mb-2">Inbox</h2>
                <p>Messaging UI would go here.</p>
            </div>
        )
    }

    if (currentPage === 'profile') {
        return <Profile />;
    }

    return <div>Page not found</div>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-violet-500 selection:text-white">
      <div className="max-w-7xl mx-auto md:pt-16 min-h-screen">
        {renderContent()}
      </div>
      <Navbar 
        currentPage={currentPage === 'dashboard' && selectedBinderId ? 'dashboard' : currentPage} 
        setPage={handleNavigation} 
        user={auth.getCurrentUser()}
      />
    </div>
  );
};

export default App;
