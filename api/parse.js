const UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.003.A1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5060 MMWEBSDK/20221206 MMWEBID/8060 MicroMessenger/8.0.32.2380(0x28002034) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

// 
const PLATFORM_NAMES = {
  douyin: '抖音',
  tiktok: 'TikTok',
  bilibili: 'B?',
  acfun: 'AcFun',
  ixigua: '西瓜视频',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  weibo: '微博',
  weixin: '微信视频号',
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
  var itemId = extractDouyinItemId(originalUrl);
  if (!itemId) return fail('未能从链接中提取视频ID');

  // 优先走iesdouyin.com/share/video/短链重定向流程（绕过JS挑战）
  var redirectUrl = 'https://www.iesdouyin.com/share/video/' + itemId + '/';
  var realUrl = await resolveRedirect(redirectUrl);
  // 如果重定向未到达douyin.com，退回到原始URL
  if (!realUrl || realUrl.indexOf('douyin.com') < 0) realUrl = originalUrl;

  var html = await fetchHtml(realUrl, { Referer: 'https://www.douyin.com/' });
  var item = extractDouyinDataFromHtml(html);

  var video = (item && item.video) || {};
  var author = (item && item.author) || {};
  var playUrl = '';
  var title = '';
  var cover = '';
  var authorName = '';
  var authorId = '';
  var avatar = '';
  var images = [];

  if (item) {
    playUrl = (video.play_addr && video.play_addr.url_list && video.play_addr.url_list[0]) || '';
    if (playUrl) playUrl = playUrl.replace('playwm', 'play').replace(/\\u002F/g, '/');
    title = item.desc || (item.share_info && item.share_info.share_title) || (item.video && item.video.text) || (item.promotions && item.promotions[0] && item.promotions[0].title) || '';
    cover = (video.origin_cover && video.origin_cover.url_list && video.origin_cover.url_list[0]) || (video.cover && video.cover.url_list && video.cover.url_list[0]) || (video.dynamic_cover && video.dynamic_cover.url_list && video.dynamic_cover.url_list[0]) || '';
    authorName = author.nickname || '';
    authorId = author.unique_id || author.short_id || author.uid || '';
    avatar = (author.avatar_larger && author.avatar_larger.url_list && author.avatar_larger.url_list[0]) || (author.avatar_medium && author.avatar_medium.url_list && author.avatar_medium.url_list[0]) || (author.avatar_thumb && author.avatar_thumb.url_list && author.avatar_thumb.url_list[0]) || '';
    images = (item.images || []).map(function(img) { return img.url_list && img.url_list[0]; }).filter(Boolean);
  }

  if (!title) {
    var ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogTitle && ogTitle[1]) title = ogTitle[1];
  }

  if (!playUrl) {
    var ogV = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
    if (ogV) playUrl = ogV[1];
    if (!playUrl) {
      var videoUrlMatch = html.match(/"playAddr":\s*"([^"]+)"/) || html.match(/"srcUrl":\s*"([^"]+)"/) || html.match(/"video_url":\s*"([^"]+)"/) || html.match(/"play_url":\s*"([^"]+)"/);
      if (videoUrlMatch) playUrl = videoUrlMatch[1].replace(/\\u002F/g, '/');
    }
  }

  if (!cover) {
    var ogI = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    if (ogI) cover = ogI[1];
  }

  // 如果HTML提取失败，尝试直接调抖音API
  if (!playUrl) {
    try {
      var apiRes = await fetch('https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=' + itemId, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'application/json,text/html,application/xhtml+xml',
        },
      });
      if (apiRes.ok) {
        var apiJson = await apiRes.json();
        var itemData = apiJson.aweme_detail || apiJson.data || apiJson;
        if (itemData && itemData.video) {
          var v = itemData.video;
          playUrl = (v.play_addr && v.play_addr.url_list && v.play_addr.url_list[0]) || '';
          if (playUrl) playUrl = playUrl.replace('playwm', 'play').replace(/\\u002F/g, '/');
          if (!title) title = itemData.desc || itemData.share_info && itemData.share_info.share_title || '';
          if (!cover) cover = (v.origin_cover && v.origin_cover.url_list && v.origin_cover.url_list[0]) || (v.cover && v.cover.url_list && v.cover.url_list[0]) || '';
          if (!authorName) authorName = (itemData.author && itemData.author.nickname) || '';
          if (!authorId) authorId = (itemData.author && (itemData.author.unique_id || itemData.author.short_id || itemData.author.uid)) || '';
          if (!avatar) avatar = (itemData.author && itemData.author.avatar_larger && itemData.author.avatar_larger.url_list && itemData.author.avatar_larger.url_list[0]) || (itemData.author && itemData.author.avatar_medium && itemData.author.avatar_medium.url_list && itemData.author.avatar_medium.url_list[0]) || '';
        }
      }
    } catch(e) { /* API fallback failed */ }
  }

  if (!playUrl) return fail('从页面HTML提取视频数据失败，item_id=' + itemId);

  return ok('douyin', {
    type: images.length ? 'image' : 'video',
    title: title,
    desc: title,
    author: {
      name: authorName,
      id: authorId,
      avatar: avatar,
    },
    cover: cover,
    url: playUrl,
    images: images,
  });
}

