
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './views/Login';
import Binders from './views/Binders';
import BinderDetail from './views/BinderDetail';
import MarketMatch from './views/MarketMatch';
import Profile from './views/Profile';
import Showcase from './views/Showcase';
import Auctions from './views/Auctions';
import AdminPanel from './views/AdminPanel';
import Home from './views/Home';
import { auth } from './services/store';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize page from localStorage or default to home
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('lotus_last_page') || 'home';
  });
  
  const [selectedBinderId, setSelectedBinderId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // Check for persistent session and URL params on mount
  useEffect(() => {
    // URL Params Check for shared profiles or binders
    const params = new URLSearchParams(window.location.search);
    const traderId = params.get('trader');
    const binderId = params.get('binder');

    if (traderId) {
        setViewingProfileId(traderId);
        setCurrentPage('profile'); 
    } else if (binderId) {
        setSelectedBinderId(binderId);
        setCurrentPage('dashboard');
    }

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
      
      // Clear query params if any
      if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname);
      }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mb-6 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
              <span className="text-3xl font-bold text-white">FS</span>
          </div>
          <Loader2 className="text-violet-500 animate-spin" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const currentUser = auth.getCurrentUser();

  const renderContent = () => {
    // Priority: Viewing a specific profile (other than mine, usually from Market)
    if (viewingProfileId) {
        return (
            <Profile 
                viewingUserId={viewingProfileId} 
                onBack={() => {
                    setViewingProfileId(null);
                    // Clear the URL param without refreshing
                    window.history.replaceState({}, '', window.location.pathname);

                    // Return to appropriate context
                    if (currentPage === 'showcase' || currentPage === 'auctions' || currentPage === 'market' || currentPage === 'home') {
                        handleNavigation(currentPage);
                    } else {
                        handleNavigation('market');
                    }
                }} 
                onViewProfile={(userId) => setViewingProfileId(userId)}
                onAdminClick={() => handleNavigation('admin')}
            />
        );
    }

    if (currentPage === 'home') {
        return <Home onNavigate={handleNavigation} onViewProfile={(userId) => setViewingProfileId(userId)} />;
    }

    if (currentPage === 'dashboard') {
      if (selectedBinderId) {
        return (
          <BinderDetail 
            binderId={selectedBinderId} 
            onBack={() => {
                setSelectedBinderId(null);
                // Clear query params if any
                if (window.location.search) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }} 
          />
        );
      }
      return <Binders onSelectBinder={setSelectedBinderId} />;
    }
    
    if (currentPage === 'market') {
      return <MarketMatch 
          onOpenChat={(userId) => {
             console.log("Open chat with", userId);
          }} 
          onViewProfile={(userId) => {
              setViewingProfileId(userId);
          }}
      />;
    }

    if (currentPage === 'auctions') {
        return <Auctions onViewProfile={(userId) => setViewingProfileId(userId)} />;
    }

    if (currentPage === 'showcase') {
        return <Showcase onViewProfile={(userId) => setViewingProfileId(userId)} />;
    }

    if (currentPage === 'profile') {
        return <Profile onViewProfile={(userId) => setViewingProfileId(userId)} onAdminClick={() => handleNavigation('admin')} />;
    }

    if (currentPage === 'admin') {
        return <AdminPanel onBack={() => handleNavigation('profile')} />;
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
        user={currentUser}
      />
    </div>
  );
};

export default App;
