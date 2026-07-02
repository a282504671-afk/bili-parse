const UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.003.A1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5060 MMWEBSDK/20221206 MMWEBID/8060 MicroMessenger/8.0.32.2380(0x28002034) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

// 平台中文名称映射
const PLATFORM_NAMES = {
  douyin: '抖音',
  tiktok: 'TikTok',
  bilibili: 'B站',
  acfun: 'AcFun',
  ixigua: '西瓜视频',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  weibo: '微博',
  weixin: '微信视频号'
};

function ok(platform, data) {
  return { code: 200, msg: '解析成功', platform, platformName: PLATFORM_NAMES[platform] || platform, data };
}
function fail(msg, code = 500) {
  return { code, msg };
}

function detectPlatform(url) {
  if (/douyin\.com|iesdouyin\.com/.test(url)) return 'douyin';
  if (/tiktok\.com|vt\.tiktok\.com/.test(url)) return 'tiktok';
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili';
  if (/acfun\.cn/.test(url)) return 'acfun';
  if (/ixigua\.com/.test(url)) return 'ixigua';
  if (/kuaishou\.com|gifshow\.com|kwai/.test(url)) return 'kuaishou';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.cn/.test(url)) return 'xiaohongshu';
  if (/weibo\.com/.test(url) || /t\.cn/.test(url)) return 'weibo';
  if (/weixin\.qq\.com\/sph/.test(url) || /channels\.weixin\.qq\.com/.test(url)) return 'weixin';
  return 'unknown';
}

async function resolveRedirect(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA } });
    return res.url || url;
  } catch (e) { return url; }
}

async function fetchHtml(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9', ...extraHeaders },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.text();
}

// ===== 抖音 =====
function extractDouyinItemId(url) {
  var m = url.match(/\/(?:share\/)?video\/(\d{6,})/);
  if (m) return m[1];
  m = url.match(/item_ids?=(\d{6,})/);
  if (m) return m[1];
  m = url.match(/modal_id=(\d{6,})/);
  if (m) return m[1];
  m = url.match(/aweme_id=(\d+)/);
  if (m) return m[1];
  return null;
}

function extractDouyinDataFromHtml(html) {
  var start = html.indexOf('"item_list":[');
  if (start < 0) return null;
  start += '"item_list":['.length;
  var depth = 1, inStr = false, escape = false;
  for (var i = start; i < html.length && depth > 0; i++) {
    var ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"' && !escape) { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '[') depth++;
    if (ch === ']') depth--;
  }
  if (depth !== 0) return null;
  try {
    var arr = JSON.parse('[' + html.substring(start, i - 1) + ']');
    return arr.length ? arr[0] : null;
  } catch(e) { return null; }
}

async function parseDouyin(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var itemId = extractDouyinItemId(realUrl) || extractDouyinItemId(originalUrl);
  if (!itemId) return fail('未能从链接中提取视频ID');

  var html = await fetchHtml(realUrl, { Referer: 'https://www.douyin.com/' });
  var item = extractDouyinDataFromHtml(html);
  if (!item) return fail('从页面 HTML 中提取视频数据失败，item_id=' + itemId);

  var video = item.video || {};
  var author = item.author || {};
  var playUrl = (video.play_addr && video.play_addr.url_list && video.play_addr.url_list[0]) || '';
  if (playUrl) playUrl = playUrl.replace('playwm', 'play').replace(/\\u002F/g, '/');

  // og:title 兜底
  if (!item.desc && !(item.share_info && item.share_info.share_title)) {
    var ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogTitle && ogTitle[1] && ogTitle[1].indexOf('抖音') < 0 && ogTitle[1].indexOf('douyin') < 0) {
      item.desc = ogTitle[1];
    }
  }

  var images = (item.images || []).map(function(img) { return img.url_list && img.url_list[0]; }).filter(Boolean);

  // 兜底：从 og:video 或页面其他位置提取
  if (!playUrl) {
    var ogV = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
    if (ogV) playUrl = ogV[1];
    if (!playUrl) {
      var videoUrlMatch = html.match(/"playAddr":\s*"([^"]+)"/) || html.match(/"srcUrl":\s*"([^"]+)"/) || html.match(/"video_url":\s*"([^"]+)"/);
      if (videoUrlMatch) playUrl = videoUrlMatch[1].replace(/\\u002F/g, '/');
    }
  }

  return ok('douyin', {
    type: images.length ? 'image' : 'video',
    title: item.desc || (item.share_info && item.share_info.share_title) || item.video && item.video.text || (item.promotions && item.promotions[0] && item.promotions[0].title) || '',
    desc: item.desc || '',
    author: {
      name: author.nickname || '',
      id: author.unique_id || author.short_id || author.uid || '',
      avatar: (author.avatar_larger && author.avatar_larger.url_list && author.avatar_larger.url_list[0]) || (author.avatar_medium && author.avatar_medium.url_list && author.avatar_medium.url_list[0]) || (author.avatar_thumb && author.avatar_thumb.url_list && author.avatar_thumb.url_list[0]) || '',
    },
    cover: (video.origin_cover && video.origin_cover.url_list && video.origin_cover.url_list[0]) || (video.cover && video.cover.url_list && video.cover.url_list[0]) || (video.dynamic_cover && video.dynamic_cover.url_list && video.dynamic_cover.url_list[0]) || '',
    url: playUrl,
    images: images,
  });
}

