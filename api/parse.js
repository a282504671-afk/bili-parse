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

  // 方式1: 页面 HTML
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

  // 方式2: API
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
    try {
      var pr = await fetch('https://api.bilibili.com/x/player/playurl?avid=' + info.aid + '&cid=' + info.cid + '&qn=80&fnval=16&fourk=1', {
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
  var videoUrl = '', title = '', cover = '', authorName = '', authorId = '', authorAvatar = '';

  var patterns = [/"srcUrl"\s*:\s*"([^"]+)"/, /"playUrl"\s*:\s*"([^"]+)"/, /"url"\s*:\s*"([^"]*\.(?:mp4|m3u8)[^"]*)"/, /video-url=\"([^\"]+)\"/, /data-url=\"([^"']+)\"/];
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

  if (!cover) { var c2 = html.match(/"coverUrl"\s*:\s*"([^"]+)"/); if (c2) cover = c2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c3 = html.match(/"poster"\s*:\s*"([^"]+)"/); if (c3) cover = c3[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c4 = html.match(/"cover"\s*:\s*"([^"]+)"/); if (c4) cover = c4[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c5 = html.match(/"thumbnail"\s*:\s*"([^"]+)"/); if (c5) cover = c5[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var upic = html.match(/https?:\/\/[^"']*yximgs\.com\/upic\/[^"']+\.jpg[^"']*/i); if (upic) cover = upic[0].replace(/&amp;/g, '&'); }

  if (!authorName) {
    var aMatch = html.match(/"name"\s*:\s*"([^"]+)"\s*,\s*"avatar"/);
    if (!aMatch) aMatch = html.match(/"user_name"\s*:\s*"([^"]+)"/);
    if (!aMatch) aMatch = html.match(/"nickname"\s*:\s*"([^"]+)"/);
    if (aMatch) authorName = aMatch[1];
  }
  if (!authorAvatar) {
    var avMatch = html.match(/"avatar"\s*:\s*"([^"]+)"/);
    if (avMatch) authorAvatar = avMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (!authorAvatar) { var av2 = html.match(/"headUrl"\s*:\s*"([^"]+)"/); if (av2) authorAvatar = av2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (authorAvatar && authorAvatar.indexOf('http://') === 0) authorAvatar = 'https://' + authorAvatar.substring(7);
  }
  if (!authorId) {
    var idMatch = html.match(/"eid"\s*:\s*"([^"]+)"/) || html.match(/"userId"\s*:\s*"([^"]+)"/) || html.match(/"user_id"\s*:\s*"([^"]+)"/);
    if (idMatch) authorId = idMatch[1];
  }

  if (!videoUrl && !cover) return fail('未提取到快手视频地址');

  return ok('kuaishou', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}

// ===== 小红书 =====
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
  var avaMatch = html.match(/<img[^>]*alt=["']头像["'][^>]*src=["']([^"']+)["']/);
  if (avaMatch) authorAvatar = avaMatch[1];

  var userIdMatch = html.match(/"userId"\s*:\s*"([^"]+)"/);
  if (userIdMatch) authorId = userIdMatch[1];

  // __INITIAL_STATE__ 解析
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

  // masterUrl 正则兜底
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

  // 优先从 author 对象块提取（这是视频原作者，不是分享者）
  var authObj = html.match(/"author":\s*\{[^}]*"uniqueId"[^}]*\}/);
  var authorName = '', authorId = '', authorAvatar = '';
  if (authObj) {
    var aNick = authObj[0].match(/"nickname":"([^"]+)"/);
    if (aNick) authorName = aNick[1];
    var aUid = authObj[0].match(/"uniqueId":"([^"]+)"/);
    if (aUid) authorId = aUid[1];
    var aAv = authObj[0].match(/"avatarLarger":"([^"]+)"/);
    if (aAv) authorAvatar = aAv[1].replace(/\\u002F/g, '/');
  }
  // 兜底：取页面中最后一个值（分享者信息，但总比没有好）
  if (!authorId) {
    var allNick = html.match(/"nickname":"([^"]+)"/g);
    var allUid = html.match(/"uniqueId":"([^"]+)"/g);
    var allAvatar = html.match(/"avatarLarger":"([^"]+)"/g);
    authorName = allNick && allNick.length > 0 ? allNick[allNick.length - 1].match(/"nickname":"([^"]+)"/)[1] : '';
    authorId = allUid && allUid.length > 0 ? allUid[allUid.length - 1].match(/"uniqueId":"([^"]+)"/)[1] : '';
    authorAvatar = allAvatar && allAvatar.length > 0 ? allAvatar[allAvatar.length - 1].match(/"avatarLarger":"([^"]+)"/)[1].replace(/\\u002F/g, '/') : '';
  }

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

  // og:title / og:image（注意西瓜视频用 name= 而不是 property=）
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

  // 检查是否有视频地址（加密的，大概率拿不到）
  if (!title && !cover) return fail('未提取到西瓜视频信息');

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

  // 从 HTML 中提取作者信息
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
  // 从各种链接格式里提取 mid
  var mid = null;

  // 格式1: m.weibo.cn/detail/xxx 或 /status/xxx
  var m1 = originalUrl.match(/\/(?:detail|status)\/(\d{10,})/);
  if (m1) mid = m1[1];

  // 格式2: weibo.com/数字/mid
  if (!mid) {
    var m2 = originalUrl.match(/weibo\.com\/\d+\/(\w+)$/);
    if (m2) mid = m2[1];
  }

  // 格式3: 从 t.cn 或HTML中提取
  if (!mid) {
    try {
      // 先尝试跳转
      var realUrl = await resolveRedirect(originalUrl);
      var m3 = realUrl.match(/\/(?:detail|status)\/(\d{10,})/);
      if (m3) mid = m3[1];
      // 从HTML中捞mid
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

  // 调移动端 statuses 接口
  try {
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


// ===== 微信视频号（via BUGPK 中转） =====
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


// ===== 主入口 =====
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
