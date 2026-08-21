import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============ 类型定义 ============
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: number;
}

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
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============ localStorage Key ============
const USERS_KEY = 'bilimedia_users';
const CURRENT_USER_KEY = 'bilimedia_current_user';
const DOWNLOADS_KEY = 'bilimedia_downloads';
const MUSIC_KEY = 'bilimedia_music';
const FAVORITES_KEY = 'bilimedia_favorites';

// ============ 工具函数 ============
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* ignore */ }
}

// ============ 历史记录操作 ============
export function getDownloads(userId: string): DownloadRecord[] {
  const all = readJSON<DownloadRecord[]>(DOWNLOADS_KEY, []);
  return all.filter(d => d.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function addDownload(record: DownloadRecord) {
  const all = readJSON<DownloadRecord[]>(DOWNLOADS_KEY, []);
  all.unshift(record);
  writeJSON(DOWNLOADS_KEY, all.slice(0, 500));
}

export function removeDownload(userId: string, id: string) {
  const all = readJSON<DownloadRecord[]>(DOWNLOADS_KEY, []);
  writeJSON(DOWNLOADS_KEY, all.filter(d => d.id !== id));
}

export function getMusicHistory(userId: string): MusicRecord[] {
  const all = readJSON<MusicRecord[]>(MUSIC_KEY, []);
  return all.filter(m => m.userId === userId).sort((a, b) => b.recognizedAt - a.recognizedAt);
}

export function addMusicRecord(record: MusicRecord) {
  const all = readJSON<MusicRecord[]>(MUSIC_KEY, []);
  all.unshift(record);
  writeJSON(MUSIC_KEY, all.slice(0, 500));
}

export function removeMusicRecord(userId: string, id: string) {
  const all = readJSON<MusicRecord[]>(MUSIC_KEY, []);
  writeJSON(MUSIC_KEY, all.filter(m => m.id !== id));
}

export function getFavorites(userId: string): FavoriteItem[] {
  const all = readJSON<FavoriteItem[]>(FAVORITES_KEY, []);
  return all.filter(f => f.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function addFavorite(item: FavoriteItem) {
  const all = readJSON<FavoriteItem[]>(FAVORITES_KEY, []);
  // 防止重复
  if (all.some(f => f.userId === item.userId && f.type === item.type && f.targetId === item.targetId)) return;
  all.unshift(item);
  writeJSON(FAVORITES_KEY, all.slice(0, 500));
}

export function removeFavorite(userId: string, id: string) {
  const all = readJSON<FavoriteItem[]>(FAVORITES_KEY, []);
  writeJSON(FAVORITES_KEY, all.filter(f => f.id !== id));
}

export function isFavorited(userId: string, type: 'video' | 'music', targetId: string): boolean {
  const all = readJSON<FavoriteItem[]>(FAVORITES_KEY, []);
  return all.some(f => f.userId === userId && f.type === type && f.targetId === targetId);
}

// ============ Provider ============
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const current = readJSON<{ username: string } | null>(CURRENT_USER_KEY, null);
    if (current) {
      const users = readJSON<User[]>(USERS_KEY, []);
      const found = users.find(u => u.username === current.username);
      if (found) setUser(found);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const users = readJSON<Array<{ id: string; username: string; email: string; password: string; createdAt: number }>>(USERS_KEY, []);
    const found = users.find(u => u.username === username && u.password === password);
    if (!found) {
      return { ok: false, message: '用户名或密码错误' };
    }
    const u: User = { id: found.id, username: found.username, email: found.email, createdAt: found.createdAt };
    setUser(u);
    writeJSON(CURRENT_USER_KEY, { username: u.username });
    setShowLoginModal(false);
    return { ok: true, message: '登录成功' };
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    if (!username || username.length < 2) {
      return { ok: false, message: '用户名至少 2 个字符' };
    }
    if (!email) {
      return { ok: false, message: '请输入邮箱' };
    }
    if (!password || password.length < 4) {
      return { ok: false, message: '密码至少 4 个字符' };
    }
    const users = readJSON<Array<{ id: string; username: string; email: string; password: string; createdAt: number }>>(USERS_KEY, []);
    if (users.some(u => u.username === username)) {
      return { ok: false, message: '用户名已存在' };
    }
    if (users.some(u => u.email === email)) {
      return { ok: false, message: '邮箱已被注册' };
    }
    const newUser = { id: genId(), username, email, password, createdAt: Date.now() };
    users.push(newUser);
    writeJSON(USERS_KEY, users);
    const u: User = { id: newUser.id, username: newUser.username, email: newUser.email, createdAt: newUser.createdAt };
    setUser(u);
    writeJSON(CURRENT_USER_KEY, { username: u.username });
    setShowLoginModal(false);
    return { ok: true, message: '注册成功' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }, []);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoggedIn: !!user,
        showLoginModal,
        openLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
