import { HelpCircle, ChevronDown } from 'lucide-react';

export default function Topbar() {
  return (
    <div className="h-16 px-8 flex items-center justify-between sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-[color:var(--color-border)]">
      {/* 左侧空白（左侧栏已含 Logo） */}
      <div className="w-[240px] shrink-0 hidden lg:block" />

      {/* 右侧菜单：使用教程（联系客服忽略）+ 用户 */}
      <div className="flex-1 flex justify-end items-center gap-6">
        <button
          className="flex items-center gap-2 text-[14px] text-[color:var(--color-txt-2)] hover:text-[color:var(--color-txt-1)] transition"
          onClick={() => alert('教程稍后上线~')}
        >
          <HelpCircle size={18} />
          <span>使用教程</span>
        </button>

        {/* 用户 */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-[color:var(--color-border)]">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold"
            style={{ background: 'var(--gradient-primary)' }}
          >
            U
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[14px] text-[color:var(--color-txt-1)] font-medium cursor-pointer hover:text-[color:var(--color-primary)]">
            <span>User123</span>
            <ChevronDown size={16} className="text-[color:var(--color-txt-3)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
