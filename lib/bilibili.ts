import axios from 'axios';

export const BILI_HEADERS = {
  Referer: 'https://www.bilibili.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};
const BILI_API = 'https://api.bilibili.com';
export function extractBvid(url) {
  if (!url) throw new Error('请输入 B 站链接');
  const bvMatch = url.match(/BV[0-9A-Za-z]{10}/);
  if (bvMatch) return bvMatch[0];
  const avMatch = url.match(/av(\d+)/i);
  if (avMatch) return avMatch[0];
  throw new Error('无法识别该 B 站链接，请粘贴包含 BV 号或 AV 号的地址');
}
export async function parseBilibiliVideo(url) {
  const bvid = extractBvid(url);
  let viewRes;
  try {
    const params = bvid.toLowerCase().startsWith('bv')
      ? { bvid }
      : { aid: parseInt(bvid.replace(/av/i, ''), 10) };
    viewRes = await axios.get(BILI_API + '/x/web-interface/view', {
      params, headers: BILI_HEADERS, timeout: 15000,
    });
  } catch (e) {
    throw new Error('B 站 API 请求失败: ' + (e?.message || e));
  }
  if (viewRes.data.code !== 0) {
    throw new Error(viewRes.data.message || '视频信息获取失败');
  }
  const data = viewRes.data.data;
  const cid = data.cid;
  const pubdate = new Date(data.pubdate * 1000).toISOString().split('T')[0];
  const playUrls = await getVideoPlayUrls(bvid, cid);
  const defaultVideoUrl = playUrls[80] || Object.values(playUrls)[0] || '';
  return {
    bvid: data.bvid || bvid, cid, title: data.title,
    author: (data.owner && data.owner.name) || '未知UP主',
    authorMid: (data.owner && data.owner.mid) || 0,
    cover: data.pic || '', duration: Number(data.duration) || 0,
    pubdate, description: data.desc || '',
    views: (data.stat && data.stat.view) || 0, defaultVideoUrl, playUrls,
  };
}
export async function getVideoPlayUrls(bvid, cid) {
  const targets = [120, 116, 112, 80, 64, 32, 16];
  const result = {};
  for (const qn of targets) {
    try {
      const url = await getVideoPlayUrl(bvid, cid, qn);
      if (url) result[qn] = url;
    } catch {}
  }
  return result;
}
export async function getVideoPlayUrl(bvid, cid, qn = 80) {
  const params = bvid.toLowerCase().startsWith('bv')
    ? { bvid, cid, qn, fnval: 0 }
    : { aid: parseInt(bvid.replace(/av/i, ''), 10), cid, qn, fnval: 0 };
  const res = await axios.get(BILI_API + '/x/player/playurl', {
    params, headers: BILI_HEADERS, timeout: 15000,
  });
  if (res.data.code !== 0) throw new Error(res.data.message || 'playurl qn=' + qn + ' failed');
  const durl = res.data.data && res.data.data.durl;
  if (!durl || !durl[0]) return '';
  return durl[0].url;
                    }
