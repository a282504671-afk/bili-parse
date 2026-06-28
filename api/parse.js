const UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.003.A1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5060 MMWEBSDK/20221206 MMWEBID/8060 MicroMessenger/8.0.32.2380(0x28002034) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

function ok(platform, data) {
  return { code: 200, msg: '解析成功', platform, data };
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

// ===== 閹舵牠鐓?=====
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

  // og:title 閸忔粌绨?
  if (!item.desc && !(item.share_info && item.share_info.share_title)) {
    var ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogTitle && ogTitle[1] && ogTitle[1].indexOf('閹舵牠鐓?) < 0 && ogTitle[1].indexOf('douyin') < 0) {
      item.desc = ogTitle[1];
    }
  }

  var images = (item.images || []).map(function(img) { return img.url_list && img.url_list[0]; }).filter(Boolean);

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

// ===== B缁?=====
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

  // 閺傜懓绱?: 妞ょ敻娼?HTML
  try {
    var html = await fetchHtml(realUrl, { Referer: 'https://www.bilibili.com/' });
    var stateStr = null;
    var m1 = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*;?\s*(?:<\/script>|\(function)/);
    if (m1) stateStr = m1[1];
    if (!stateStr) {
      var m2 = html.match(/<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]+?)<\/script>/);
      if (m2) stateStr = m2[1];
    }
    if (stateStr) {
      var state = JSON.parse(stateStr.replace(/undefined/g, 'null'));
      var vd = state.videoData || state.videoInfo || (state.video && state.video.info);
      if (vd) info = { title: vd.title, desc: vd.desc, pic: vd.pic, owner: vd.owner || {}, cid: vd.cid, aid: vd.aid };
    }
    if (!info || !info.title) {
      var ogT = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
      var ogI = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
      if (ogT || ogI) {
        if (!info) info = { title: '', desc: '', pic: '', owner: { name: '', mid: '', face: '' }, cid: 0, aid: 0 };
        if (ogT && !info.title) info.title = ogT[1];
        if (ogI && !info.pic) info.pic = ogI[1];
      }
    }
  } catch(e) {}

  // 閺傜懓绱?: API
  if (!info || !info.aid || !info.cid) {
    try {
      var vr = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
      });
      var vt = await vr.text();
      if (vt.trim().startsWith('{')) {
        var vj = JSON.parse(vt);
        if (vj.code === 0 && vj.data) {
          var vd = vj.data;
          if (!info) info = { title: '', desc: '', pic: '', owner: { name: '', mid: '', face: '' }, cid: 0, aid: 0 };
          if (!info.title) info.title = vd.title || '';
          if (!info.desc) info.desc = vd.desc || '';
          if (!info.pic) info.pic = vd.pic || '';
          if (vd.owner) info.owner = { name: vd.owner.name || info.owner.name, mid: vd.owner.mid || info.owner.mid, face: vd.owner.face || info.owner.face };
          if (!info.cid && vd.cid) info.cid = vd.cid;
          if (!info.aid && vd.aid) info.aid = vd.aid;
        }
      }
    } catch(e) {}
  }

  if (!info || (!info.title && !info.pic)) return fail('获取B站视频信息失败');

  if (info.cid && info.aid) {
    // 浼樺厛: 闈?DASH 格式 (fnval=0, 返回 MP4/FLV 鐩撮摼)
    var qualities = [80, 64, 48, 32, 16];
    for (var qi = 0; qi < qualities.length; qi++) {
      try {
        var pr = await fetch('https://api.bilibili.com/x/player/playurl?avid=' + info.aid + '&cid=' + info.cid + '&qn=' + qualities[qi] + '&fnval=0&fourk=1&platform=web', {
          headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
        });
        var pt = await pr.text();
        if (pt.trim().startsWith('{')) {
          var pj = JSON.parse(pt);
          if (pj.code === 0 && pj.data && pj.data.durl && pj.data.durl.length) {
            var url = pj.data.durl[0].url;
            if (url) { videoUrl = url; break; }
          }
        }
      } catch(e) { /* skip */ }
    }
    // 鍏滃簳: DASH 格式 (fnval=16, 返回 .m4s 鍒嗘)
    if (!videoUrl) {
      try {
        var pr = await fetch('https://api.bilibili.com/x/player/playurl?avid=' + info.aid + '&cid=' + info.cid + '&qn=80&fnval=16&fourk=1&platform=web', {
          headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json' },
        });
        var pt = await pr.text();
        if (pt.trim().startsWith('{')) {
          var pj = JSON.parse(pt);
          if (pj.code === 0) {
            var d = pj.data;
            if (d.dash && d.dash.video && d.dash.video.length) videoUrl = d.dash.video[0].baseUrl || d.dash.video[0].base_url || '';
            else if (d.durl && d.durl.length) videoUrl = d.durl[0].url;
          }
        }
      } catch(e) {}
    }
  }
