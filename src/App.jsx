import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Home from './components/Home';
import LiveTV from './components/LiveTV';
import Search from './components/Search';
import MyList from './components/MyList';
import VideoPlayer from './components/VideoPlayer';
import { Info, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [playingMedia, setPlayingMedia] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Toast notifications state
  const [toast, setToast] = useState(null); // { message, type }

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setPlayingMedia(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#141414] flex flex-col items-center justify-center select-none">
        <svg className="animate-spin h-16 w-16 text-[#E50914] mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-zinc-500 font-bold tracking-wider text-sm animate-pulse uppercase">Initialisation de tafaraj m3a atlas...</span>
      </div>
    );
  }

  // Not Authenticated -> Show Login screen
  if (!user) {
    return <Login />;
  }

  // Authenticated -> Show Main App Layout
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home onPlay={setPlayingMedia} user={user} triggerToast={triggerToast} />;
      case 'livetv':
        return <LiveTV onPlay={setPlayingMedia} />;
      case 'search':
        return <Search onPlay={setPlayingMedia} user={user} triggerToast={triggerToast} />;
      case 'mylist':
        return <MyList onPlay={setPlayingMedia} user={user} triggerToast={triggerToast} />;
      default:
        return <Home onPlay={setPlayingMedia} user={user} triggerToast={triggerToast} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex">
      {/* Navigation Sidebar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen ml-0 lg:ml-64 bg-[#141414] overflow-y-auto">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-20 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur lg:hidden"
          aria-label="Ouvrir le menu"
          aria-controls="main-navigation"
          aria-expanded={isSidebarOpen}
        >
          <span className="sr-only">Ouvrir le menu</span>
          <span className="flex h-5 w-5 flex-col justify-center gap-1">
            <span className="h-0.5 w-full bg-current" />
            <span className="h-0.5 w-full bg-current" />
            <span className="h-0.5 w-full bg-current" />
          </span>
        </button>
        {renderView()}
      </main>

      {/* Fullscreen Video Player overlay */}
      {playingMedia && (
        <VideoPlayer 
          data={playingMedia} 
          onClose={() => setPlayingMedia(null)} 
          user={user} 
        />
      )}

      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-zinc-900 border border-zinc-800 text-white px-5 py-3 rounded-xl shadow-2xl animate-fade-in transition-all">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Info className="h-5 w-5 text-[#E50914]" />
          )}
          <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
