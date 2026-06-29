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
  var videoUrl = '', title = '', cover = '', authorName = '', authorId = '', authorAvatar = '';

  // 快手真实用户 ID 始终是纯数字，用于过滤掉抓错的分享码/photoId 等无关字段
  var isValidUid = function (v) { return !!v && /^\d+$/.test(String(v)); };
  // 抓到的"作者名"如果是这些通用占位词，说明命中的是无关卡片，而不是真实作者
  var BAD_NAMES = ['小哥哥', '小姐姐', '快手用户', '神秘人', '热门用户'];
  var isValidName = function (v) { return !!v && BAD_NAMES.indexOf(v) === -1; };

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
  var ogVU = html.match(/<meta[^>]*property="og:video:url"[^>]*content="([^"]+)"/);
  if (ogVU && !videoUrl) videoUrl = ogVU[1];

  if (!cover) { var c2 = html.match(/"coverUrl"\s*:\s*"([^"]+)"/); if (c2) cover = c2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c3 = html.match(/"poster"\s*:\s*"([^"]+)"/); if (c3) cover = c3[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c4 = html.match(/"cover"\s*:\s*"([^"]+)"/); if (c4) cover = c4[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c5 = html.match(/"thumbnail"\s*:\s*"([^"]+)"/); if (c5) cover = c5[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var c6 = html.match(/"thumb"\s*:\s*"([^"]+)"/); if (c6) cover = c6[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
  if (!cover) { var upic = html.match(/https?:\/\/[^"']*yximgs\.com\/upic\/[^"']+\.jpg[^"']*/i); if (upic) cover = upic[0].replace(/&amp;/g, '&'); }

  // 优先：页面内嵌 __NEXT_DATA__ JSON，按结构化路径取真实作者对象（最可靠，命中即直接信任）
  var jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonMatch) {
    try {
      var nd = JSON.parse(jsonMatch[1].replace(/undefined/g, 'null'));
      var userInfo = null;
      if (nd.props && nd.props.pageProps) {
        var contentInfo = nd.props.pageProps.photoInfo || nd.props.pageProps.videoInfo || nd.props.pageProps.pageData;
        if (contentInfo && contentInfo.user) userInfo = contentInfo.user;
      }
      if (userInfo) {
        var jName = userInfo.name || userInfo.nickname || '';
        var jId = userInfo.id || userInfo.eid || userInfo.userId || '';
        if (isValidUid(jId) && isValidName(jName)) {
          authorName = jName;
          authorId = String(jId);
          authorAvatar = userInfo.avatar || userInfo.headUrl || userInfo.headerUrl || '';
        }
      }
    } catch (e) {}
  }

  // 兜底：松散正则扫描页面，但 ID 必须是纯数字、名字不能是占位词，否则丢弃，避免抓错
  if (!authorId) {
    var idMatch = html.match(/"eid"\s*:\s*"(\d+)"/) || html.match(/"userId"\s*:\s*"?(\d+)"?/) || html.match(/"user_id"\s*:\s*"?(\d+)"?/) || html.match(/"kwaiId"\s*:\s*"?(\d+)"?/);
    if (idMatch && isValidUid(idMatch[1])) authorId = idMatch[1];
  }
  if (!authorName && authorId) {
    // 只在已经拿到合法数字 ID 的前提下，去找与之配对的名字字段，降低误命中无关卡片的概率
    var aMatch = html.match(/"user_name"\s*:\s*"([^"]+)"/);
    if (!aMatch) aMatch = html.match(/"name"\s*:\s*"([^"]+)"\s*,\s*"avatar"/);
    if (aMatch && isValidName(aMatch[1])) authorName = aMatch[1];
    if (!authorName) {
      var ogA = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/);
      if (ogA && isValidName(ogA[1])) authorName = ogA[1];
    }
    // 有数字 ID 但名字仍为空时，在 __NEXT_DATA__ 深层搜索匹配该 ID 的用户
    if (!authorName && jsonMatch) {
      try {
        var nd2 = JSON.parse(jsonMatch[1].replace(/undefined/g, 'null'));
        function findUserById(obj, depth) {
          if (depth > 10 || typeof obj !== 'object' || !obj) return null;
          if (obj.name && obj.id === parseInt(authorId)) return obj;
          if (obj.name && obj.userId === parseInt(authorId)) return obj;
          for (var k in obj) {
            var r = findUserById(obj[k], depth + 1);
            if (r) return r;
          }
          return null;
        }
        var matchUser = findUserById(nd2, 0);
        if (matchUser) {
          authorName = matchUser.name || matchUser.nickname || '';
          if (!authorAvatar) authorAvatar = matchUser.avatar || matchUser.headUrl || matchUser.headerUrl || '';
        }
      } catch(e) {}
    }
    // 如果名字还是空的，用 userId 数字值在 HTML 中找附近的名字
    if (!authorName) {
      var uidStr = '"' + authorId + '"';
      var uidPos = html.indexOf('"userId":' + uidStr);
      if (uidPos < 0) uidPos = html.indexOf('"id":' + uidStr);
      if (uidPos >= 0) {
        var before = html.substring(Math.max(0, uidPos - 800), uidPos);
        var nMatch = before.match(/"name"\s*:\s*"([^"]+)"/);
        if (nMatch && isValidName(nMatch[1])) authorName = nMatch[1];
      }
    }
  }
  if (!authorAvatar && authorId) {
    var avMatch = html.match(/"avatar"\s*:\s*"([^"]+)"/);
    if (avMatch) authorAvatar = avMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (!authorAvatar) { var av2 = html.match(/"headUrl"\s*:\s*"([^"]+)"/); if (av2) authorAvatar = av2[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (!authorAvatar) { var av3 = html.match(/"userAvatar"\s*:\s*"([^"]+)"/); if (av3) authorAvatar = av3[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/'); }
    if (authorAvatar && authorAvatar.indexOf('http://') === 0) authorAvatar = 'https://' + authorAvatar.substring(7);
  }
  // 若始终没能拿到合法（纯数字）ID，宁可作者信息留空，也不展示抓错的数据
  if (!isValidUid(authorId)) { authorId = ''; authorName = ''; authorAvatar = ''; }

  // 从 HTML 中找标题（如果 og:title 没拿到）
  if (!title) {
    var tMatch = html.match(/"caption"\s*:\s*"([^"]+)"/);
    if (!tMatch) tMatch = html.match(/"title"\s*:\s*"([^"]+)"\s*,\s*"coverUrl"/);
    if (tMatch) title = tMatch[1];
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
                  if (candidates.length) { var best = candidates[candidates.length - 1]; videoUrl = best.masterUrl || best.url || (best.backupUrls && best.backupUrls[0]) || ''; }
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
                  if (c.length) { var best = c[c.length - 1]; videoUrl = best.masterUrl || best.url || (best.backupUrls && best.backupUrls[0]) || ''; }
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

    // 从原始HTML中搜索 xhscdn stream 直链（优先 sns-video-zl 无 watermark 节点）
  if (!videoUrl && !images.length) {
    // 先搜 sns-video-zl（无 watermark）
    var zlMatch = html.match(/https?:\/\/[^"'\s]*sns-video-zl\.xhscdn\.com\/stream\/[^"'\s]+\.mp4[^"'\s]*/i);
    // 再搜其他 xhscdn 节点
    var anyStream = zlMatch || html.match(/https?:\/\/[^"'\s]*xhscdn\.com\/stream\/[^"'\s]+\.mp4[^"'\s]*/i);
    if (anyStream) {
      videoUrl = anyStream[0].replace(/&amp;/g, '&').replace(/\\u002F/g, '/');
      if (videoUrl.indexOf('http://') === 0) videoUrl = 'https://' + videoUrl.substring(7);
    }
    if (!videoUrl) {
      var allUrls = html.match(/https?:\/\/[^"']*xhscdn\.com\/stream\/[^"'\s]+/g);
      if (allUrls && allUrls.length) {
        // 优先选 sns-video-zl
        var best = '';
        for (var si = 0; si < allUrls.length; si++) {
          var su = allUrls[si].replace(/\\u002F/g, '/');
          if (su.indexOf('http://') === 0) su = 'https://' + su.substring(7);
          if (su.match(/\.mp4/i)) {
            if (su.indexOf('sns-video-zl') > 0) { videoUrl = su; break; }
            if (!best) best = su;
          }
        }
        if (!videoUrl) videoUrl = best;
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


  if (!title && !cover && !videoUrl) return fail('未提取到西瓜视频信息');
if (!title && !cover && !videoUrl) return fail('未提取到西瓜视频信息');

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


addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
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
    // === TikTok /proxy 代理下载 ===
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








