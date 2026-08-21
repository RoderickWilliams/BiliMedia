import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
  return `/api/download/video?${q.toString()}`;
}

/** 构造音乐下载 URL（后端代理） */
export function buildMusicDownloadUrl(url: string, name: string) {
  const q = new URLSearchParams();
  q.set('url', encodeURIComponent(url));
  q.set('name', name);
  return `/api/download/music?${q.toString()}`;
}

export default api;
