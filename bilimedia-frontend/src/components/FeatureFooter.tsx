import { Zap, Music2, ShieldCheck, CloudDownload } from 'lucide-react';

const FEATURES = [
  {
    icon: <Zap size={22} />,
    cls: 'fi-blue',
    title: '极速解析',
    desc: '采用多线程技术\n快速解析视频链接',
  },
  {
    icon: <Music2 size={22} />,
    cls: 'fi-pink',
    title: '精准识别',
    desc: '先进的关键词匹配\n精准识别背景音乐',
  },
  {
    icon: <ShieldCheck size={22} />,
    cls: 'fi-green',
    title: '高清下载',
    desc: '支持 4K/1080P 高清下载\n无水印高质量视频',
  },
  {
    icon: <CloudDownload size={22} />,
    cls: 'fi-purple',
    title: '一键下载',
    desc: '音乐和视频\n一键打包下载',
  },
];

export default function FeatureFooter() {
  return (
    <div className="card p-6 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-4">
            <div className={`feature-icon ${f.cls} shrink-0`}>{f.icon}</div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[color:var(--color-txt-1)]">
                {f.title}
              </div>
              <div className="mt-1 text-[12.5px] text-[color:var(--color-txt-3)] whitespace-pre-line leading-relaxed">
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
