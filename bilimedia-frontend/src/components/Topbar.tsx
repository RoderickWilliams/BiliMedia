import UserMenu from './UserMenu';

interface Props {
  onNavigate: (page: string) => void;
}

export default function Topbar({ onNavigate }: Props) {
  return (
    <div className="h-16 px-8 flex items-center justify-between sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-[color:var(--color-border)]">
      {/* 左侧空白（左侧栏已含 Logo） */}
      <div className="w-[240px] shrink-0 hidden lg:block" />

      {/* 右侧菜单：用户 */}
      <div className="flex-1 flex justify-end items-center">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  );
}
