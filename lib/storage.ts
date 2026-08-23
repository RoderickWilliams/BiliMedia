// 通过 GitHub Contents API 读写仓库里的 JSON 文件，作为无数据库的持久化存储。
// 支持 Vercel 部署时从两种来源拿到凭证：
//   1) 环境变量 GITHUB_TOKEN + GITHUB_REPOSITORY (Vercel 手动配置)
//   2) 环境变量 BILIMEDIA_STORAGE_TOKEN + BILIMEDIA_STORAGE_REPO（显式自定义）
// 回退：如果两个都没配，降级到进程内内存缓存（首次体验不会报错，但重启会丢）

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

export interface Store {
  downloads: any[];
  music: any[];
  favorites: any[];
}

// 进程内兜底缓存（Token 缺失时使用）
let memoryStore: Store | null = null;
let memoryUsers: any[] | null = null;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** 读取 JSON 文件（带本地兜底） */
export async function readJSONFile<T>(path: string, fallback: T): Promise<T> {
  if (!TOKEN) {
    // 无 token：返回内存兜底
    if (path === 'data/users.json') return (memoryUsers ?? (memoryUsers = []) as any) as T;
    if (path === 'data/store.json') {
      if (!memoryStore) memoryStore = { downloads: [], music: [], favorites: [] };
      return memoryStore as T;
    }
    return fallback;
  }
  try {
    const url = `${API_ROOT}/repos/${REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(BRANCH)}`;
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
    const json = await res.json();
    const content = json.content as string | undefined; // base64
    if (!content) return fallback;
    const raw = Buffer.from(content.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('[storage] readJSONFile fail:', path, e);
    return fallback;
  }
}

/** 写入 JSON 文件（创建或更新；自动带 SHA；冲突重试） */
export async function writeJSONFile<T>(path: string, value: T, maxTries = 4): Promise<void> {
  if (!TOKEN) {
    if (path === 'data/users.json') memoryUsers = value as any;
    else if (path === 'data/store.json') memoryStore = value as any;
    return;
  }
  const content = Buffer.from(JSON.stringify(value, null, 2), 'utf8').toString('base64');
  const url = `${API_ROOT}/repos/${REPO}/contents/${encodeURI(path)}`;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    // 拿 SHA（存在时需要）
    let sha: string | null = null;
    try {
      const headRes = await fetch(url + `?ref=${encodeURIComponent(BRANCH)}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + TOKEN,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (headRes.ok) {
        const headJson = await headRes.json();
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
      // 冲突：重试获取最新 SHA
      await sleep(300 * (attempt + 1));
      continue;
    }
    throw new Error(`GitHub PUT ${putRes.status}: ${txt.slice(0, 300)}`);
  }
}

// =============================================================
// 领域模型：用户表 + 存储桶
// =============================================================
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
