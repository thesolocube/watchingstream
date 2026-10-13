
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Home, Tv, List, Search, LogOut, Film, X } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, user, isOpen, onClose }) {
  const navItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'livetv', label: 'TV en Direct', icon: Tv },
    { id: 'mylist', label: 'Ma Liste', icon: List },
    { id: 'search', label: 'Rechercher', icon: Search }
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getInitials = () => {
    if (!user) return 'M';
    if (user.isAnonymous) return 'D'; // Demo
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
        />
      )}
    <aside
      id="main-navigation"
      className={`w-64 bg-[#0c0c0c] border-r border-zinc-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div>
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-zinc-900">
          <Film className="h-7 w-7 text-[#E50914] fill-[#E50914]" />
          <span className="flex-1 text-xl font-bold tracking-wider text-[#E50914] font-serif">tafaraj m3a atlas</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2 mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#E50914] text-white shadow-lg shadow-[#e509142f] translate-x-1'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Info & Logout */}
      <div className="p-4 border-t border-zinc-900 bg-[#070707] space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-[#E50914] text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer border border-zinc-600">
            {getInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-400 truncate">
              {user?.isAnonymous ? 'Mode Démo' : 'Connecté en tant que'}
            </p>
            <p className="text-sm font-medium text-white truncate">
              {user?.isAnonymous ? 'Utilisateur invité' : user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white hover:bg-red-950/20 hover:border hover:border-red-900/30 transition-all border border-transparent"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          Déconnexion
        </button>
      </div>
    </aside>
    </>
  );
}
