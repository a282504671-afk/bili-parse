/**
 * 全平台短视频解析 Worker（不依赖 BugPK）
 * 支持：抖音 / 快手 / 小红书 / B站 / TikTok / 西瓜 / 微博 / 微信视频号 / AcFun
 * 部署：Cloudflare Workers
 *
 * 本版本相对原版修复：
 * 1. followRedirects 判断逻辑错误：v.douyin.com 短链因为 host 本身也包含
 *    "douyin.com" 子串而被误判为"已到位"，导致从未真正跟进重定向，
 *    抖音短链基本必现"无法提取视频ID"。改为精确匹配 www.douyin.com。
 * 2. SM3 消息扩展里字节下标写成了 t[4+i]，应为 t[4*i]，
 *    否则哈希计算是错的，a_bogus 签名大概率通不过服务端校验。
 * 3. randomStr 字符集拼写错误（大小写字母表里都少了 J、多了个 G）。
 * 4. B站解析未调用 playurl 接口，url 字段原来恒为空字符串。
 * 5. ttwid 请求失败时原来会回退到一个写死的、早已过期的 cookie 值，
 *    现在改为不带 cookie 继续尝试，并给出更明确的日志/错误信息。
 * 6. 关键路径的 catch 增加 console.error，并把部分异常信息透传到
 *    返回结果里，方便排查（原来大量 catch {} 完全静默）。
 *
 * 注意：抖音/快手/小红书/微博/微信视频号这几个解析器都依赖对方
 * 前端页面里的私有字段结构（未公开的接口/数据格式），这些结构会
 * 随对方产品改版随时变化，不代表"改好之后就能长期稳定工作"，
 * 需要你自己根据实际返回情况持续维护。我这边没有网络环境可以
 * 实际请求这些站点来验证，只能保证逻辑上的修复。
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "content-type": "application/json; charset=utf-8",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    try {
      const url = new URL(request.url);
      const target = url.searchParams.get("url") || "";
      if (!target) return new Response(JSON.stringify({ code: 400, msg: "请传入url参数" }), { headers: CORS });

      const platform = detectPlatform(target);
      let result;
      switch (platform) {
        case "douyin": result = await parseDouyin(target); break;
        case "kuaishou": result = await parseKuaishou(target); break;
        case "xiaohongshu": result = await parseXHS(target); break;
        case "bilibili": result = await parseBilibili(target); break;
        case "tiktok": result = await parseTikTok(target); break;
        case "ixigua": result = await parseXigua(target); break;
        case "weibo": result = await parseWeibo(target); break;
        case "weixin": result = await parseWeixin(target); break;
        case "acfun": result = await parseAcfun(target); break;
        default: result = { code: 400, msg: "不支持的平台" };
      }
      result.platform = platform;
      return new Response(JSON.stringify(result), {
        status: result.code >= 500 ? 500 : 200,
        headers: CORS,
      });
    } catch (e) {
      console.error("顶层异常:", e);
      return new Response(JSON.stringify({ code: 500, msg: "服务异常: " + e.message }), { headers: CORS });
    }
  },
};

function detectPlatform(url) {
  if (/douyin\.com|iesdouyin\.com/.test(url)) return "douyin";
  if (/kuaishou\.com|gifshow\.com|kwai/.test(url)) return "kuaishou";
  if (/xiaohongshu\.com|xhslink/.test(url)) return "xiaohongshu";
  if (/bilibili\.com|b23\.tv/.test(url)) return "bilibili";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/ixigua\.com/.test(url)) return "ixigua";
  if (/weibo\.com|t\.cn/.test(url)) return "weibo";
  if (/weixin\.qq\.com|finder\.video/.test(url)) return "weixin";
  if (/acfun\.cn/.test(url)) return "acfun";
  return "unknown";
}

async function fetchHtml(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    redirect: "follow",
  });
  return await res.text();
}

async function resolveRedirect(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", headers: { "user-agent": UA } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) return new URL(loc, url).toString();
    }
    return res.url || url;
  } catch (e) {
    console.error("resolveRedirect失败:", e);
    return url;
  }
}

function ok(platform, data) { return { code: 200, msg: "解析成功", platform, data }; }
function fail(msg) { return { code: 500, msg }; }

// ==================== 抖音（a_bogus 直连）====================

async function parseDouyin(shareUrl) {
  const resolved = await followRedirects(shareUrl);
  const awemeId = extractAwemeId(resolved);
  if (!awemeId) return fail(`无法提取视频ID（重定向后的链接: ${resolved}）`);

  const ttwid = await getTtwid();
  if (!ttwid) console.warn("获取 ttwid 失败，将不带 cookie 继续尝试，可能导致接口返回空数据");

  const detail = await fetchDouyinDetail(awemeId, ttwid || "");
  if (!detail || !detail.aweme_detail) return fail("抖音API未返回数据（可能是 a_bogus 签名或 ttwid 已失效）");

  const d = detail.aweme_detail;
  const author = d.author || {};
  const images = d.images || d.image_list || [];

  const result = {
    type: images.length ? "image" : "video",
    title: d.desc || "",
    desc: d.desc || "",
    author: {
      name: author.nickname || "",
      id: author.unique_id || author.short_id || author.uid || "",
      avatar: (author.avatar_thumb?.url_list?.[0]) || "",
    },
    cover: "",
    url: "",
    images: [],
    live_photo: [],
    duration: d.video ? Math.round((d.video.duration || 0) / 1000) : 0,
  };

  if (d.video) {
    result.cover = d.video.origin_cover?.url_list?.[0] || d.video.cover?.url_list?.[0] || "";
  }

  if (images.length) {
    for (const img of images) {
      if (img.url_list?.[0]) result.images.push(img.url_list[0]);
      if (img.video) {
        const lv = extractLiveVideo(img.video);
        if (lv) result.live_photo.push({ image: img.url_list?.[0] || "", video: lv });
      }
    }
    if (result.live_photo.length) result.type = "live";
  } else {
    const best = pickBestDouyinVideo(d.video);
    result.url = best.url;
    result.cover = result.cover || best.cover;
    const vid = d.video?.play_addr?.uri || d.video?.uri;
    if (vid) {
      const orig = await resolveOriginal(vid);
      if (orig) result.url = orig;
    }
  }
  return ok("douyin", result);
}

// 修复点：原来用 host.includes("douyin.com") 判断"是否已到位"，
// 但短链 v.douyin.com 的 host 本身就包含 "douyin.com" 子串，
// 导致第一轮循环就直接把还没跳转过的短链当结果返回，
// 从未真正 follow 到 www.douyin.com/video/xxx 这种长链接。
// 这里改成精确匹配跳转后的长链接域名。
async function followRedirects(startUrl, max = 8) {
  let cur = startUrl;
  for (let i = 0; i < max; i++) {
    try {
      const host = new URL(cur).host;
      if (host === "www.douyin.com" || host === "douyin.com") return cur;
    } catch {}
    const next = await getLocation(cur);
    if (!next) break;
    cur = next;
  }
  return cur;
}

async function getLocation(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", headers: { "user-agent": UA } });
    if (res.status >= 300 && res.status < 400) return res.headers.get("location");
  } catch (e) {
    console.error("getLocation失败:", e);
  }
  return null;
}

function extractAwemeId(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) return m[1];
    for (const k of ["modal_id", "aweme_id", "id"]) {
      const v = u.searchParams.get(k);
      if (v && /^\d{15,}/.test(v)) return v;
    }
  } catch (e) {
    console.error("extractAwemeId失败:", e);
  }
  return null;
}

async function getTtwid() {
  try {
    const res = await fetch("https://ttwid.bytedance.com/ttwid/union/register/", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ region: "cn", aid: 6383, need_t: 1, service: "www.douyin.com", domain: ".douyin.com" }),
    });
    const sc = res.headers.get("set-cookie") || "";
    const m = sc.match(/ttwid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) {
    console.error("getTtwid失败:", e);
    return null;
  }
}

async function fetchDouyinDetail(awemeId, ttwid) {
  const referer = `https://www.douyin.com/video/${awemeId}`;
  await fetch(referer, { headers: { "user-agent": UA } }).catch((e) => console.error("预热referer失败:", e));
  const cookie = ttwid ? `ttwid=${ttwid}` : "";
  for (let i = 0; i < 2; i++) {
    const msToken = randomStr(107);
    const params = new URLSearchParams({ device_platform: "webapp", aid: "6383", channel: "channel_pc_web", aweme_id: awemeId, msToken });
    const query = params.toString();
    const aBogus = generate_a_bogus(query, UA);
    try {
      const res = await fetch(`https://www.douyin.com/aweme/v1/web/aweme/detail/?${query}&a_bogus=${encodeURIComponent(aBogus)}`, {
        headers: { "accept": "application/json", "user-agent": UA, "referer": referer, "cookie": cookie },
      });
      const json = await res.json();
      if (json.aweme_detail) return json;
      console.warn(`第${i + 1}次请求未返回 aweme_detail:`, JSON.stringify(json).slice(0, 300));
    } catch (e) {
      console.error(`第${i + 1}次请求异常:`, e);
    }
  }
  return null;
}

function pickBestDouyinVideo(video) {
  if (!video) return { url: "", cover: "" };
  const cover = video.origin_cover?.url_list?.[0] || video.cover?.url_list?.[0] || "";
  const brList = video.bitRateList || video.bit_rate || [];
  let bestUrl = "", bestBr = -1;
  for (const br of brList) {
    const urls = br.play_addr?.url_list || [];
    const rate = br.bitRate || br.bit_rate || 0;
    for (const u of urls) {
      if (u.includes("v3-web") && rate > bestBr) { bestUrl = u; bestBr = rate; }
    }
  }
  if (!bestUrl) bestUrl = video.play_addr?.url_list?.[0] || "";
  return { url: bestUrl.replace(/playwm/g, "play"), cover };
}

async function resolveOriginal(vid) {
  try {
    let cur = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(vid)}&ratio=default&line=0`;
    for (let i = 0; i < 3; i++) {
      const res = await fetch(cur, { method: "GET", redirect: "manual", headers: { "user-agent": UA } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (loc) { cur = loc; continue; }
      }
      break;
    }
    return cur.replace(/^http:\/\//, "https://");
  } catch (e) {
    console.error("resolveOriginal失败:", e);
    return null;
  }
}

function extractLiveVideo(video) {
  const pa = video.playAddr || video.play_addr?.url_list || [];
  if (Array.isArray(pa)) {
    for (const a of pa) {
      if (typeof a === "object" && a.src?.includes("v3-web")) return a.src;
      if (typeof a === "string" && a.includes("v3-web")) return a;
    }
    if (pa.length) return typeof pa[0] === "object" ? pa[0].src : pa[0];
  }
  return null;
}

// ==================== 快手 ====================

async function parseKuaishou(shareUrl) {
  const realUrl = await resolveRedirect(shareUrl);
  const html = await fetchHtml(realUrl, { referer: "https://www.kuaishou.com/" });

  // 从 INIT_STATE 提取
  const initMatch = html.match(/window\.INIT_STATE\s*=\s*(\{[\s\S]*?\})<\/script>/);
  if (initMatch) {
    try {
      const data = JSON.parse(initMatch[1].replace(/undefined/g, "null"));
      for (const key in data) {
        if (!key.startsWith("tusjoh")) continue;
        const photo = data[key].photo;
        if (!photo) continue;
        const videoUrl = photo.mainMvUrls?.[0]?.url || photo.manifest?.adaptationSet?.[0]?.representation?.[0]?.url || "";
        const images = photo.ext_params?.atlas?.list?.map(p => "https://tx2.a.yximgs.com/" + p) || [];
        return ok("kuaishou", {
          type: images.length ? "image" : "video",
          title: photo.caption || "",
          desc: photo.caption || "",
          author: { name: photo.userName || "", id: photo.userId || "", avatar: photo.headUrl || "" },
          cover: photo.coverUrls?.[0]?.url || "",
          url: videoUrl,
          images,
        });
      }
    } catch (e) {
      console.error("快手JSON解析失败:", e);
      return fail("快手JSON解析失败: " + e.message);
    }
  }
  return fail("快手解析失败（页面结构可能已变化，未找到 INIT_STATE 中的 tusjoh 前缀字段）");
}

// ==================== 小红书 ====================

async function parseXHS(shareUrl) {
  const realUrl = await resolveRedirect(shareUrl);
  const html = await fetchHtml(realUrl, { referer: "https://www.xiaohongshu.com/" });

  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})<\/script>/);
  if (!m) return fail("小红书解析失败（未找到 __INITIAL_STATE__，页面结构可能已变化）");

  try {
    const state = JSON.parse(m[1].replace(/undefined/g, "null"));
    let note = state.note?.noteDetailMap?.[Object.keys(state.note.noteDetailMap || {})[0]]?.note;
    if (!note) note = state.noteData?.data?.noteData;
    if (!note) return fail("未找到笔记数据");

    const result = {
      type: note.type === "video" ? "video" : "image",
      title: note.title || "",
      desc: note.desc || "",
      author: { name: note.user?.nickname || "", id: note.user?.userId || "", avatar: note.user?.avatar || "" },
      cover: note.cover?.urlDefault || note.cover?.url || "",
      url: "",
      images: [],
      live_photo: [],
    };

    // 视频
    if (note.type === "video" && note.video) {
      // originVideoKey 原画直链
      if (note.video.consumer?.originVideoKey) {
        result.url = "https://sns-video-hw.xhscdn.com/" + note.video.consumer.originVideoKey;
      } else {
        // h265 > h264 选最高码率
        const streams = [...(note.video.media?.stream?.h265 || []), ...(note.video.media?.stream?.h264 || [])];
        if (streams.length) {
          streams.sort((a, b) => (b.avgBitrate || 0) - (a.avgBitrate || 0));
          result.url = streams[0].masterUrl || "";
        }
      }
    }

    // 图片
    if (note.imageList?.length) {
      for (const img of note.imageList) {
        result.images.push(img.urlDefault || img.url || "");
        if (img.livePhoto && img.stream) {
          const lv = img.stream.h264?.[0]?.masterUrl || img.stream.h265?.[0]?.masterUrl || "";
          if (lv) result.live_photo.push({ image: img.urlDefault || "", video: lv });
        }
      }
      if (result.live_photo.length) result.type = "live";
    }
    return ok("xiaohongshu", result);
  } catch (e) {
    console.error("小红书JSON解析失败:", e);
    return fail("小红书JSON解析失败: " + e.message);
  }
}

// ==================== B站 ====================
// 修复点：原来只调用了 view 接口拿元信息，url 字段恒为空字符串，
// 现在补上 playurl 调用来获取实际可播放地址。
// 注意：不带登录态默认只能拿到较低清晰度（一般 480p/720p），
// 下载该地址时通常还需要带上 referer: https://www.bilibili.com/ 请求头，
// 否则会被 CDN 拒绝（防盗链）。
async function parseBilibili(shareUrl) {
  let realUrl = await resolveRedirect(shareUrl);
  const bvMatch = realUrl.match(/BV[0-9A-Za-z]+/);
  if (!bvMatch) return fail("无法识别BV号");
  const bvid = bvMatch[0];

  const info = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: { "user-agent": UA, "referer": "https://www.bilibili.com/" },
  });
  const json = await info.json();
  if (json.code !== 0) return fail("B站API错误: " + (json.message || json.code));

  const d = json.data;
  let videoUrl = "";
  try {
    const playRes = await fetch(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${d.cid}&qn=64&fnval=1&fnver=0&fourk=1`,
      { headers: { "user-agent": UA, "referer": `https://www.bilibili.com/video/${bvid}` } }
    );
    const playJson = await playRes.json();
    videoUrl = playJson.data?.durl?.[0]?.url || "";
  } catch (e) {
    console.error("B站playurl获取失败:", e);
  }

  return ok("bilibili", {
    type: "video",
    title: d.title || "",
    desc: d.desc || "",
    author: { name: d.owner?.name || "", id: String(d.owner?.mid || ""), avatar: d.owner?.face || "" },
    cover: d.pic || "",
    url: videoUrl,
    images: [],
    duration: d.duration || 0,
  });
}

// ==================== TikTok（tikwm）====================

async function parseTikTok(shareUrl) {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(shareUrl)}&hd=1`, { headers: { "user-agent": UA } });
    const json = await res.json();
    if (json.code !== 0) return fail("TikTok解析失败: " + json.msg);
    const d = json.data;
    return ok("tiktok", {
      type: d.images?.length ? "image" : "video",
      title: d.title || "",
      desc: d.title || "",
      author: { name: d.author?.nickname || "", id: d.author?.unique_id || "", avatar: d.author?.avatar || "" },
      cover: d.cover || "",
      url: d.hdplay || d.play || "",
      images: d.images || [],
    });
  } catch (e) {
    console.error("TikTok请求失败:", e);
    return fail("TikTok请求失败: " + e.message);
  }
}

// ==================== 西瓜 ====================

async function parseXigua(shareUrl) {
  const realUrl = await resolveRedirect(shareUrl);
  const html = await fetchHtml(realUrl, { referer: "https://www.ixigua.com/" });
  const title = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/)?.[1] || "";
  const cover = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1] || "";
  const videoUrl = html.match(/"srcUrl":"([^"]+)"/)?.[1]?.replace(/\\u002F/g, "/") || "";
  return ok("ixigua", { type: "video", title, desc: title, author: { name: "", id: "", avatar: "" }, cover, url: videoUrl, images: [] });
}

// ==================== 微博 ====================

async function parseWeibo(shareUrl) {
  // 微博无API需要BugPK，先尝试HTML抓取
  const realUrl = await resolveRedirect(shareUrl);
  const html = await fetchHtml(realUrl);
  const videoUrl = html.match(/"mp4_hd_url":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") ||
                   html.match(/"mp4_url":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") || "";
  const title = html.match(/"title":"([^"]+)"/)?.[1] || "";
  if (videoUrl) return ok("weibo", { type: "video", title, desc: title, author: { name: "", id: "", avatar: "" }, cover: "", url: videoUrl, images: [] });
  return fail("微博解析失败（需要登录态）");
}

// ==================== 微信视频号 ====================

async function parseWeixin(shareUrl) {
  const html = await fetchHtml(shareUrl);
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  if (m) {
    try {
      const state = JSON.parse(m[1]);
      const vd = state.videoData || state.finderData || {};
      if (vd.url || vd.video?.url) {
        return ok("weixin", {
          type: "video", title: vd.title || "", desc: vd.desc || "",
          author: { name: vd.author?.name || "", id: "", avatar: vd.author?.avatar || "" },
          cover: vd.cover || "", url: vd.url || vd.video?.url || "", images: [],
        });
      }
    } catch (e) {
      console.error("微信视频号JSON解析失败:", e);
    }
  }
  return fail("微信视频号解析失败");
}

// ==================== AcFun ====================

async function parseAcfun(shareUrl) {
  const realUrl = await resolveRedirect(shareUrl);
  const html = await fetchHtml(realUrl, { referer: "https://www.acfun.cn/" });
  const title = html.match(/<title>([^<]+)/)?.[1] || "";
  const name = html.match(/<span class="up-name">([^<]+)</)?.[1] || "";
  const avatar = html.match(/<span class="up-avatar"><img src="([^"]+)"/)?.[1] || "";
  const uid = html.match(/\/upPage\/(\d+)/)?.[1] || "";
  return ok("acfun", { type: "video", title, desc: title, author: { name, id: uid, avatar }, cover: "", url: "", images: [] });
}

// ==================== a_bogus 签名算法 ====================

// 修复点：字符集里原来大小写字母表都写成了 "...GHIGKL..."，
// 少了 J、多了一个重复的 G，改成正确的连续字母表。
function randomStr(len) {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=";
  let s = "";
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function rc4(pt, key) {
  const s = [];
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }
  let i = 0; j = 0;
  const out = [];
  for (let k = 0; k < pt.length; k++) {
    i = (i + 1) % 256; j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    out.push(String.fromCharCode(s[(s[i] + s[j]) % 256] ^ pt.charCodeAt(k)));
  }
  return out.join("");
}

function le(e, r) { return ((e << (r % 32)) | (e >>> (32 - (r % 32)))) >>> 0; }
function sm3De(e) { return e < 16 ? 2043430169 : 2055708042; }
function sm3Pe(e, r, t, n) { return e < 16 ? (r ^ t ^ n) >>> 0 : ((r & t) | (r & n) | (t & n)) >>> 0; }
function sm3He(e, r, t, n) { return e < 16 ? (r ^ t ^ n) >>> 0 : ((r & t) | (~r & n)) >>> 0; }

class SM3 {
  constructor() { this.reset(); }
  reset() {
    this.r = [1937774191, 1226093241, 388252375, 3666478592, 2842636476, 372324522, 3817729613, 2969243214];
    this.c = []; this.sz = 0;
  }
  write(input) {
    const b = typeof input === "string"
      ? Array.from(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), ch => ch.charCodeAt(0))
      : input;
    this.sz += b.length;
    let free = 64 - this.c.length;
    this.c = this.c.concat(b.slice(0, free));
    while (this.c.length >= 64) {
      this._cmp(this.c.slice(0, 64));
      if (free < b.length) this.c = b.slice(free, free + 64);
      else this.c = [];
      free += 64;
    }
  }
  sum(input) {
    this.reset(); this.write(input); this._fill();
    for (let i = 0; i < this.c.length; i += 64) this._cmp(this.c.slice(i, i + 64));
    let hex = "";
    for (let i = 0; i < 8; i++) hex += this.r[i].toString(16).padStart(8, "0");
    this.reset(); return hex;
  }
  _cmp(t) {
    const w = new Array(132);
    // 修复点：原来是 t[4+i]，应该是 t[4*i]（按 4 字节一组取值），
    // 原写法只用到了分组里第 4~22 字节，其余字节完全没参与运算，
    // 会导致哈希结果错误。
    for (let i = 0; i < 16; i++) {
      w[i] = ((t[4 * i] << 24) | (t[4 * i + 1] << 16) | (t[4 * i + 2] << 8) | (t[4 * i + 3])) >>> 0;
    }
    for (let i = 16; i < 68; i++) {
      let a = w[i-16]^w[i-9]^le(w[i-3],15);
      a = a^le(a,15)^le(a,23);
      w[i] = (a^le(w[i-13],7)^w[i-6])>>>0;
    }
    for (let i = 0; i < 64; i++) w[i+68] = (w[i]^w[i+4])>>>0;
    const s = this.r.slice(0);
    for (let i = 0; i < 64; i++) {
      let ss1 = le((((le(s[0],12)+s[4]+le(sm3De(i),i))>>>0)&0xffffffff)>>>0, 7);
      const ss2 = (ss1^le(s[0],12))>>>0;
      let tt1 = (sm3Pe(i,s[0],s[1],s[2])+s[3]+ss2+w[i+68])>>>0;
      let tt2 = (sm3He(i,s[4],s[5],s[6])+s[7]+ss1+w[i])>>>0;
      s[3]=s[2]; s[2]=le(s[1],9); s[1]=s[0]; s[0]=tt1;
      s[7]=s[6]; s[6]=le(s[5],19); s[5]=s[4];
      s[4]=(tt2^le(tt2,9)^le(tt2,17))>>>0;
    }
    for (let i = 0; i < 8; i++) this.r[i] = (this.r[i]^s[i])>>>0;
  }
  _fill() {
    const tb = 8*this.sz;
    let mod = (this.c.push(128)%64);
    if (64-mod < 8) mod -= 64;
    while (this.c.push(0), (mod+=8) < 56) {}
    for (let i = 0; i < 4; i++) this.c.push((Math.floor(tb/4294967296)>>(8*(3-i)))&255);
    for (let i = 0; i < 4; i++) this.c.push((tb>>>(8*i))&255);
  }
}

function resultEncrypt(ls, num) {
  const table = "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe=";
  const c0=16515072, c1=258048, c2=4032;
  let out = "", round = -1;
  for (let i = 0; i < (ls.length/3)*4; i++) {
    if (Math.floor(i/4) !== round) round++;
    const off = round*3;
    const li = (ls.charCodeAt(off)<<16)|(ls.charCodeAt(off+1)<<8)|ls.charCodeAt(off+2);
    const k = i%4;
    if (k===0) out += table[(li&c0)>>18];
    else if (k===1) out += table[(li&c1)>>12];
    else if (k===2) out += table[(li&c2)>>6];
    else out += table[li&63];
  }
  return out;
}

function genRandom(rand, opt) {
  return [
    ((rand&255&170)|(opt[0]&85))>>>0,
    ((rand&255&85)|(opt[0]&170))>>>0,
    (((rand>>8)&255&170)|(opt[1]&85))>>>0,
    (((rand>>8)&255&85)|(opt[1]&170))>>>0,
  ];
}

function generate_a_bogus(urlParams, ua) {
  const sm3 = new SM3();
  const st = Date.now();
  const uh = sm3.sum(sm3.sum(urlParams+"cus"));
  const ch = sm3.sum(sm3.sum("cus"));
  const uah = sm3.sum(resultEncrypt(rc4(ua, String.fromCharCode(1,14)), "s3"));
  const et = Date.now();

  const b = [];
  b[8]=3; b[10]=et; b[16]=st; b[18]=44; b[19]=[1,0,1,5];
  b[20]=(st>>24)&255; b[21]=(st>>16)&255; b[22]=(st>>8)&255; b[23]=st&255;
  b[24]=Math.floor(st/1099511627776); b[25]=Math.floor(st/281474976710656);
  b[26]=b[27]=b[28]=b[29]=b[30]=b[31]=b[32]=b[33]=0;
  b[34]=b[35]=b[36]=b[37]=0;
  b[38]=parseInt(uh.substr(42,2),16); b[39]=parseInt(uh.substr(44,2),16);
  b[40]=parseInt(ch.substr(42,2),16); b[41]=parseInt(ch.substr(44,2),16);
  b[42]=parseInt(uah.substr(46,2),16); b[43]=parseInt(uah.substr(48,2),16);
  b[44]=(et>>24)&255; b[45]=(et>>16)&255; b[46]=(et>>8)&255; b[47]=et&255;
  b[48]=3; b[49]=Math.floor(et/1099511627776); b[50]=Math.floor(et/281474976710656);
  b[51]=6241; b[52]=(6241>>24)&255; b[53]=(6241>>16)&255; b[54]=(6241>>8)&255; b[55]=6241&255;
  b[56]=6383; b[57]=6383&255; b[58]=(6383>>8)&255; b[59]=(6383>>16)&255; b[60]=(6383>>24)&255;

  const we = "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32";
  const wb = [];
  for (let i = 0; i < we.length; i++) wb.push(we.charCodeAt(i));
  b[64]=wb.length; b[65]=wb.length&255; b[66]=(wb.length>>8)&255;
  b[69]=b[70]=b[71]=0;
  b[72]=b[18]^b[20]^b[26]^b[30]^b[38]^b[40]^b[42]^b[21]^b[27]^b[31]^b[35]^b[39]^b[41]^b[43]^b[22]^b[28]^b[32]^b[36]^b[23]^b[29]^b[33]^b[37]^b[44]^b[45]^b[46]^b[47]^b[48]^b[49]^b[50]^b[24]^b[25]^b[52]^b[53]^b[54]^b[55]^b[57]^b[58]^b[59]^b[60]^b[65]^b[66]^b[70]^b[71];

  let bb = [b[18],b[20],b[52],b[26],b[30],b[34],b[58],b[38],b[40],b[53],b[42],b[21],b[27],b[54],b[55],b[31],b[35],b[57],b[39],b[41],b[43],b[22],b[28],b[32],b[60],b[36],b[23],b[29],b[33],b[37],b[44],b[45],b[59],b[46],b[47],b[48],b[49],b[50],b[24],b[25],b[65],b[66],b[70],b[71]];
  bb = bb.concat(wb).concat(b[72]);

  const rs = String.fromCharCode(...genRandom(Math.random()*10000,[3,45])) +
    String.fromCharCode(...genRandom(Math.random()*10000,[1,0])) +
    String.fromCharCode(...genRandom(Math.random()*10000,[1,5])) +
    rc4(String.fromCharCode(...bb), String.fromCharCode(121));
  return resultEncrypt(rs, "s4") + "=";
}
