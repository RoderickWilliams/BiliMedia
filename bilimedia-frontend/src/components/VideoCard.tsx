import { Play, Calendar, User, Clock } from 'lucide-react';
import type { VideoInfo } from '../services/api';

interface Props {
  info: VideoInfo | null;
  loading?: boolean;
}

export default function VideoCard({ info, loading }: Props) {
  if (!info && !loading) return null;

  return (
    <div className="card p-5 fade-up">
      <div className="text-[15px] font-semibold mb-4 text-[color:var(--color-txt-1)] flex items-center justify-between">
        <span>视频信息</span>
        <span className="tag tag-success text-[11px]">
          来源：Bilibili
        </span>
      </div>

      {loading && !info ? (
        <div className="flex gap-4 animate-pulse">
          <div className="w-[180px] h-[102px] rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="h-3 w-1/4 rounded bg-slate-100" />
            <div className="h-3 w-1/4 rounded bg-slate-100" />
          </div>
        </div>
      ) : info ? (
        <div className="flex flex-col sm:flex-row gap-5">
          {/* 封面 */}
          <div className="relative shrink-0">
            <img
              src={info.cover || ''}
              alt={info.title}
              className="w-full sm:w-[220px] h-[124px] object-cover rounded-xl border border-[color:var(--color-border)] bg-slate-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(11,14,26,0.55)', backdropFilter: 'blur(4px)' }}
              >
                <Play size={22} fill="#fff" />
              </div>
            </div>
          </div>

          {/* 文字信息 */}
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold leading-snug line-clamp-2 mb-3 text-[color:var(--color-txt-1)]">
              {info.title}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[13px] text-[color:var(--color-txt-2)]">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[color:var(--color-txt-3)]" />
                <span>UP主：{info.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[color:var(--color-txt-3)]" />
                <span>视频时长：{info.durationText}</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Calendar size={14} className="text-[color:var(--color-txt-3)]" />
                <span>发布时间：{info.pubdate}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
