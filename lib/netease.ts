import axios from 'axios';
const MUSIC_HOST = 'https://music.163.com';
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Origin: 'https://music.163.com',
};
function buildCookie() {
  const rand = (len = 16) => Math.random().toString(36).slice(2, 2 + len) + Date.now().toString(36);
  return [
    'NMTID=' + rand(10),
    '_ntes_nnid=' + rand(32) + ',' + Date.now(),
    '_ntes_nuid=' + rand(32),
    'appver=3.0.1818181818',
    'os=pc',
    'osver=Microsoft-Windows-10-Professional-build-26100-64bit',
  ].join('; ');
}
function cleanKeyword(title, author) {
  const symbols = /[【】\[\]\(\)（）《》「」『』<>{}"'`。，,！？!?.、:：\-_~|/\\]/g;
  const t = (title || '').replace(symbols, ' ').replace(/\s+/g, ' ').trim();
  const a = (author || '').replace(/[【】\[\]\(\)（）]/g, ' ').trim();
  const noiseWords = /\b(4K|8K|1080P|2160P|720P|HDR|蓝光|超清|高清|MV|官方|完整版|歌词版|纯音乐|治愈|唯美|混剪|无损|HiRes|杜比)\b/gi;
  const striped = t.replace(noiseWords, ' ').replace(/\s+/g, ' ').trim();
  return (striped + ' ' + a).trim().slice(0, 80);
}
async function searchSongs(keyword, limit = 5) {
  try {
    const body = new URLSearchParams({ s: keyword, type: '1', offset: '0', limit: String(limit), total: 'true' });
    const { data } = await axios.post(MUSIC_HOST + '/api/search/get/web', body, {
      headers: { ...COMMON_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: buildCookie() },
      timeout: 15000,
    });
    return (data && data.result && data.result.songs) || [];
  } catch { return []; }
}
async function getSongDetails(ids) {
  const map = new Map();
  if (!ids.length) return map;
  try {
    const { data } = await axios.get(MUSIC_HOST + '/api/song/detail', {
      params: { ids: '[' + ids.join(',') + ']' },
      headers: { ...COMMON_HEADERS, Cookie: buildCookie() },
      timeout: 15000,
    });
    (data && data.songs || []).forEach(s => map.set(s.id, s));
  } catch {}
  return map;
}
async function getSongUrls(ids, br = 3200000) {
  const map = new Map();
  ids.forEach(i => map.set(i, null));
  if (!ids.length) return map;
  try {
    const { data } = await axios.get(MUSIC_HOST + '/api/song/enhance/player/url', {
      params: { ids: '[' + ids.join(',') + ']', br: String(br) },
      headers: { ...COMMON_HEADERS, Cookie: buildCookie() },
      timeout: 15000,
    });
    (data && data.data || []).forEach(u => map.set(u.id, u.url || null));
  } catch {}
  return map;
}
export async function recognizeMusicFromVideo(title, author) {
  const keyword = cleanKeyword(title, author) || title;
  if (!keyword) return { accuracy: 0, list: [] };
  let songs = [];
  try { songs = await searchSongs(keyword, 5); }
  catch (e) { throw new Error('网易云音乐识别失败：' + (e?.response?.status || '') + ' ' + (e?.message || e)); }
  if (!songs.length) return { accuracy: 0, list: [] };
  const candidates = songs.slice(0, 5);
  const ids = candidates.map(s => Number(s.id)).filter(Boolean);
  const [detailMap, urlMap] = await Promise.all([getSongDetails(ids), getSongUrls(ids)]);
  const list = candidates.map(s => {
    const id = Number(s.id);
    const d = detailMap.get(id);
    const artists = (d && d.ar && d.ar.map(a => a.name).join(', ')) ||
      (s.artists && s.artists.map(a => a.name).join(', ')) ||
      (s.album && s.album.artist && s.album.artist.name) || '未知艺术家';
    const album = (d && d.al && d.al.name) || (s.album && s.album.name) || '未知专辑';
    const cover = (d && d.al && d.al.picUrl) || (s.album && (s.album.picUrl || s.album.blurPicUrl)) || '';
    const durationSec = Math.floor((((d && d.dt) || s.duration || 0) / 1000));
    return { id, name: (d && d.name) || s.name, artists, album, cover, duration: durationSec, mp3Url: urlMap.get(id) || null };
  });
  const accuracy = Math.min(0.99, 0.78 + Math.min(candidates.length, 3) * 0.07);
  return { accuracy, list };
}
