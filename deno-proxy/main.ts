// BiliMedia API 反向代理（部署在 Deno Deploy，供国内无代理用户中转访问 Vercel 后端）
// 部署后获得的 *.deno.dev 域名在国内系统网络下可达，前端在 Vercel 不可达时切换到本地址。
//
// 工作原理：把所有请求原样转发到 https://bili-media.vercel.app ，并补齐 CORS 头，
// 使 GitHub Pages 上的前端可以跨域调用。流式响应（视频/音乐下载）通过 ReadableStream 直接透传。

const UPSTREAM = "https://bili-media.vercel.app";

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function withCors(resp: Response): Response {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v as string);
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  // 预检
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const target = new URL(url.pathname + url.search, UPSTREAM);

  // 构造转发 headers：去掉 host/origin 等，保留 Content-Type / Authorization
  const fwdHeaders = new Headers();
  const keep = new Set([
    "content-type",
    "authorization",
    "accept",
    "user-agent",
    "content-length",
  ]);
  for (const [k, v] of req.headers.entries()) {
    if (keep.has(k.toLowerCase())) fwdHeaders.set(k, v);
  }

  // 转发 body（GET/HEAD 不带 body）
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "follow",
    });
    return withCors(upstream);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return withCors(
      new Response(
        JSON.stringify({ ok: false, message: "上游 Vercel 请求失败: " + msg }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
});