// ===== B站 =====
async function parseBilibili(originalUrl) {
  var realUrl = originalUrl;
  if (realUrl.includes('b23.tv')) realUrl = await resolveRedirect(realUrl);

  var bvMatch = realUrl.match(/BV[0-9A-Za-z]+/);
  if (!bvMatch) {
    var avMatch = realUrl.match(/av(\d+)/i);
    if (!avMatch) return fail('未识别到BV号');
    bvMatch = { 0: avMatch[0] };
  }
  var bvid = bvMatch[0];
  var info = null;
  var videoUrl = '';

  // 方式1: 直连 B站 API（跳过页面 HTML 抓取，CF Worker IP 经常被页面封）
  try {
    var vr = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
    });
    if (vr.ok) {
      var vj = await vr.json();
      if (vj.data) {
        var vd = vj.data;
        info = {
          title: vd.title || '', desc: vd.desc || '', pic: vd.pic || '',
          owner: vd.owner || { name: '', mid: '', face: '' },
          cid: vd.cid || 0, aid: vd.aid || 0,
        };
      }
    }
  } catch(e) {}

  // 方式2: 直连失败 → 通过 BUGPK 代理（api520.ccwu.cc 包裹 BUGPK，用户家庭 IP 不可见）
  if (!info || !videoUrl) {
    try {
      var bpRes = await fetch('https://api.bugpk.com/api/short_videos?url=' + encodeURIComponent(originalUrl), {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      });
      if (bpRes.ok) {
        var bpJson = await bpRes.json();
        if (bpJson.code === 200 && bpJson.data) {
          var bpData = bpJson.data;
          if (!info) {
            info = {
              title: bpData.title || bpData.desc || '',
              desc: bpData.desc || bpData.title || '',
              pic: bpData.cover || '',
              owner: { name: (bpData.author && bpData.author.name) || bpData.auther || bpData.author_name || bpData.nickname || '', mid: (bpData.author && bpData.author.id) || bpData.author_id || bpData.uid || '', face: (bpData.author && bpData.author.avatar) || bpData.avatar || bpData.author_avatar || bpData.face || '' },
              cid: 0, aid: 0,
            };
          }
          if (!videoUrl) videoUrl = bpData.url || '';
          if (!info.title && bpData.title) info.title = bpData.title;
          if (!info.pic && bpData.cover) info.pic = bpData.cover;
        }
      }
    } catch(e) {}
  }

  if (!info || !videoUrl) {
    // Vercel 兜底
    try {
      var vcRes = await fetch('https://bili-parse-xrg9.vercel.app/?url=' + encodeURIComponent(originalUrl), {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      });
      if (vcRes.ok) {
        var vcJson = await vcRes.json();
        if (vcJson.code === 200 && vcJson.data) {
          var vcData = vcJson.data;
          if (!info) {
            info = { title: vcData.title || '', desc: vcData.desc || '', pic: vcData.cover || '', owner: { name: (vcData.author && vcData.author.name) || '', mid: (vcData.author && vcData.author.id) || '', face: (vcData.author && vcData.author.avatar) || '' }, cid: 0, aid: 0 };
          }
          if (!videoUrl) videoUrl = vcData.url || '';
          if (!info.title && vcData.title) info.title = vcData.title;
          if (!info.pic && vcData.cover) info.pic = vcData.cover;
        }
      }
    } catch(e) {}
  }

  if (!info) return fail('获取B站视频信息失败，可能被海外IP限制');

  // 获取播放地址（仅直连成功时尝试，BUGPK 已自带视频地址）
  if (!videoUrl && info.cid && info.aid) {
    try {
      var pr = await fetch('https://api.bilibili.com/x/player/playurl?avid=' + info.aid + '&cid=' + info.cid + '&qn=80&fnval=16&fourk=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
      });
      if (pr.ok) {
        var pj = await pr.json();
        if (pj.code === 0 && pj.data) {
          var d = pj.data;
          if (d.dash && d.dash.video && d.dash.video.length) videoUrl = d.dash.video[0].baseUrl || d.dash.video[0].base_url || '';
          if (!videoUrl && d.durl && d.durl.length) videoUrl = d.durl[0].url;
        }
      }
    } catch(e) {}
  }
  // 兜底：如果 mid 为空，尝试单独获取用户 mid
  if (info && (!info.owner || !info.owner.mid) && bvid) {
    try {
      var midRes = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
      });
      if (midRes.ok) {
        var midJson = await midRes.json();
        if (midJson.data && midJson.data.owner && midJson.data.owner.mid) {
          if (!info.owner) info.owner = {};
          info.owner.mid = midJson.data.owner.mid;
          if (!info.owner.name) info.owner.name = midJson.data.owner.name || '';
          if (!info.owner.face) info.owner.face = midJson.data.owner.face || '';
        }
      }
    } catch(e) {}
  }


  return ok('bilibili', {
    type: 'video', title: info.title || '', desc: info.desc || '',
    author: { name: (info.owner && info.owner.name) || '', id: (info.owner && info.owner.mid && String(info.owner.mid)) || '', avatar: (info.owner && info.owner.face) || '' },
    cover: info.pic || '', url: videoUrl || '', images: [],
  });
}

