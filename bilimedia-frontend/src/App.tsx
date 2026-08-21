import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Home from './pages/Home';

export default function App() {
  const [active, setActive] = useState<'home' | 'download' | 'music' | 'fav' | 'settings'>('home');

  return (
    <div className="app-bg min-h-screen w-full">
      <div className="flex min-h-screen w-full">
        <Sidebar active={active} onChange={setActive} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <div className="flex-1">
            {active === 'home' && <Home />}
            {active !== 'home' && (
              <div className="mx-auto max-w-xl py-20 text-center text-[color:var(--color-txt-2)]">
                <div className="text-[18px] font-semibold mb-2 text-[color:var(--color-txt-1)]">
                  此模块即将上线
                </div>
                <div className="text-[13.5px]">
                  您可在「首页」体验 B 站视频下载 & 音乐识别核心功能。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
