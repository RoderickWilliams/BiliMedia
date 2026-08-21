import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginModal from './components/LoginModal';
import Home from './pages/Home';
import DownloadHistory from './pages/DownloadHistory';
import MusicHistory from './pages/MusicHistory';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import { useAuth } from './services/auth';

export default function App() {
  const [active, setActive] = useState<'home' | 'download' | 'music' | 'fav' | 'settings'>('home');
  const { isLoggedIn, openLoginModal } = useAuth();

  const handleNavigate = (page: string) => {
    const map: Record<string, typeof active> = {
      home: 'home',
      download: 'download',
      music: 'music',
      fav: 'fav',
      settings: 'settings',
    };
    setActive(map[page] || 'home');
  };

  const handleSidebarChange = (key: typeof active) => {
    // 需要登录的页面
    const requiresAuth = ['download', 'music', 'fav', 'settings'];
    if (requiresAuth.includes(key) && !isLoggedIn) {
      openLoginModal();
      return;
    }
    setActive(key);
  };

  return (
    <div className="app-bg min-h-screen w-full">
      <div className="flex min-h-screen w-full">
        <Sidebar active={active} onChange={handleSidebarChange} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar onNavigate={handleNavigate} />
          <div className="flex-1">
            {active === 'home' && <Home />}
            {active === 'download' && <DownloadHistory />}
            {active === 'music' && <MusicHistory />}
            {active === 'fav' && <Favorites />}
            {active === 'settings' && <Settings />}
          </div>
        </div>
      </div>
      <LoginModal />
    </div>
  );
}
