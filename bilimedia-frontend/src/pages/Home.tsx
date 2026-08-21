import { useEffect, useState } from 'react';
import { Link2, ArrowRight, Loader2 } from 'lucide-react';

import FeatureBadges from '../components/FeatureBadges';
import VideoCard from '../components/VideoCard';
import MusicList from '../components/MusicList';
import DownloadOptions from '../components/DownloadOptions';
import FeatureFooter from '../components/FeatureFooter';
import { useAuth } from '../services/auth';

import {
  parseVideo,
  recognizeMusic,
  type VideoInfo,
  type RecognizeResult,
} from '../services/api';

export default function Home() {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [url, setUrl] = useState('');
  const [inputErr, setInputErr] = useState(false);

  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoErr, setVideoErr] = useState('');

  const [musicResult, setMusicResult] = useState<RecognizeResult | null>(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicErr, setMusicErr] = useState('');

  const [toast, setToast] = useState<{ show: boolean; msg: string; ok: boolean }>({
    show: false,
    msg: '',
    ok: true,
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  };

  const onParse = async () => {
    const u = url.trim();
    if (!u || !/bilibili\.com|BV[0-9A-Za-z]{10}|av\d+/i.test(u)) {
      setInputErr(true);
      showToast('请粘贴有效的 Bilibili 视频链接', false);
      return;
    }
    setInputErr(false);
    setVideoLoading(true);
    setVideoErr('');
    setMusicLoading(true);
    setMusicErr('');
    setMusicResult(null);
    setVideoInfo(null);

    // 未登录时提示登录
    if (!isLoggedIn) {
      showToast('提示：登录后可保存下载和识别历史', true);
    }

    try {
      const info = await parseVideo(u);
      setVideoInfo(info);
      showToast('视频解析成功，正在识别音乐…');
    } catch (e: any) {
      const m = e?.message || '解析失败，请稍后重试';
      setVideoErr(m);
      showToast(m, false);
      setMusicLoading(false);
    } finally {
      setVideoLoading(false);
    }
  };

  // videoInfo 变化后自动识别音乐
  useEffect(() => {
    if (!videoInfo) return;
    let canceled = false;
    (async () => {
      setMusicLoading(true);
      setMusicErr('');
      try {
        const r = await recognizeMusic(videoInfo.title, videoInfo.author);
        if (canceled) return;
        setMusicResult(r);
        if (r.list.length > 0) {
          showToast(`成功识别 ${r.list.length} 首背景音乐`);
        } else {
          showToast('暂未匹配到背景音乐', false);
        }
      } catch (e: any) {
        if (canceled) return;
        const m = e?.message || '音乐识别失败';
        setMusicErr(m);
        void m;
      } finally {
        if (!canceled) setMusicLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoInfo]);

  const hasAnyContent =
    videoLoading ||
    videoInfo ||
    videoErr ||
    musicLoading ||
    musicResult ||
    musicErr;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-10">
      {/* Toast */}
      <div
        className={`toast ${toast.show ? 'show' : ''}`}
        style={toast.ok ? undefined : { background: '#991B1B' }}
      >
        {toast.msg}
      </div>

      {/* Hero 标题 */}
      <section className="text-center fade-up">
        <h1 className="text-[32px] sm:text-[44px] font-bold leading-tight tracking-tight text-[color:var(--color-txt-1)]">
          B站视频下载 &nbsp;&amp;&nbsp;
          <span className="text-gradient">音乐识别</span>
        </h1>
        <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-[color:var(--color-txt-2)]">
          高清视频下载&nbsp;·&nbsp;背景音乐识别&nbsp;·&nbsp;一键获取音乐下载
        </p>

        {/* 输入框 + 开始解析按钮 */}
        <div className="mt-7 mx-auto max-w-[820px]">
          <div
            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl bg-white/85 backdrop-blur border ${
              inputErr
                ? 'border-red-300'
                : 'border-[color:var(--color-border)]'
            } shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition`}
          >
            <div className="flex items-center gap-3 flex-1 px-3.5 py-1">
              <Link2 size={18} className="text-[color:var(--color-txt-3)] shrink-0" />
              <input
                className="flex-1 bg-transparent outline-none text-[14.5px] py-2 placeholder:text-[color:var(--color-txt-placeholder)] text-[color:var(--color-txt-1)]"
                placeholder="粘贴 Bilibili 视频链接到此处..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (inputErr) setInputErr(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onParse();
                }}
              />
            </div>
            <button
              className="btn-primary justify-center shrink-0"
              onClick={onParse}
              disabled={videoLoading}
              style={{ padding: '12px 28px', borderRadius: 12 }}
            >
              {videoLoading ? <Loader2 size={16} className="spin" /> : null}
              {videoLoading ? '解析中…' : '开始解析'}
              {!videoLoading && <ArrowRight size={16} />}
            </button>
          </div>
          {inputErr && (
            <div className="mt-2 text-left px-1 text-[12.5px] text-[#ef4444]">
              链接格式不正确，示例：https://www.bilibili.com/video/BV1xx411c7mD
            </div>
          )}
          {!isLoggedIn && (
            <div className="mt-3 text-center text-[12.5px] text-gray-500">
              <button
                className="text-indigo-500 hover:underline font-medium"
                onClick={openLoginModal}
              >
                登录后
              </button>
              可自动保存下载和识别历史记录
            </div>
          )}
        </div>

        <FeatureBadges />
      </section>

      {/* 错误提示 */}
      {videoErr && !videoInfo && (
        <div className="mt-7 card p-4 text-center text-[13.5px] text-[#ef4444] fade-up">
          {videoErr}
        </div>
      )}

      {/* 内容区：视频信息 + 音乐识别（左右布局） */}
      {hasAnyContent && (
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
          {/* 左列：视频信息 + 下载选项 */}
          <div className="space-y-5 min-w-0">
            <VideoCard info={videoInfo} loading={videoLoading} />
            <DownloadOptions info={videoInfo} onShowToast={showToast} />
          </div>
          {/* 右列：音乐识别结果 */}
          <div className="min-w-0">
            <MusicList
              result={musicResult}
              loading={musicLoading}
              errorMsg={musicErr}
              videoTitle={videoInfo?.title}
              videoBvid={videoInfo?.bvid}
            />
          </div>
        </section>
      )}

      {/* 底部 4 个功能卡片 */}
      <section className="mt-10">
        <FeatureFooter />
      </section>
    </main>
  );
}