// ===== 快手 =====
async function parseKuaishou(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.kuaishou.com/' });
  var photoIdMatch = realUrl.match(/photoId[=\/](\d+)/);
  var currentPhotoId = photoIdMatch ? photoIdMatch[1] : null;

  var isValidUid = function (v) { return !!v && /^\d+$/.test(String(v)); };

  // ===== 占位/无效昵称识别 =====
  // 黑名单：快手/上游接口常见的匿名占位昵称
  var BAD_NAMES = ['快手用户', '神秘人', '热门用户', '已注销', '账号已注销', '未知用户', '佚名', 'kwai user', 'KuaiShou User', 'null', 'undefined'];
  // 模式：纯问号("?"/"？")、Unicode替换字符(\uFFFD)、纯符号/纯空白 —— 这类昵称在前端会渲染成"4个方块问号"等乱码占位
  var GARBAGE_PATTERN = /^[\?？\uFFFD\*\-_=.\s]+$/;
  var isGarbageName = function (v) {
    if (v === null || v === undefined) return true;
    var s = String(v).trim();
    if (!s) return true;
    if (BAD_NAMES.indexOf(s) !== -1) return true;
    if (GARBAGE_PATTERN.test(s)) return true;
    return false;
  };
  var isValidName = function (v) { return !isGarbageName(v); };

  // 还原 \uXXXX 转义与常见 HTML 实体，避免昵称显示乱码
  function decodeText(s) {
    if (!s) return s;
    try {
      return String(s)
        .replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); })
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    } catch (e) { return s; }
  }

  function normalizeUrl(u) {
    if (!u) return u;
    u = String(u).replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (u.indexOf('http://') === 0) u = 'https://' + u.substring(7);
    return u;
  }

  // ===== 严格校验：数字ID + 合法名字 + photoId绑定（防串号） =====
  function validAuthor(user) {
    if (!user || typeof user !== 'object') return null;
    var uid = user.id || user.userId || user.eid;
    var name = decodeText(user.name || user.nickname || '');
    if (!isValidUid(uid)) return null;
    if (!isValidName(name)) return null;
    if (user.photoId && currentPhotoId && String(user.photoId) !== String(currentPhotoId)) return null;
    return { id: String(uid), name: name || '', avatar: normalizeUrl(user.avatar || user.headUrl || user.headerUrl || '') };
  }

  // ===== 提取视频信息（保留原全部封面兜底逻辑） =====
  function extractVideo(html) {
    var videoUrl = '', title = '', cover = '';
    var patterns = [/"srcUrl"\s*:\s*"([^"]+)"/, /"playUrl"\s*:\s*"([^"]+)"/, /"url"\s*:\s*"([^"]*\.(?:mp4|m3u8)[^"]*)"/, /video-url="([^"]+)"/, /data-url="([^"']+)"/];
    for (var i = 0; i < patterns.length; i++) {
      var m = html.match(patterns[i]);
      if (m) { videoUrl = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); break; }
    }
    var ogT = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogT) title = ogT[1];
    var ogI = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    if (ogI) cover = ogI[1];
    var ogV = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
    if (ogV && !videoUrl) videoUrl = ogV[1];
    var ogVU = html.match(/<meta[^>]*property="og:video:url"[^>]*content="([^"]+)"/);
    if (ogVU && !videoUrl) videoUrl = ogVU[1];
    if (!cover) { var c2 = html.match(/"coverUrl"\s*:\s*"([^"]+)"/); if (c2) cover = c2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!cover) { var c3 = html.match(/"poster"\s*:\s*"([^"]+)"/); if (c3) cover = c3[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!cover) { var c4 = html.match(/"cover"\s*:\s*"([^"]+)"/); if (c4) cover = c4[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!cover) { var c5 = html.match(/"thumbnail"\s*:\s*"([^"]+)"/); if (c5) cover = c5[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!cover) { var c6 = html.match(/"thumb"\s*:\s*"([^"]+)"/); if (c6) cover = c6[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!cover) { var upic = html.match(/https?:\/\/[^"']*yximgs\.com\/upic\/[^"']+\.jpg[^"']*/i); if (upic) cover = upic[0].replace(/&amp;/g, '&'); }
    if (!title) {
      var tMatch = html.match(/"caption"\s*:\s*"([^"]+)"/);
      if (!tMatch) tMatch = html.match(/"title"\s*:\s*"([^"]+)"\s*,\s*"coverUrl"/);
      if (tMatch) title = tMatch[1];
    }
    return { videoUrl: videoUrl || '', title: title || '', cover: cover || '' };
  }

  // ===== 全文兜底补头像：不管 id/昵称是从哪条路径拿到的，缺头像就再扫一遍 =====
  function fillAvatarIfMissing(author, html) {
    if (!author || author.avatar) return author;
    var av = html.match(/"avatar"\s*:\s*"([^"]+)"/) || html.match(/"headUrl"\s*:\s*"([^"]+)"/) || html.match(/"userAvatar"\s*:\s*"([^"]+)"/) || html.match(/"headerUrl"\s*:\s*"([^"]+)"/);
    if (av) author.avatar = normalizeUrl(av[1]);
    return author;
  }

  // ===== __NEXT_DATA__ 深度结构化搜索（精准定位，跳过评论/音乐/推荐节点） =====
  function deepFindAuthorInJSON(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 15) return null;
    var author = validAuthor(obj);
    if (author) return author;
    if (obj.photo && obj.photo.user) { var r = validAuthor(obj.photo.user); if (r) return r; }
    if (obj.photoAuthor) { var r = validAuthor(obj.photoAuthor); if (r) return r; }
    if (obj.author && obj.photoId) { var r = validAuthor(obj.author); if (r) return r; }
    if (obj.video && obj.video.author) { var r = validAuthor(obj.video.author); if (r) return r; }
    if (obj.post && obj.post.author) { var r = validAuthor(obj.post.author); if (r) return r; }
    for (var k in obj) {
      if (k === 'comment' || k === 'comments' || k === 'music' || k === 'feed' || k === 'related') continue;
      var r = deepFindAuthorInJSON(obj[k], depth + 1);
      if (r) return r;
    }
    return null;
  }

  function findFromNextData(html) {
    var jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!jsonMatch) return null;
    try {
      var nd = JSON.parse(jsonMatch[1].replace(/undefined/g, 'null'));
      return deepFindAuthorInJSON(nd, 0);
    } catch (e) { return null; }
  }

  // ===== window.INIT_STATE 兜底（快手新版页面无 __NEXT_DATA__ 时使用，同步补头像） =====
  function findFromInitState(html) {
    var initMatch = html.match(/window\.INIT_STATE\s*=\s*(\{[\s\S]*?\});/);
    if (!initMatch) return null;
    try {
      var initRaw = initMatch[1].replace(/\\u002F/g, "/").replace(/\\u003E/g, ">").replace(/\\u003C/g, "<");
      var photoMatch = initRaw.match(/"userId"\s*:\s*(\d+)[\s\S]{0,300}?"userName"\s*:\s*"([^"]+)"/);
      if (!photoMatch) return null;
      var avatar = '';
      var avMatch = initRaw.match(/"avatar"\s*:\s*"([^"]+)"/) || initRaw.match(/"headUrl"\s*:\s*"([^"]+)"/) || initRaw.match(/"userAvatar"\s*:\s*"([^"]+)"/);
      if (avMatch) avatar = avMatch[1];
      return validAuthor({ id: photoMatch[1], name: photoMatch[2], avatar: avatar });
    } catch (e) {}
    return null;
  }

  // ===== HTML轻量提取作者（id + 尝试通过 meta[name=author] 补全昵称） =====
  function findFromHtmlMeta(html) {
    var m = html.match(/"user"\s*:\s*\{[\s\S]{0,500}?"id"\s*:\s*"(\d+)"/);
    if (!m) return null;
    var name = '';
    var ogA = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/);
    if (ogA) name = decodeText(ogA[1]);
    return validAuthor({ id: m[1], name: name });
  }

  var video = extractVideo(html);
  var finalAuthor = null;

  // 优先级：本地解析（无额外网络请求，最快最稳）→ 都拿不到时，最后才打一次外部接口兜底
  finalAuthor = findFromNextData(html);
  if (!finalAuthor) finalAuthor = findFromInitState(html);
  if (!finalAuthor) finalAuthor = findFromHtmlMeta(html);

  if (!finalAuthor || !video.videoUrl) {
    try {
      var res = await fetch('https://api.bugpk.com/api/short_videos?url=' + encodeURIComponent(realUrl), {
        headers: { 'User-Agent': UA }
      });
      if (res.ok) {
        var json = await res.json();
        var d = json && json.data;
        if (d) {
          if (!finalAuthor) {
            finalAuthor = validAuthor({ id: d.author && d.author.id, name: d.author && d.author.name, avatar: d.author && d.author.avatar });
          }
          if (!video.videoUrl && d.url) video.videoUrl = d.url;
          if (!video.cover && d.cover) video.cover = d.cover;
          if (!video.title && d.title) video.title = d.title;
        }
      }
    } catch (e) {}
  }

  // 不管走的是哪条路径拿到的作者信息，缺头像就再用全文兜底补一次
  finalAuthor = fillAvatarIfMissing(finalAuthor, html);

  if (!video.videoUrl && !video.cover) return fail('未提取到快手视频地址');

  return ok('kuaishou', {
    type: 'video',
    title: video.title || '',
    desc: video.title || '',
    author: finalAuthor || { name: '', id: '', avatar: '' },
    cover: video.cover || '',
    url: video.videoUrl || '',
    images: []
  });
}

