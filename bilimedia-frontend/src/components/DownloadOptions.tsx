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

  // 确保选中项在 options 的 qn 中
  const options: QualityOption[] = info.qualityOptions || [];
  const current = options.find((q) => q.qn === selected) || options.find((q) => q.available) || options[0];
  const sizeText = current
    ? `约${current.sizeEstimateMB >= 1024 ? (current.sizeEstimateMB / 1024).toFixed(1) + 'GB' : current.sizeEstimateMB + 'MB'}`
    : '--';

  const onDownload = () => {
    if (!current || !current.available) return;
    setDownloading(true);

    const dlUrl = buildVideoDownloadUrl({
      bvid: info.bvid,
      cid: info.cid,
      qn: current.qn,
      filename: info.title,
    });
    const filename = `${info.title}_${current.sub}.mp4`;

    // 保存下载历史
    if (user) {
      addDownload({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userId: user.id,
        bvid: info.bvid,
        cid: info.cid,
        qn: current.qn,
        title: info.title,
        thumbnail: info.thumbnail,
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
    }

    try {
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onShowToast?.(user ? '已开始下载视频，下载历史已保存' : '已开始下载视频，请查看浏览器下载栏', true);
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
      // 降级
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

      {/* 分辨率选项 */}
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

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
        <button
          className="btn-primary justify-center sm:justify-start"
          onClick={onDownload}
          disabled={downloading || !current?.available}
        >
          {downloading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          {downloading ? '准备下载' : '下载视频'}
        </button>
        <button className="btn-ghost justify-center sm:justify-start" onClick={onCopy}>
          <Link2 size={16} />
          复制链接
        </button>
      </div>

      {/* 文件信息 */}
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
