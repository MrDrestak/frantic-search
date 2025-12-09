
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './views/Login';
import Binders from './views/Binders';
import BinderDetail from './views/BinderDetail';
import MarketMatch from './views/MarketMatch';
import Profile from './views/Profile';
import { auth } from './services/store';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBinderId, setSelectedBinderId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
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
      return <MarketMatch onOpenChat={(userId) => {
          console.log("Open chat with", userId);
          setCurrentPage('messages'); // Placeholder navigation
      }} />;
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
        setPage={(page) => {
            setCurrentPage(page);
            setSelectedBinderId(null);
        }} 
        user={auth.getCurrentUser()}
      />
    </div>
  );
};

export default App;