// ===== B?=====
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

  // 
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

  // 
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

  // 
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
  // 
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

  // 
  // 
  var BAD_NAMES = ['快手用户', '神秘人', '热门用户', '已注销', '账号已注销', '未知用户', '佚名', 'kwai user', 'KuaiShou User', 'null', 'undefined'];
  // 
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

  // 
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

  // 
  function validAuthor(user) {
    if (!user || typeof user !== 'object') return null;
    var uid = user.id || user.userId || user.eid;
    var name = decodeText(user.name || user.nickname || '');
    if (!isValidUid(uid)) return null;
    if (!isValidName(name)) return null;
    if (user.photoId && currentPhotoId && String(user.photoId) !== String(currentPhotoId)) return null;
    return { id: String(uid), name: name || '', avatar: normalizeUrl(user.avatar || user.headUrl || user.headerUrl || '') };
  }

  // 
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

  // 
  function fillAvatarIfMissing(author, html) {
    if (!author || author.avatar) return author;
    var av = html.match(/"avatar"\s*:\s*"([^"]+)"/) || html.match(/"headUrl"\s*:\s*"([^"]+)"/) || html.match(/"userAvatar"\s*:\s*"([^"]+)"/) || html.match(/"headerUrl"\s*:\s*"([^"]+)"/);
    if (av) author.avatar = normalizeUrl(av[1]);
    return author;
  }

  // 
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

  // 
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

  // 
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

  // 
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

  // 
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

