import React from 'react';
import { Home, Layers, ShoppingBag, MessageSquare, User } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage, user }) => {
  const navItems = [
    { id: 'dashboard', icon: Layers, label: 'Binders' },
    { id: 'market', icon: ShoppingBag, label: 'Market' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 md:top-0 md:bottom-auto w-full bg-slate-900 border-t md:border-b md:border-t-0 border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('dashboard')}>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:block">
              LotusExchange
            </span>
          </div>

          <div className="flex space-x-1 md:space-x-8 w-full md:w-auto justify-evenly md:justify-end">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'text-violet-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <item.icon size={20} />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;