const UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.003.A1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5060 MMWEBSDK/20221206 MMWEBID/8060 MicroMessenger/8.0.32.2380(0x28002034) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

// 平台中文名称映射
const PLATFORM_NAMES = {
  douyin: '抖音',
  tiktok: 'TikTok',
  bilibili: 'bilibili',
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
  // 解析item_id
  var itemId = extractDouyinItemId(originalUrl);
  var realUrl = originalUrl;

  if (itemId) {
    // 关键：直接用iesdouyin.com/share/video/页面提取数据（不跟redirect）
    // 这个页面包含bit_rate等完整数据，而douyin.com/video/只有单条playwm
    realUrl = 'https://www.iesdouyin.com/share/video/' + itemId + '/';
  } else {
    realUrl = await resolveRedirect(originalUrl);
    itemId = extractDouyinItemId(realUrl) || extractDouyinItemId(originalUrl);
    if (!itemId) return fail('未能从链接中提取视频ID');
    realUrl = 'https://www.iesdouyin.com/share/video/' + itemId + '/';
  }

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

  // ===== 从HTML item_list提取数据 =====
  if (item) {
    // 策略1: download_addr优先（原始上传视频，未转码，画质最高）
    if (video.download_addr && video.download_addr.url_list) {
      for (var di = 0; di < video.download_addr.url_list.length; di++) {
        var du = video.download_addr.url_list[di].replace(/\\u002F/g, '/');
        if (du && du.indexOf('aweme.snssdk.com') < 0) { playUrl = du; break; }
      }
      if (!playUrl && video.download_addr.url_list.length > 0) {
        playUrl = video.download_addr.url_list[0].replace(/\\u002F/g, '/');
      }
    }

    // 策略2: bit_rate最高码率
    if (!playUrl && video.bit_rate && video.bit_rate.length > 0) {
      var bestBitrate = -1;
      for (var bi = 0; bi < video.bit_rate.length; bi++) {
        var br = video.bit_rate[bi];
        var brRate = br.bit_rate || 0;
        if (brRate > bestBitrate) {
          var brUrlList = br.play_addr && br.play_addr.url_list || [];
          for (var bui = 0; bui < brUrlList.length; bui++) {
            var bu = brUrlList[bui].replace('playwm', 'play').replace(/\\u002F/g, '/');
            if (bu && bu.indexOf('aweme.snssdk.com') < 0) { bestBitrate = brRate; playUrl = bu; break; }
          }
          if (!playUrl && brUrlList.length > 0) { bestBitrate = brRate; playUrl = brUrlList[0].replace('playwm', 'play').replace(/\\u002F/g, '/'); }
        }
      }
    }

    // 策略3: play_addr.url_list多索引
    if (!playUrl) {
      var urlList = video.play_addr && video.play_addr.url_list || [];
      for (var ui = 0; ui < urlList.length; ui++) {
        var u = urlList[ui].replace('playwm', 'play').replace(/\\u002F/g, '/');
        if (u.indexOf('aweme.snssdk.com') >= 0) { if (!playUrl) playUrl = u; }
        else { playUrl = u; break; }
      }
    }

    // 统一升级到1080p
    if (playUrl) playUrl = playUrl.replace('ratio=720p', 'ratio=1080p');

    title = item.desc || (item.share_info && item.share_info.share_title) || (item.video && item.video.text) || (item.promotions && item.promotions[0] && item.promotions[0].title) || '';
    cover = (video.origin_cover && video.origin_cover.url_list && video.origin_cover.url_list[0]) || (video.cover && video.cover.url_list && video.cover.url_list[0]) || (video.dynamic_cover && video.dynamic_cover.url_list && video.dynamic_cover.url_list[0]) || '';
    authorName = author.nickname || '';
    authorId = author.unique_id || author.short_id || author.uid || '';
    avatar = (author.avatar_larger && author.avatar_larger.url_list && author.avatar_larger.url_list[0]) || (author.avatar_medium && author.avatar_medium.url_list && author.avatar_medium.url_list[0]) || (author.avatar_thumb && author.avatar_thumb.url_list && author.avatar_thumb.url_list[0]) || '';
    images = (item.images || []).map(function(img) { return img.url_list && img.url_list[0]; }).filter(Boolean);
  }

  // og:title 兜底
  if (!title) {
    var ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogTitle && ogTitle[1] && ogTitle[1].indexOf('抖音') < 0 && ogTitle[1].indexOf('douyin') < 0) {
      title = ogTitle[1];
    }
  }

  // ===== HTML正则兜底 =====
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

  // ===== iesdouyin API 补充获取（无论HTML是否找到playUrl，都尝试API获取更高质量CDN地址） =====
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
        // 从API获取最高码率非aweme的play_addr
        var apiBestUrl = '';
        if (v.bit_rate && v.bit_rate.length > 0) {
          var apiBestBr = -1;
          for (var bi2 = 0; bi2 < v.bit_rate.length; bi2++) {
            var br2 = v.bit_rate[bi2];
            var brRate2 = br2.bit_rate || 0;
            if (brRate2 > apiBestBr) {
              var brUrlList2 = br2.play_addr && br2.play_addr.url_list || [];
              for (var bui2 = 0; bui2 < brUrlList2.length; bui2++) {
                var bu2 = brUrlList2[bui2].replace('playwm', 'play').replace(/\\u002F/g, '/');
                if (bu2 && bu2.indexOf('aweme.snssdk.com') < 0) {
                  apiBestBr = brRate2;
                  apiBestUrl = bu2;
                  break;
                }
              }
              // 如果API bit_rate全是aweme，先记着第一个备用
              if (!apiBestUrl && brUrlList2.length > 0) {
                apiBestBr = brRate2;
                apiBestUrl = brUrlList2[0].replace('playwm', 'play').replace(/\\u002F/g, '/');
              }
            }
          }
        }
        // 如果API找到了非aweme的URL，或者当前的playUrl也是aweme但API有更高码率，用API的
        if (apiBestUrl && (apiBestUrl.indexOf('aweme.snssdk.com') < 0 || (playUrl && playUrl.indexOf('aweme.snssdk.com') >= 0))) {
          playUrl = apiBestUrl;
        }
        // API的play_addr.url_list找非aweme的URL
        if (!apiBestUrl || (playUrl && playUrl.indexOf('aweme.snssdk.com') >= 0)) {
          var apiUrlList = v.play_addr && v.play_addr.url_list || [];
          for (var ai = 0; ai < apiUrlList.length; ai++) {
            var au = apiUrlList[ai].replace('playwm', 'play').replace(/\\u002F/g, '/');
            if (au && au.indexOf('aweme.snssdk.com') < 0) { playUrl = au; break; }
            if (au && !playUrl) playUrl = au;
          }
        }
        // 补充字段（仅当HTML提取缺失时）
        if (!title) title = itemData.desc || (itemData.share_info && itemData.share_info.share_title) || '';
        if (!cover) cover = (v.origin_cover && v.origin_cover.url_list && v.origin_cover.url_list[0]) || (v.cover && v.cover.url_list && v.cover.url_list[0]) || '';
        if (!authorName) authorName = (itemData.author && itemData.author.nickname) || '';
        if (!authorId) authorId = (itemData.author && (itemData.author.unique_id || itemData.author.short_id || itemData.author.uid)) || '';
        if (!avatar) avatar = (itemData.author && itemData.author.avatar_larger && itemData.author.avatar_larger.url_list && itemData.author.avatar_larger.url_list[0]) || (itemData.author && itemData.author.avatar_medium && itemData.author.avatar_medium.url_list && itemData.author.avatar_medium.url_list[0]) || '';
      }
    }
  } catch(e) {}

  // 最后确保升级到1080p
  if (playUrl) playUrl = playUrl.replace('ratio=720p', 'ratio=1080p');

  // 最后确保aweme.snssdk.com也升级到1080p
  if (playUrl && playUrl.indexOf('aweme.snssdk.com') >= 0) {
    playUrl = playUrl.replace('ratio=720p', 'ratio=1080p');
  }

    // ===== BugPK 兜底：HTML只有单条aweme URL时尝试BugPK获取高质量源 =====
  if (playUrl && playUrl.indexOf('aweme.snssdk.com') >= 0) {
    try {
      var bpRes = await fetch('https://api.bugpk.com/api/short_videos?url=' + encodeURIComponent(originalUrl), {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      });
      if (bpRes.ok) {
        var bpJson = await bpRes.json();
        if (bpJson.code === 200 && bpJson.data && bpJson.data.url) {
          var bpUrl = bpJson.data.url;
          if (bpUrl.indexOf('aweme.snssdk.com') < 0) {
            playUrl = bpUrl;
          }
          if (!title && (bpJson.data.title || bpJson.data.desc)) title = bpJson.data.title || bpJson.data.desc || '';
          if (!cover && bpJson.data.cover) cover = bpJson.data.cover;
          if (!authorName && bpJson.data.author && bpJson.data.author.name) authorName = bpJson.data.author.name;
          if (!authorId && bpJson.data.author && bpJson.data.author.id) authorId = String(bpJson.data.author.id);
          if (!avatar && bpJson.data.author && bpJson.data.author.avatar) avatar = bpJson.data.author.avatar;
        }
      }
    } catch(e) {}
  }
