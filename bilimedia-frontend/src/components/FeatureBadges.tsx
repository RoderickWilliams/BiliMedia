import { Check, ShieldCheck, Zap } from 'lucide-react';

/** 三枚功能标签（安全无毒 / 极速解析 / 高清无水印） */
export default function FeatureBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
      <span className="tag tag-success">
        <ShieldCheck size={14} />
        安全无毒
      </span>
      <span className="tag tag-warning">
        <Zap size={14} />
        极速解析
      </span>
      <span className="tag tag-info">
        <Check size={14} />
        高清无水印
      </span>
    </div>
  );
}