return ok('bilibili', {
    type: 'video', title: info.title || '', desc: info.desc || '',
    author: { name: (info.owner && info.owner.name) || '', id: (info.owner && info.owner.mid && String(info.owner.mid)) || '', avatar: (info.owner && info.owner.face) || '' },
    cover: info.pic || '', url: videoUrl || '', images: [],
  });
}

// ===== 韫囶偅澧?=====
async function parseKuaishou(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.kuaishou.com/' });
  var videoUrl = '', title = '', cover = '', authorName = '', authorId = '', authorAvatar = '';

  // 视频地址: 澶氱姝ｅ垯鍖归厤
  var patterns = [/"srcUrl"\s*:\s*"([^"]+)"/, /"playUrl"\s*:\s*"([^"]+)"/, /"url"\s*:\s*"([^"]*\.(?:mp4|m3u8)[^"]*)"/, /video-url=\"([^\"]+)\"/, /data-url=\"([^"']+)\"/];
  for (var i = 0; i < patterns.length; i++) {
    var m = html.match(patterns[i]);
    if (m) { videoUrl = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); break; }
  }

  // OG 鏍囩
  var ogT = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
  if (ogT) title = ogT[1];
  var ogI = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
  if (ogI) cover = ogI[1];
  var ogV = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
  if (ogV && !videoUrl) videoUrl = ogV[1];

  // 灏侀潰: 澶氱 fallback
  if (!cover) { var c2 = html.match(/"coverUrl"\s*:\s*"([^"]+)"/); if (c2) cover = c2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c3 = html.match(/"poster"\s*:\s*"([^"]+)"/); if (c3) cover = c3[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c4 = html.match(/"cover"\s*:\s*"([^"]+)"/); if (c4) cover = c4[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c5 = html.match(/"thumbnail"\s*:\s*"([^"]+)"/); if (c5) cover = c5[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var upic = html.match(/https?:\/\/[^"']*yximgs\.com\/upic\/[^"']+\.jpg[^"']*/i); if (upic) cover = upic[0].replace(/&amp;/g, '&'); }

  // 浣滆€呮樀绉?  if (!authorName) {
    var aMatch = html.match(/"name"\s*:\s*"([^"]+)"\s*,\s*"avatar"/);
    if (!aMatch) aMatch = html.match(/"user_name"\s*:\s*"([^"]+)"/);
    if (!aMatch) aMatch = html.match(/"nickname"\s*:\s*"([^"]+)"/);
    if (!aMatch) aMatch = html.match(/"caption"\s*:\s*"([^"]+)"/);
    if (aMatch) authorName = aMatch[1];
  }

  // 浣滆€呭ご鍍?  if (!authorAvatar) {
    var avMatch = html.match(/"avatar"\s*:\s*"([^"]+)"/);
    if (avMatch) authorAvatar = avMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (!authorAvatar) { var av2 = html.match(/"headUrl"\s*:\s*"([^"]+)"/); if (av2) authorAvatar = av2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (authorAvatar && authorAvatar.indexOf('http://') === 0) authorAvatar = 'https://' + authorAvatar.substring(7);
  }

