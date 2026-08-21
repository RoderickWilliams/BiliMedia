import { useState } from 'react';
import { User, Download, Music, Monitor, Bell, Shield, Info, ChevronRight } from 'lucide-react';
import { useAuth } from '../services/auth';

type Section = 'account' | 'download' | 'music' | 'interface' | 'notification' | 'privacy' | 'about';

const SECTIONS: { key: Section; label: string; icon: typeof User }[] = [
  { key: 'account', label: '账户', icon: User },
  { key: 'download', label: '下载设置', icon: Download },
  { key: 'music', label: '音乐识别', icon: Music },
  { key: 'interface', label: '界面', icon: Monitor },
  { key: 'notification', label: '通知', icon: Bell },
  { key: 'privacy', label: '隐私与安全', icon: Shield },
  { key: 'about', label: '关于', icon: Info },
];

export default function Settings() {
  const { user, isLoggedIn } = useAuth();
  const [section, setSection] = useState<Section>('account');

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center text-[color:var(--color-txt-2)]">
        <div className="text-[48px] mb-4">🔒</div>
        <div className="text-[18px] font-semibold mb-2 text-[color:var(--color-txt-1)]">请先登录</div>
        <div className="text-[14px]">登录后才能访问设置</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-8">
      <div className="flex items-start gap-6">
        {/* 左侧导航 */}
        <div className="w-44 shrink-0">
          <div className="text-[13px] text-gray-400 font-medium px-2 mb-2">设置</div>
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition ${
                  section === s.key
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSection(s.key)}
              >
                <s.icon size={16} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 card p-6">
          {section === 'account' && <AccountSection />}
          {section === 'download' && <DownloadSection />}
          {section === 'music' && <MusicSection />}
          {section === 'interface' && <InterfaceSection />}
          {section === 'notification' && <NotificationSection />}
          {section === 'privacy' && <PrivacySection />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function AccountSection() {
  const { user } = useAuth();
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">账户设置</h2>
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[24px] font-bold"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {user?.username[0].toUpperCase()}
        </div>
        <div>
          <div className="text-[16px] font-semibold">{user?.username}</div>
          <div className="text-[13px] text-gray-500">{user?.email}</div>
          <div className="mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[11px] rounded inline-block">免费用户</div>
        </div>
      </div>
      <Row label="用户名" value={user?.username || ''} />
      <Row label="邮箱" value={user?.email || ''} />
      <Row label="注册时间" value={new Date(user?.createdAt || 0).toLocaleDateString()} />
    </div>
  );
}

function DownloadSection() {
  const [quality, setQuality] = useState('1080P');
  const [format, setFormat] = useState('mp4');
  const [notify, setNotify] = useState(true);
  const [autoOpen, setAutoOpen] = useState(false);

  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">下载设置</h2>
      <SelectRow label="默认清晰度" value={quality} options={['4K', '2K', '1080P', '720P', '480P']} onChange={setQuality} />
      <SelectRow label="默认格式" value={format} options={['mp4', 'flv']} onChange={setFormat} />
      <ToggleRow label="下载完成后通知我" desc="下载完成时显示桌面通知" checked={notify} onChange={setNotify} />
      <ToggleRow label="下载完成后自动打开文件夹" checked={autoOpen} onChange={setAutoOpen} />
    </div>
  );
}

function MusicSection() {
  const [auto, setAuto] = useState(true);
  const [save, setSave] = useState(true);
  const [mode, setMode] = useState('fast');

  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">音乐识别设置</h2>
      <ToggleRow label="自动识别背景音乐" desc="解析视频时自动尝试识别背景音乐" checked={auto} onChange={setAuto} />
      <ToggleRow label="自动保存识别结果" desc="将识别结果自动保存到历史记录" checked={save} onChange={setSave} />
      <SelectRow label="识别模式" value={mode} options={[
        { value: 'fast', label: '快速识别 (速度优先)' },
        { value: 'precise', label: '精准识别 (准确率优先)' },
      ]} onChange={setMode} />
    </div>
  );
}

function InterfaceSection() {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('zh-CN');

  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">界面设置</h2>
      <SelectRow label="主题" value={theme} options={[
        { value: 'light', label: '浅色' },
        { value: 'dark', label: '深色 (即将推出)' },
        { value: 'auto', label: '跟随系统' },
      ]} onChange={setTheme} />
      <SelectRow label="语言" value={lang} options={[
        { value: 'zh-CN', label: '简体中文' },
        { value: 'en-US', label: 'English' },
      ]} onChange={setLang} />
    </div>
  );
}

function NotificationSection() {
  const [dl, setDl] = useState(true);
  const [rec, setRec] = useState(true);
  const [sys, setSys] = useState(true);

  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">通知设置</h2>
      <ToggleRow label="下载完成通知" checked={dl} onChange={setDl} />
      <ToggleRow label="识别完成通知" checked={rec} onChange={setRec} />
      <ToggleRow label="系统通知" checked={sys} onChange={setSys} />
    </div>
  );
}

function PrivacySection() {
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">隐私与安全</h2>
      <Row label="数据存储" value="所有数据存储在本地浏览器中" />
      <Row label="账户安全" value="修改密码" action />
      <Row label="清除所有数据" value="下载历史、识别历史、收藏" danger action />
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-4">关于 BiliMedia</h2>
      <div className="space-y-3 text-[14px]">
        <Row label="版本" value="v1.0.0" />
        <Row label="服务条款" value="查看" action />
        <Row label="隐私政策" value="查看" action />
        <Row label="联系方式" value="support@bilimedia.app" />
      </div>
    </div>
  );
}

// ============ 辅助组件 ============
function Row({ label, value, action, danger }: { label: string; value: string; action?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
      <div className="text-[14px] text-gray-700">{label}</div>
      <div className={`text-[13px] ${danger ? 'text-red-500' : 'text-gray-500'} ${action ? 'flex items-center gap-1 cursor-pointer hover:underline' : ''}`}>
        {value}
        {action && <ChevronRight size={14} />}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
      <div>
        <div className="text-[14px] text-gray-700">{label}</div>
        {desc && <div className="text-[12px] text-gray-400 mt-0.5">{desc}</div>}
      </div>
      <button
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-500' : 'bg-gray-200'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (v: string) => void }) {
  const getLabel = (opt: string | { value: string; label: string }) =>
    typeof opt === 'string' ? opt : opt.label;
  const getValue = (opt: string | { value: string; label: string }) =>
    typeof opt === 'string' ? opt : opt.value;

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50">
      <div className="text-[14px] text-gray-700">{label}</div>
      <select
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-indigo-400 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={getValue(o)} value={getValue(o)}>
            {getLabel(o)}
          </option>
        ))}
      </select>
    </div>
  );
}