// ===== 小红书=====
async function parseXiaohongshu(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '', images = [];
  var html = await fetchHtml(realUrl, { Referer: 'https://www.xiaohongshu.com/' });

  // 
  var stateStart = html.indexOf('__INITIAL_STATE__=');
  var noteIsVideoType = false;
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
          var noteIdFromUrl = (realUrl || originalUrl).match(/\/(?:explore|discovery\/)?item\/([a-f0-9]+)/);
          var noteData = null;
          if (state.noteData && state.noteData.data && state.noteData.data.noteData) {
            noteData = state.noteData.data.noteData;
          }
          if (!noteData && state.note && state.note.noteDetailMap) {
            var noteDetail = state.note.noteDetailMap;
            var keys = Object.keys(noteDetail);
            var targetKey = null, matchedByUrl = false;
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
            if (targetKey && matchedByUrl) {
              noteData = noteDetail[targetKey] && noteDetail[targetKey].note;
            }
          }
          if (noteData) {
            if (noteData.type === 'video') noteIsVideoType = true;
            if (!title) title = noteData.title || noteData.desc || '';
            if (noteData.user) {
              if (!authorName) authorName = noteData.user.nickname || noteData.user.nickName || noteData.user.name || '';
              if (!authorAvatar) authorAvatar = noteData.user.avatar || noteData.user.headUrl || noteData.user.avatarUrl || '';
              if (!authorId) authorId = noteData.user.userId || noteData.user.user_id || noteData.user.id || noteData.userId || '';
              if (authorAvatar && authorAvatar.indexOf('http') !== 0 && authorAvatar.indexOf('//') !== 0) {
                authorAvatar = 'https://sns-avatar-qc.xhscdn.com/avatar/' + authorAvatar + '?imageView2/2/w/120/format/jpg';
              }
            }
            if (!cover && noteData.cover) cover = noteData.cover.urlDefault || noteData.cover.url || noteData.cover.urlDefault || '';
            if (!videoUrl && noteData.video) {
              var candidates = [];
              if (noteData.video.media && noteData.video.media.stream) {
                var s = noteData.video.media.stream;
                (s.h264 || []).forEach(function(x) { candidates.push(x); });
                (s.h265 || []).forEach(function(x) { candidates.push(x); });
              }
              if (noteData.video.masterUrl) candidates.push({masterUrl: noteData.video.masterUrl});
              if (noteData.video.url) candidates.push({masterUrl: noteData.video.url});
              if (noteData.video.videoUrl) candidates.push({masterUrl: noteData.video.videoUrl});
              if (noteData.video.playUrl) candidates.push({masterUrl: noteData.video.playUrl});
              if (noteData.video.play_addr) candidates.push({masterUrl: noteData.video.play_addr});
              videoUrl = pickBestVideoUrl(candidates);
            }
            if (!images.length && noteData.imageList && noteData.imageList.length) {
              noteData.imageList.forEach(function(img) { images.push(img.urlDefault || img.url || ''); });
            }
          }
        } catch(e) {}
      }
    }
  }

  // 
  if (!videoUrl) {
    var muRegex = /"masterUrl"\s*:\s*"([^"]+)"/g;
    var muMatch;
    var url309 = '', url258 = '', urlOther = '';
    while ((muMatch = muRegex.exec(html)) !== null) {
      var mu = muMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (mu.indexOf('http://') === 0) mu = 'https://' + mu.substring(7);
      if (mu.indexOf('_309') > 0) { if (!url309) url309 = mu; }
      else if (mu.indexOf('_258') > 0) { if (!url258) url258 = mu; }
      else if (!urlOther && mu.indexOf('_259') < 0 && (mu.indexOf('.mp4') > 0 || mu.indexOf('.m3u8') > 0)) { urlOther = mu; }
    }
    if (url309) videoUrl = url309;
    else if (url258) videoUrl = url258;
    else if (urlOther) videoUrl = urlOther;
  }

  // 
  if (!title) {
    var h1Match = html.match(/note-card-title[^>]*><!--\[-->([^<]+)/);
    if (h1Match && h1Match[1].trim()) title = h1Match[1].trim();
  }
  if (!cover) {
    var posterMatch = html.match(/id=["']video_note_poster["'][^>]*src=["']([^"']+)["']/);
    if (posterMatch) cover = posterMatch[1];
    if (!cover) { var ogI = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/); if (ogI) cover = ogI[1]; }
  }
  if (title && (!authorName || !authorId)) {
    var uidPos = html.indexOf('"userId"');
    if (uidPos >= 0) {
      var userChunk = html.substring(Math.max(0, uidPos - 8000), Math.min(html.length, uidPos + 8000));
      if (!authorName) { var nMatch = userChunk.match(/"(?:nickname|nickName)"\s*:\s*"([^"]+)"/); if (nMatch) authorName = nMatch[1]; }
      if (!authorId) { var uMatch = userChunk.match(/"userId"\s*:\s*"([^"]+)"/); if (uMatch) authorId = uMatch[1]; }
      if (!authorAvatar) { var aMatch = userChunk.match(/"(?:avatar|avatar_url|headUrl)"\s*:\s*"([^"]+)"/); if (aMatch) authorAvatar = aMatch[1]; }
    }
  }

  if (!videoUrl && !images.length && !cover) return fail('未提取到小红书内容');

  var dataType = videoUrl ? 'video' : (images.length ? 'image' : 'video');

  return ok('xiaohongshu', {
    type: dataType, title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: images,
  });
}

// 
function pickBestVideoUrl(candidates) {
  var best309 = '', best258 = '';
  for (var ti = 0; ti < candidates.length; ti++) {
    var cdd = candidates[ti];
    var allUrls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []);
    for (var ui = 0; ui < allUrls.length; ui++) {
      var u = allUrls[ui];
      if (u) {
        u = u.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
        if (u.indexOf('http://') === 0) u = 'https://' + u.substring(7);
        if (u.indexOf('_309') > 0 && (u.indexOf('.mp4') > 0 || u.indexOf('.m3u8') > 0)) { if (!best309) best309 = u; }
        else if (u.indexOf('_258') > 0 && (u.indexOf('.mp4') > 0 || u.indexOf('.m3u8') > 0)) { if (!best258) best258 = u; }
      }
    }
  }
  return best309 || best258 || '';
}
async function parseTiktok(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.tiktok.com/' });

  // 
  var allNick = html.match(/"nickname":"([^"]+)"/g);
  var allUid = html.match(/"uniqueId":"([^"]+)"/g);
  var allAvatar = html.match(/"avatarLarger":"([^"]+)"/g);

  var paMatch = html.match(/"playAddr":"([^"]+)"/);
  var coverMatch = html.match(/"cover":"([^"]+)"/);
  var descMatch = html.match(/"desc":"([^"]+)"/);

  // 
  var authorName = allNick && allNick.length > 0 ? allNick[allNick.length - 1].match(/"nickname":"([^"]+)"/)[1] : '';
  var authorId = allUid && allUid.length > 0 ? allUid[allUid.length - 1].match(/"uniqueId":"([^"]+)"/)[1] : '';
  var authorAvatar = allAvatar && allAvatar.length > 0 ? allAvatar[allAvatar.length - 1].match(/"avatarLarger":"([^"]+)"/)[1].replace(/\\u002F/g, '/') : '';

  var videoUrl = paMatch ? paMatch[1].replace(/\\u002F/g, '/') : '';
  var cover = coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '';
  var title = descMatch ? descMatch[1] : '';

  if (!videoUrl) return fail('未提取到TikTok视频地址');

  // 
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

  // 
  var tMatch = html.match(/<meta[^>]*name="og:title"[^>]*content="([^"]+)"/);
  if (tMatch) title = tMatch[1].replace(/\|\s*西瓜视频$/, '').trim();
  var iMatch = html.match(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/);
  if (iMatch) cover = iMatch[1];

  // 
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

  // 
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