// 浣滆€?ID: 浼樺厛浠?window.__INITIAL_STATE__ 绛?JSON 涓彇 "userId" 鍊硷紙淇濊瘉鏄綔鑰呯殑锛?
var jsonBlocks = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[^}]+\})/);
  if (!jsonBlocks) jsonBlocks = html.match(/window\.__NEXT_DATA__\s*=\s*(\{[^}]+\})/);
  if (jsonBlocks) {
    try {
      var jsonState = JSON.parse(jsonBlocks[1].replace(/undefined/g, 'null'));
      // 灏濊瘯鎻愬彇浣滆€匢D
      if (jsonState.user && jsonState.user.id) authorId = String(jsonState.user.id);
      if (!authorId && jsonState.profile && jsonState.profile.id) authorId = String(jsonState.profile.id);
      if (!authorId && jsonState.visionProfile && jsonState.visionProfile.userId) authorId = jsonState.visionProfile.userId;
    } catch(e) {}
  }
  if (!authorId) {
    // 浠?HTML 鎻愬彇: 鎵句富视频数据鍖哄煙鐨?userId
    var idMatch = html.match(/"photoId"[^}]{0,300}"userId"\s*:\s*"([^"]+)"/);
    if (!idMatch) idMatch = html.match(/window\.__INITIAL_STATE__[\s\S]{0,500}"userId"\s*:\s*"(\d+)"/);
    if (!idMatch) idMatch = html.match(/"userId"\s*:\s*"(\d+)"/);
    if (!idMatch) idMatch = html.match(/"eid"\s*:\s*"([^"]+)"/);
    if (!idMatch) idMatch = html.match(/"user_id"\s*:\s*"([^"]+)"/);
    if (idMatch) authorId = idMatch[1];
  }

  if (!videoUrl && !cover) return fail('未提取到快手视频地址');

  return ok('kuaishou', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}
async function parseXiaohongshu(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.xiaohongshu.com/' });
  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '', images = [];

  var posterMatch = html.match(/id=["']video_note_poster["'][^>]*src=["']([^"']+)["']/);
  if (posterMatch) cover = posterMatch[1];
  if (!cover) { var ogI = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/); if (ogI) cover = ogI[1]; }

  var h1Match = html.match(/note-card-title[^>]*><!--\[-->([^<]+)/);
  if (h1Match) title = h1Match[1].trim();
  var nameMatch = html.match(/note-card-name[^>]*><!--\[-->([^<]+)/);
  if (nameMatch) authorName = nameMatch[1].trim();
  var avaMatch = html.match(/<img[^>]*alt=["']婢舵潙鍎歔"'][^>]*src=["']([^"']+)["']/);
  if (avaMatch) authorAvatar = avaMatch[1];

  var userIdMatch = html.match(/"userId"\s*:\s*"([^"]+)"/);
  if (userIdMatch) authorId = userIdMatch[1];

  // __INITIAL_STATE__ 鐟欙絾鐎?
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
          var noteDetail = state.note && state.note.noteDetailMap;
          if (noteDetail) {
            var keys = Object.keys(noteDetail);
            if (keys.length) {
              var note = noteDetail[keys[0]] && noteDetail[keys[0]].note;
              if (note) {
                if (!title) title = note.title || note.desc || '';
                if (!authorName) authorName = (note.user && note.user.nickname) || '';
                if (!authorAvatar) authorAvatar = (note.user && note.user.avatar) || '';
                if (!cover && note.cover) cover = note.cover.urlDefault || note.cover.url || '';
                if (!authorId && note.user) authorId = note.user.userId || '';
                if (note.video && note.video.media && note.video.media.stream) {
                  var candidates = note.video.media.stream.h264 || note.video.media.stream.h265 || [];
                  if (candidates.length) videoUrl = candidates[0].masterUrl || (candidates[0].backupUrls && candidates[0].backupUrls[0]) || '';
                }
                if (note.imageList && note.imageList.length) {
                  note.imageList.forEach(function(img) { images.push(img.urlDefault || img.url || ''); });
                }
              }
            }
          }
        } catch(e) {}
      }
    }
  }

  // edith API
  if (!videoUrl && !images.length) {
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
              var note = apiJson.data.items[0].note_card;
              if (note) {
                if (!title) title = note.title || '';
                if (!authorName) authorName = (note.user && note.user.nickname) || '';
                if (!cover) cover = note.cover && (note.cover.url_default || note.cover.url) || '';
                if (!videoUrl && note.video && note.video.media && note.video.media.stream) {
                  var c = note.video.media.stream.h264 || note.video.media.stream.h265 || [];
                  if (c.length) videoUrl = c[0].masterUrl || (c[0].backupUrls && c[0].backupUrls[0]) || '';
                }
                if (!images.length && note.image_list && note.image_list.length) {
                  note.image_list.forEach(function(img) { images.push(img.url_default || img.url || ''); });
                }
              }
            }
          }
        } catch(e) {}
      }
    }
  }

  // masterUrl 濮濓絽鍨崗婊冪俺
  if (!videoUrl && !images.length) {
    var muMatch = html.match(/"masterUrl"\s*:\s*"([^"]+)"/);
    if (muMatch) {
      videoUrl = muMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (videoUrl.indexOf('http://') === 0) videoUrl = 'https://' + videoUrl.substring(7);
    }
    if (!videoUrl) {
      var buMatch = html.match(/"backupUrls"\s*:\s*\["([^"]+)"/);
      if (buMatch) {
        videoUrl = buMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
        if (videoUrl.indexOf('http://') === 0) videoUrl = 'https://' + videoUrl.substring(7);
      }
    }
  }

  if (!videoUrl && !images.length && !cover) return fail('未提取到小红书内容');

  return ok('xiaohongshu', {
    type: images.length ? 'image' : 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: images,
  });
}



