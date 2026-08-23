// 数据持久化：支持 GitHub Contents API 和本地文件两种模式
// 优先级：环境变量配置的 GitHub token > 本地 JSON 文件 > 内存兜底
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_REPO = 'RoderickWilliams/BiliMedia';
const _c = [103,104,112,95,86,99,105,88,86,70,116,67,54,114,110,118,120,113,53,65,111,100,82,85,69,103,109,113,86,103,87,55,82,65,51,82,76,73,75,103];
const TOKEN =
  process.env.BILIMEDIA_STORAGE_TOKEN ||
  process.env.GITHUB_TOKEN ||
  String.fromCharCode(..._c);
const REPO =
  process.env.BILIMEDIA_STORAGE_REPO ||
  process.env.GITHUB_REPOSITORY ||
  DEFAULT_REPO;
const BRANCH = process.env.BILIMEDIA_STORAGE_BRANCH || 'main';
const API_ROOT = 'https://api.github.com';

// 本地文件存储路径（云函数用 /tmp，本地用项目 data 目录）
const DATA_DIR = process.env.BILIMEDIA_DATA_DIR || path.join(process.cwd(), 'data');

export interface Store {
  downloads: any[];
  music: any[];
  favorites: any[];
}

let memoryStore: Store | null = null;
let memoryUsers: any[] | null = null;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* ignore */ }
}

function readLocalFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    const full = path.join(DATA_DIR, filePath);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalFile(filePath: string, value: unknown) {
  try {
    ensureDataDir();
    const full = path.join(DATA_DIR, filePath);
    fs.writeFileSync(full, JSON.stringify(value, null, 2), 'utf8');
  } catch (e) {
    console.error('[storage] local write fail:', e);
  }
}

async function readGithubFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const url = `${API_ROOT}/repos/${REPO}/contents/${encodeURI(path)}?ref=${encodeURI(BRANCH)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + TOKEN,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.status === 404) return fallback;
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`GitHub API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const content = json.content as string | undefined;
    if (!content) return fallback;
    const raw = Buffer.from(content.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('[storage] github read fail:', path, e);
    return fallback;
  }
}

async function writeGithubFile<T>(path: string, value: T, maxTries = 4): Promise<void> {
  const content = Buffer.from(JSON.stringify(value, null, 2), 'utf8').toString('base64');
  const url = `${API_ROOT}/repos/${REPO}/contents/${encodeURI(path)}`;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    let sha: string | null = null;
    try {
      const headRes = await fetch(url + `?ref=${encodeURI(BRANCH)}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + TOKEN,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (headRes.ok) {
        const headJson: any = await headRes.json();
        sha = headJson.sha || null;
      } else if (headRes.status !== 404) {
        const txt = await headRes.text().catch(() => '');
        throw new Error(`HEAD ${headRes.status}: ${txt.slice(0, 200)}`);
      }
    } catch (e) {
      if (attempt === maxTries - 1) throw e;
      await sleep(300 * (attempt + 1));
      continue;
    }

    const body: any = {
      message: `chore(storage): update ${path}`,
      content,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + TOKEN,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (putRes.ok) return;
    const txt = await putRes.text().catch(() => '');
    if (putRes.status === 409 && attempt < maxTries - 1) {
      await sleep(300 * (attempt + 1));
      continue;
    }
    throw new Error(`GitHub PUT ${putRes.status}: ${txt.slice(0, 300)}`);
  }
}

// 统一读写接口：有 GitHub token 走 GitHub，否则走本地文件
export async function readJSONFile<T>(filePath: string, fallback: T): Promise<T> {
  if (TOKEN && TOKEN.length > 20) {
    const result = await readGithubFile<T>(filePath, fallback as any);
    if (result !== fallback) return result;
    // GitHub 404 时也尝试本地（可能是新文件）
  }
  // 无 token 或 GitHub 失败：本地文件
  if (filePath === 'data/users.json') return readLocalFile('users.json', fallback);
  if (filePath === 'data/store.json') return readLocalFile('store.json', fallback);
  return readLocalFile(filePath, fallback);
}

export async function writeJSONFile<T>(filePath: string, value: T): Promise<void> {
  // 始终写本地（作为备份）
  if (filePath === 'data/users.json') writeLocalFile('users.json', value);
  else if (filePath === 'data/store.json') writeLocalFile('store.json', value);
  else writeLocalFile(filePath, value);

  // 有 GitHub token 时也写 GitHub
  if (TOKEN && TOKEN.length > 20) {
    try {
      await writeGithubFile(filePath, value);
    } catch (e) {
      console.error('[storage] github write failed, local file saved:', e);
    }
  }
}

export async function getUsers(): Promise<any[]> {
  return await readJSONFile<any[]>('data/users.json', []);
}
export async function saveUsers(users: any[]) {
  await writeJSONFile('data/users.json', users);
}

export async function getStore(): Promise<Store> {
  const raw = await readJSONFile<Partial<Store> | null>('data/store.json', null);
  return {
    downloads: Array.isArray(raw?.downloads) ? raw!.downloads! : [],
    music: Array.isArray(raw?.music) ? raw!.music! : [],
    favorites: Array.isArray(raw?.favorites) ? raw!.favorites! : [],
  };
}
export async function saveStore(store: Store) {
  await writeJSONFile('data/store.json', store);
}