return ok('douyin', {
    type: images.length ? 'image' : 'video',
    title: title,
    desc: title || '',
    author: { name: authorName, id: authorId, avatar: avatar },
    cover: cover,
    url: playUrl,
    images: images,
  });
}


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

  // 方式2: 直连失败 鈫?通过 BUGPK 代理（api520.ccwu.cc 包裹 BUGPK锛岀敤鎴峰搴?IP 不可见）
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

  // 鑾峰彇鎾斁鍦板潃锛堜粎鐩磋繛鎴愬姛鏃跺皾璇曪紝BUGPK 宸茶嚜甯﹁棰戝湴鍧€锛?
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

  // ===== 占位/无效昵称识别 =====
  // 榛戝悕鍗曪細快手/涓婃父鎺ュ彛甯歌鐨勫尶鍚嶅崰浣嶆樀绉?
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

  // 还原 \uXXXX 杞箟涓庡父瑙?HTML 瀹炰綋锛岄伩鍏嶆樀绉版樉绀轰贡鐮?
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

  // ===== __NEXT_DATA__ 娣卞害缁撴瀯鍖栨悳绱紙绮惧噯瀹氫綅锛岃烦杩囪瘎璁?音乐/鎺ㄨ崘鑺傜偣锛?=====
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

  // ===== window.INIT_STATE 兜底（快手新版页面无 __NEXT_DATA__ 鏃朵娇鐢紝鍚屾琛ュご鍍忥級 =====
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
                  if (candidates.length) { for (var ci = 0; ci < candidates.length; ci++) { var cdd = candidates[ci]; var urls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []); for (var ui = 0; ui < urls.length; ui++) { if (urls[ui] && (urls[ui].indexOf("sns-video-zl") > 0 || urls[ui].indexOf("sns-video-hw") > 0)) { videoUrl = urls[ui]; break; } } if (videoUrl) break; } }
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
                  if (c.length) { for (var ci = 0; ci < c.length; ci++) { var cdd = c[ci]; var urls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []); for (var ui = 0; ui < urls.length; ui++) { if (urls[ui] && (urls[ui].indexOf("sns-video-zl") > 0 || urls[ui].indexOf("sns-video-hw") > 0)) { videoUrl = urls[ui]; break; } } if (videoUrl) break; } }
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

  // masterUrl regex fallback (only _309/_258 watermark-free)
  if (!videoUrl && !images.length) {
    var muRegex = /"masterUrl"\s*:\s*"([^"]+)"/g;
    var muMatch;
    var bestUrl = '';
    while ((muMatch = muRegex.exec(html)) !== null) {
      var mu = muMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (mu.indexOf('http://') === 0) mu = 'https://' + mu.substring(7);
      if (mu.indexOf('_309') > 0) { bestUrl = mu; break; }
      if (mu.indexOf('_258') > 0 && !bestUrl) bestUrl = mu;
    }
    if (bestUrl) videoUrl = bestUrl;
  }

  // xhscdn stream direct URL search (only sns-video-zl/sns-video-hw)
  if (!videoUrl && !images.length) {
    var zlMatch = html.match(/https?:\/\/[^"'\s]*sns-video-zl\.xhscdn\.com\/stream\/[^"'\s]+\.mp4[^"'\s]*/i);
    if (zlMatch) {
      videoUrl = zlMatch[0].replace(/&amp;/g, '&').replace(/\\u002F/g, '/');
      if (videoUrl.indexOf('http://') === 0) videoUrl = 'https://' + videoUrl.substring(7);
    }
    if (!videoUrl) {
      var allUrls = html.match(/https?:\/\/[^"']*xhscdn\.com\/stream\/[^"'\s]+/g);
      if (allUrls && allUrls.length) {
        for (var si = 0; si < allUrls.length; si++) {
          var su = allUrls[si].replace(/\\u002F/g, '/');
          if (su.indexOf('http://') === 0) su = 'https://' + su.substring(7);
          if (su.match(/\.mp4/i)) {
            if (su.indexOf('sns-video-zl') > 0 || su.indexOf('sns-video-hw') > 0) { videoUrl = su; break; }
          }
        }
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

  // TikTok 椤甸潰閲岀涓€涓敤鎴锋槸鍒嗕韩鑰?褰撳墠鐧诲綍鐢ㄦ埛锛屾渶鍚庝竴涓墠鏄棰戝師浣滆€?
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

  // tikwm.com 鍏滃簳锛堣В鍐抽潪娴忚鍣ㄨ姹?403 闂锛?
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

  // og:title / og:image锛堣タ鐡滆棰戠敤 name= 鑰屼笉鏄?property=锛?
  var tMatch = html.match(/<meta[^>]*name="og:title"[^>]*content="([^"]+)"/);
  if (tMatch) title = tMatch[1].replace(/\|\s*西瓜视频$/, '').trim();
  var iMatch = html.match(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/);
  if (iMatch) cover = iMatch[1];

  // media_user 浣滆€呬俊鎭?
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

// ===== AcFun=====
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

  // 解析 var playInfo锛堣棰戞祦鍦板潃锛?
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

  if (!title && !cover) return fail('未提取到AcFun视频信息');

  return ok('acfun', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || '', images: [],
  });
}

// ===== 微博 =====
async function parseWeibo(originalUrl) {
  // 直接通过 BUGPK 代理解析（CF Worker IP 鏃犳硶鑾峰彇微博瑙嗛鏁版嵁锛?
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
}// ===== 微信视频号=====
async function parseWeixin(originalUrl) {
  // 重试3次，每次使用不同的策略
  var lastErr = null;
  var attempts = [
    { ua: UA_WECHAT, label: 'WeChat UA' },
    { ua: UA, label: 'Chrome UA' },
  ];
  
  for (var t = 0; t < attempts.length; t++) {
    try {
      var html = await fetchHtml(originalUrl, { 'User-Agent': attempts[t].ua });
      var title = '', cover = '', videoUrl = '', desc = '';
      var author = '', authorAvatar = '';

      // 策略1: 查找 __INITIAL_STATE__
      var match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        try {
          var state = JSON.parse(match[1]);
          var vd = state.videoData || state.finderData || state.shareData || state.mediaData || {};
          if (vd.url || (vd.video && vd.video.url)) {
            title = vd.title || vd.desc || vd.caption || '';
            desc = vd.desc || vd.title || vd.caption || '';
            cover = vd.cover || vd.thumb || vd.pic || (vd.coverUrl ? vd.coverUrl : '');
            videoUrl = vd.url || (vd.video ? vd.video.url : '') || vd.playUrl || vd.play_url || '';
            if (vd.author) { author = vd.author.name || vd.author.nickname || ''; authorAvatar = vd.author.avatar || vd.author.headUrl || ''; }
          }
        } catch(e) {}
      }

      // 策略2: __NEXT_DATA__
      if (!videoUrl) {
        var m2 = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
        if (m2) {
          try { var nd = JSON.parse(m2[1]); if (nd.props && nd.props.pageProps) { var pp = nd.props.pageProps; videoUrl = pp.url || pp.videoUrl || ''; title = pp.title || ''; cover = pp.cover || pp.image || ''; } } catch(e) {}
        }
      }

      // 策略3: og:video meta标签
      if (!videoUrl) {
        var m;
        m = html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i);
        if (m) videoUrl = m[1];
        if (!videoUrl) { m = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i); if (m) videoUrl = m[1]; }
        m = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (m) title = m[1];
        m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (m) cover = m[1];
      }

      // 策略4: 查找任何 JSON-LD 或 video 相关 script
      if (!videoUrl) {
        var ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/);
        if (ldMatch) {
          try { var ld = JSON.parse(ldMatch[1]); if (ld.url) videoUrl = ld.url; if (ld.name) title = ld.name; if (ld.thumbnailUrl) cover = ld.thumbnailUrl; } catch(e) {}
        }
      }

      // 策略5: 直接在HTML中搜索video/mp4链接
      if (!videoUrl) {
        var urlMatch = html.match(/https?:\/\/finder\.video\.qq\.com\/[^\s"']+(?:mp4|m3u8)[^\s"']*/i);
        if (urlMatch) videoUrl = urlMatch[0];
      }

      if (videoUrl) {
        if (!author) {
          var am = html.match(/<p[^>]*class=["']finder-card-name["'][^>]*>([^<]+)<\/p>/i);
          if (am) author = am[1].trim();
          if (!author) { am = html.match(/"nickname"\s*[:=]\s*"([^"]+)"/i); if (am) author = am[1]; }
          if (!author) { am = html.match(/"name"\s*[:=]\s*"([^"]+)"/i); if (am) author = am[1]; }
          if (!author) { am = html.match(/"author_name"\s*[:=]\s*"([^"]+)"/i); if (am) author = am[1]; }
        }
        if (!authorAvatar) {
          var avm = html.match(/"avatar"\s*[:=]\s*"([^"]+)"/i);
          if (avm) authorAvatar = avm[1];
        }
        return ok('weixin', {
          type: 'video', title: title || desc || '', desc: desc || title || '',
          author: { name: author || '', id: '', avatar: authorAvatar || '' },
          cover: cover || '', url: videoUrl, images: [],
        });
      }
    } catch(e) { lastErr = e; }
  }

  // 全部HTML抓取失败，走BugPK
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

  return fail('微信视频号解析失败');
}





// Vercel handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
    const action = url.searchParams.get('action') || '';

    // action=proxy：代理下载视频（TikTok/微信等CDN防盗链）
    if (action === 'proxy') {
      const videoUrl = url.searchParams.get('video') || '';
      if (!videoUrl) { res.statusCode = 400; res.end(JSON.stringify({ code: 400, msg: 'missing video url' })); return; }

      // 根据视频URL来源设置请求头
      let proxyHeaders = { 'User-Agent': UA };
      if (videoUrl.includes('finder.video.qq.com') || videoUrl.includes('weixin.qq.com') || videoUrl.includes('weixin')) {
        proxyHeaders = {
          'User-Agent': UA_WECHAT,
          'Referer': 'https://channels.weixin.qq.com/',
          'Origin': 'https://channels.weixin.qq.com',
        };
      } else if (videoUrl.includes('tiktokcdn') || videoUrl.includes('tiktok.com')) {
        proxyHeaders = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
          'Origin': 'https://www.tiktok.com',
        };
      }

      // 获取Range头用于断点续传
      const range = req.headers['range'] || '';
      const fetchOpts = { headers: proxyHeaders };
      if (range) fetchOpts.headers['Range'] = range;

      const proxyRes = await fetch(videoUrl, fetchOpts);
      if (!proxyRes.ok && proxyRes.status !== 206) {
        res.statusCode = proxyRes.status;
        res.end(JSON.stringify({ code: proxyRes.status, msg: 'proxy fetch failed' }));
        return;
      }

      // 透传响应头
      const contentType = proxyRes.headers.get('content-type') || 'video/mp4';
      const contentLength = proxyRes.headers.get('content-length') || '';
      const contentRange = proxyRes.headers.get('content-range') || '';
      const acceptRanges = proxyRes.headers.get('accept-ranges') || 'bytes';

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Accept-Ranges', acceptRanges);
      if (range) res.statusCode = 206;
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // 使用arrayBuffer获取完整数据后返回
      const buffer = Buffer.from(await proxyRes.arrayBuffer());
      res.end(buffer);
      return;
    }

    const targetUrl = url.searchParams.get('url') || '';
  // ===== 调试模式 =====
  var debug = url.searchParams.get('debug');
  if (debug === '1' || debug === 'douyin') {
    var dbgTargetUrl = url.searchParams.get('url') || targetUrl;
    try {
      var dbgItemId = extractDouyinItemId(dbgTargetUrl);
      if (!dbgItemId) {
        var dbgRealUrl = await resolveRedirect(dbgTargetUrl);
        dbgItemId = extractDouyinItemId(dbgRealUrl) || extractDouyinItemId(dbgTargetUrl);
      }
      if (dbgItemId) {
        var dbgFinalUrl = dbgTargetUrl;
        var dbgShareUrl = 'https://www.iesdouyin.com/share/video/' + dbgItemId + '/';
        var dbgResolved = await resolveRedirect(dbgShareUrl);
        if (dbgResolved && dbgResolved.indexOf('douyin.com') >= 0) dbgFinalUrl = dbgResolved;

        var dbgHtml = await fetchHtml(dbgFinalUrl || dbgTargetUrl, { Referer: 'https://www.douyin.com/' });
        var dbgItem = extractDouyinDataFromHtml(dbgHtml);
        
        var dbgInfo = { itemId: dbgItemId, hasItem: !!dbgItem };
        if (dbgItem) {
          var v = dbgItem.video || {};
          dbgInfo.hasDownloadAddr = !!v.download_addr;
          dbgInfo.hasBitRate = !!(v.bit_rate && v.bit_rate.length > 0);
          dbgInfo.bitRateCount = (v.bit_rate || []).length;
          dbgInfo.playAddrUrlCount = (v.play_addr && v.play_addr.url_list || []).length;
          dbgInfo.playAddrUrls = (v.play_addr && v.play_addr.url_list || []).map(function(u) { return u.replace(/\\u002F/g, '/').substring(0, 120); });
          if (v.download_addr) {
            dbgInfo.downloadAddrUrls = (v.download_addr.url_list || []).map(function(u) { return u.replace(/\\u002F/g, '/').substring(0, 120); });
          }
          if (v.bit_rate && v.bit_rate.length > 0) {
            dbgInfo.bitRates = v.bit_rate.map(function(br) { 
              return { gear: br.gear_name || '', bitrate: br.bit_rate || 0, urlCount: (br.play_addr && br.play_addr.url_list || []).length };
            });
          }
        }
        try {
          var dbgApiRes = await fetch('https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=' + dbgItemId, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://www.douyin.com/' },
          });
          dbgInfo.iesdouyinApiStatus = dbgApiRes.status;
          if (dbgApiRes.ok) {
            var dbgApiJson = await dbgApiRes.json();
            var dbgApiData = dbgApiJson.aweme_detail || dbgApiJson.data || dbgApiJson;
            if (dbgApiData && dbgApiData.video) {
              var av = dbgApiData.video;
              dbgInfo.apiHasDownloadAddr = !!av.download_addr;
              dbgInfo.apiHasBitRate = !!(av.bit_rate && av.bit_rate.length > 0);
              dbgInfo.apiPlayAddrUrlCount = (av.play_addr && av.play_addr.url_list || []).length;
              dbgInfo.apiBitRateCount = (av.bit_rate || []).length;
              if (av.bit_rate && av.bit_rate.length > 0) {
                dbgInfo.apiBitRates = av.bit_rate.map(function(br) { 
                  return { gear: br.gear_name || '', bitrate: br.bit_rate || 0, urlCount: (br.play_addr && br.play_addr.url_list || []).length };
                });
              }
            }
          }
        } catch(e) { dbgInfo.iesdouyinApiError = String(e);
        
        // 检查iesdouyin.com/share/video/页面数据
        try {
          var iesdUrl2 = "https://www.iesdouyin.com/share/video/" + dbgItemId + "/";
          var iesdHtml2 = await fetchHtml(iesdUrl2, { Referer: "https://www.douyin.com/" });
          var iesdItem2 = extractDouyinDataFromHtml(iesdHtml2);
          dbgInfo.iesdHasItem = !!iesdItem2;
          if (iesdItem2) {
            var iesdV2 = iesdItem2.video || {};
            dbgInfo.iesdHasDownloadAddr = !!iesdV2.download_addr;
            dbgInfo.iesdHasBitRate = !!(iesdV2.bit_rate && iesdV2.bit_rate.length > 0);
            dbgInfo.iesdBitRateCount = (iesdV2.bit_rate || []).length;
            dbgInfo.iesdPlayAddrUrlCount = (iesdV2.play_addr && iesdV2.play_addr.url_list || []).length;
            dbgInfo.iesdPlayAddrUrls = (iesdV2.play_addr && iesdV2.play_addr.url_list || []).map(function(u) { return u.replace(/\\u002F/g, "/").substring(0, 120); });
            if (iesdV2.bit_rate && iesdV2.bit_rate.length > 0) {
              dbgInfo.iesdBitRates = iesdV2.bit_rate.map(function(br) { 
                return { gear: br.gear_name || "", bitrate: br.bit_rate || 0, urlCount: (br.play_addr && br.play_addr.url_list || []).length };
              });
            }
            if (iesdV2.download_addr) {
              dbgInfo.iesdDownloadAddrUrls = (iesdV2.download_addr.url_list || []).map(function(u) { return u.replace(/\\u002F/g, "/").substring(0, 120); });
            }
          }
        } catch(e) { dbgInfo.iesdError = String(e); }
 }
        res.statusCode = 200;
        res.end(JSON.stringify({ code: 200, msg: '调试信息', debug: dbgInfo }));
        return;
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify({ code: 400, msg: '无法提取视频ID', debug: { targetUrl: dbgTargetUrl } }));
        return;
      }
    } catch(e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ code: 500, msg: '调试失败: ' + String(e) }));
      return;
    }
  }
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
