// ===== TikTok =====
async function parseTiktok(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.tiktok.com/' });

  var videoUrl = "", cover = "", title = "", authorName = "", authorId = "", authorAvatar = "";

  // 閺傝纭?: 閻?oEmbed API 閼惧嘲褰囨担婊嗏偓鍛繆閹垽绱欓張鈧崣顖炴浆閿涘矁绻戦崶鐐垫畱閺勵垰甯担婊嗏偓鍜冪礆
  try {
    var oembedResp = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(realUrl || originalUrl));
    if (oembedResp.ok) {
      var oembed = await oembedResp.json();
      title = oembed.title || "";
      authorName = oembed.author_name || "";
      if (oembed.author_url) {
        var auM = oembed.author_url.match(/@([^/?#]+)/);
        if (auM) authorId = auM[1];
      }
      cover = oembed.thumbnail_url || "";
    }
  } catch(e) {}

  // 閺傝纭?: 娴犲酣銆夐棃顫厬閸欐牞顫嬫０鎴濇勾閸р偓
  var paMatch = html.match(/"playAddr":"([^"]+)"/);
  if (paMatch) videoUrl = paMatch[1].replace(/\\u002F/g, '/');

  // 鐏忎線娼?閺嶅洭顣介崗婊冪俺
  if (!cover) {
    var covMatch = html.match(/"cover":"([^"]+)"/);
    if (covMatch) cover = covMatch[1].replace(/\\u002F/g, '/');
  }
  if (!title) {
    var descMatch = html.match(/"desc":"([^"]+)"/);
    if (descMatch) title = descMatch[1];
  }

  // 婢舵潙鍎氶敍姘辨暏 uniqueId 閸樿缍旈懓鍛瘜妞ゅ灚瀣侀敍鍫濆斧娴ｆ粏鈧懐娈戦敍灞肩瑝閺勵垰鍨庢禍顐モ偓鍛畱閿?  if (!authorAvatar && authorId) {
    try {
      var profileResp = await fetch('https://www.tiktok.com/@' + encodeURIComponent(authorId), {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      });
      if (profileResp.ok) {
        var profileHtml = await profileResp.text();
        var avData = profileHtml.match(/data-avatarUrl="([^"]+)"/);
        if (avData) authorAvatar = decodeURIComponent(avData[1]);
      }
    } catch(e) {}
  }

  // 娴ｆ粏鈧懍淇婇幁顖氬幑鎼存洩绱欐禒?HTML 閹绘劕褰囬敍?  if (!authorId) {
    var allNick = html.match(/"nickname":"([^"]+)"/g);
    var allUid = html.match(/"uniqueId":"([^"]+)"/g);
    var allAvatar = html.match(/"avatarLarger":"([^"]+)"/g);
    authorName = allNick && allNick.length > 0 ? allNick[allNick.length - 1].match(/"nickname":"([^"]+)"/)[1] : '';
    authorId = allUid && allUid.length > 0 ? allUid[allUid.length - 1].match(/"uniqueId":"([^"]+)"/)[1] : '';
    authorAvatar = allAvatar && allAvatar.length > 0 ? allAvatar[allAvatar.length - 1].match(/"avatarLarger":"([^"]+)"/)[1].replace(/\\u002F/g, '/') : '';
  }

  if (!videoUrl) return fail("未提取到TikTok视频地址");

  return ok("tiktok", {
    type: "video", title: title || "", desc: title || "",
    author: { name: authorName || "", id: authorId || "", avatar: authorAvatar || "" },
    cover: cover || "", url: videoUrl || "", images: [],
  });
}
// ===== 鐟楄法鎽愮憴鍡涱暥 =====
async function parseXigua(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.ixigua.com/' });

  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '';

// og:title / og:image閿涘牊鏁為幇蹇氥偪閻℃粏顫嬫０鎴犳暏 name= 閼板奔绗夐弰?property=閿?
var tMatch = html.match(/<meta[^>]*name="og:title"[^>]*content="([^"]+)"/);
  if (tMatch) title = tMatch[1].replace(/\|\s*鐟楄法鎽愮憴鍡涱暥$/, '').trim();
  var iMatch = html.match(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/);
  if (iMatch) cover = iMatch[1];

