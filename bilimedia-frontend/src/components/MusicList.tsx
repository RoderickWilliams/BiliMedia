import { Download, Heart, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { MusicItem, RecognizeResult } from '../services/api';
import { buildMusicDownloadUrl } from '../services/api';

interface Props {
  result: RecognizeResult | null;
  loading?: boolean;
  errorMsg?: string;
}

export default function MusicList({ result, loading, errorMsg }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const list = result?.list || [];
  const displayCount = showAll ? list.length : Math.min(3, list.length);
  const displayList = list.slice(0, displayCount);

  const onDownload = async (item: MusicItem, idx: number) => {
    if (!item.mp3Url) return;
    setLoadingIdx(idx);
    try {
      const a = document.createElement('a');
      a.href = buildMusicDownloadUrl(item.mp3Url, `${item.name} - ${item.artists}`);
      a.download = `${item.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setLoadingIdx(null), 1200);
    }
  };

  const hasContent = loading || (result && list.length > 0) || errorMsg;
  if (!hasContent) return null;

  return (
    <div className="card p-5 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-semibold text-[color:var(--color-txt-1)]">
          识别到的背景音乐
        </div>
        <div className="text-[13px] text-[color:var(--color-txt-2)]">
          识别准确度：
          <span className="font-semibold ml-1 text-[color:var(--color-success)]">
            {loading ? '--' : `${result?.accuracy || 0}%`}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && !result && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="music-row">
              <div className="w-12 h-12 rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {errorMsg && !loading && (
        <div className="py-10 text-center text-[14px] text-[color:var(--color-txt-2)]">
          <div className="text-[15px] mb-1 text-[#ef4444]">识别未成功</div>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* List */}
      {!loading && result && list.length === 0 && !errorMsg && (
        <div className="py-10 text-center text-[14px] text-[color:var(--color-txt-3)]">
          未识别到匹配的背景音乐，可尝试关键词更清晰的视频。
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {displayList.map((it, idx) => (
            <div key={it.id} className="music-row">
              <img
                src={it.cover || ''}
                alt={it.name}
                className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                onError={(e) => { ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden'); }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[color:var(--color-txt-1)] truncate">
                  {it.name}
                </div>
                <div className="text-[12.5px] text-[color:var(--color-txt-2)] truncate mt-0.5">
                  <span>艺术家：{it.artists}</span>
                  <span className="mx-1.5 text-[color:var(--color-txt-3)]">·</span>
                  <span>专辑：{it.album}</span>
                </div>
              </div>
              <div className="hidden sm:block text-[12.5px] text-[color:var(--color-txt-3)] w-14 text-right">
                {it.durationText}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-[12.5px] font-semibold text-white transition ${
                    it.available ? '' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={it.available ? { background: 'var(--gradient-primary)', boxShadow: '0 3px 12px rgba(79,124,247,0.32)' } : { background: '#9CA3AF' }}
                  disabled={!it.available || loadingIdx === idx}
                  onClick={() => onDownload(it, idx)}
                >
                  <Download size={14} className={loadingIdx === idx ? 'spin' : ''} />
                  {loadingIdx === idx ? '下载中' : '下载音乐'}
                </button>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--color-txt-3)] hover:text-pink-500 hover:bg-pink-50 transition"
                  title="收藏"
                >
                  <Heart size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* 查看全部 */}
          {list.length > 0 && (
            <div className="pt-1 text-center">
              <button
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => setShowAll((v) => !v)}
              >
                <span>
                  {showAll ? '收起' : `查看全部识别结果（${list.length}）`}
                </span>
                <ChevronDown
                  size={16}
                  style={{ transition: 'transform .2s', transform: showAll ? 'rotate(180deg)' : 'none' }}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
