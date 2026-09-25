/**
 * 全平台短视频解析 Worker（不依赖 BugPK）
 * 抖音 a_bogus 照搬官方 workers.js
 * 微博/西瓜照搬 BugPK PHP 解析逻辑
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
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
      return new Response(JSON.stringify(result), { status: result.code >= 500 ? 500 : 200, headers: CORS });
    } catch (e) {
      console.error("error:", e);
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
  if (/ixigua\.com|toutiao\.com/.test(url)) return "ixigua";
  if (/weibo\.com|t\.cn/.test(url)) return "weibo";
  if (/weixin\.qq\.com|finder\.video/.test(url)) return "weixin";
  if (/acfun\.cn/.test(url)) return "acfun";
  return "unknown";
}
function ok(data) { return { code: 200, msg: "解析成功", data }; }
function fail(msg) { return { code: 500, msg }; }

// ==================== 抖音 ====================

async function parseDouyin(shareUrl) {
  const resolved = await followRedirects(shareUrl);
  if (!resolved) return fail("无法解析重定向");
  const awemeId = getVideoId(resolved);
  if (!awemeId) return fail("无法提取视频ID");
  const detail = await fetchAwemeDetail(awemeId);
  if (!detail.ok) return fail(detail.reason || "请求失败");

  const d = detail.detail.aweme_detail;
  const author = d.author || {};
  const images = d.images || d.image_list || [];
  const result = {
    type: images.length ? "image" : "video",
    title: d.desc || "",
    desc: d.desc || "",
    author: {
      name: author.nickname || "",
      id: author.unique_id || author.short_id || author.uid || "",
      sec_uid: author.sec_uid || "",
      avatar: (author.avatar_thumb?.url_list?.[0]) || "",
    },
    cover: d.video?.origin_cover?.url_list?.[0] || d.video?.cover?.url_list?.[0] || d.cover?.url_list?.[0] || "",
    url: "", images: [], live_photo: [],
    duration: d.video ? Math.round((d.video.duration || 0) / 1000) : 0,
  };

  if (images.length) {
    for (const img of images) {
      if (img.url_list?.[0]) result.images.push(img.url_list[0]);
      if (img.video?.play_addr?.url_list?.[0]) {
        result.live_photo.push({ image: img.url_list?.[0] || "", video: img.video.play_addr.url_list[0] });
      }
    }
    if (result.live_photo.length) result.type = "live";
  } else {
    // bitRateList 选最高画质
    let bestUrl = "", bestBr = -1;
    for (const br of (d.video?.bitRateList || [])) {
      for (const u of (br.play_addr?.url_list || [])) {
        if ((br.bitRate || 0) > bestBr) { bestUrl = u; bestBr = br.bitRate; }
      }
    }
    if (!bestUrl) bestUrl = d.video?.play_addr?.url_list?.[0] || "";
    result.url = bestUrl.replace(/playwm/g, "play");
    // vid 302 原画
    const vid = d.video?.play_addr?.uri || d.video?.uri;
    if (vid) result.url = await resolveOriginal(vid);
  }
  return ok(result);
}

async function followRedirects(startUrl) {
  let cur = startUrl;
  for (let i = 0; i < 8; i++) {
    try { if (new URL(cur).host === "www.douyin.com") return cur; } catch {}
    const res = await fetch(cur, { method: "GET", redirect: "manual", headers: { "user-agent": UA } }).catch(() => null);
    if (!res || res.status < 300 || res.status >= 400) break;
    const loc = res.headers.get("location");
    if (!loc) break;
    cur = new URL(loc, cur).toString();
  }
  return cur;
}
function getVideoId(url) {
  try {
    const u = new URL(url);
    for (const k of ["vid", "id", "modal_id", "aweme_id"]) {
      const v = u.searchParams.get(k);
      if (v) return v;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    let last = parts[parts.length - 1];
    if (last?.endsWith(".html")) last = last.slice(0, -5);
    return last || null;
  } catch { return null; }
}
async function fetchAwemeDetail(awemeId) {
  const referer = `https://www.douyin.com/video/${awemeId}`;
  await fetch(referer, { headers: { "user-agent": UA } }).catch(() => null);
  let ttwid = await getTtwid();
  if (!ttwid) ttwid = "1%7CvDWCB8tYdKPbdOlqwNTkDPhizBaV9i91KjYLKJbqurg%7C1723536402%7C314e63000decb79f46b8ff255560b29f4d8c57352dad465b41977db4830b4c7e";

  for (let i = 0; i < 2; i++) {
    const msToken = randomStr(107);
    const params = new URLSearchParams({ device_platform: "webapp", aid: "6383", channel: "channel_pc_web", aweme_id: awemeId, msToken });
    const query = params.toString();
    const aBogus = generate_a_bogus(query, UA);
    try {
      const res = await fetch(`https://www.douyin.com/aweme/v1/web/aweme/detail/?${query}&a_bogus=${encodeURIComponent(aBogus)}`, {
        headers: { "accept": "application/json", "user-agent": UA, "referer": referer, "cookie": `ttwid=${ttwid}` },
      });
      const json = await res.json();
      if (json.aweme_detail) return { ok: true, detail: json };
      if (i === 1) return { ok: false, reason: json?.status_msg || "API未返回数据" };
    } catch (e) {
      if (i === 1) return { ok: false, reason: e.message };
    }
  }
  return { ok: false, reason: "请求失败" };
}
async function getTtwid() {
  try {
    const res = await fetch("https://ttwid.bytedance.com/ttwid/union/register/", {
      method: "POST", headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ region: "cn", aid: 6383, need_t: 1, service: "www.douyin.com", domain: ".douyin.com" }),
    });
    const m = (res.headers.get("set-cookie") || "").match(/(?:^|,\s*)ttwid=([^;\s]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}
async function resolveOriginal(vid) {
  let cur = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(vid)}&ratio=default&line=0`;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(cur, { method: "GET", redirect: "manual", headers: { "user-agent": UA } }).catch(() => null);
    if (!res || res.status < 300 || res.status >= 400) break;
    const loc = res.headers.get("location");
    if (!loc) break;
    cur = loc;
  }
  return cur.replace(/^http:\/\//, "https://");
}

// ==================== 快手 ====================

async function parseKuaishou(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": MOBILE_UA }, redirect: "follow" });
  const html = await res.text();

  const initMatch = html.match(/window\.INIT_STATE\s*=\s*(\{[\s\S]*?\})<\/script>/);
  if (initMatch) {
    try {
      const data = JSON.parse(initMatch[1].replace(/undefined/g, "null"));
      for (const key in data) {
        if (!key.startsWith("tusjoh")) continue;
        const photo = data[key].photo;
        if (!photo) continue;
        const images = photo.ext_params?.atlas?.list || [];
        const videoUrl = photo.mainMvUrls?.[0]?.url || photo.manifest?.adaptationSet?.[0]?.representation?.[0]?.url || "";
        return ok({
          type: images.length ? "image" : "video",
          title: photo.caption || "", desc: photo.caption || "",
          author: { name: photo.userName || "", id: photo.userId || "", avatar: photo.headUrl || "" },
          cover: photo.coverUrls?.[0]?.url || "", url: videoUrl,
          images: images.map(p => "http://tx2.a.yximgs.com/" + p), live_photo: [],
        });
      }
    } catch (e) { console.error("ks init:", e); }
  }

  const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\})<\/script>/);
  if (apolloMatch) {
    try {
      const apollo = JSON.parse(apolloMatch[1].replace(/undefined/g, "null"));
      const client = apollo.defaultClient || {};
      for (const key in client) {
        if (key.startsWith("VisionVideoDetailPhoto:")) {
          const vd = client[key];
          const authorKey = Object.keys(client).find(k => k.startsWith("VisionVideoDetailAuthor:"));
          const ad = authorKey ? client[authorKey] : {};
          return ok({
            type: "video", title: vd.caption || "", desc: vd.caption || "",
            author: { name: ad.name || "", id: ad.id || "", avatar: ad.headerUrl || "" },
            cover: vd.coverUrl || "", url: vd.photoUrl || "", images: [], live_photo: [],
          });
        }
      }
    } catch (e) { console.error("ks apollo:", e); }
  }
  return fail("快手解析失败");
}

// ==================== 小红书 ====================

async function parseXHS(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": UA, referer: "https://www.xiaohongshu.com/" }, redirect: "follow" });
  const html = await res.text();
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})<\/script>/);
  if (!m) return fail("未找到 __INITIAL_STATE__");
  try {
    const state = JSON.parse(m[1].replace(/undefined/g, "null"));
    let note = state.note?.noteDetailMap?.[Object.keys(state.note.noteDetailMap || {})[0]]?.note;
    if (!note) note = state.noteData?.data?.noteData;
    if (!note) return fail("未找到笔记数据");
    const result = {
      type: note.type === "video" ? "video" : "image",
      title: note.title || "", desc: note.desc || "",
      author: { name: note.user?.nickname || "", id: note.user?.userId || "", avatar: note.user?.avatar || "" },
      cover: note.cover?.urlDefault || note.cover?.url || "",
      url: "", images: [], live_photo: [],
    };
    if (note.type === "video" && note.video) {
      if (note.video.consumer?.originVideoKey) {
        result.url = "https://sns-video-hw.xhscdn.com/" + note.video.consumer.originVideoKey;
      } else {
        const streams = [...(note.video.media?.stream?.h265 || []), ...(note.video.media?.stream?.h264 || [])];
        if (streams.length) {
          streams.sort((a, b) => (b.avgBitrate || 0) - (a.avgBitrate || 0));
          result.url = streams[0].masterUrl || "";
        }
      }
    }
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
    return ok(result);
  } catch (e) { return fail("小红书解析失败: " + e.message); }
}

// ==================== B站 ====================

async function parseBilibili(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": UA }, redirect: "follow" });
  const bv = res.url.match(/BV[0-9A-Za-z]+/)?.[0];
  if (!bv) return fail("无法识别BV号");
  const infoRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}`, { headers: { "user-agent": UA, referer: "https://www.bilibili.com/" } });
  const info = await infoRes.json();
  if (info.code !== 0) return fail("B站API错误: " + info.message);
  const d = info.data;
  let videoUrl = "";
  try {
    const playRes = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${d.cid}&qn=64&fnval=1&fnver=0&fourk=1`, { headers: { "user-agent": UA, referer: `https://www.bilibili.com/video/${bv}` } });
    const playJson = await playRes.json();
    videoUrl = playJson.data?.durl?.[0]?.url || "";
  } catch {}
  return ok({ type: "video", title: d.title || "", desc: d.desc || "", author: { name: d.owner?.name || "", id: String(d.owner?.mid || ""), avatar: d.owner?.face || "" }, cover: d.pic || "", url: videoUrl, images: [], duration: d.duration || 0 });
}

// ==================== TikTok ====================

async function parseTikTok(shareUrl) {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(shareUrl)}&hd=1`, { headers: { "user-agent": UA } });
    const json = await res.json();
    if (json.code !== 0) return fail("TikTok: " + json.msg);
    const d = json.data;
    return ok({
      type: d.images?.length ? "image" : "video",
      title: d.title || "", desc: d.title || "",
      author: { name: d.author?.nickname || "", id: d.author?.unique_id || "", avatar: d.author?.avatar || "" },
      cover: d.cover || "", url: d.hdplay || d.play || "", images: d.images || [], live_photo: [],
    });
  } catch (e) { return fail("TikTok: " + e.message); }
}

// ==================== 西瓜/头条（RENDER_DATA）====================

async function parseXigua(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": UA }, redirect: "follow" });
  const html = await res.text();
  const m = html.match(/<script id="RENDER_DATA" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return fail("西瓜：未找到RENDER_DATA");
  try {
    const json = JSON.parse(decodeURIComponent(m[1]));
    const data = json.data || json;
    const item = data.initialVideo?.itemCell || data.initialVideo || data;
    return ok({
      type: "video",
      title: item.title || data.initialVideo?.title || "",
      desc: item.title || "",
      author: { name: item.userInfo?.name || "", id: String(item.userInfo?.userID || ""), avatar: item.userInfo?.avatarURL || "" },
      cover: item.coverUrl || data.initialVideo?.coverUrl || "",
      url: item.videoPlayInfo?.video_list?.[2]?.main_url || item.videoPlayInfo?.video_list?.[1]?.main_url || "",
      images: [], live_photo: [],
    });
  } catch (e) { return fail("西瓜解析失败: " + e.message); }
}

// ==================== 微博（官方 API）====================

async function parseWeibo(shareUrl) {
  let fid = "";
  try {
    const u = new URL(shareUrl);
    fid = u.searchParams.get("fid") || "";
    if (!fid) {
      const m = shareUrl.match(/weibo\.com\/tv\/(?:show|v)\/([^?&]+)/);
      if (m) fid = m[1];
    }
  } catch {}
  if (!fid) {
    const res = await fetch(shareUrl, { headers: { "user-agent": UA }, redirect: "follow" });
    const m = res.url.match(/weibo\.com\/tv\/(?:show|v)\/([^?&]+)/);
    if (m) fid = m[1];
    if (!fid) {
      const u = new URL(res.url);
      fid = u.searchParams.get("fid") || "";
    }
  }
  if (!fid) return fail("无法提取微博视频ID");

  try {
    const postData = "data=" + encodeURIComponent(JSON.stringify({ Component_Play_Playinfo: { oid: fid } }));
    const res = await fetch(`https://weibo.com/tv/api/component?page=${encodeURIComponent("/tv/show/" + fid)}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA, "referer": "https://weibo.com/" },
      body: postData,
    });
    const json = await res.json();
    if (json.code !== 100000) return fail("微博API错误: " + (json.msg || json.code));
    const info = json.data.Component_Play_Playinfo;
    if (!info) return fail("微博未返回视频数据");

    let bestUrl = "", bestPriority = -1;
    const backups = [];
    if (info.urls) {
      for (const [quality, url] of Object.entries(info.urls)) {
        let priority = 0;
        if (quality.includes("1080P")) priority = 3;
        else if (quality.includes("720P")) priority = 2;
        else if (quality.includes("480P")) priority = 1;
        backups.push({ label: quality, url: "https:" + url });
        if (priority > bestPriority) { bestUrl = "https:" + url; bestPriority = priority; }
      }
    }
    return ok({
      type: "video", title: info.title || "", desc: info.title || "",
      author: { name: info.author || "", id: String(info.author_id || ""), avatar: info.avatar ? "https:" + info.avatar : "" },
      cover: info.cover_image ? "https:" + info.cover_image : "",
      url: bestUrl, video_backup: backups,
      duration: info.duration_time || 0,
    });
  } catch (e) { return fail("微博请求失败: " + e.message); }
}

// ==================== 其他 ====================

async function parseWeixin(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": UA }, redirect: "follow" });
  const html = await res.text();
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  if (m) {
    try {
      const state = JSON.parse(m[1]);
      const vd = state.videoData || state.finderData || {};
      if (vd.url || vd.video?.url) {
        return ok({ type: "video", title: vd.title || "", desc: vd.desc || "", author: { name: vd.author?.name || "", id: "", avatar: vd.author?.avatar || "" }, cover: vd.cover || "", url: vd.url || vd.video?.url || "", images: [], live_photo: [] });
      }
    } catch {}
  }
  return fail("微信视频号解析失败");
}

async function parseAcfun(shareUrl) {
  const res = await fetch(shareUrl, { headers: { "user-agent": UA }, redirect: "follow" });
  const html = await res.text();
  const title = html.match(/<title>([^<]+)/)?.[1] || "";
  const name = html.match(/<span class="up-name">([^<]+)</)?.[1] || "";
  const uid = html.match(/\/upPage\/(\d+)/)?.[1] || "";
  return ok({ type: "video", title, desc: title, author: { name, id: uid, avatar: "" }, cover: "", url: "", images: [], live_photo: [] });
}

// ==================== a_bogus ====================

function randomStr(len) {
  const c = "ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789=";
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
function de(e) { return e < 16 ? 2043430169 : 2055708042; }
function pe(e, r, t, n) { return e < 16 ? (r ^ t ^ n) >>> 0 : ((r & t) | (r & n) | (t & n)) >>> 0; }
function he(e, r, t, n) { return e < 16 ? (r ^ t ^ n) >>> 0 : ((r & t) | (~r & n)) >>> 0; }

class SM3 {
  constructor() { this.reset(); }
  reset() {
    this.reg = [1937774191, 1226093241, 388252375, 3666478592, 2842636476, 372324522, 3817729613, 2969243214];
    this.chunk = []; this.size = 0;
  }
  write(input) {
    const bytes = typeof input === "string"
      ? Array.from(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt("0x" + h))), ch => ch.charCodeAt(0))
      : input;
    this.size += bytes.length;
    let free = 64 - this.chunk.length;
    if (bytes.length < free) { this.chunk = this.chunk.concat(bytes); return; }
    this.chunk = this.chunk.concat(bytes.slice(0, free));
    while (this.chunk.length >= 64) {
      this._compress(this.chunk);
      if (free < bytes.length) this.chunk = bytes.slice(free, Math.min(free + 64, bytes.length));
      else this.chunk = [];
      free += 64;
    }
  }
  sum(input) {
    if (input) { this.reset(); this.write(input); }
    this._fill();
    for (let i = 0; i < this.chunk.length; i += 64) this._compress(this.chunk.slice(i, i + 64));
    const result = new Array(32);
    for (let i = 0; i < 8; i++) {
      let c = this.reg[i];
      result[4*i+3] = (c & 255) >>> 0; c >>>= 8;
      result[4*i+2] = (c & 255) >>> 0; c >>>= 8;
      result[4*i+1] = (c & 255) >>> 0; c >>>= 8;
      result[4*i] = (c & 255) >>> 0;
    }
    this.reset();
    return result;
  }
  _compress(t) {
    const w = new Array(132);
    for (let i = 0; i < 16; i++) w[i] = ((t[4*i] << 24) | (t[4*i+1] << 16) | (t[4*i+2] << 8) | t[4*i+3]) >>> 0;
    for (let i = 16; i < 68; i++) {
      let a = w[i-16] ^ w[i-9] ^ le(w[i-3], 15);
      a = a ^ le(a, 15) ^ le(a, 23);
      w[i] = (a ^ le(w[i-13], 7) ^ w[i-6]) >>> 0;
    }
    for (let i = 0; i < 64; i++) w[i+68] = (w[i] ^ w[i+4]) >>> 0;
    const state = this.reg.slice(0);
    for (let i = 0; i < 64; i++) {
      let ss1 = le((((le(state[0], 12) + state[4] + le(de(i), i)) >>> 0) & 0xffffffff) >>> 0, 7);
      const ss2 = (ss1 ^ le(state[0], 12)) >>> 0;
      let tt1 = (pe(i, state[0], state[1], state[2]) + state[3] + ss2 + w[i+68]) >>> 0;
      let tt2 = (he(i, state[4], state[5], state[6]) + state[7] + ss1 + w[i]) >>> 0;
      state[3] = state[2]; state[2] = le(state[1], 9); state[1] = state[0]; state[0] = tt1;
      state[7] = state[6]; state[6] = le(state[5], 19); state[5] = state[4];
      state[4] = (tt2 ^ le(tt2, 9) ^ le(tt2, 17)) >>> 0;
    }
    for (let i = 0; i < 8; i++) this.reg[i] = (this.reg[i] ^ state[i]) >>> 0;
  }
  _fill() {
    const totalBits = 8 * this.size;
    let mod = this.chunk.push(128) % 64;
    if (64 - mod < 8) mod -= 64;
    while (mod < 56) { this.chunk.push(0); mod += 1; }
    for (let i = 0; i < 4; i++) this.chunk.push((Math.floor(totalBits / 4294967296) >>> (8 * (3 - i))) & 255);
    for (let i = 0; i < 4; i++) this.chunk.push((totalBits >>> (8 * (3 - i))) & 255);
  }
}

function resultEncrypt(longStr) {
  const table = "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe=";
  let result = "", round = -1;
  for (let i = 0; i < (longStr.length / 3) * 4; i++) {
    if (Math.floor(i / 4) !== round) round++;
    const off = round * 3;
    const n = (longStr.charCodeAt(off) << 16) | (longStr.charCodeAt(off+1) << 8) | longStr.charCodeAt(off+2);
    const k = i % 4;
    if (k === 0) result += table[(n & 16515072) >> 18];
    else if (k === 1) result += table[(n & 258048) >> 12];
    else if (k === 2) result += table[(n & 4032) >> 6];
    else result += table[n & 63];
  }
  return result;
}
function genRandom(rand, opt) {
  return [
    ((rand & 255 & 170) | (opt[0] & 85)) >>> 0,
    ((rand & 255 & 85) | (opt[0] & 170)) >>> 0,
    (((rand >> 8) & 255 & 170) | (opt[1] & 85)) >>> 0,
    (((rand >> 8) & 255 & 85) | (opt[1] & 170)) >>> 0,
  ];
}
function generate_a_bogus(query, ua) {
  const sm3 = new SM3();
  const st = Date.now();
  const urlHash = sm3.sum(sm3.sum(query + "cus"));
  const cusHash = sm3.sum(sm3.sum("cus"));
  const uaHash = sm3.sum(resultEncrypt(rc4(ua, String.fromCharCode(0.00390625, 1, 14))));
  const et = Date.now();
  const b = [];
  b[8] = 3; b[10] = et; b[16] = st; b[18] = 44; b[19] = [1, 0, 1, 5];
  b[20] = (st >> 24) & 255; b[21] = (st >> 16) & 255; b[22] = (st >> 8) & 255; b[23] = st & 255;
  b[24] = Math.floor(st / 4294967296); b[25] = Math.floor(st / 1099511627776);
  b[31] = 1; b[37] = 14;
  b[38] = urlHash[21]; b[39] = urlHash[22];
  b[40] = cusHash[21]; b[41] = cusHash[22];
  b[42] = uaHash[23]; b[43] = uaHash[24];
  b[44] = (et >> 24) & 255; b[45] = (et >> 16) & 255; b[46] = (et >> 8) & 255; b[47] = et & 255;
  b[48] = 3; b[49] = Math.floor(et / 4294967296); b[50] = Math.floor(et / 1099511627776);
  b[51] = 6241; b[52] = (6241 >> 24) & 255; b[53] = (6241 >> 16) & 255; b[54] = (6241 >> 8) & 255; b[55] = 6241 & 255;
  b[56] = 6383; b[57] = 6383 & 255; b[58] = (6383 >> 8) & 255; b[59] = (6383 >> 16) & 255; b[60] = (6383 >> 24) & 255;
  const we = "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32";
  const wb = [];
  for (let i = 0; i < we.length; i++) wb.push(we.charCodeAt(i));
  b[64] = wb.length; b[65] = wb.length & 255; b[66] = (wb.length >> 8) & 255;
  b[72] = b[18]^b[20]^b[26]^b[30]^b[38]^b[40]^b[42]^b[21]^b[27]^b[31]^b[35]^b[39]^b[41]^b[43]^b[22]^b[28]^b[32]^b[36]^b[23]^b[29]^b[33]^b[37]^b[44]^b[45]^b[46]^b[47]^b[48]^b[49]^b[50]^b[24]^b[25]^b[52]^b[53]^b[54]^b[55]^b[57]^b[58]^b[59]^b[60]^b[65]^b[66]^b[70]^b[71];
  let bb = [b[18],b[20],b[52],b[26],b[30],b[34],b[58],b[38],b[40],b[53],b[42],b[21],b[27],b[54],b[55],b[31],b[35],b[57],b[39],b[41],b[43],b[22],b[28],b[32],b[60],b[36],b[23],b[29],b[33],b[37],b[44],b[45],b[59],b[46],b[47],b[48],b[49],b[50],b[24],b[25],b[65],b[66],b[70],b[71]];
  bb = bb.concat(wb).concat(b[72]);
  const randomPart = String.fromCharCode(...genRandom(Math.random()*10000,[3,45])) + String.fromCharCode(...genRandom(Math.random()*10000,[1,0])) + String.fromCharCode(...genRandom(Math.random()*10000,[1,5]));
  const rc4Part = rc4(String.fromCharCode(...bb), String.fromCharCode(121));
  return resultEncrypt(randomPart + rc4Part) + "=";
}
