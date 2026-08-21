import {
  Home,
  History,
  Music2,
  Heart,
  Settings,
  Play,
} from 'lucide-react';

export interface NavKey {
  key: 'home' | 'download' | 'music' | 'fav' | 'settings';
  label: string;
  icon: React.ReactNode;
}

const NAVS: NavKey[] = [
  { key: 'home',     label: '首页',          icon: <Home size={18} /> },
  { key: 'download', label: '下载历史',      icon: <History size={18} /> },
  { key: 'music',    label: '音乐识别历史',  icon: <Music2 size={18} /> },
  { key: 'fav',      label: '我的收藏',      icon: <Heart size={18} /> },
  { key: 'settings', label: '设置中心',      icon: <Settings size={18} /> },
];

interface Props {
  active?: NavKey['key'];
  onChange?: (k: NavKey['key']) => void;
}

export default function Sidebar({ active = 'home', onChange }: Props) {
  return (
    <aside className="sidebar-wrap sticky top-0 h-screen w-[240px] shrink-0 border-r border-[color:var(--color-border)] bg-white/80 backdrop-blur-md px-4 py-5 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-7">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 6px 16px rgba(79,124,247,0.32)' }}
        >
          <Play size={18} fill="#fff" />
        </div>
        <div className="text-[18px] font-bold tracking-wide" style={{ color: 'var(--color-txt-1)' }}>
          Bili<span className="text-gradient">Media</span>
        </div>
      </div>

      {/* 菜单 */}
      <nav className="flex flex-col gap-1">
        {NAVS.map((n) => (
          <div
            key={n.key}
            className={`nav-item ${active === n.key ? 'active' : ''}`}
            onClick={() => onChange?.(n.key)}
          >
            <span className="flex items-center justify-center w-5">{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </nav>

      {/* 占位底部留白 */}
      <div className="mt-auto pt-4 px-2 text-[12px] text-[color:var(--color-txt-3)]">
        © {new Date().getFullYear()} BiliMedia · 内部演示版
      </div>
    </aside>
  );
}
