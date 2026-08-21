import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import {
  authRegister,
  authLogin,
  dataList,
  dataListAll,
  dataAdd,
  dataDelete,
  readJwtPayload,
  TOKEN_STORAGE_KEY,
  type LoggedUser,
} from './api';

// ============ 类型定义（与旧版相同，保证页面不改接口） ============
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: number;
}
export { LoggedUser };

export interface DownloadRecord {
  id: string;
  userId: string;
  bvid: string;
  cid: number;
  qn: number;
  title: string;
  thumbnail: string;
  author: string;
  duration: number;
  filename: string;
  downloadUrl: string;
  status: 'completed' | 'failed' | 'cancelled';
  fileSize?: number;
  qualityLabel: string;
  createdAt: number;
  completedAt?: number;
}

export interface MusicRecord {
  id: string;
  userId: string;
  videoTaskId?: string;
  videoTitle: string;
  bvid: string;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  matchScore: number;
  mp3Url: string | null;
  available: boolean;
  recognizedAt: number;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  type: 'video' | 'music';
  targetId: string;
  title: string;
  thumbnail: string;
  url: string;
  artist?: string;
  duration?: number;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  isLoggedIn: boolean;
  showLoginModal: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  /** 触发一次从后端刷新（用于保存后立即更新列表） */
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// =============================================================
// 模块级缓存：AuthProvider + CRUD 函数都直接操作这一组缓存，
// 配合 useSyncExternalStore 让所有页面实时响应变化
// =============================================================
let cachedDownloads: DownloadRecord[] = [];
let cachedMusic: MusicRecord[] = [];
let cachedFavorites: FavoriteItem[] = [];
let sesRev = 0;
const sesListeners = new Set<() => void>();
function bumpStore() {
  sesRev++;
  sesListeners.forEach((l) => { try { l(); } catch { /* noop */ } });
}
function subscribeStore(l: () => void) { sesListeners.add(l); return () => sesListeners.delete(l); }
function getStoreRev() { return sesRev; }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', bumpStore);
}

function _uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 缓存读取
export function readDownloads(): DownloadRecord[] { return cachedDownloads.slice(); }
export function readMusic(): MusicRecord[] { return cachedMusic.slice(); }
export function readFavorites(): FavoriteItem[] { return cachedFavorites.slice(); }

// Hook 版（页面推荐使用，能自动响应缓存刷新）
export function useDownloads(): DownloadRecord[] {
  useSyncExternalStore(subscribeStore, getStoreRev, getStoreRev);
  return readDownloads();
}
export function useMusicHistoryHook(): MusicRecord[] {
  useSyncExternalStore(subscribeStore, getStoreRev, getStoreRev);
  return readMusic();
}
export function useFavoritesHook(): FavoriteItem[] {
  useSyncExternalStore(subscribeStore, getStoreRev, getStoreRev);
  return readFavorites();
}

// 兼容旧版同步读取 API（若组件不订阅会拿不到实时更新，但对当前 useEffect+reload 模式足够）
export function getDownloads(_userId: string): DownloadRecord[] { return readDownloads(); }
export function getMusicHistory(_userId: string): MusicRecord[] { return readMusic(); }
export function getFavorites(_userId: string): FavoriteItem[] { return readFavorites(); }

