import axios from 'axios';

const VERCEL_API_BASE = 'https://bili-media.vercel.app/api';

function resolveApiBase(): string {
  if (typeof window === 'undefined') return '/api';
  const host = window.location.hostname || '';
  // 部署在 Vercel 域名（生产或预览）或本地开发：走同源相对路径
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host === 'bili-media.vercel.app'
  ) {
    return '/api';
  }
  // GitHub Pages / 其它非 Vercel 域名：跨域走 Vercel 稳定生产地址
  return VERCEL_API_BASE;
}

const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface QualityOption {
  qn: number;
  label: string;
  sub: string;
  available: boolean;
  sizeEstimateMB: number;
}

export interface VideoInfo {
  bvid: string;
  cid: number;
  title: string;
  author: string;
  cover: string;
  duration: number;
  durationText: string;
  pubdate: string;
  description: string;
  views: number;
  defaultVideoUrl: string;
  qualityOptions: QualityOption[];
  playQnMap: Record<number, string>;
}

export interface MusicItem {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  durationText: string;
  mp3Url: string | null;
  available: boolean;
  source: string;
  matchScore?: number;
}

export interface RecognizeResult {
  accuracy: number;
  total: number;
  list: MusicItem[];
}

export async function parseVideo(url: string) {
  const resp = await api.post<{
    ok: boolean;
    message?: string;
    data?: VideoInfo;
  }>('/parse', { url });
  if (!resp.data.ok) throw new Error(resp.data.message || '解析失败');
  return resp.data.data as VideoInfo;
}

export async function recognizeMusic(title: string, author: string) {
  const resp = await api.post<{
    ok: boolean;
    message?: string;
    data?: RecognizeResult;
  }>('/recognize', { title, author });
  if (!resp.data.ok) throw new Error(resp.data.message || '识别失败');
  return resp.data.data as RecognizeResult;
}

/** 构造视频下载 URL（后端代理） */
export function buildVideoDownloadUrl(params: {
  bvid: string;
  cid: number;
  qn: number;
  filename?: string;
}) {
  const q = new URLSearchParams();
  q.set('bvid', params.bvid);
  q.set('cid', String(params.cid));
  q.set('qn', String(params.qn));
  if (params.filename) q.set('filename', params.filename);
  const path = `/api/download/video?${q.toString()}`;
  return API_BASE === '/api' ? path : `https://bili-media.vercel.app${path}`;
}

/** 构造音乐下载 URL（后端代理） */
export function buildMusicDownloadUrl(url: string, name: string) {
  const q = new URLSearchParams();
  q.set('url', encodeURIComponent(url));
  q.set('name', name);
  const path = `/api/download/music?${q.toString()}`;
  return API_BASE === '/api' ? path : `https://bili-media.vercel.app${path}`;
}

export default api;
