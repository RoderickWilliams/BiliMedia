import axios from 'axios';

// ============ 基础：动态 API Base ============
// 优先级：构建时 VITE_API_ORIGIN（GitHub Pages 等跨域场景指向腾讯云域名） > 同源 /api（Docker 同域部署）
const ENV_API_ORIGIN = (import.meta as any).env?.VITE_API_ORIGIN || '';

const API_ORIGIN = ENV_API_ORIGIN ? ENV_API_ORIGIN.replace(/\/+$/, '') : '';
export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 自动附加 JWT
const TOKEN_KEY = 'bilimedia_token';
api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const tok = window.localStorage.getItem(TOKEN_KEY);
    if (tok) {
      cfg.headers.Authorization = 'Bearer ' + tok;
    }
  }
  return cfg;
});

export default api;

// ============ 导出 token key ============
export const TOKEN_STORAGE_KEY = TOKEN_KEY;

// 解析 JWT 用的前端辅助函数（不校验签名，仅读 payload 给登录状态判断）
export function readJwtPayload(token: string | null): { sub: string; username: string; email: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    const pad = '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob((payload + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const obj = JSON.parse(decoded);
    if (!obj.sub || !obj.username) return null;
    if (obj.exp && obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}

// ============ 数据模型（保持老字段命名，与后端一致） ============
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

// ============ 解析 / 识别 ============
export async function parseVideo(url: string) {
  const resp = await api.post<{ ok: boolean; message?: string; data?: VideoInfo }>('/parse', { url });
  if (!resp.data.ok) throw new Error(resp.data.message || '解析失败');
  return resp.data.data as VideoInfo;
}

export async function recognizeMusic(title: string, author: string) {
  const resp = await api.post<{ ok: boolean; message?: string; data?: RecognizeResult }>('/recognize', { title, author });
  if (!resp.data.ok) throw new Error(resp.data.message || '识别失败');
  return resp.data.data as RecognizeResult;
}

// ============ 下载链接构建 ============
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
  const path = `/download/video?${q.toString()}`;
  return `${API_BASE}${path}`;
}

export function buildMusicDownloadUrl(url: string, name: string) {
  const q = new URLSearchParams();
  q.set('url', encodeURIComponent(url));
  q.set('name', name);
  const path = `/download/music?${q.toString()}`;
  return `${API_BASE}${path}`;
}

// ============ 账号：注册 / 登录 ============
export interface LoggedUser {
  id: string;
  username: string;
  email: string;
  createdAt: number;
}

export async function authRegister(p: { username: string; email: string; password: string }) {
  const r = await api.post<{ ok: boolean; message?: string; data?: { token: string; user: LoggedUser } }>('/auth/register', p);
  if (!r.data.ok) return { ok: false as const, message: r.data.message || '注册失败' };
  const { token, user } = r.data.data!;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return { ok: true as const, user, token };
}

export async function authLogin(p: { username: string; password: string }) {
  const r = await api.post<{ ok: boolean; message?: string; data?: { token: string; user: LoggedUser } }>('/auth/login', p);
  if (!r.data.ok) return { ok: false as const, message: r.data.message || '登录失败' };
  const { token, user } = r.data.data!;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return { ok: true as const, user, token };
}

// ============ 统一数据接口客户端 ============
export type DataBucket = 'downloads' | 'music' | 'favorites';
export type DownloadRecord = any;
export type MusicRecord = any;
export type FavoriteItem = any;

export async function dataList<T = any>(bucket: DataBucket): Promise<T[]> {
  const r = await api.get<{ ok: boolean; data: T[]; message?: string }>(
    `/data?bucket=${encodeURIComponent(bucket)}`,
  );
  if (!r.data.ok) throw new Error(r.data.message || '读取失败');
  return r.data.data || [];
}

export async function dataListAll(): Promise<{ downloads: DownloadRecord[]; music: MusicRecord[]; favorites: FavoriteItem[] }> {
  const r = await api.get<{ ok: boolean; data: any; message?: string }>('/data?bucket=all');
  if (!r.data.ok) throw new Error(r.data.message || '读取失败');
  const d = r.data.data || {};
  return { downloads: d.downloads || [], music: d.music || [], favorites: d.favorites || [] };
}

export async function dataAdd(bucket: DataBucket, record: Record<string, unknown>): Promise<{ id: string; existed?: boolean }> {
  const r = await api.post<{ ok: boolean; message?: string; data?: { id: string; existed?: boolean } }>(
    `/data?bucket=${encodeURIComponent(bucket)}`,
    { record },
  );
  if (!r.data.ok) throw new Error(r.data.message || '写入失败');
  return r.data.data!;
}

export async function dataDelete(bucket: DataBucket, id: string): Promise<void> {
  const r = await api.delete<{ ok: boolean; message?: string }>(
    `/data?bucket=${encodeURIComponent(bucket)}&id=${encodeURIComponent(id)}`,
  );
  if (!r.data.ok) throw new Error(r.data.message || '删除失败');
}