// ===== 小红书 =====
async function parseXiaohongshu(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '', images = [];

  // === 1. Edith API（根据 note_id + xsec_token 精准获取，最可靠） ===
  var noteIdMatch = realUrl.match(/\/item\/([a-f0-9]+)/);
  if (noteIdMatch) {
    var xsecMatch = realUrl.match(/xsec_token=([^&]+)/);
    if (xsecMatch) {
      try {
        var apiRes = await fetch('https://edith.xiaohongshu.com/api/sns/web/v1/feed?note_id=' + noteIdMatch[1] + '&xsec_token=' + xsecMatch[1], {
          headers: { 'User-Agent': UA, 'Referer': 'https://www.xiaohongshu.com/', 'Accept': 'application/json' },
        });
        if (apiRes.ok) {
          var apiJson = await apiRes.json();
          if (apiJson.success && apiJson.data && apiJson.data.items && apiJson.data.items.length) {
            var item = apiJson.data.items[0];
            var note = item.note_card;
            if (note) {
              if (!title) title = note.title || '';
              var user = note.user || note.user_info || note.userInfo || null;
              if (user) {
                if (!authorName) authorName = user.nickname || user.nickName || user.name || '';
                if (!authorAvatar) authorAvatar = user.avatar || user.avatar_url || user.avatarUrl || user.headUrl || '';
                if (!authorId) authorId = user.userId || user.user_id || user.id || '';
              }
              if (!cover) cover = (note.cover && (note.cover.url_default || note.cover.url || note.cover.urlDefault)) || '';
              if (!videoUrl && note.video && note.video.media && note.video.media.stream) {
                var c = note.video.media.stream.h264 || note.video.media.stream.h265 || [];
                if (c.length) {
                  for (var ci = 0; ci < c.length; ci++) {
                    var cdd = c[ci];
                    var urls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []);
                    for (var ui = 0; ui < urls.length; ui++) {
                      if (urls[ui] && (urls[ui].indexOf("sns-video-zl") > 0 || urls[ui].indexOf("sns-video-hw") > 0)) {
                        if (urls[ui].indexOf('_309') > 0) { videoUrl = urls[ui]; break; }
                        if (!videoUrl) videoUrl = urls[ui];
                      }
                    }
                    if (videoUrl && videoUrl.indexOf('_309') > 0) break;
                  }
                }
              }
              if (!images.length && note.image_list && note.image_list.length) {
                note.image_list.forEach(function(img) { images.push(img.url_default || img.url || img.urlDefault || ''); });
              }
            }
          }
        }
      } catch(e) {}
    }
  }

  var html = await fetchHtml(realUrl, { Referer: 'https://www.xiaohongshu.com/' });

  // === 2. __INITIAL_STATE__ JSON（Edith 数据不全时补充） ===
  var stateStart = html.indexOf('__INITIAL_STATE__=');
  if (stateStart >= 0) {
    stateStart += '__INITIAL_STATE__='.length;
    while (stateStart < html.length && (html[stateStart] === ' ' || html[stateStart] === '"')) stateStart++;
    if (html[stateStart] === '{') {
      var depth = 1, inStr = false, escape = false, endIdx = stateStart + 1;
      for (; endIdx < html.length && depth > 0; endIdx++) {
        var ch = html[endIdx];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inStr) { escape = true; continue; }
        if (ch === '"' && !escape) { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0) {
        try {
          var state = JSON.parse(html.substring(stateStart, endIdx).replace(/undefined/g, 'null'));
          var noteIdFromUrl = (realUrl || originalUrl).match(/\/(?:explore|item)\/([a-f0-9]+)/);
          var noteDetail = state.note && state.note.noteDetailMap;
          if (noteDetail) {
            var keys = Object.keys(noteDetail);
            var targetKey = null;
            var matchedByUrl = false;
            if (noteIdFromUrl) {
              var urlNoteId = noteIdFromUrl[1];
              if (noteDetail[urlNoteId]) { targetKey = urlNoteId; matchedByUrl = true; }
              else {
                for (var ki = 0; ki < keys.length; ki++) {
                  var kv = keys[ki];
                  var innerNote = noteDetail[kv] && noteDetail[kv].note;
                  if (innerNote) {
                    var innerId = innerNote.noteId || innerNote.id || innerNote.note_id || '';
                    if (innerId === urlNoteId || kv.indexOf(urlNoteId) >= 0 || urlNoteId.indexOf(kv) >= 0) { targetKey = kv; matchedByUrl = true; break; }
                  }
                }
              }
            }
            if (!targetKey && keys.length) targetKey = keys[0];
            if (targetKey) {
              var note = noteDetail[targetKey] && noteDetail[targetKey].note;
              if (note) {
                if (!title) title = note.title || note.desc || '';
                if (note.user) {
                  if (!authorName) authorName = note.user.nickname || note.user.nickName || note.user.name || '';
                  if (!authorAvatar) authorAvatar = note.user.avatar || note.user.headUrl || note.user.avatarUrl || '';
                  if (!authorId) authorId = note.user.userId || note.user.user_id || note.user.id || '';
                }
                if (!cover && note.cover) cover = note.cover.urlDefault || note.cover.url || '';
                if (!videoUrl && note.video && note.video.media && note.video.media.stream) {
                  var candidates = note.video.media.stream.h264 || note.video.media.stream.h265 || [];
                  if (candidates.length) { for (var ci = 0; ci < candidates.length; ci++) { var cdd = candidates[ci]; var urls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []); for (var ui = 0; ui < urls.length; ui++) { if (urls[ui] && (urls[ui].indexOf("sns-video-zl") > 0 || urls[ui].indexOf("sns-video-hw") > 0)) { if (urls[ui].indexOf('_309') > 0) { videoUrl = urls[ui]; break; } if (!videoUrl) videoUrl = urls[ui]; } } if (videoUrl && videoUrl.indexOf('_309') > 0) break; } }
                }
                if (note.imageList && note.imageList.length) {
                  note.imageList.forEach(function(img) { if (!images.length) images.push(img.urlDefault || img.url || ''); });
                }
              }
            }
          }
          if ((!authorName || !authorAvatar) && state.user) {
            if (!authorName) authorName = state.user.nickname || state.user.name || state.user.nickName || '';
            if (!authorAvatar) authorAvatar = state.user.avatar || state.user.headUrl || '';
            if (!authorId) authorId = state.user.userId || state.user.id || '';
          }
        } catch(e) {}
      }
    }
  }

  // === 3. DOM 最后兜底 ===
  var posterMatch = html.match(/id=["']video_note_poster["'][^>]*src=["']([^"']+)["']/);
  if (posterMatch && !cover) cover = posterMatch[1];
  if (!cover) { var ogI = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/); if (ogI) cover = ogI[1]; }
  if (!title) { var h1Match = html.match(/note-card-title[^>]*><!--\[-->([^<]+)/); if (h1Match) title = h1Match[1].trim(); }

  if (!authorName || !authorId) {
    var uidPos = html.indexOf('"userId"');
    if (uidPos >= 0) {
      var userChunk = html.substring(Math.max(0, uidPos - 8000), Math.min(html.length, uidPos + 8000));
      if (!authorName) { var nMatch = userChunk.match(/"(?:nickname|nickName)"\s*:\s*"([^"]+)"/); if (nMatch) authorName = nMatch[1]; }
      if (!authorId) { var uMatch = userChunk.match(/"userId"\s*:\s*"([^"]+)"/); if (uMatch) authorId = uMatch[1]; }
      if (!authorAvatar) { var aMatch = userChunk.match(/"(?:avatar|avatar_url|headUrl)"\s*:\s*"([^"]+)"/); if (aMatch) authorAvatar = aMatch[1]; }
    }
  }
  if (!authorName) { var nameMatch = html.match(/note-card-name[^>]*><!--\[-->([^<]+)/); if (nameMatch) authorName = nameMatch[1].trim(); }
  var avaMatch = html.match(/<img[^>]*alt=["']\u5934\u50CF["'][^>]*src=["']([^"']+)["']/);
  if (avaMatch && !authorAvatar) authorAvatar = avaMatch[1];

  // masterUrl 兜底（偏好 _309）
  if (!videoUrl && !images.length) {
    var muRegex = /"masterUrl"\s*:\s*"([^"]+)"/g;
    var muMatch, bestUrl = '';
    while ((muMatch = muRegex.exec(html)) !== null) {
      var mu = muMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (mu.indexOf('http://') === 0) mu = 'https://' + mu.substring(7);
      if (mu.indexOf('_309') > 0) { bestUrl = mu; break; }
      if (mu.indexOf('_258') > 0 && !bestUrl) bestUrl = mu;
    }
    if (bestUrl) videoUrl = bestUrl;
  }
  if (!videoUrl && !images.length) {
    var zlMatch = html.match(/https?:\/\/[^"'\s]*sns-video-zl\.xhscdn\.com\/stream\/[^"'\s]+\.mp4[^"'\s]*/i);
    if (zlMatch) {
      videoUrl = zlMatch[0].replace(/&amp;/g, '&').replace(/\\u002F/g, '/');
      if (videoUrl.indexOf('http://') === 0) videoUrl = 'https://' + videoUrl.substring(7);
      if (videoUrl.indexOf('_309') <= 0) {
        var all309 = html.match(/https?:\/\/[^"']*xhscdn\.com\/stream\/[^"'\s]*_309[^"'\s]*\.mp4[^"'\s]*/i);
        if (all309 && all309.length) { videoUrl = all309[0].replace(/&amp;/g, '&').replace(/\\u002F/g, '/'); }
      }
    }
    if (!videoUrl) {
      var allUrls = html.match(/https?:\/\/[^"']*xhscdn\.com\/stream\/[^"'\s]+/g);
      if (allUrls && allUrls.length) {
        var found309 = false;
        for (var si = 0; si < allUrls.length; si++) {
          var su = allUrls[si].replace(/\\u002F/g, '/');
          if (su.indexOf('http://') === 0) su = 'https://' + su.substring(7);
          if (su.match(/\.mp4/i)) {
            if (su.indexOf('sns-video-zl') > 0 || su.indexOf('sns-video-hw') > 0) {
              if (su.indexOf('_309') > 0) { videoUrl = su; found309 = true; break; }
              if (!videoUrl) videoUrl = su;
            }
          }
        }
        if (!found309 && videoUrl && videoUrl.indexOf('_258') > 0) {
          for (var sj = 0; sj < allUrls.length; sj++) {
            var sj2 = allUrls[sj].replace(/\\u002F/g, '/');
            if (sj2.indexOf('http://') === 0) sj2 = 'https://' + sj2.substring(7);
            if (sj2.indexOf('_309') > 0 && sj2.match(/\.mp4/i)) { videoUrl = sj2; break; }
          }
        }
      }
    }
  }

  // 后处理：如果视频地址是 _258 且有 _309 版本的 masterUrl，尝试替换
  if (videoUrl && videoUrl.indexOf('_258') > 0) {
    var muRegex2 = /"masterUrl"\s*:\s*"([^"]+)"/g;
    var muMatch2;
    while ((muMatch2 = muRegex2.exec(html)) !== null) {
      var mu2 = muMatch2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (mu2.indexOf('http://') === 0) mu2 = 'https://' + mu2.substring(7);
      if (mu2.indexOf('_309') > 0) { videoUrl = mu2; break; }
    }
  }

  if (!videoUrl && !images.length && !cover) return fail('未提取到小红书内容');

  return ok('xiaohongshu', {
    type: images.length ? 'image' : 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: images,
  });
}
async function parseTiktok(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.tiktok.com/' });

  // TikTok 页面里第一个用户是分享者/当前登录用户，最后一个才是视频原作者
  var allNick = html.match(/"nickname":"([^"]+)"/g);
  var allUid = html.match(/"uniqueId":"([^"]+)"/g);
  var allAvatar = html.match(/"avatarLarger":"([^"]+)"/g);

  var paMatch = html.match(/"playAddr":"([^"]+)"/);
  var coverMatch = html.match(/"cover":"([^"]+)"/);
  var descMatch = html.match(/"desc":"([^"]+)"/);

  // 取最后一个值（原作者）
  var authorName = allNick && allNick.length > 0 ? allNick[allNick.length - 1].match(/"nickname":"([^"]+)"/)[1] : '';
  var authorId = allUid && allUid.length > 0 ? allUid[allUid.length - 1].match(/"uniqueId":"([^"]+)"/)[1] : '';
  var authorAvatar = allAvatar && allAvatar.length > 0 ? allAvatar[allAvatar.length - 1].match(/"avatarLarger":"([^"]+)"/)[1].replace(/\\u002F/g, '/') : '';

  var videoUrl = paMatch ? paMatch[1].replace(/\\u002F/g, '/') : '';
  var cover = coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '';
  var title = descMatch ? descMatch[1] : '';

  if (!videoUrl) return fail('未提取到TikTok视频地址');

  // tikwm.com 兜底（解决非浏览器请求 403 问题）
  try {
    var tikRes = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(originalUrl || realUrl), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (tikRes.ok) {
      var tikJson = await tikRes.json();
      if (tikJson.code === 0 && tikJson.data) {
        var td = tikJson.data;
        if (td.hdplay || td.play || td.url) videoUrl = td.hdplay || td.play || td.url;
        if (!authorName) authorName = (td.author && td.author.nickname) || '';
        if (!authorId) authorId = (td.author && td.author.unique_id) || '';
        if (!authorAvatar) authorAvatar = (td.author && td.author.avatar) || '';
        if (!cover) cover = td.cover || '';
        if (!title) title = td.title || '';
      }
    }
  } catch(e) {}

  return ok('tiktok', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}


