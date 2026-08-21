import axios from 'axios';

/** --------------------------------------------------------------------------
 * 网易云音乐 Web API 直连版
 *  不再依赖外部子服务（Binaryify/NeteaseCloudMusicApi 已停止维护）
 *  直接调用网易云音乐公开的 "/api/*" 系列接口，伪造 PC 浏览器头即可
 *  -------------------------------------------------------------------------- */

export interface NeteaseSong {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number; // seconds
  mp3Url: string | null;
}

export interface RecognizeResult {
  accuracy: number;
  list: NeteaseSong[];
}

const MUSIC_HOST = 'https://music.163.com';

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Origin: 'https://music.163.com',
};

function buildCookie(): string {
  const rand = (len = 16) =>
    Math.random().toString(36).slice(2, 2 + len) +
    Date.now().toString(36);
  return [
    `NMTID=${rand(10)}`,
    `_ntes_nnid=${rand(32)},${Date.now()}`,
    `_ntes_nuid=${rand(32)}`,
    'appver=3.0.1818181818',
    'os=pc',
    'osver=Microsoft-Windows-10-Professional-build-26100-64bit',
  ].join('; ');
}

/** 清洗 B 站标题关键词，提升搜索匹配率 */
function cleanKeyword(title: string, author: string): string {
  const symbols =
    /[【】\[\]\(\)（）《》「」『』<>{}"'`「」『』。，,！？!?.、:：\-_~|/\\]/g;
  const t = (title || '')
    .replace(symbols, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const a = (author || '')
    .replace(/[【】\[\]\(\)（）]/g, ' ')
    .trim();
  const noiseWords =
    /\b(4K|8K|1080P|2160P|720P|HDR|蓝光|超清|高清|MV|官方|完整版|歌词版|纯音乐|治愈|唯美|混剪|无损|HiRes|杜比)\b/gi;
  const striped = t
    .replace(noiseWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (striped + ' ' + a).trim().slice(0, 80);
}

/** 搜索歌曲：POST 表单提交 /api/search/get/web */
async function searchSongs(
  keyword: string,
  limit = 5
): Promise<any[]> {
  try {
    const body = new URLSearchParams({
      s: keyword,
      type: '1',
      offset: '0',
      limit: String(limit),
      total: 'true',
    });
    const { data } = await axios.post(
      `${MUSIC_HOST}/api/search/get/web`,
      body,
      {
        headers: {
          ...COMMON_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: buildCookie(),
        },
        timeout: 15000,
      }
    );
    return data?.result?.songs || [];
  } catch {
    return [];
  }
}

/** 歌曲详情：GET /api/song/detail */
async function getSongDetails(
  ids: number[]
): Promise<Map<number, any>> {
  const map = new Map<number, any>();
  if (ids.length === 0) return map;
  try {
    const { data } = await axios.get(`${MUSIC_HOST}/api/song/detail`, {
      params: { ids: `[${ids.join(',')}]` },
      headers: { ...COMMON_HEADERS, Cookie: buildCookie() },
      timeout: 15000,
    });
    (data?.songs || []).forEach((s: any) => map.set(s.id, s));
  } catch {
    /* ignore */
  }
  return map;
}

/** 歌曲播放链接：GET /api/song/enhance/player/url  (320kbps) */
async function getSongUrls(
  ids: number[],
  br = 3200000
): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  ids.forEach((i) => map.set(i, null));
  if (ids.length === 0) return map;
  try {
    const { data } = await axios.get(
      `${MUSIC_HOST}/api/song/enhance/player/url`,
      {
        params: { ids: `[${ids.join(',')}]`, br: String(br) },
        headers: { ...COMMON_HEADERS, Cookie: buildCookie() },
        timeout: 15000,
      }
    );
    (data?.data || []).forEach((u: any) => {
      map.set(u.id, u.url || null);
    });
  } catch {
    /* ignore */
  }
  return map;
}

/**
 * 主入口：使用清洗后的关键词调用网易云搜索，拉取详情与 MP3 URL
 */
export async function recognizeMusicFromVideo(
  title: string,
  author: string
): Promise<RecognizeResult> {
  const keyword = cleanKeyword(title, author) || title;
  if (!keyword) return { accuracy: 0, list: [] };

  let songs: any[] = [];
  try {
    songs = await searchSongs(keyword, 5);
  } catch (e: any) {
    throw new Error(
      `网易云音乐识别失败：${e?.response?.status || ''} ${e?.message || e}`
    );
  }
  if (songs.length === 0) return { accuracy: 0, list: [] };

  const candidates = songs.slice(0, 5);
  const ids = candidates.map((s) => Number(s.id)).filter(Boolean);

  const [detailMap, urlMap] = await Promise.all([
    getSongDetails(ids),
    getSongUrls(ids),
  ]);

  const list: NeteaseSong[] = candidates.map((s) => {
    const id = Number(s.id);
    const d = detailMap.get(id);
    const artists =
      d?.ar?.map((a: any) => a.name).join(', ') ||
      s.artists?.map((a: any) => a.name)?.join(', ') ||
      s.album?.artist?.name ||
      '未知艺术家';
    const album = d?.al?.name || s.album?.name || '未知专辑';
    const cover =
      d?.al?.picUrl || s.album?.picUrl || s.album?.blurPicUrl || '';
    const durationSec = Math.floor(
      (((d?.dt as number) || (s.duration as number) || 0) as number) /
        1000
    );
    return {
      id,
      name: d?.name || s.name,
      artists,
      album,
      cover,
      duration: durationSec,
      mp3Url: urlMap.get(id) || null,
    };
  });

  const accuracy = Math.min(
    0.99,
    0.78 + Math.min(candidates.length, 3) * 0.07
  );
  return { accuracy, list };
}