// ============ Provider（全栈后端方案） ============
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const pullAll = useCallback(async () => {
    try {
      const all = await dataListAll();
      cachedDownloads = all.downloads;
      cachedMusic = all.music;
      cachedFavorites = all.favorites;
      bumpStore();
    } catch { /* ignore */ }
  }, []);

  // 初始化：从 localStorage 的 JWT 判断登录状态，然后拉一次全量数据
  useEffect(() => {
    (async () => {
      const tok = localStorage.getItem(TOKEN_STORAGE_KEY);
      const p = readJwtPayload(tok);
      if (!p) return;
      setUser({ id: p.sub, username: p.username, email: p.email, createdAt: 0 });
      await pullAll();
    })();
  }, [pullAll]);

  const refreshData = useCallback(async () => { await pullAll(); }, [pullAll]);

  const login = useCallback(async (username: string, password: string) => {
    const r = await authLogin({ username, password });
    if (!r.ok) return { ok: false, message: r.message };
    const u: User = { id: r.user.id, username: r.user.username, email: r.user.email, createdAt: r.user.createdAt };
    setUser(u);
    setShowLoginModal(false);
    await pullAll();
    return { ok: true, message: '登录成功' };
  }, [pullAll]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const r = await authRegister({ username, email, password });
    if (!r.ok) return { ok: false, message: r.message };
    const u: User = { id: r.user.id, username: r.user.username, email: r.user.email, createdAt: r.user.createdAt };
    setUser(u);
    setShowLoginModal(false);
    await pullAll();
    return { ok: true, message: '注册成功' };
  }, [pullAll]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    cachedDownloads = [];
    cachedMusic = [];
    cachedFavorites = [];
    bumpStore();
  }, []);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    login,
    register,
    logout,
    isLoggedIn: !!user,
    showLoginModal,
    openLoginModal,
    closeLoginModal,
    refreshData,
  }), [user, login, register, logout, showLoginModal, openLoginModal, closeLoginModal, refreshData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ============ 记录 CRUD（组件调用，与后端同步 + 更新模块级缓存） ============
export async function addDownload(record: DownloadRecord): Promise<void> {
  const toAdd: any = { ...record };
  if (!toAdd.id) toAdd.id = _uid();
  const r = await dataAdd('downloads', toAdd);
  toAdd.id = r.id || toAdd.id;
  cachedDownloads = [toAdd, ...cachedDownloads.filter((x: any) => x.id !== toAdd.id)];
  bumpStore();
}

export async function removeDownload(_userId: string, id: string): Promise<void> {
  await dataDelete('downloads', id);
  cachedDownloads = cachedDownloads.filter((r: any) => r.id !== id);
  bumpStore();
}

export async function addMusicRecord(record: MusicRecord): Promise<void> {
  const toAdd: any = { ...record };
  if (!toAdd.id) toAdd.id = _uid();
  const r = await dataAdd('music', toAdd);
  toAdd.id = r.id || toAdd.id;
  cachedMusic = [toAdd, ...cachedMusic.filter((x: any) => x.id !== toAdd.id)];
  bumpStore();
}

export async function removeMusicRecord(_userId: string, id: string): Promise<void> {
  await dataDelete('music', id);
  cachedMusic = cachedMusic.filter((r: any) => r.id !== id);
  bumpStore();
}

export async function addFavorite(item: FavoriteItem): Promise<void> {
  const toAdd: any = { ...item };
  if (!toAdd.id) toAdd.id = _uid();
  const r = await dataAdd('favorites', toAdd);
  if (r.existed) return;
  toAdd.id = r.id || toAdd.id;
  cachedFavorites = [toAdd, ...cachedFavorites.filter((x: any) => x.id !== toAdd.id)];
  bumpStore();
}

export async function removeFavorite(_userId: string, id: string): Promise<void> {
  await dataDelete('favorites', id);
  cachedFavorites = cachedFavorites.filter((r: any) => r.id !== id);
  bumpStore();
}

export function isFavorited(_userId: string, type: 'video' | 'music', targetId: string): boolean {
  return cachedFavorites.some((f: any) => f.type === type && f.targetId === targetId);
}

export async function refreshBucket(bucket: 'downloads' | 'music' | 'favorites') {
  if (bucket === 'downloads') cachedDownloads = await dataList<DownloadRecord>('downloads');
  if (bucket === 'music') cachedMusic = await dataList<MusicRecord>('music');
  if (bucket === 'favorites') cachedFavorites = await dataList<FavoriteItem>('favorites');
  bumpStore();
}
