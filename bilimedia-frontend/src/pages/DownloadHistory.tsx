import { useState } from 'react';
import { Download, Trash2, Heart, AlertTriangle, Search, Play } from 'lucide-react';
import { useAuth, useDownloads, removeDownload, addFavorite, isFavorited } from '../services/auth';
import type { DownloadRecord } from '../services/auth';

function formatSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function DownloadHistory() {
  const { user, isLoggedIn } = useAuth();
  const records = useDownloads();     // 自动响应缓存刷新
  const [search, setSearch] = useState('');
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deadId, setDeadId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyDel, setBusyDel] = useState<string | null>(null);
  const [busyFav, setBusyFav] = useState<string | null>(null);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center text-[color:var(--color-txt-2)]">
        <div className="text-[48px] mb-4">🔒</div>
        <div className="text-[18px] font-semibold mb-2 text-[color:var(--color-txt-1)]">请先登录</div>
        <div className="text-[14px]">登录后才能查看下载历史</div>
      </div>
    );
  }

  const filtered = records.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.author.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = async (rec: DownloadRecord) => {
    setCheckingId(rec.id);
    setDeadId(null);
    try {
      await fetch(rec.downloadUrl, { method: 'HEAD', mode: 'no-cors' });
      const a = document.createElement('a');
      a.href = rec.downloadUrl;
      a.download = rec.filename;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDeadId(rec.id);
    } finally {
      setCheckingId(null);
    }
  };

  const handleFavorite = async (rec: DownloadRecord) => {
    if (isFavorited(user.id, 'video', rec.bvid + '_' + rec.qn)) return;
    setBusyFav(rec.id);
    try {
      await addFavorite({
        id: '',
        userId: user.id,
        type: 'video',
        targetId: rec.bvid + '_' + rec.qn,
        title: rec.title,
        thumbnail: rec.thumbnail,
        url: rec.downloadUrl,
        artist: rec.author,
        duration: rec.duration,
        createdAt: Date.now(),
      });
    } finally { setBusyFav(null); }
  };

  const handleDelete = async (id: string) => {
    setBusyDel(id);
    try {
      await removeDownload(user.id, id);
    } finally {
      setBusyDel(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-[color:var(--color-txt-1)]">下载历史</h1>
          <p className="text-[14px] text-[color:var(--color-txt-2)] mt-1">查看和管理你下载过的视频资源（多入口同步）</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-[13px] rounded-lg border border-gray-200 w-56 outline-none focus:border-indigo-400 transition"
            placeholder="搜索标题或UP主"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[60px] mb-4">📥</div>
          <div className="text-[16px] font-semibold text-gray-600 mb-2">暂无下载记录</div>
          <div className="text-[14px] text-gray-500">在首页解析视频并下载，记录会自动保存在这里并在多入口同步</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <div key={rec.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition">
              <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                {rec.thumbnail ? (
                  <img src={rec.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Download size={20} />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                  {rec.qualityLabel}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] text-[color:var(--color-txt-1)] truncate">{rec.title}</div>
                <div className="text-[12.5px] text-gray-500 mt-1 flex items-center gap-3">
                  <span>{rec.author}</span>
                  <span>·</span>
                  <span>{formatDate(rec.createdAt)}</span>
                  <span>·</span>
                  <span>{formatSize(rec.fileSize)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {deadId === rec.id ? (
                  <div className="flex items-center gap-1 text-red-500 text-[12px] px-2 py-1 bg-red-50 rounded-lg">
                    <AlertTriangle size={14} /><span>文件已被移动或删除</span>
                  </div>
                ) : (
                  <button
                    className="btn-secondary text-[12.5px] px-3 py-1.5 flex items-center gap-1.5"
                    style={{ padding: '6px 12px' }}
                    onClick={() => handleOpen(rec)}
                    disabled={checkingId === rec.id}
                  >
                    {checkingId === rec.id ? '检查中…' : <><Play size={14} /> 重新下载</>}
                  </button>
                )}
                <button
                  className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-pink-500 transition ${busyFav === rec.id ? 'opacity-60' : ''}`}
                  onClick={() => handleFavorite(rec)}
                  title="加入收藏"
                  disabled={busyFav === rec.id}
                >
                  <Heart size={16} />
                </button>
                <button
                  className={`p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition ${busyDel === rec.id ? 'opacity-60' : ''}`}
                  onClick={() => setConfirmDelete(rec.id)}
                  title="删除记录"
                  disabled={busyDel === rec.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[360px] p-6 fade-up">
            <h3 className="text-[17px] font-semibold mb-2">确认删除</h3>
            <p className="text-[13.5px] text-gray-500 mb-5">删除后无法恢复，确定要删除这条下载记录吗？</p>
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
