import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Settings, Heart, History, Download } from 'lucide-react';
import { useAuth } from '../services/auth';

interface Props {
  onNavigate: (page: string) => void;
}

export default function UserMenu({ onNavigate }: Props) {
  const { user, isLoggedIn, logout, openLoginModal } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!isLoggedIn || !user) {
    return (
      <div className="flex items-center gap-2.5 pl-4 border-l border-[color:var(--color-border)]">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold transition hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
          onClick={openLoginModal}
        >
          登
        </button>
        <button
          className="text-[14px] text-[color:var(--color-primary)] font-medium hover:underline"
          onClick={openLoginModal}
        >
          请登录
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2.5 pl-4 pr-2 py-1 rounded-lg hover:bg-gray-50 transition"
        onClick={() => setOpen(!open)}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {user.username[0].toUpperCase()}
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[14px] text-[color:var(--color-txt-1)] font-medium">
          <span>{user.username}</span>
          <ChevronDown size={16} className="text-[color:var(--color-txt-3)]" />
        </div>
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 fade-up">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-[14px] font-semibold text-gray-800">{user.username}</div>
            <div className="text-[12px] text-gray-500">{user.email}</div>
          </div>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50 transition"
            onClick={() => { setOpen(false); onNavigate('download'); }}
          >
            <History size={16} />
            下载历史
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50 transition"
            onClick={() => { setOpen(false); onNavigate('music'); }}
          >
            <Download size={16} />
            音乐识别历史
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50 transition"
            onClick={() => { setOpen(false); onNavigate('fav'); }}
          >
            <Heart size={16} />
            我的收藏
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-gray-50 transition"
            onClick={() => { setOpen(false); onNavigate('settings'); }}
          >
            <Settings size={16} />
            设置中心
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            className="w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-red-500 hover:bg-red-50 transition"
            onClick={() => { setOpen(false); logout(); }}
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
