import { useState } from 'react';
import { Download, Link2, Loader2 } from 'lucide-react';
import type { QualityOption, VideoInfo } from '../services/api';
import { buildVideoDownloadUrl } from '../services/api';
import { useAuth, addDownload } from '../services/auth';

interface Props {
  info: VideoInfo | null;
  onShowToast?: (msg: string, ok?: boolean) => void;
}

export default function DownloadOptions({ info, onShowToast }: Props) {
  const [selected, setSelected] = useState<number>(80);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();

  if (!info) return null;

  const options: QualityOption[] = info.qualityOptions || [];
  const current = options.find((q) => q.qn === selected) || options.find((q) => q.available) || options[0];
  const sizeText = current
    ? `约${current.sizeEstimateMB >= 1024 ? (current.sizeEstimateMB / 1024).toFixed(1) + 'GB' : current.sizeEstimateMB + 'MB'}`
    : '--';

  const onDownload = async () => {
    if (!current || !current.available) return;
    setDownloading(true);

    const dlUrl = buildVideoDownloadUrl({
      bvid: info.bvid,
      cid: info.cid,
      qn: current.qn,
      filename: info.title,
    });
    const filename = `${info.title}_${current.sub}.mp4`;

    try {
      // 保存下载历史（后端共享存储）
      if (user) {
        try {
          await addDownload({
            id: '',
            userId: user.id,
            bvid: info.bvid,
            cid: info.cid,
            qn: current.qn,
            title: info.title,
            thumbnail: info.cover,
            author: info.author,
            duration: info.duration,
            filename,
            downloadUrl: dlUrl,
            status: 'completed',
            fileSize: current.sizeEstimateMB * 1024 * 1024,
            qualityLabel: current.label,
            createdAt: Date.now(),
            completedAt: Date.now(),
          });
        } catch (e: any) {
          onShowToast?.('保存下载历史失败: ' + (e?.message || String(e)), false);
        }
      }

      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onShowToast?.(user ? '已开始下载，记录已同步到云端' : '已开始下载，请查看浏览器下载栏', true);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const onCopy = async () => {
    if (!current || !info.playQnMap?.[current.qn]) {
      onShowToast?.('该清晰度暂无直链', false);
      return;
    }
    try {
      await navigator.clipboard.writeText(info.playQnMap[current.qn]);
      onShowToast?.('视频直链已复制到剪贴板', true);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = info.playQnMap[current.qn];
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onShowToast?.('视频直链已复制到剪贴板', true);
    }
  };

  return (
    <div className="card p-5 fade-up">
      <div className="text-[15px] font-semibold mb-4 text-[color:var(--color-txt-1)]">
        视频下载
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {options.map((q) => {
          const isActive = q.qn === current?.qn;
          const disabled = !q.available;
          return (
            <div
              key={q.qn}
              className={`quality-card ${isActive ? 'active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && setSelected(q.qn)}
            >
              <div className="text-[14px] font-semibold">{q.label}</div>
              <div className="q-sub text-[11px] mt-1 opacity-70">{q.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
        <button
          className="btn-primary justify-center sm:justify-start"
          onClick={onDownload}
          disabled={downloading || !current?.available}
        >
          {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
          {downloading ? '准备下载' : '下载视频'}
        </button>
        <button className="btn-ghost justify-center sm:justify-start" onClick={onCopy}>
          <Link2 size={16} />
          复制链接
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[color:var(--color-txt-3)]">
        <span>大小：{sizeText}</span>
        <span>格式：MP4</span>
        <span>编码：H.264</span>
        {current && !current.available && (
          <span className="text-[#ef4444]">当前清晰度无可用源，请选择其它档</span>
        )}
      </div>
    </div>
  );
}