// ===== AcFun=====
async function parseAcfun(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.acfun.cn/' });

  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '';

  // 
  var acMatch = realUrl.match(/[?&]ac=(\d+)/);
  if (!acMatch) return fail('未识别到AC号');

  // 
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

  // 
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
             // 
        for (var si = 0; si < pi.streams.length; si++) {
          if (pi.streams[si].playUrls && pi.streams[si].playUrls.length) {
            videoUrl = pi.streams[si].playUrls[0];
            break;
          }
        }
      }
    } catch(e) {}
  }

  // 
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
  // 
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
}

// ===== 微信视频号 =====
async function parseWeixin(originalUrl) {
  // 
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


export default async function handler(request) {
const url = new URL(request.url);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return new Response(JSON.stringify(fail('缺少 url 参数', 400)), { status: 400, headers });
  }

  try {
    // 
    var action = url.searchParams.get('action');
    if (action === 'proxy') {
      var videoUrl = url.searchParams.get('video');
      if (!videoUrl) return new Response(JSON.stringify(fail('缺少 video 参数')), { status: 400, headers });
      var proxyRes = await fetch(videoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', 'Referer': 'https://www.tiktok.com/', 'Origin': 'https://www.tiktok.com' },
      });
      if (!proxyRes.ok) return new Response(JSON.stringify(fail('代理下载失败: HTTP ' + proxyRes.status)), { status: 502, headers });
      var proxyHeaders = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': proxyRes.headers.get('Content-Type') || 'video/mp4',
        'Content-Disposition': proxyRes.headers.get('Content-Disposition') || 'inline',
        'Cache-Control': 'public, max-age=3600',
      });
      return new Response(proxyRes.body, { status: 200, headers: proxyHeaders });
    }

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
      default: return new Response(JSON.stringify(fail('暂不支持该平台链接', 400)), { status: 400, headers });
    }
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify(fail('解析失败: ' + (e && e.message ? e.message : String(e)))), { status: 500, headers });
  }
}