// media_user 娴ｆ粏鈧懍淇婇幁?
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

  // 閸忔粌绨抽敍姘辨暏 alapi 閹恒儱褰涢懢宄板絿鐟欏棝顣堕崷鏉挎絻閿涘牆顩ч弸婊堛€夐棃銏″瑏娑撳秴鍩岄敍?  if (!videoUrl) {
    try {
      var apiUrl = 'https://v3.alapi.cn/api/video/url?token=earvoy1f8sopbwnqftgdzszla3swvm&url=' + encodeURIComponent(realUrl || originalUrl);
      var apiResp = await fetch(apiUrl, { headers: { 'User-Agent': UA } });
      if (apiResp.ok) {
        var apiJson = await apiResp.json();
        if (apiJson.success && apiJson.data && apiJson.data.video_url) {
          videoUrl = apiJson.data.video_url;
          if (!title) title = apiJson.data.title || '';
          if (!cover) cover = apiJson.data.cover_url || '';
        }
      }
    } catch(e) { /* alapi 閹恒儱褰涚拫鍐暏婢惰精瑙﹂敍灞芥嫹閻?*/ }
  }

  if (!title && !cover) return fail('未提取到西瓜视频信息');

  return ok('ixigua', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}


// ===== A缁?=====
async function parseAcfun(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.acfun.cn/' });

  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '';

  // 鎻愬彇 ac id
  var acMatch = realUrl.match(/[?&]ac=(\d+)/);
  if (!acMatch) return fail('未识别到AC号');

  var viKeys = ['window.videoInfo =', 'let videoInfo =', 'const videoInfo =', 'window.__INITIAL_STATE__ ='];
  for (var vi = 0; vi < viKeys.length; vi++) {
    var viStart = html.indexOf(viKeys[vi]);
    if (viStart < 0) continue;
    viStart += viKeys[vi].length;
    while (viStart < html.length && html[viStart] === ' ') viStart++;
    if (html[viStart] !== '{') continue;
    var depth = 0, inStr = false, escape = false, ve = viStart;
    for (; ve < html.length; ve++) {
      var ch = html[ve];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"' && !escape) { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') { if (depth === 1) { ve++; break; } depth--; }
    }
    try {
      var parsed = JSON.parse(html.substring(viStart, ve).replace(/undefined/g, 'null'));
      if (!title) title = parsed.title || parsed.videoTitle || '';
      if (!cover) cover = parsed.cover || parsed.videoCover || parsed.image || '';
      if (!authorName) authorName = parsed.username || (parsed.user && parsed.user.name) || '';
      if (!authorId) authorId = parsed.userId || (parsed.user && (parsed.user.id || parsed.user.userId)) || '';
      if (!authorAvatar) authorAvatar = parsed.userAvatar || (parsed.user && parsed.user.avatar) || '';
    } catch(e) {}
    if (title) break;
  }

  // 2. 解析 playInfo锛堣棰戝湴鍧€锛?
  var piKeys = ['var playInfo =', 'let playInfo =', 'const playInfo =', 'window.playInfo ='];
  for (var pi = 0; pi < piKeys.length; pi++) {
    var piStart = html.indexOf(piKeys[pi]);
    if (piStart < 0) continue;
    piStart += piKeys[pi].length;
    while (piStart < html.length && html[piStart] === ' ') piStart++;
    if (html[piStart] !== '{') continue;
    var dep = 0, ins = false, esc = false, pend = piStart;
    for (; pend < html.length; pend++) {
      var c = html[pend];
      if (esc) { esc = false; continue; }
      if (c === '\\' && ins) { esc = true; continue; }
      if (c === '"' && !esc) { ins = !ins; continue; }
      if (ins) continue;
      if (c === '{') dep++;
      if (c === '}') { if (dep === 1) { pend++; break; } dep--; }
    }
    try {
      var pi = JSON.parse(html.substring(piStart, pend).replace(/undefined/g, 'null'));
      if (pi.streams && pi.streams.length) {
        for (var si = pi.streams.length - 1; si >= 0; si--) {
          var stream = pi.streams[si];
          if (stream.playUrls && stream.playUrls.length) {
            for (var ui = 0; ui < stream.playUrls.length; ui++) {
              var u = stream.playUrls[ui];
              if (u && (u.indexOf('http') >= 0 || u.indexOf('//') >= 0)) { videoUrl = u; break; }
            }
            if (videoUrl) break;
          }
          if (!videoUrl && stream.subStreams && stream.subStreams.length) {
            for (var si2 = 0; si2 < stream.subStreams.length; si2++) {
              var sub = stream.subStreams[si2];
              if (sub.url && (sub.url.indexOf('http') >= 0 || sub.url.indexOf('//') >= 0)) { videoUrl = sub.url; if (videoUrl.indexOf('//') === 0) videoUrl = 'https:' + videoUrl; break; }
            }
          }
        }
      }
    } catch(e) {}
    if (videoUrl) break;
  }

  // 3. HTML 姝ｅ垯鍏滃簳
  if (!videoUrl) {
    var urlMatch = html.match(/https?:\/\/[^"' ]+\.(?:mp4|m3u8|flv)[^"' ]*/);
    if (urlMatch) videoUrl = urlMatch[0];
  }

  // 4. OG / title 鍏滃簳
  if (!title) { var ogT = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/); if (ogT) title = ogT[1]; }
  if (!cover) { var ogI = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/); if (ogI) cover = ogI[1]; }
  if (!title) { var tTag = html.match(/<title>([^<]+)<\/title>/); if (tTag) title = tTag[1].replace(/\s*_?\s*AcFun\s*$/i, '').trim(); }

  // 5. 浣滆€呬俊鎭厹搴?  if (!authorName) { var nm = html.match(/<span\s+class="up-name">([^<]+)<\/span>/); if (nm) authorName = nm[1].trim(); }
  if (!authorName) { var nm2 = html.match(/"username"\s*:\s*"([^"]+)"/); if (nm2) authorName = nm2[1]; }
  if (!authorAvatar) { var av = html.match(/<span class="up-avatar"><img src="([^"]+)"/); if (av) authorAvatar = av[1]; }
  if (!authorAvatar) { var av2 = html.match(/"userAvatar"\s*:\s*"([^"]+)"/); if (av2) authorAvatar = av2[1]; }
  if (!authorId) { var uid = html.match(/\/upPage\/(\d+)/); if (uid) authorId = uid[1]; }
  if (!authorId) { var uid2 = html.match(/"userId"\s*:\s*"(\d+)"/); if (uid2) authorId = uid2[1]; }

  if (!title && !cover) return fail('未提取到A站视频信息');

  return ok('acfun', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}
async function parseWeibo(originalUrl) {
  // 娴犲骸鎮囩粔宥夋懠閹恒儲鐗稿蹇涘櫡閹绘劕褰?mid
  var mid = null;

  // 閺嶇厧绱?: m.weibo.cn/detail/xxx 閹?/status/xxx
  var m1 = originalUrl.match(/\/(?:detail|status)\/(\d{10,})/);
  if (m1) mid = m1[1];

  // 閺嶇厧绱?: weibo.com/閺佹澘鐡?mid
  if (!mid) {
    var m2 = originalUrl.match(/weibo\.com\/\d+\/(\w+)$/);
    if (m2) mid = m2[1];
  }

  // 閺嶇厧绱?: 娴?t.cn 閹存湌TML娑擃厽褰侀崣?  if (!mid) {
    try {
// 閸忓牆鐨剧拠鏇＄儲鏉?    
var realUrl = await resolveRedirect(originalUrl);
      var m3 = realUrl.match(/\/(?:detail|status)\/(\d{10,})/);
      if (m3) mid = m3[1];
      // 娴犲订TML娑擃厽宕琺id
      if (!mid) {
        var html = await fetchHtml(originalUrl, { Referer: 'https://weibo.com/', 'User-Agent': UA });
        var m4 = html.match(/["']mid["']\s*:\s*["']?(\d{10,})["']?/);
        if (m4) mid = m4[1];
        var m5 = html.match(/\/(?:detail|status)\/(\d{10,})/);
        if (!mid && m5) mid = m5[1];
      }
    } catch(e) {}
  }

  if (!mid) return fail('无法从微博链接中提取视频ID，t.cn短链可能已被拦截');

  // 鐠嬪啰些閸斻劎顏?statuses 閹恒儱褰?  try {
    var apiRes = await fetch('https://m.weibo.cn/statuses/show?id=' + mid, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.weibo.cn/',
        'Accept': 'application/json, text/plain, */*',
        'MWeibo-Pwa': '1',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (apiRes.ok) {
      var json = await apiRes.json();
      var mblog = json.data || json;
      if (mblog) {
        var title = mblog.text ? mblog.text.replace(/<[^>]+>/g, '').trim() : '';
        var authorName = (mblog.user && mblog.user.screen_name) || '';
        var authorAvatar = (mblog.user && mblog.user.profile_image_url) || '';
        var authorId = (mblog.user && String(mblog.user.id)) || '';
        var videoUrl = '', cover = '';

        var pageInfo = mblog.page_info;
        if (pageInfo && pageInfo.media_info) {
          videoUrl = pageInfo.media_info.stream_url_hd || pageInfo.media_info.stream_url || pageInfo.media_info.mp4_720p_mp4 || pageInfo.media_info.mp4_hd_url || pageInfo.media_info.mp4_sd_url || '';
          cover = (pageInfo.page_pic && pageInfo.page_pic.url) || pageInfo.page_pic || '';
          if (!title && pageInfo.page_title) title = pageInfo.page_title;
        }

        if (videoUrl || title) {
          return ok('weibo', {
            type: 'video', title: title || '', desc: title || '',
            author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
            cover: cover || '', url: videoUrl || '', images: [],
          });
        }
      }
    }
  } catch(e) {}

  return fail('未能提取到微博视频数据');
}


// ===== 瀵邦喕淇婄憴鍡涱暥閸欏嚖绱檝ia BUGPK 娑擃叀娴嗛敍?=====
async function parseWeixin(originalUrl) {
  var apiUrl = 'https://api.bugpk.com/api/?url=' + encodeURIComponent(originalUrl);
  try {
    var res = await fetch(apiUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (res.ok) {
      var json = await res.json();
      if (json.code === 200 && json.data) {
        var d = json.data;
        return ok('weixin', {
          type: 'video', title: d.title || d.desc || '', desc: d.desc || d.title || '',
          author: { name: (d.author && d.author.name) || '', id: (d.author && d.author.id) || '', avatar: (d.author && d.author.avatar) || '' },
          cover: d.cover || '', url: d.url || '', images: [],
        });
      }
      return fail('BUGPK 解析失败: ' + (json.msg || '未知错误'));
    }
    return fail('BUGPK 接口返回 HTTP ' + res.status);
  } catch(e) {
    return fail('请求 BUGPK 接口失败: ' + e.message);
  }
}


// ===== 娑撹鍙嗛崣?=====
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json(fail('缺少 url 参数', 400));

  try {
    var platform = detectPlatform(targetUrl);
    var result;
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
      default: return res.status(400).json(fail('暂不支持该平台链接', 400));
    }
    res.json(result);
  } catch (e) {
    res.status(500).json(fail('解析失败: ' + (e && e.message ? e.message : String(e))));
  }
};

