import { useState, useEffect } from 'react';
import { Play, Download, Heart } from 'lucide-react';
import { useAuth, getFavorites, removeFavorite } from '../services/auth';
import type { FavoriteItem } from '../services/auth';

type Tab = 'all' | 'video' | 'music';

export default function Favorites() {
  const { user, isLoggedIn } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) setItems(getFavorites(user.id));
  }, [user]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center text-[color:var(--color-txt-2)]">
        <div className="text-[48px] mb-4">🔒</div>
        <div className="text-[18px] font-semibold mb-2 text-[color:var(--color-txt-1)]">请先登录</div>
        <div className="text-[14px]">登录后才能查看收藏</div>
      </div>
    );
  }

  const filtered = tab === 'all' ? items : items.filter(i => i.type === tab);
  const videoCount = items.filter(i => i.type === 'video').length;
  const musicCount = items.filter(i => i.type === 'music').length;

  const handleDelete = (id: string) => {
    removeFavorite(user.id, id);
    setItems(getFavorites(user.id));
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-8">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-[color:var(--color-txt-1)]">我的收藏</h1>
        <p className="text-[14px] text-[color:var(--color-txt-2)] mt-1">管理你收藏的视频和音乐</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-100">
        {([
          { key: 'all', label: '全部', count: items.length },
          { key: 'video', label: '视频', count: videoCount },
          { key: 'music', label: '音乐', count: musicCount },
        ] as const).map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2.5 text-[14px] font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="text-[12px] opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* 空状态 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[60px] mb-4">❤️</div>
          <div className="text-[16px] font-semibold text-gray-600 mb-2">暂无收藏</div>
          <div className="text-[14px] text-gray-500">在下载历史或识别结果中点击爱心即可收藏</div>
        </div>
      ) : tab === 'video' || tab === 'all' ? (
        /* 视频卡片 */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.filter(i => i.type === 'video').map((item) => (
            <div key={item.id} className="card overflow-hidden group">
              <div className="relative aspect-video bg-gray-200">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    className="px-3 py-1.5 bg-white rounded-lg text-[13px] font-medium flex items-center gap-1.5"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = item.url;
                      a.download = item.title;
                      a.target = '_blank';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    <Download size={14} /> 下载
                  </button>
                </div>
                <button
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-pink-500 hover:bg-white transition opacity-0 group-hover:opacity-100"
                  onClick={() => setConfirmDelete(item.id)}
                >
                  <Heart size={14} fill="currentColor" />
                </button>
              </div>
              <div className="p-3">
                <div className="text-[13.5px] font-medium text-gray-800 truncate">{item.title}</div>
                <div className="text-[12px] text-gray-500 mt-0.5">{item.artist}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 音乐列表 */
        <div className="space-y-2">
          {filtered.filter(i => i.type === 'music').map((item) => (
            <div key={item.id} className="card p-3 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[14px] truncate">{item.title}</div>
                <div className="text-[12px] text-gray-500">{item.artist}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="p-2 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-500"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <Play size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-500"
                  onClick={() => {
                    if (!item.url) return;
                    const a = document.createElement('a');
                    a.href = item.url;
                    a.download = `${item.title}.mp3`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <Download size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-50 text-pink-500"
                  onClick={() => setConfirmDelete(item.id)}
                >
                  <Heart size={16} fill="currentColor" />
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
            <h3 className="text-[17px] font-semibold mb-2">确认取消收藏</h3>
            <p className="text-[13.5px] text-gray-500 mb-5">确定要取消收藏吗？</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-lg border border-gray-200 text-[13.5px] hover:bg-gray-50 transition" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13.5px] hover:bg-red-600 transition" onClick={() => handleDelete(confirmDelete)}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
