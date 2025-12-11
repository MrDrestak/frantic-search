
import React from 'react';
import { Layers, ShoppingBag, MessageSquare, User, Star, Gavel, Home } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage, user }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home', hideOnMobileBottom: true },
    { id: 'dashboard', icon: Layers, label: 'Binders' },
    { id: 'market', icon: ShoppingBag, label: 'Market' },
    { id: 'auctions', icon: Gavel, label: 'Auctions' },
    { id: 'showcase', icon: Star, label: 'Showcase' }, // Now visible on mobile
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Top Bar - Acts as Home Button */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 z-50 h-16 flex items-center justify-center px-4 shadow-lg">
          <button 
            onClick={() => setPage('home')}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/20">
              <span className="text-white font-bold text-lg">FS</span>
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Frantic Search
            </span>
          </button>
      </div>

      {/* Main Navbar (Bottom on Mobile, Top on Desktop) */}
      <nav className="fixed bottom-0 md:top-0 w-full bg-slate-900 border-t md:border-b md:border-t-0 border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Desktop Logo */}
            <div className="hidden md:flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">FS</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Frantic Search
              </span>
            </div>

            {/* Nav Items */}
            <div className="flex w-full md:w-auto justify-between md:justify-end md:gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 md:px-3 py-2 rounded-md transition-all flex-1 md:flex-none ${
                    item.hideOnMobileBottom ? 'hidden md:flex' : 'flex'
                  } ${
                    currentPage === item.id
                      ? 'text-violet-400 bg-slate-800/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  }`}
                >
                  <item.icon size={24} className="md:w-5 md:h-5" />
                  <span className="text-[10px] md:text-sm font-medium hidden md:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
