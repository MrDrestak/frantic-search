
import React from 'react';
import { Layers, ShoppingBag, User, Star, Gavel, Home } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage, user }) => {
  const { t } = useTranslation();
  const navItems = [
    { id: 'home', icon: Home, label: t('nav.home') },
    { id: 'dashboard', icon: Layers, label: t('nav.binders') },
    { id: 'market', icon: ShoppingBag, label: t('nav.market') },
    { id: 'auctions', icon: Gavel, label: t('nav.auctions') },
    { id: 'showcase', icon: Star, label: t('nav.showcase') },
    { id: 'profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 md:top-0 md:bottom-auto w-full bg-slate-900 border-t md:border-b md:border-t-0 border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">FS</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:block">
              Frantic Search
            </span>
          </div>

          <div className="flex space-x-2 md:space-x-8 w-full md:w-auto justify-evenly md:justify-end">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className={`${
                  item.id === 'home' ? 'hidden md:flex' : 'flex'
                } items-center justify-center md:flex-row gap-2 px-3 py-2 rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'text-violet-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium hidden md:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
