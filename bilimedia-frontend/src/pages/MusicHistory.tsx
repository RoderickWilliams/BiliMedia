import { useState, useEffect } from 'react';
import { Search, Play, Download, Heart, Trash2 } from 'lucide-react';
import { useAuth, getMusicHistory, removeMusicRecord, isFavorited, addFavorite } from '../services/auth';
import type { MusicRecord } from '../services/auth';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MusicHistory() {
  const { user, isLoggedIn } = useAuth();
  const [records, setRecords] = useState<MusicRecord[]>([]);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) setRecords(getMusicHistory(user.id));
  }, [user]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center text-[color:var(--color-txt-2)]">
        <div className="text-[48px] mb-4">🔒</div>
        <div className="text-[18px] font-semibold mb-2 text-[color:var(--color-txt-1)]">请先登录</div>
        <div className="text-[14px]">登录后才能查看音乐识别历史</div>
      </div>
    );
  }

  const filtered = records.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.artists.toLowerCase().includes(search.toLowerCase())
  );

  const handlePlay = (rec: MusicRecord) => {
    if (!rec.mp3Url) return;
    window.open(rec.mp3Url, '_blank');
  };

  const handleDownload = (rec: MusicRecord) => {
    if (!rec.mp3Url) return;
    const a = document.createElement('a');
    a.href = rec.mp3Url;
    a.download = `${rec.name}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFavorite = (rec: MusicRecord) => {
    if (isFavorited(user.id, 'music', String(rec.id))) return;
    addFavorite({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId: user.id,
      type: 'music',
      targetId: String(rec.id),
      title: rec.name,
      thumbnail: rec.cover,
      url: rec.mp3Url || '',
      artist: rec.artists,
      duration: rec.duration,
      createdAt: Date.now(),
    });
  };

  const handleDelete = (id: string) => {
    removeMusicRecord(user.id, id);
    setRecords(getMusicHistory(user.id));
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-8">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-[color:var(--color-txt-1)]">音乐识别历史</h1>
          <p className="text-[14px] text-[color:var(--color-txt-2)] mt-1">你识别过的音乐都会保存在这里</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-[13px] rounded-lg border border-gray-200 w-56 outline-none focus:border-indigo-400 transition"
            placeholder="搜索歌曲或艺术家"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 空状态 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[60px] mb-4">🎵</div>
          <div className="text-[16px] font-semibold text-gray-600 mb-2">暂无识别记录</div>
          <div className="text-[14px] text-gray-500">在首页解析视频时会自动识别背景音乐</div>
        </div>
      ) : (
        /* 列表 */
        <div className="space-y-2">
          {filtered.map((rec) => (
            <div
              key={rec.id}
              className="card p-3 flex items-center gap-4 hover:shadow-md transition"
            >
              {/* 封面 */}
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                {rec.cover ? (
                  <img src={rec.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🎵</div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[14.5px] text-[color:var(--color-txt-1)] truncate">
                  {rec.name}
                </div>
                <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                  {rec.artists} · {rec.album}
                </div>
                <div className="text-[11.5px] text-gray-400 mt-0.5 truncate flex items-center gap-2">
                  <span>来源: {rec.videoTitle}</span>
                  <span>·</span>
                  <span>{formatDate(rec.recognizedAt)}</span>
                  <span>·</span>
                  <span className={rec.matchScore >= 0.8 ? 'text-green-500' : rec.matchScore >= 0.6 ? 'text-yellow-500' : 'text-gray-400'}>
                    匹配度 {(rec.matchScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  className="p-2 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-500 transition"
                  onClick={() => handlePlay(rec)}
                  disabled={!rec.available}
                  title={rec.available ? '试听' : '暂无资源'}
                >
                  <Play size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-500 transition"
                  onClick={() => handleDownload(rec)}
                  disabled={!rec.available}
                  title={rec.available ? '下载' : '暂无资源'}
                >
                  <Download size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-pink-50 text-gray-500 hover:text-pink-500 transition"
                  onClick={() => handleFavorite(rec)}
                  title="加入收藏"
                >
                  <Heart size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition"
                  onClick={() => setConfirmDelete(rec.id)}
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[360px] p-6 fade-up">
            <h3 className="text-[17px] font-semibold mb-2">确认删除</h3>
            <p className="text-[13.5px] text-gray-500 mb-5">删除后无法恢复，确定要删除这条识别记录吗？</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-lg border border-gray-200 text-[13.5px] hover:bg-gray-50 transition" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13.5px] hover:bg-red-600 transition" onClick={() => handleDelete(confirmDelete)}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