// ===== 西瓜视频 =====
async function parseXigua(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.ixigua.com/' });

  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '';

  // og:title / og:image（西瓜视频用 name= 而不是 property=）
  var tMatch = html.match(/<meta[^>]*name="og:title"[^>]*content="([^"]+)"/);
  if (tMatch) title = tMatch[1].replace(/\|\s*西瓜视频$/, '').trim();
  var iMatch = html.match(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/);
  if (iMatch) cover = iMatch[1];

  // media_user 作者信息
  var muMatch = html.match(/"media_user":\{[^}]+\}/);
  if (muMatch) {
    var mu = muMatch[0];
    var sn = mu.match(/"screen_name":"([^"]+)"/);
    if (sn) authorName = sn[1];
    var av = mu.match(/"avatar_url":"([^"]+)"/);
    if (av) authorAvatar = av[1].replace(/\\u002F/g, '/');
    var idM = mu.match(/"id":"(\d+)"/);
    if (idM) authorId = idM[1];
  }

  // ALAPI paid API
  try {
    var alapiRes = await fetch('https://v3.alapi.cn/api/video/url?token=earvoy1f8sopbwnqftgdzszla3swvm&url=' + encodeURIComponent(originalUrl) + '&format=json', {
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (alapiRes.ok) {
      var alapi = await alapiRes.json();
      if (alapi.code === 200 && alapi.data && alapi.data.video_url) {
        if (!videoUrl) videoUrl = alapi.data.video_url;
        if (!title && alapi.data.title) title = alapi.data.title;
        if (!cover && alapi.data.cover_url) cover = alapi.data.cover_url;
      }
    }
  } catch(e) {}

  // HTML fallback
  if (!videoUrl) {
    var patterns = [/\x22srcUrl\x22\s*:\s*\x22([^\x22]+)\x22/, /\x22videoUrl\x22\s*:\s*\x22([^\x22]+)\x22/, /\x22play_url\x22\s*:\s*\x22([^\x22]+)\x22/];
    for (var pi = 0; pi < patterns.length; pi++) { var vm = html.match(patterns[pi]); if (vm) { videoUrl = vm[1].replace(/\\u002F/g, '/'); break; } }
  }

  if (!title && !cover && !videoUrl) return fail('xigua parse failed');

  return ok('ixigua', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}

// ===== A站 =====
async function parseAcfun(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.acfun.cn/' });

  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '';

  // 提取 ac id
  var acMatch = realUrl.match(/[?&]ac=(\d+)/);
  if (!acMatch) return fail('未识别到AC号');

  // 解析 window.videoInfo
  var viStart = html.indexOf('window.videoInfo =');
  if (viStart >= 0) {
    var vs = viStart + 'window.videoInfo ='.length;
    var depth = 0, inStr = false, escape = false, ve = vs;
    for (; ve < html.length; ve++) {
      var ch = html[ve];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"' && !escape) { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0 && ch === '}') { ve++; break; }
    }
    try {
      var vi = JSON.parse(html.substring(vs, ve));
      title = vi.title || '';
      cover = vi.cover || vi.videoCover || '';
    } catch(e) {}
  }

  // 解析 var playInfo（视频流地址）
  var piStart = html.indexOf('var playInfo =');
  if (piStart >= 0) {
    var ps = piStart + 'var playInfo ='.length;
    var dep2 = 0, ins2 = false, esc2 = false, pe = ps;
    for (; pe < html.length; pe++) {
      var ch2 = html[pe];
      if (esc2) { esc2 = false; continue; }
      if (ch2 === '\\' && ins2) { esc2 = true; continue; }
      if (ch2 === '"' && !esc2) { ins2 = !ins2; continue; }
      if (ins2) continue;
      if (ch2 === '{') dep2++;
      if (ch2 === '}') dep2--;
      if (dep2 === 0 && ch2 === '}') { pe++; break; }
    }
    try {
      var pi = JSON.parse(html.substring(ps, pe));
      if (pi.streams && pi.streams.length) {
             // 取最高画质的播放地址
        for (var si = 0; si < pi.streams.length; si++) {
          if (pi.streams[si].playUrls && pi.streams[si].playUrls.length) {
            videoUrl = pi.streams[si].playUrls[0];
            break;
          }
        }
      }
    } catch(e) {}
  }

  // 从 HTML 中提取作者信息  // 从 HTML 中提取作者信息
  var nameMatch = html.match(/<span\s+class="up-name">([^<]+)<\/span>/);
  if (nameMatch) authorName = nameMatch[1].trim();
  var avatarMatch = html.match(/<span class="up-avatar"><img src="([^"]+)"/);
  if (avatarMatch) authorAvatar = avatarMatch[1];
  var uidMatch = html.match(/\/upPage\/(\d+)/);
  if (uidMatch) authorId = uidMatch[1];

  if (!title && !cover) return fail('未提取到A站视频信息');

  return ok('acfun', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}

// ===== 微博 =====
async function parseWeibo(originalUrl) {
  // 直接通过 BUGPK 代理解析（CF Worker IP 无法获取微博视频数据）
  try {
    var res = await fetch('https://api.bugpk.com/api/short_videos?url=' + encodeURIComponent(originalUrl), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (res.ok) {
      var json = await res.json();
      if (json.code === 200 && json.data && json.data.url) {
        var d = json.data;
        return ok('weibo', {
          type: 'video', title: d.title || d.desc || '', desc: d.desc || d.title || '',
          author: { name: (d.author && d.author.name) || '', id: (d.author && String(d.author.id)) || '', avatar: (d.author && d.author.avatar) || '' },
          cover: d.cover || '', url: d.url || '', images: [],
        });
      }
    }
  } catch(e) {}

  return fail('微博解析失败（BUGPK 代理）');
}// ===== 微信视频号 =====
async function parseWeixin(originalUrl) {
  // 页面是 SPA，CF Worker 无法直接解析，通过 BUGPK 代理
  try {
    var res = await fetch('https://api.bugpk.com/api/short_videos?url=' + encodeURIComponent(originalUrl), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (res.ok) {
      var json = await res.json();
      if (json.code === 200 && json.data && json.data.url) {
        var d = json.data;
        return ok('weixin', {
          type: 'video', title: d.title || d.desc || '', desc: d.desc || d.title || '',
          author: { name: (d.author && d.author.name) || d.nickname || d.author_name || '', id: (d.author && d.author.id) || d.author_id || d.uid || d.user_id || '', avatar: (d.author && d.author.avatar) || d.avatar || d.author_avatar || d.face || '' },
          cover: d.cover || '', url: d.url || '', images: [],
        });
      }
    }
  } catch(e) {}

  return fail('微信视频号解析失败（BUGPK 代理）');
}



// Vercel handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
    const targetUrl = url.searchParams.get('url') || '';
    if (!targetUrl) { res.statusCode = 400; res.end(JSON.stringify({ code: 400, msg: 'missing url' })); return; }

    const platform = detectPlatform(targetUrl);
    let result;
    switch (platform) {
      case 'douyin': result = await parseDouyin(targetUrl); break;
      case 'bilibili': result = await parseBilibili(targetUrl); break;
      case 'kuaishou': result = await parseKuaishou(targetUrl); break;
      case 'xiaohongshu': result = await parseXiaohongshu(targetUrl); break;
      case 'tiktok': result = await parseTiktok(targetUrl); break;
      case 'ixigua': result = await parseXigua(targetUrl); break;
      case 'acfun': result = await parseAcfun(targetUrl); break;
      case 'weibo': result = await parseWeibo(targetUrl); break;
      case 'weixin': result = await parseWeixin(targetUrl); break;
      default: res.statusCode = 400; res.end(JSON.stringify({ code: 400, msg: 'unsupported' })); return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ code: 500, msg: 'error: ' + (e && e.message ? e.message : String(e)) }));
  }
};
