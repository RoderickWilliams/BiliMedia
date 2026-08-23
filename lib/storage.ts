const DEFAULT_REPO = 'RoderickWilliams/BiliMedia';
const TOKEN = process.env.BILIMEDIA_STORAGE_TOKEN || process.env.GITHUB_TOKEN || '';
const REPO = process.env.BILIMEDIA_STORAGE_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
const BRANCH = process.env.BILIMEDIA_STORAGE_BRANCH || 'main';
const API_ROOT = 'https://api.github.com';
let memoryStore = null;
let memoryUsers = null;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
export async function readJSONFile(path, fallback) {
  if (!TOKEN) {
    if (path === 'data/users.json') return memoryUsers || (memoryUsers = []);
    if (path === 'data/store.json') { if (!memoryStore) memoryStore = { downloads: [], music: [], favorites: [] }; return memoryStore; }
    return fallback;
  }
  try {
    const url = API_ROOT + '/repos/' + REPO + '/contents/' + encodeURI(path) + '?ref=' + encodeURIComponent(BRANCH);
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (res.status === 404) return fallback;
    if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error('GitHub API ' + res.status + ': ' + txt.slice(0, 200)); }
    const json = await res.json();
    const content = json.content;
    if (!content) return fallback;
    const raw = Buffer.from(content.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (e) { console.error('[storage] readJSONFile fail:', path, e); return fallback; }
}
export async function writeJSONFile(path, value, maxTries = 4) {
  if (!TOKEN) {
    if (path === 'data/users.json') memoryUsers = value;
    else if (path === 'data/store.json') memoryStore = value;
    return;
  }
  const content = Buffer.from(JSON.stringify(value, null, 2), 'utf8').toString('base64');
  const url = API_ROOT + '/repos/' + REPO + '/contents/' + encodeURI(path);
  for (let attempt = 0; attempt < maxTries; attempt++) {
    let sha = null;
    try {
      const headRes = await fetch(url + '?ref=' + encodeURIComponent(BRANCH), { headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, 'X-GitHub-Api-Version': '2022-11-28' } });
      if (headRes.ok) { const headJson = await headRes.json(); sha = headJson.sha || null; }
      else if (headRes.status !== 404) { const txt = await headRes.text().catch(() => ''); throw new Error('HEAD ' + headRes.status + ': ' + txt.slice(0, 200)); }
    } catch (e) { if (attempt === maxTries - 1) throw e; await sleep(300 * (attempt + 1)); continue; }
    const body = { message: 'chore(storage): update ' + path, content, branch: BRANCH };
    if (sha) body.sha = sha;
    const putRes = await fetch(url, { method: 'PUT', headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify(body) });
    if (putRes.ok) return;
    const txt = await putRes.text().catch(() => '');
    if (putRes.status === 409 && attempt < maxTries - 1) { await sleep(300 * (attempt + 1)); continue; }
    throw new Error('GitHub PUT ' + putRes.status + ': ' + txt.slice(0, 300));
  }
}
export async function getUsers() { return await readJSONFile('data/users.json', []); }
export async function saveUsers(users) { await writeJSONFile('data/users.json', users); }
export async function getStore() { const raw = await readJSONFile('data/store.json', null); return { downloads: Array.isArray(raw && raw.downloads) ? raw.downloads : [], music: Array.isArray(raw && raw.music) ? raw.music : [], favorites: Array.isArray(raw && raw.favorites) ? raw.favorites : [] }; }
export async function saveStore(store) { await writeJSONFile('data/store.json', store); }
