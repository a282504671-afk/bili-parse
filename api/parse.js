(function(){
// All the content in this article is only for learning and communication use, not for any other purpose, strictly prohibited for commercial use and illegal use, otherwise all the consequences are irrelevant to the author!
function rc4_encrypt(plaintext, key) {
    var s = [];
    for (var i = 0; i < 256; i++) {
        s[i] = i;
    }
    var j = 0;
    for (var i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        var temp = s[i];
        s[i] = s[j];
        s[j] = temp;
    }

    var i = 0;
    var j = 0;
    var cipher = [];
    for (var k = 0; k < plaintext.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        var temp = s[i];
        s[i] = s[j];
        s[j] = temp;
        var t = (s[i] + s[j]) % 256;
        cipher.push(String.fromCharCode(s[t] ^ plaintext.charCodeAt(k)));
    }
    return cipher.join('');
}

function le(e, r) {
    return (e << (r %= 32) | e >>> 32 - r) >>> 0
}

function de(e) {
    return 0 <= e && e < 16 ? 2043430169 : 16 <= e && e < 64 ? 2055708042 : void console['error']("invalid j for constant Tj")
}

function pe(e, r, t, n) {
    return 0 <= e && e < 16 ? (r ^ t ^ n) >>> 0 : 16 <= e && e < 64 ? (r & t | r & n | t & n) >>> 0 : (console['error']('invalid j for bool function FF'),
        0)
}

function he(e, r, t, n) {
    return 0 <= e && e < 16 ? (r ^ t ^ n) >>> 0 : 16 <= e && e < 64 ? (r & t | ~r & n) >>> 0 : (console['error']('invalid j for bool function GG'),
        0)
}

function reset() {
    this.reg[0] = 1937774191,
        this.reg[1] = 1226093241,
        this.reg[2] = 388252375,
        this.reg[3] = 3666478592,
        this.reg[4] = 2842636476,
        this.reg[5] = 372324522,
        this.reg[6] = 3817729613,
        this.reg[7] = 2969243214,
        this["chunk"] = [],
        this["size"] = 0
}

function write(e) {
    var a = "string" == typeof e ? function (e) {
        n = encodeURIComponent(e)['replace'](/%([0-9A-F]{2})/g, (function (e, r) {
                return String['fromCharCode']("0x" + r)
            }
        ))
            , a = new Array(n['length']);
        return Array['prototype']['forEach']['call'](n, (function (e, r) {
                a[r] = e.charCodeAt(0)
            }
        )),
            a
    }(e) : e;
    this.size += a.length;
    var f = 64 - this['chunk']['length'];
    if (a['length'] < f)
        this['chunk'] = this['chunk'].concat(a);
    else
        for (this['chunk'] = this['chunk'].concat(a.slice(0, f)); this['chunk'].length >= 64;)
            this['_compress'](this['chunk']),
                f < a['length'] ? this['chunk'] = a['slice'](f, Math['min'](f + 64, a['length'])) : this['chunk'] = [],
                f += 64
}

function sum(e, t) {
    e && (this['reset'](),
        this['write'](e)),
        this['_fill']();
    for (var f = 0; f < this.chunk['length']; f += 64)
        this._compress(this['chunk']['slice'](f, f + 64));
    var i = null;
    if (t == 'hex') {
        i = "";
        for (f = 0; f < 8; f++)
            i += se(this['reg'][f]['toString'](16), 8, "0")
    } else
        for (i = new Array(32),
                 f = 0; f < 8; f++) {
            var c = this.reg[f];
            i[4 * f + 3] = (255 & c) >>> 0,
                c >>>= 8,
                i[4 * f + 2] = (255 & c) >>> 0,
                c >>>= 8,
                i[4 * f + 1] = (255 & c) >>> 0,
                c >>>= 8,
                i[4 * f] = (255 & c) >>> 0
        }
    return this['reset'](),
        i
}

function _compress(t) {
    if (t < 64)
        console.error("compress error: not enough data");
    else {
        for (var f = function (e) {
            for (var r = new Array(132), t = 0; t < 16; t++)
                r[t] = e[4 * t] << 24,
                    r[t] |= e[4 * t + 1] << 16,
                    r[t] |= e[4 * t + 2] << 8,
                    r[t] |= e[4 * t + 3],
                    r[t] >>>= 0;
            for (var n = 16; n < 68; n++) {
                var a = r[n - 16] ^ r[n - 9] ^ le(r[n - 3], 15);
                a = a ^ le(a, 15) ^ le(a, 23),
                    r[n] = (a ^ le(r[n - 13], 7) ^ r[n - 6]) >>> 0
            }
            for (n = 0; n < 64; n++)
                r[n + 68] = (r[n] ^ r[n + 4]) >>> 0;
            return r
        }(t), i = this['reg'].slice(0), c = 0; c < 64; c++) {
            var o = le(i[0], 12) + i[4] + le(de(c), c)
                , s = ((o = le(o = (4294967295 & o) >>> 0, 7)) ^ le(i[0], 12)) >>> 0
                , u = pe(c, i[0], i[1], i[2]);
            u = (4294967295 & (u = u + i[3] + s + f[c + 68])) >>> 0;
            var b = he(c, i[4], i[5], i[6]);
            b = (4294967295 & (b = b + i[7] + o + f[c])) >>> 0,
                i[3] = i[2],
                i[2] = le(i[1], 9),
                i[1] = i[0],
                i[0] = u,
                i[7] = i[6],
                i[6] = le(i[5], 19),
                i[5] = i[4],
                i[4] = (b ^ le(b, 9) ^ le(b, 17)) >>> 0
        }
        for (var l = 0; l < 8; l++)
            this['reg'][l] = (this['reg'][l] ^ i[l]) >>> 0
    }
}

function _fill() {
    var a = 8 * this['size']
        , f = this['chunk']['push'](128) % 64;
    for (64 - f < 8 && (f -= 64); f < 56; f++)
        this.chunk['push'](0);
    for (var i = 0; i < 4; i++) {
        var c = Math['floor'](a / 4294967296);
        this['chunk'].push(c >>> 8 * (3 - i) & 255)
    }
    for (i = 0; i < 4; i++)
        this['chunk']['push'](a >>> 8 * (3 - i) & 255)

}

function SM3() {
    this.reg = [];
    this.chunk = [];
    this.size = 0;
    this.reset()
}
SM3.prototype.reset = reset;
SM3.prototype.write = write;
SM3.prototype.sum = sum;
SM3.prototype._compress = _compress;
SM3.prototype._fill = _fill;

function result_encrypt(long_str, num = null) {
    let s_obj = {
        "s0": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        "s1": "Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
        "s2": "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
        "s3": "ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe",
        "s4": "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe"
    }
    let constant = {
        "0": 16515072,
        "1": 258048,
        "2": 4032,
        "str": s_obj[num],
    }

    let result = "";
    let lound = 0;
    let long_int = get_long_int(lound, long_str);
    for (let i = 0; i < long_str.length / 3 * 4; i++) {
        if (Math.floor(i / 4) !== lound) {
            lound += 1;
            long_int = get_long_int(lound, long_str);
        }
        let key = i % 4;
        switch (key) {
            case 0:
                temp_int = (long_int & constant["0"]) >> 18;
                result += constant["str"].charAt(temp_int);
                break;
            case 1:
                temp_int = (long_int & constant["1"]) >> 12;
                result += constant["str"].charAt(temp_int);
                break;
            case 2:
                temp_int = (long_int & constant["2"]) >> 6;
                result += constant["str"].charAt(temp_int);
                break;
            case 3:
                temp_int = long_int & 63;
                result += constant["str"].charAt(temp_int);
                break;
            default:
                break;
        }
    }
    return result;
}

function get_long_int(round, long_str) {
    round = round * 3;
    return (long_str.charCodeAt(round) << 16) | (long_str.charCodeAt(round + 1) << 8) | (long_str.charCodeAt(round + 2));
}

function gener_random(random, option) {
    return [
        (random & 255 & 170) | option[0] & 85, // 163
        (random & 255 & 85) | option[0] & 170, //87
        (random >> 8 & 255 & 170) | option[1] & 85, //37
        (random >> 8 & 255 & 85) | option[1] & 170, //41
    ]
}

//////////////////////////////////////////////
function generate_rc4_bb_str(url_search_params, user_agent, window_env_str, suffix = "cus", Arguments = [0, 1, 14]) {
    let sm3 = new SM3()
    let start_time = Date.now()
    /**
     * 进行3次加密处理
     * 1: url_search_params两次sm3之的结果
     * 2: 对后缀两次sm3之的结果
     * 3: 对ua处理之后的结果
     */
        // url_search_params两次sm3之的结果
    let url_search_params_list = sm3.sum(sm3.sum(url_search_params + suffix))
    // 对后缀两次sm3之的结果
    let cus = sm3.sum(sm3.sum(suffix))
    // 对ua处理之后的结果
    let ua = sm3.sum(result_encrypt(rc4_encrypt(user_agent, String.fromCharCode.apply(null, [0.00390625, 1, Arguments[2]])), "s3"))
    //
    let end_time = Date.now()
    // b
    let b = {
        8: 3, // 固定
        10: end_time, //3次加密结束时间
        15: {
            "aid": 6383,
            "pageId": 6241,
            "boe": false,
            "ddrt": 7,
            "paths": {
                "include": [
                    {},
                    {},
                    {},
                    {},
                    {},
                    {},
                    {}
                ],
                "exclude": []
            },
            "track": {
                "mode": 0,
                "delay": 300,
                "paths": []
            },
            "dump": true,
            "rpU": ""
        },
        16: start_time, //3次加密开始时间
        18: 44, //固定
        19: [1, 0, 1, 5],
    }

    //3次加密开始时间
    b[20] = (b[16] >> 24) & 255
    b[21] = (b[16] >> 16) & 255
    b[22] = (b[16] >> 8) & 255
    b[23] = b[16] & 255
    b[24] = (b[16] / 256 / 256 / 256 / 256) >> 0
    b[25] = (b[16] / 256 / 256 / 256 / 256 / 256) >> 0

    // 参数Arguments [0, 1, 14, ...]
    // let Arguments = [0, 1, 14]
    b[26] = (Arguments[0] >> 24) & 255
    b[27] = (Arguments[0] >> 16) & 255
    b[28] = (Arguments[0] >> 8) & 255
    b[29] = Arguments[0] & 255

    b[30] = (Arguments[1] / 256) & 255
    b[31] = (Arguments[1] % 256) & 255
    b[32] = (Arguments[1] >> 24) & 255
    b[33] = (Arguments[1] >> 16) & 255

    b[34] = (Arguments[2] >> 24) & 255
    b[35] = (Arguments[2] >> 16) & 255
    b[36] = (Arguments[2] >> 8) & 255
    b[37] = Arguments[2] & 255

    // (url_search_params + "cus") 两次sm3之的结果
    /**let url_search_params_list = [
     91, 186,  35,  86, 143, 253,   6,  76,
     34,  21, 167, 148,   7,  42, 192, 219,
     188,  20, 182,  85, 213,  74, 213, 147,
     37, 155,  93, 139,  85, 118, 228, 213
     ]*/
    b[38] = url_search_params_list[21]
    b[39] = url_search_params_list[22]

    // ("cus") 对后缀两次sm3之的结果
    /**
     * let cus = [
     136, 101, 114, 147,  58,  77, 207, 201,
     215, 162, 154,  93, 248,  13, 142, 160,
     105,  73, 215, 241,  83,  58,  51,  43,
     255,  38, 168, 141, 216, 194,  35, 236
     ]*/
    b[40] = cus[21]
    b[41] = cus[22]

    // 对ua处理之后的结果
    /**
     * let ua = [
     129, 190,  70, 186,  86, 196, 199,  53,
     99,  38,  29, 209, 243,  17, 157,  69,
     147, 104,  53,  23, 114, 126,  66, 228,
     135,  30, 168, 185, 109, 156, 251,  88
     ]*/
    b[42] = ua[23]
    b[43] = ua[24]

    //3次加密结束时间
    b[44] = (b[10] >> 24) & 255
    b[45] = (b[10] >> 16) & 255
    b[46] = (b[10] >> 8) & 255
    b[47] = b[10] & 255
    b[48] = b[8]
    b[49] = (b[10] / 256 / 256 / 256 / 256) >> 0
    b[50] = (b[10] / 256 / 256 / 256 / 256 / 256) >> 0


    // object配置项
    b[51] = b[15]['pageId']
    b[52] = (b[15]['pageId'] >> 24) & 255
    b[53] = (b[15]['pageId'] >> 16) & 255
    b[54] = (b[15]['pageId'] >> 8) & 255
    b[55] = b[15]['pageId'] & 255

    b[56] = b[15]['aid']
    b[57] = b[15]['aid'] & 255
    b[58] = (b[15]['aid'] >> 8) & 255
    b[59] = (b[15]['aid'] >> 16) & 255
    b[60] = (b[15]['aid'] >> 24) & 255

    // 中间进行了环境检测
    // 代码索引:  2496 索引值:  17 （索引64关键条件）
    // '1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32'.charCodeAt()得到65位数组
    /**
     * let window_env_list = [49, 53, 51, 54, 124, 55, 52, 55, 124, 49, 53, 51, 54, 124, 56, 51, 52, 124, 48, 124, 51,
     * 48, 124, 48, 124, 48, 124, 49, 53, 51, 54, 124, 56, 51, 52, 124, 49, 53, 51, 54, 124, 56,
     * 54, 52, 124, 49, 53, 50, 53, 124, 55, 52, 55, 124, 50, 52, 124, 50, 52, 124, 87, 105, 110,
     * 51, 50]
     */
    let window_env_list = [];
    for (let index = 0; index < window_env_str.length; index++) {
        window_env_list.push(window_env_str.charCodeAt(index))
    }
    b[64] = window_env_list.length
    b[65] = b[64] & 255
    b[66] = (b[64] >> 8) & 255

    b[69] = [].length
    b[70] = b[69] & 255
    b[71] = (b[69] >> 8) & 255

    b[72] = b[18] ^ b[20] ^ b[26] ^ b[30] ^ b[38] ^ b[40] ^ b[42] ^ b[21] ^ b[27] ^ b[31] ^ b[35] ^ b[39] ^ b[41] ^ b[43] ^ b[22] ^
        b[28] ^ b[32] ^ b[36] ^ b[23] ^ b[29] ^ b[33] ^ b[37] ^ b[44] ^ b[45] ^ b[46] ^ b[47] ^ b[48] ^ b[49] ^ b[50] ^ b[24] ^
        b[25] ^ b[52] ^ b[53] ^ b[54] ^ b[55] ^ b[57] ^ b[58] ^ b[59] ^ b[60] ^ b[65] ^ b[66] ^ b[70] ^ b[71]
    let bb = [
        b[18], b[20], b[52], b[26], b[30], b[34], b[58], b[38], b[40], b[53], b[42], b[21], b[27], b[54], b[55], b[31],
        b[35], b[57], b[39], b[41], b[43], b[22], b[28], b[32], b[60], b[36], b[23], b[29], b[33], b[37], b[44], b[45],
        b[59], b[46], b[47], b[48], b[49], b[50], b[24], b[25], b[65], b[66], b[70], b[71]
    ]
    bb = bb.concat(window_env_list).concat(b[72])
    return rc4_encrypt(String.fromCharCode.apply(null, bb), String.fromCharCode.apply(null, [121]));
}

function generate_random_str() {
    let random_str_list = []
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [3, 45]))
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [1, 0]))
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [1, 5]))
    return String.fromCharCode.apply(null, random_str_list)
}

function sign(url_search_params, user_agent, arguments) {
    /**
     * url_search_params："device_platform=webapp&aid=6383&channel=channel_pc_web&update_version_code=170400&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=123.0.0.0&browser_online=true&engine_name=Blink&engine_version=123.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7362810250930783783&msToken=VkDUvz1y24CppXSl80iFPr6ez-3FiizcwD7fI1OqBt6IICq9RWG7nCvxKb8IVi55mFd-wnqoNkXGnxHrikQb4PuKob5Q-YhDp5Um215JzlBszkUyiEvR"
     * user_agent："Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
     */
    let result_str = generate_random_str() + generate_rc4_bb_str(
        url_search_params,
        user_agent,
        "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32",
        "cus",
        arguments
    );
    return result_encrypt(result_str, "s4") + "=";
}

function sign_datail(params, userAgent) {
    return sign(params, userAgent, [0, 1, 14])
}

function sign_reply(params, userAgent) {
    return sign(params, userAgent, [0, 1, 8])
}
globalThis.sign_datail = sign_datail;
globalThis.sign = sign;
})();
const UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const BUGPK2_API = 'https://api-new.ifphp.com/api/svparse';
const BUGPK2_KEY = 'bp_live_5c44b116706699e861c2f0c4a7dc386ccebd9ad568a6985b48896c360da3fef9';
// BUGPK2.0 统一请求：老 api.bugpk.com 不稳定，全部改走新平台（需 X-API-Key）
async function _bugpk2Fetch(targetUrl, timeoutMs) {
  var bpUrl = BUGPK2_API + '?url=' + encodeURIComponent(targetUrl);
  var bpHeaders = { 'User-Agent': UA, 'Accept': 'application/json', 'X-API-Key': BUGPK2_KEY };
  var bpTimeout = timeoutMs || 15000;
  // BUGPK2.0 接口偶发 502，自动重试最多3次（只重试新接口，不调用老接口）
  for (var bpRetry = 0; bpRetry < 2; bpRetry++) {
    try {
      var bpRes = await fetch(bpUrl, { headers: bpHeaders, signal: AbortSignal.timeout(bpTimeout) });
      if (bpRes.ok) return bpRes;
      // 502/503/504 等服务端错误，等待后重试
      if (bpRes.status === 502 || bpRes.status === 503 || bpRes.status === 504) {
        await new Promise(function(r) { setTimeout(r, 1000); });
        continue;
      }
      return bpRes; // 其他错误直接返回
    } catch (e) {
      if (bpRetry < 2) { await new Promise(function(r) { setTimeout(r, 1000); }); continue; }
      throw e;
    }
  }
  return fetch(bpUrl, { headers: bpHeaders, signal: AbortSignal.timeout(bpTimeout) });
}
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.003.A1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5060 MMWEBSDK/20221206 MMWEBID/8060 MicroMessenger/8.0.32.2380(0x28002034) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

// ===== parse cache (by itemId, TTL 30min) =====
const _parseCache = new Map();
const _CACHE_TTL = 30 * 60 * 1000;
function _cacheGet(key) {
  const hit = _parseCache.get(key);
  if (hit && (Date.now() - hit.t) < _CACHE_TTL) return hit.v;
  if (hit) _parseCache.delete(key);
  return null;
}
function _cacheSet(key, val) {
  if (_parseCache.size > 500) _parseCache.clear();
  _parseCache.set(key, { t: Date.now(), v: val });
}

function _extractImageList(images) {
  if (!Array.isArray(images)) return [];
  return images.map(function(x) {
    if (typeof x === 'string') return x;
    if (x && Array.isArray(x.url_list) && x.url_list.length) return x.url_list[0];
    if (x && typeof x.url === 'string') return x.url;
    return '';
  }).filter(function(u) { return typeof u === 'string' && u.indexOf('http') === 0; });
}

// ===== build douyin ok() from BugPK data (author id: unique_id/short_id first) =====
function _buildDouyinOk(data, url, isImageType, videoList) {
  var ext = data.extra || {};
  var ae = ext.author_extra || {};
  var authorId = String(ae.unique_id || ae.short_id || (data.author && data.author.id) || '');
  var result = {
    type: isImageType ? 'image' : 'video',
    title: data.title || data.desc || '',
    desc: data.desc || data.title || '',
    author: { name: (data.author && data.author.name) || '', id: authorId, avatar: (data.author && data.author.avatar) || '' },
    cover: data.cover || '',
    url: isImageType ? '' : url,
    images: _extractImageList(data.images),
  };
  if (videoList && videoList.length) result.videoList = videoList;
  return ok('douyin', result);
}

// ===== BugPK: accept zjcdn direct link only; null on any failure =====
async function _bugpkGetZjcdn(originalUrl) {
  try {
    var bpRes = await _bugpk2Fetch(originalUrl);
    if (!bpRes.ok) return null;
    var bpJson = await bpRes.json();
    if (bpJson.code !== 200 || !bpJson.data) return null;
    var bpData = bpJson.data;
    // ?????zjcdn ???? video_backup????????????? images ??
    var bpUrl = bpData.url || '';
    if (bpUrl && bpUrl.indexOf('http') === 0 && bpUrl.indexOf('aweme.snssdk.com') < 0) {
      return { ok: true, result: _buildDouyinOk(bpData, bpUrl, false) };
    }
    if (bpData.video_backup && bpData.video_backup.length) {
      var bestBbUrl = '', bestBbBr = -1;
      for (var bbi = 0; bbi < bpData.video_backup.length; bbi++) {
        var bbUrl = bpData.video_backup[bbi] && bpData.video_backup[bbi].url || '';
        if (bbUrl && bbUrl.indexOf('http') === 0 && bbUrl.indexOf('aweme.snssdk.com') < 0) {
          var bbBrMatch = bbUrl.match(/[?&]br=(\\d+)/);
          var bbBr = bbBrMatch ? parseInt(bbBrMatch[1]) : 0;
          if (bbBr > bestBbBr) { bestBbBr = bbBr; bestBbUrl = bbUrl; }
        }
      }
      if (bestBbUrl) return { ok: true, result: _buildDouyinOk(bpData, bestBbUrl, false) };
    }
    // ===== 动图/实况照片(live_photo)：每个元素带 image + video，视频为无水印直链 =====
    if (bpData.live_photo && bpData.live_photo.length) {
      var lpVideos = [];
      var lpImages = [];
      for (var lpi = 0; lpi < bpData.live_photo.length; lpi++) {
        var lpItem = bpData.live_photo[lpi] || {};
        var lpVid = lpItem.video || '';
        var lpImg = lpItem.image || '';
        if (lpVid && lpVid.indexOf('http') === 0 && lpVideos.indexOf(lpVid) < 0) lpVideos.push(lpVid);
        if (lpImg && lpImg.indexOf('http') === 0 && lpImages.indexOf(lpImg) < 0) lpImages.push(lpImg);
      }
      if (lpVideos.length) {
        if (lpImages.length) bpData.images = lpImages;
        return { ok: true, result: _buildDouyinOk(bpData, lpVideos[0], false, lpVideos) };
      }
    }
    // ?? zjcdn ??????????BugPK ??????? images?
    var bpImages = _extractImageList(bpData.images);
    if (bpImages.length) {
      return { ok: true, result: _buildDouyinOk(bpData, '', true) };
    }
    return null;
  } catch (e) { return null; }
}


// 
const PLATFORM_NAMES = {
  douyin: '抖音',
  tiktok: 'TikTok',
  bilibili: 'bilibili',
  acfun: 'AcFun',
  ixigua: '西瓜视频',
  toutiao: '今日头条',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  weibo: '微博',
  weixin: '微信视频',
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
  if (/toutiao\.com|m\.toutiao\.com/.test(url)) return 'toutiao';
  if (/kuaishou\.com|gifshow\.com|kwai/.test(url)) return 'kuaishou';
  if (/xiaohongshu\.com|xhslink\.com|xhslink\.cn|xhs\.cn/.test(url)) return 'xiaohongshu';
  if (/weibo\.com/.test(url) || /t\.cn/.test(url)) return 'weibo';
  if (/weixin\.qq\.com\/sph/.test(url) || /channels\.weixin\.qq\.com/.test(url) || /finder\.video\.qq\.com/.test(url)) return 'weixin';
  return 'unknown';
}

async function resolveRedirect(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA } });
    return res.url || url;
  } catch (e) { return url; }
}

async function fetchHtml(url, extraHeaders = {}) {
  // First request - get cookies from Set-Cookie
  const res1 = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9', ...extraHeaders },
    redirect: 'manual',
  });
  var cookies = '';
  if (res1.headers) {
    const setCookie = res1.headers.get('Set-Cookie');
    if (setCookie) cookies = setCookie.split(';')[0];
  }
  var text = await res1.text();
  
  // Check if page has obfuscated JS (anti-bot) - need second request with cookies
  if (text.indexOf('_$jsvmprt') >= 0 && cookies) {
    const res2 = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9', 'Cookie': cookies, ...extraHeaders },
      redirect: 'follow',
    });
    if (res2.ok) {
      text = await res2.text();
    }
  }
  
  // Try a third retry as simple follow-redirect
  if (text.indexOf('reload') >= 0 && text.indexOf('_$jsvmprt') >= 0) {
    try {
      const res3 = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9', ...extraHeaders },
        redirect: 'follow',
      });
      if (res3.ok) {
        const text3 = await res3.text();
        if (text3.indexOf('_$jsvmprt') < 0) text = text3;
      }
    } catch(e) {}
  }
  
  return text;
}

// ===== 抖音 =====
function extractDouyinItemId(url) {
  var m = url.match(/\/(?:share\/)?video\/(\d{6,})/);
  if (m) return m[1];
  m = url.match(/item_ids?=(\d{6,})/);
  if (m) return m[1];
  m = url.match(/modal_id=(\d{6,})/);
  if (m) return m[1];
  m = url.match(/\/note\/(\d{6,})/);
  if (m) return m[1];
  m = url.match(/\/slides\/(\d{6,})/);
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
  var bpCacheKey = itemId ? ('dy:' + itemId) : ('dy:url:' + originalUrl);
  var bpCached = _cacheGet(bpCacheKey);
  if (bpCached) return bpCached;

  var bpPrimary = await _bugpkGetZjcdn(originalUrl);
  if (bpPrimary) {
    _cacheSet(bpCacheKey, bpPrimary.result);
    return bpPrimary.result;
  }

  return fail('未提取到抖音视频地址');
}
async function parseBilibili(originalUrl) {
  var realUrl = originalUrl;
  if (realUrl.includes('b23.tv')) realUrl = await resolveRedirect(realUrl);

  var bvMatch = realUrl.match(/BV[0-9A-Za-z]+/);
  if (!bvMatch) {
    var avMatch = realUrl.match(/av(\d+)/i);
  if (!avMatch) return fail('\u672a\u8bc6\u522b\u5230AV\u53f7');
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
      var bpRes = await _bugpk2Fetch(originalUrl);
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
    // Vercel ????
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

  if (!info) return fail('\u83b7\u53d6B\u7ad9\u89c6\u9891\u4fe1\u606f\u5931\u8d25\uff0c\u53ef\u80fd\u88ab\u6d77\u5916IP\u9650\u5236');

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

// ===== ???? =====

async function parseKuaishou(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.kuaishou.com/' });
  var photoIdMatch = realUrl.match(/photoId[=\/](\d+)/);
  var currentPhotoId = photoIdMatch ? photoIdMatch[1] : null;

  var isValidUid = function (v) { return !!v && /^\d+$/.test(String(v)); };

  // 
  // 
  var BAD_NAMES = ['???????', '??????', '???????', '?????', '????????', 'δ????', '????', 'kwai user', 'KuaiShou User', 'null', 'undefined'];
  // 
  var GARBAGE_PATTERN = /^[\???\uFFFD\*\-_=.\s]+$/;
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
      var res = await _bugpk2Fetch(originalUrl);
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
          // 提取图集图片
          if (d.images && d.images.length > 0) {
            if (!video.images) video.images = [];
            video.images = d.images.filter(u => u && !u.includes('notinline') && u.startsWith('http'));
          }
          // ===== 动图/实况照片(live_photo)：提取视频列表 =====
          if (d.live_photo && d.live_photo.length) {
            var ksLpVideos = [];
            var ksLpImages = [];
            for (var kslpi = 0; kslpi < d.live_photo.length; kslpi++) {
              var ksLpItem = d.live_photo[kslpi] || {};
              var ksLpVid = ksLpItem.video || '';
              var ksLpImg = ksLpItem.image || '';
              if (ksLpVid && ksLpVid.indexOf('http') === 0 && ksLpVideos.indexOf(ksLpVid) < 0) ksLpVideos.push(ksLpVid);
              if (ksLpImg && ksLpImg.indexOf('http') === 0 && ksLpImages.indexOf(ksLpImg) < 0) ksLpImages.push(ksLpImg);
            }
            if (ksLpVideos.length) {
              if (!video.videoUrl) video.videoUrl = ksLpVideos[0];
              if (!video.videoList) video.videoList = [];
              video.videoList = video.videoList.concat(ksLpVideos);
              if (ksLpImages.length && (!video.images || !video.images.length)) video.images = ksLpImages;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 
  finalAuthor = fillAvatarIfMissing(finalAuthor, html);

  if (!video.videoUrl && !video.cover) return fail('\u672a\u63d0\u53d6\u5230\u5feb\u624b\u89c6\u9891\u5730\u5740');
  // 兜底：从页面 JSON 数据中取真实图片
  if ((!video.images || !video.images.length) && !video.videoUrl) {
    var photoMatch = html.match(/\"photo\"\s*:\s*\{[^}]+\"coverUrls\"\s*:\s*\[([^\]]+)\]/);
    if (photoMatch) {
      var urls = photoMatch[1].match(/\"url\"\s*:\s*\"([^\"]+)\"/g);
      if (urls && urls.length > 0) {
        video.images = [];
        urls.forEach(function(u) {
          var pu = u.match(/\"url\"\s*:\s*\"([^\"]+)\"/);
          if (pu) video.images.push(pu[1].replace(/\\u002F/g, '/'));
        });
      }
    }
    if ((!video.images || !video.images.length) && video.cover && video.cover.indexOf('yximgs') >= 0) {
      video.images = [video.cover];
    }
  }

    var ksImages = (video.images && video.images.length > 0) ? video.images : [];
  var ksVideoList = (video.videoList && video.videoList.length > 0) ? video.videoList : [];
  var ksRet = {
    type: (video.videoUrl || ksVideoList.length) ? 'video' : (ksImages.length ? 'image' : 'video'),
    title: video.title || '',
    desc: video.title || '',
    author: finalAuthor || { name: '', id: '', avatar: '' },
    cover: video.cover || '',
    url: (video.videoUrl || ksVideoList.length) ? (video.videoUrl || ksVideoList[0] || '') : (ksImages.length ? '' : (video.videoUrl || '')),
    images: ksImages,
  };
  if (ksVideoList.length) ksRet.videoList = ksVideoList;
  return ok('kuaishou', ksRet);
}

// ===== С????=====

async function parseXiaohongshu(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '', images = [], xhsVideoList = [];
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
            if (noteData.imageList && noteData.imageList.length) {
              noteData.imageList.forEach(function(img) {
                var iu = img.urlDefault || img.url || '';
                if (iu) images.push( iu.indexOf('sns-webpic-qc.xhscdn.com') >= 0 ? iu.replace(/^(?:https?:)?\/\/sns-webpic-qc\.xhscdn\.com\/[^/]+\/[^/]+\/([^!]+)(?:!\w+)?$/, 'https://ci.xiaohongshu.com/$1?imageView2/2/w/0/format/jpg/v3&c=v1') : iu );
                // 动图/实况照片：提取视频URL（直接取第一个masterUrl，不经过pickBestVideoUrl）
                if (img.livePhoto && img.stream) {
                  var lpVid = '';
                  if (img.stream.h264 && img.stream.h264.length) {
                    lpVid = img.stream.h264[0].masterUrl || img.stream.h264[0].url || '';
                  }
                  if (!lpVid && img.stream.h265 && img.stream.h265.length) {
                    lpVid = img.stream.h265[0].masterUrl || img.stream.h265[0].url || '';
                  }
                  if (lpVid) {
                    lpVid = lpVid.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
                    if (lpVid.indexOf('http://') === 0) lpVid = 'https://' + lpVid.substring(7);
                  }
                  if (lpVid && xhsVideoList.indexOf(lpVid) < 0) xhsVideoList.push(lpVid);
                }
              });
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

  if (!videoUrl && !images.length && !cover) return fail('\u672a\u63d0\u53d6\u5230\u5c0f\u7ea2\u4e66\u5185\u5bb9');

  // ===== BugPK 兜底：始终尝试获取动图live_photo完整视频列表（不覆盖已有videoUrl） =====

  if (!xhsVideoList.length) {
    try {
      var xhsBpRes = await _bugpk2Fetch(originalUrl);
      if (xhsBpRes.ok) {
        var xhsBpJson = await xhsBpRes.json();
        var xhsBpData = xhsBpJson && xhsBpJson.data;
        if (xhsBpData) {
          if (!title && xhsBpData.title) title = xhsBpData.title;
          if (!cover && xhsBpData.cover) cover = xhsBpData.cover;
          if (!authorName && xhsBpData.author && xhsBpData.author.name) authorName = xhsBpData.author.name;
          if (!authorId && xhsBpData.author && xhsBpData.author.id) authorId = String(xhsBpData.author.id);
          if (!authorAvatar && xhsBpData.author && xhsBpData.author.avatar) authorAvatar = xhsBpData.author.avatar;
          if (!videoUrl && xhsBpData.url && xhsBpData.url.indexOf('http') === 0) videoUrl = xhsBpData.url;
          if (!images.length && xhsBpData.images && xhsBpData.images.length) images = xhsBpData.images.filter(function(u){ return u && u.indexOf('http') === 0; });
          // 动图/实况照片 live_photo（始终提取，不限制!videoUrl）
          if (xhsBpData.live_photo && xhsBpData.live_photo.length) {
            for (var xhslpi = 0; xhslpi < xhsBpData.live_photo.length; xhslpi++) {
              var xhsLpItem = xhsBpData.live_photo[xhslpi] || {};
              var xhsLpVid = xhsLpItem.video || '';
              var xhsLpImg = xhsLpItem.image || '';
              if (xhsLpVid && xhsLpVid.indexOf('http') === 0 && xhsVideoList.indexOf(xhsLpVid) < 0) xhsVideoList.push(xhsLpVid);
              if (xhsLpImg && xhsLpImg.indexOf('http') === 0 && images.indexOf(xhsLpImg) < 0) images.push(xhsLpImg);
            }
            if (xhsVideoList.length && !videoUrl) videoUrl = xhsVideoList[0];
          }
        }
      }
    } catch(e) {}
  }

  // De-watermark all Xiaohongshu images regardless of extraction path
  for (var di = 0; di < images.length; di++) {
    var iu = images[di];
    if (iu.indexOf('sns-webpic-qc.xhscdn.com') >= 0) {
      images[di] = iu.replace(/^(?:https?:)?\/\/sns-webpic-qc\.xhscdn\.com\/[^\/]+\/[^\/]+\/([^!]+)(?:!\w+)?$/, 'https://ci.xiaohongshu.com/$1?imageView2/2/w/0/format/jpg/v3&c=v1');
    }
  }

  var dataType = noteIsVideoType ? 'video' : (videoUrl || xhsVideoList.length ? 'video' : (images.length ? 'image' : 'video'));

  var xhsRet = {
    type: dataType, title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || (xhsVideoList.length ? xhsVideoList[0] : ''), images: images,
  };
  if (xhsVideoList.length) xhsRet.videoList = xhsVideoList;
  return ok('xiaohongshu', xhsRet);
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
      var bpRes = await _bugpk2Fetch(originalUrl);
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
  var BAD_NAMES = ['快手用户', '神秘用户', '热门用户', '已注销', '账号已注销', '未知用户', '佚名', 'kwai user', 'KuaiShou User', 'null', 'undefined'];
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


  // 新增：直接正则匹配 snake_case 字段（v.m.chenzhongtech.com 页面格式）
  // snake_case 匹配：用重定向URL里的 userId= 参数精确定位作者 profile 对象
  if (!finalAuthor || !finalAuthor.name || !finalAuthor.id) {
    var scName = '', scId = '', scAvatar = '';
    var eidMatch = realUrl.match(/[?&]userId=([^&]+)/);
    if (eidMatch) {
      var authorEid = eidMatch[1];
      // 找 "profile":{"eid":"<authorEid>" 精确位置
      var profileMarker = '"profile":{"eid":"' + authorEid + '"';
      var profPos = html.indexOf(profileMarker);
      if (profPos < 0) {
        // 兜底1：只找 "eid":"<authorEid>"
        profPos = html.indexOf('"eid":"' + authorEid + '"');
      }
      if (profPos < 0) {
        // 兜底2：找 userEid，往后找 profile
        var uePos = html.indexOf('"userEid":"' + authorEid + '"');
        if (uePos >= 0) {
          var afterRegion = html.substring(uePos, uePos + 5000);
          var profInAfter = afterRegion.indexOf('"profile":{"eid":"' + authorEid + '"');
          if (profInAfter >= 0) profPos = uePos + profInAfter;
        }
      }
      if (profPos >= 0) {
        // 从 profile 开始取 2000 字符，提取字段
        var region = html.substring(profPos, profPos + 2000);
        var mName = region.match(/"user_name"\s*:\s*"([^"]+)"/);
        var mId = region.match(/"user_id"\s*:\s*(\d{5,15})/);
        var mAv = region.match(/"headurl"\s*:\s*"([^"]+)"/);
        if (mName) scName = mName[1];
        if (mId) scId = mId[1];
        if (mAv) scAvatar = mAv[1];
      }
    }
    // 兜底：用 isSubscribe 锚点找
    if (!scId) {
      var anchorPos = html.indexOf('"isSubscribe"');
      if (anchorPos < 0) anchorPos = html.indexOf('"isFollowing"');
      if (anchorPos > 0) {
        var region2 = html.substring(Math.max(0, anchorPos - 2000), anchorPos);
        var mName2 = region2.match(/"user_name"\s*:\s*"([^"]+)"/);
        var mId2 = region2.match(/"user_id"\s*:\s*(\d{5,15})/);
        var mAv2 = region2.match(/"headurl"\s*:\s*"([^"]+)"/);
        if (mName2) scName = mName2[1];
        if (mId2) scId = mId2[1];
        if (mAv2) scAvatar = mAv2[1];
      }
    }
    // 最终兜底：取最后一个 user_id/user_name
    if (!scId) {
      var allIdMatches = [...html.matchAll(/"user_id"\s*:\s*(\d{5,15})/g)];
      var allNameMatches = [...html.matchAll(/"user_name"\s*:\s*"([^"]+)"/g)];
      if (allIdMatches.length) scId = allIdMatches[allIdMatches.length - 1][1];
      if (allNameMatches.length) scName = allNameMatches[allNameMatches.length - 1][1];
    }
    if (scName || scId) {
      if (!finalAuthor) finalAuthor = { name: '', id: '', avatar: '' };
      if (!finalAuthor.name && scName) finalAuthor.name = decodeText(scName);
      if (!finalAuthor.id && scId) finalAuthor.id = String(scId);
      if (!finalAuthor.avatar && scAvatar) finalAuthor.avatar = normalizeUrl(scAvatar);
    }
  }
  // BugPK 2.0 补全：SSR 作者信息不全时调用
  var needAuthor = !finalAuthor || !finalAuthor.name || !finalAuthor.id;
  var needVideo = !video.videoUrl;
  if (needAuthor || needVideo) {
    try {
      var bpRes = await _bugpk2Fetch(originalUrl, 10000);
      if (bpRes.ok) {
        var bpJson = await bpRes.json();
        var bd = bpJson && bpJson.data;
        if (bd) {
          if (needAuthor && bd.author) {
            if (!finalAuthor) finalAuthor = { name: "", id: "", avatar: "" };
            if (!finalAuthor.name && bd.author.name) finalAuthor.name = bd.author.name;
            if (!finalAuthor.id && bd.author.id) finalAuthor.id = bd.author.id;
            if (!finalAuthor.avatar && bd.author.avatar) finalAuthor.avatar = bd.author.avatar;
          }
          if (needVideo && bd.url) video.videoUrl = bd.url;
          if (!video.cover && bd.cover) video.cover = bd.cover;
          if (!video.title && bd.title) video.title = bd.title;
          if (bd.images && bd.images.length && (!video.images || !video.images.length)) {
            video.images = bd.images.filter(function(u){ return u && u.indexOf("http") === 0; });
          }
          if (bd.live_photo && bd.live_photo.length) {
            var lpVids = [];
            bd.live_photo.forEach(function(lp) { if (lp.video) lpVids.push(lp.video); });
            if (lpVids.length) {
              if (!video.videoUrl) video.videoUrl = lpVids[0];
              if (!video.videoList) video.videoList = [];
              video.videoList = video.videoList.concat(lpVids);
            }
          }
        }
      }
    } catch(e) {}
  }

  // 
  finalAuthor = fillAvatarIfMissing(finalAuthor, html);

  if (!video.videoUrl && !video.cover) return fail('未提取到快手视频地址');
  // 从页面 JSON 数据中取真实图片
  if ((!video.images || !video.images.length) && !video.videoUrl) {
    var photoMatch = html.match(/\"photo\"\s*:\s*\{[^}]+\"coverUrls\"\s*:\s*\[([^\]]+)\]/);
    if (photoMatch) {
      var urls = photoMatch[1].match(/\"url\"\s*:\s*\"([^\"]+)\"/g);
      if (urls && urls.length > 0) {
        video.images = [];
        urls.forEach(function(u) {
          var pu = u.match(/\"url\"\s*:\s*\"([^\"]+)\"/);
          if (pu) video.images.push(pu[1].replace(/\\u002F/g, '/'));
        });
      }
    }
    if ((!video.images || !video.images.length) && video.cover && video.cover.indexOf('yximgs') >= 0) {
      video.images = [video.cover];
    }
  }

    var ksImages = (video.images && video.images.length > 0) ? video.images : [];
  var ksVideoList = (video.videoList && video.videoList.length > 0) ? video.videoList : [];
  var ksRet = {
    type: (video.videoUrl || ksVideoList.length) ? 'video' : (ksImages.length ? 'image' : 'video'),
    title: video.title || '',
    desc: video.title || '',
    author: finalAuthor || { name: '', id: '', avatar: '' },
    cover: video.cover || '',
    url: (video.videoUrl || ksVideoList.length) ? (video.videoUrl || ksVideoList[0] || '') : (ksImages.length ? '' : (video.videoUrl || '')),
    images: ksImages,
  };
  if (ksVideoList.length) ksRet.videoList = ksVideoList;
  return ok('kuaishou', ksRet);
}



// ===== 抖音笔记/图集解析 =====
function extractRENDER_DATA(html) {
  if (!html) return null;
  // Try multiple RENDER_DATA ID patterns
  var patterns = ['id="RENDER_DATA"', "id='RENDER_DATA'", 'id="__RENDER_DATA__"', "id='__RENDER_DATA__'", 'id="__NEXT_DATA__"'];
  for (var pi = 0; pi < patterns.length; pi++) {
    var idx = html.indexOf(patterns[pi]);
    if (idx >= 0) {
      var start = html.indexOf('>', idx) + 1;
      if (start > 0) {
        var end = html.indexOf('</script>', start);
        if (end > start) {
          return [null, html.substring(start, end)];
        }
      }
    }
  }
  return null;
}

async function parseDouyinNote(noteId) {
var title = "", cover = "", authorName = "", authorAvatar = "", authorId = "", images = [], videoUrl = "", videoList = [];

  // Step 1: Try douyin note API endpoint first (works from Cloudflare Workers IP)
  try {
    var apiRes = await fetch('https://www.douyin.com/aweme/v1/web/note/detail/?note_id=' + noteId, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json',
      },
    });
    if (apiRes.ok) {
      var apiJson = await apiRes.json();
      var noteDetail = apiJson.note || apiJson.data || apiJson;
      var noteData = null;
      if (noteDetail && noteDetail.noteDetailMap) {
        var ndKeys = Object.keys(noteDetail.noteDetailMap);
        if (ndKeys.length) noteData = noteDetail.noteDetailMap[ndKeys[0]].note;
      } else if (noteDetail && noteDetail.note) {
        noteData = noteDetail.note;
      }
      if (noteData) {
        if (!title) title = noteData.title || noteData.desc || '';
        if (!authorName) authorName = (noteData.user && noteData.user.nickname) || '';
        if (!authorAvatar) authorAvatar = (noteData.user && noteData.user.avatar) || '';
        if (!authorId) authorId = (noteData.user && (noteData.user.userId || noteData.user.id)) || '';
        if (!cover) cover = (noteData.cover && (noteData.cover.urlDefault || noteData.cover.url)) || '';
        if (noteData.imageList && noteData.imageList.length) {
          noteData.imageList.forEach(function(img) {
            var hasVideoInImg = img.video && img.video.media && img.video.media.stream;
            if (hasVideoInImg) {
              var vidCandidates = img.video.media.stream.h264 || img.video.media.stream.h265 || [];
              var foundVid = '';
              for (var vi = 0; vi < vidCandidates.length; vi++) {
                var vc = vidCandidates[vi];
                if (vc.masterUrl || vc.url) { 
                foundVid = vc.masterUrl || vc.url; 
                // For note imageList items, also check play_addr and other fields
                if (vc.play_addr && vc.play_addr.url_list && vc.play_addr.url_list[0]) {
                  foundVid = vc.play_addr.url_list[0];
                }
                break;
              }
              }
              if (foundVid) { videoList.push(foundVid); if (!videoUrl) videoUrl = foundVid; }
            }
            var imgUrl = img.urlDefault || img.url || '';
            if (imgUrl && images.indexOf(imgUrl) < 0) images.push(imgUrl);
          });
        }
      }
    }
  } catch(e) {}

  // Also try iesdouyin note detail endpoint
      if (images.length === 0 && !videoUrl) {
        var altRes = await fetch('https://www.iesdouyin.com/aweme/v1/web/note/detail/?note_id=' + noteId, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.douyin.com/',
            'Accept': 'application/json',
          },
        });
        if (altRes.ok) {
          var altJson = await altRes.json();
          var altDetail = altJson.note || altJson.data || altJson;
          var altData = null;
          if (altDetail && altDetail.noteDetailMap) {
            var ak = Object.keys(altDetail.noteDetailMap);
            if (ak.length) altData = altDetail.noteDetailMap[ak[0]].note;
          } else if (altDetail && altDetail.note) {
            altData = altDetail.note;
          }
          if (altData) {
            if (!title) title = altData.title || altData.desc || '';
            if (!authorName) authorName = (altData.user && altData.user.nickname) || '';
            if (!authorAvatar) authorAvatar = (altData.user && altData.user.avatar) || '';
            if (!authorId) authorId = (altData.user && (altData.user.userId || altData.user.id)) || '';
            if (!cover) cover = (altData.cover && (altData.cover.urlDefault || altData.cover.url)) || '';
            if (altData.imageList && altData.imageList.length) {
              altData.imageList.forEach(function(img) {
                var hv = img.video && img.video.media && img.video.media.stream;
                if (hv) {
                  var vc2 = img.video.media.stream.h264 || img.video.media.stream.h265 || [];
                  var fv = '';
                  for (var vi2 = 0; vi2 < vc2.length; vi2++) {
                    if (vc2[vi2].masterUrl || vc2[vi2].url) { fv = vc2[vi2].masterUrl || vc2[vi2].url; break; }
                  }
                  if (fv) { videoList.push(fv); if (!videoUrl) videoUrl = fv; }
                }
                var iu = img.urlDefault || img.url || '';
                if (iu && images.indexOf(iu) < 0) images.push(iu);
              });
            }
          }
        }
      }


  // Step 2: Try iesdouyin aweme detail API
  if (images.length === 0 && !videoUrl) {
    try {
      var apiRes2 = await fetch('https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=' + noteId, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'application/json',
        },
      });
      if (apiRes2.ok) {
        var apiJson2 = await apiRes2.json();
        var itemData = apiJson2.aweme_detail || apiJson2.data || apiJson2;
        if (itemData && itemData.images && itemData.images.length) {
          itemData.images.forEach(function(img) {
            // Extract embedded video from each image item (for 动图/mixed works)
            if (img.video && img.video.media && img.video.media.stream) {
              var vidCandidates = img.video.media.stream.h264 || img.video.media.stream.h265 || [];
              var foundVid = '';
              for (var vi = 0; vi < vidCandidates.length; vi++) {
                var vc = vidCandidates[vi];
                var vUrls = [vc.masterUrl, vc.url].concat(vc.backupUrls || []);
                for (var vu = 0; vu < vUrls.length; vu++) {
                  if (vUrls[vu] && (vUrls[vu].indexOf("sns-video-zl") > 0 || vUrls[vu].indexOf("sns-video-hw") > 0 || vUrls[vu].indexOf('.zjcdn.com') > 0 || vUrls[vu].indexOf('.douyinvod') > 0 || vUrls[vu].indexOf('365yg.com') > 0 || vUrls[vu].indexOf('ixigua.com') > 0)) {
                    foundVid = vUrls[vu]; break;
                  }
                }
                if (foundVid) break;
              }
              if (!foundVid && vidCandidates.length > 0) {
                foundVid = vidCandidates[0].masterUrl || vidCandidates[0].url || '';
              }
              if (foundVid) {
                videoList.push(foundVid);
                if (!videoUrl) videoUrl = foundVid;
              }
            }
            var imgUrl = img.url_list && img.url_list[0];
            if (imgUrl && images.indexOf(imgUrl) < 0) images.push(imgUrl);
          });
        }
        if (!title) title = itemData.desc || '';
        if (!authorName) authorName = (itemData.author && itemData.author.nickname) || '';
        if (!authorAvatar) authorAvatar = (itemData.author && (itemData.author.avatar_larger && itemData.author.avatar_larger.url_list && itemData.author.avatar_larger.url_list[0])) || '';
        if (!authorId) authorId = (itemData.author && (itemData.author.unique_id || itemData.author.uid)) || '';
        if (!cover) cover = (itemData.video && itemData.video.origin_cover && itemData.video.origin_cover.url_list && itemData.video.origin_cover.url_list[0]) || '';
      }
    } catch(e) {}
  }

  // Step 3: Fall back to page scraping (RENDER_DATA from HTML)
  if (images.length === 0 && !videoUrl) {
  var noteUrl = "https://www.douyin.com/note/" + noteId + "/";
  var html;
  try { html = await fetchHtml(noteUrl, { Referer: "https://www.douyin.com/" }); } catch(e) { if (images.length > 0 || videoUrl) { return { type: videoUrl ? "video" : "image", title: title, desc: title || "", author: { name: authorName, id: authorId, avatar: authorAvatar }, cover: cover, url: videoUrl || "", images: images, videoList: videoList }; } return null; }
  var rdMatch = extractRENDER_DATA(html);
  if (rdMatch) {
    try {
      var decoded = decodeURIComponent(rdMatch[1]);
      var state = JSON.parse(decoded);
      var noteDetail = state && state.note && state.note.noteDetailMap;
      if (noteDetail) {
        var keys = Object.keys(noteDetail);
        if (keys.length) {
          var note = noteDetail[keys[0]] && noteDetail[keys[0]].note;
          if (note) {
            if (!title) title = note.title || note.desc || "";
            if (!authorName) authorName = (note.user && note.user.nickname) || "";
            if (!authorAvatar) authorAvatar = (note.user && note.user.avatar) || "";
            if (!authorId) authorId = (note.user && note.user.userId) || "";
            if (!cover && note.cover) cover = note.cover.urlDefault || note.cover.url || "";
            if (note.imageList && note.imageList.length) {
              note.imageList.forEach(function(img) {
                var hasVideoData = img.video && img.video.media && img.video.media.stream;
                if (hasVideoData) {
                  var vidCandidates = img.video.media.stream.h264 || img.video.media.stream.h265 || [];
                  var foundVid = '';
                  for (var vi = 0; vi < vidCandidates.length; vi++) {
                    var vc = vidCandidates[vi];
                    var vUrls = [vc.masterUrl, vc.url].concat(vc.backupUrls || []);
                    for (var vu = 0; vu < vUrls.length; vu++) {
                      if (vUrls[vu] && (vUrls[vu].indexOf("sns-video-zl") > 0 || vUrls[vu].indexOf("sns-video-hw") > 0 || vUrls[vu].indexOf('.zjcdn.com') > 0 || vUrls[vu].indexOf('.douyinvod') > 0 || vUrls[vu].indexOf('365yg.com') > 0 || vUrls[vu].indexOf('ixigua.com') > 0)) {
                        foundVid = vUrls[vu]; break;
                      }
                    }
                    if (foundVid) break;
                  }
                  if (!foundVid && vidCandidates.length > 0) {
                    foundVid = vidCandidates[0].masterUrl || vidCandidates[0].url || '';
                  }
                  if (foundVid) {
                    videoList.push(foundVid);
                    if (!videoUrl) videoUrl = foundVid;
                  }
                }
                var imgUrl = img.urlDefault || img.url || '';
                if (imgUrl) images.push(imgUrl);
              });
            }
            var audioUrl = "";
            if (note.music && note.music.playUrl) {
              var muList = note.music.playUrl.urlList || note.music.playUrl.url_list || [];
              if (muList.length > 0) audioUrl = muList[0];
            }
            if (!audioUrl && note.music && note.music.mid) {
              audioUrl = "https://sf6-cdn-tos.douyinstatic.com/obj/" + note.music.mid;
            }
            if (note.video && note.video.media && note.video.media.stream) {
              var candidates = note.video.media.stream.h264 || note.video.media.stream.h265 || [];
              for (var ci = 0; ci < candidates.length; ci++) {
                var cdd = candidates[ci];
                var urls = [cdd.masterUrl, cdd.url].concat(cdd.backupUrls || []);
                for (var ui = 0; ui < urls.length; ui++) {
                  if (urls[ui] && (urls[ui].indexOf("sns-video-zl") > 0 || urls[ui].indexOf("sns-video-hw") > 0 || urls[ui].indexOf('.zjcdn.com') > 0 || urls[ui].indexOf('.douyinvod') > 0 || urls[ui].indexOf('365yg.com') > 0 || urls[ui].indexOf('ixigua.com') > 0)) {
                    videoUrl = urls[ui]; break;
                  }
                }
                if (videoUrl) break;
              }
              if (!videoUrl && candidates.length > 0) {
                videoUrl = candidates[0].masterUrl || candidates[0].url || "";
              }
            }
            if (!videoUrl && audioUrl) videoUrl = audioUrl;
          }
        }
      }
    } catch(e) {}
  }
  }

    // Step 4: BugPK fallback for douyin notes (with retry)
  if (!videoList.length) {
    for (var bpri = 0; bpri < 3 && !videoList.length; bpri++) {
      try {
        var bpNoteUrl = "https://www.douyin.com/note/" + noteId + "/";
        var bpT = String(Date.now());
        var bpRes3 = await _bugpk2Fetch(bpNoteUrl, 8000);
        if (bpRes3.ok) {
          var bpJson3 = await bpRes3.json();
          if (bpJson3.code === 200 && bpJson3.data) {
            if (bpJson3.data.live_photo && bpJson3.data.live_photo.length) {
              bpJson3.data.live_photo.forEach(function(lp) {
                if (lp.video && videoList.indexOf(lp.video) < 0) {
                  videoList.push(lp.video);
                  if (!videoUrl) videoUrl = lp.video;
                }
                if (lp.image && images.indexOf(lp.image) < 0) images.push(lp.image);
              });
            }
            if (!title && (bpJson3.data.title || bpJson3.data.desc)) title = bpJson3.data.title || bpJson3.data.desc || "";
            if (!cover && bpJson3.data.cover) cover = bpJson3.data.cover;
            var bpA = bpJson3.data.author || bpJson3.data.extra || {};
            if (!authorName) authorName = bpA.name || bpA.nickname || "";
            if (!authorId) authorId = String(bpA.id || bpA.uid || "");
            if (!authorAvatar) authorAvatar = bpA.avatar || "";
            if (!videoUrl && bpJson3.data.url && bpJson3.data.url.indexOf("aweme.snssdk.com") < 0) videoUrl = bpJson3.data.url;
            if (bpJson3.data.images && bpJson3.data.images.length) {
              bpJson3.data.images.forEach(function(img) {
                if (img && images.indexOf(img) < 0) images.push(img);
              });
            }
          }
        }
      } catch(e) {}
    }
  }
  if (images.length > 0 || videoUrl) {
    return { type: videoUrl ? "video" : "image", title: title, desc: title || "",
      author: { name: authorName, id: authorId, avatar: authorAvatar },
      cover: cover, url: videoUrl || "", images: images, videoList: videoList };
  }
  return null;
}

async function parseXiaohongshu(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var videoUrl = '', title = '', cover = '', authorName = '', authorAvatar = '', authorId = '', images = [], xhsVideoList = [];
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
              if (noteData.video.consumer && noteData.video.consumer.originVideoKey) {
                videoUrl = 'https://sns-video-hw.xhscdn.com/' + noteData.video.consumer.originVideoKey;
              }
            }
            if (noteData.imageList && noteData.imageList.length) {
              noteData.imageList.forEach(function(img) {
                var iu = img.urlDefault || img.url || '';
                if (iu) images.push( iu.indexOf('sns-webpic-qc.xhscdn.com') >= 0 ? iu.replace(/^(?:https?:)?\/\/sns-webpic-qc\.xhscdn\.com\/[^/]+\/[^/]+\/([^!]+)(?:!\w+)?$/, 'https://ci.xiaohongshu.com/$1?imageView2/2/w/0/format/jpg/v3&c=v1') : iu );
                // 动图/实况照片：提取视频URL（直接取第一个masterUrl，不经过pickBestVideoUrl）
                if (img.livePhoto && img.stream) {
                  var lpVid = '';
                  if (img.stream.h264 && img.stream.h264.length) {
                    lpVid = img.stream.h264[0].masterUrl || img.stream.h264[0].url || '';
                  }
                  if (!lpVid && img.stream.h265 && img.stream.h265.length) {
                    lpVid = img.stream.h265[0].masterUrl || img.stream.h265[0].url || '';
                  }
                  if (lpVid) {
                    lpVid = lpVid.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
                    if (lpVid.indexOf('http://') === 0) lpVid = 'https://' + lpVid.substring(7);
                  }
                  if (lpVid && xhsVideoList.indexOf(lpVid) < 0) xhsVideoList.push(lpVid);
                }
              });
            }
          }
        } catch(e) {}
      }
    }
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

  // ===== BugPK 兜底：始终尝试获取动图live_photo完整视频列表（不覆盖已有videoUrl） =====

  if (!xhsVideoList.length) {
    try {
      var xhsBpRes = await _bugpk2Fetch(originalUrl, 8000);
      if (xhsBpRes.ok) {
        var xhsBpJson = await xhsBpRes.json();
        var xhsBpData = xhsBpJson && xhsBpJson.data;
        if (xhsBpData) {
          if (!title && xhsBpData.title) title = xhsBpData.title;
          if (!cover && xhsBpData.cover) cover = xhsBpData.cover;
          if (!authorName && xhsBpData.author && xhsBpData.author.name) authorName = xhsBpData.author.name;
          if (!authorId && xhsBpData.author && xhsBpData.author.id) authorId = String(xhsBpData.author.id);
          if (!authorAvatar && xhsBpData.author && xhsBpData.author.avatar) authorAvatar = xhsBpData.author.avatar;
          if (!videoUrl && xhsBpData.url && xhsBpData.url.indexOf('http') === 0) videoUrl = xhsBpData.url;
          if (!images.length && xhsBpData.images && xhsBpData.images.length) images = xhsBpData.images.filter(function(u){ return u && u.indexOf('http') === 0; });
          // 动图/实况照片 live_photo（始终提取，不限制!videoUrl）
          if (xhsBpData.live_photo && xhsBpData.live_photo.length) {
            for (var xhslpi = 0; xhslpi < xhsBpData.live_photo.length; xhslpi++) {
              var xhsLpItem = xhsBpData.live_photo[xhslpi] || {};
              var xhsLpVid = xhsLpItem.video || '';
              var xhsLpImg = xhsLpItem.image || '';
              if (xhsLpVid && xhsLpVid.indexOf('http') === 0 && xhsVideoList.indexOf(xhsLpVid) < 0) xhsVideoList.push(xhsLpVid);
              if (xhsLpImg && xhsLpImg.indexOf('http') === 0 && images.indexOf(xhsLpImg) < 0) images.push(xhsLpImg);
            }
            if (xhsVideoList.length && !videoUrl) videoUrl = xhsVideoList[0];
          }
        }
      }
    } catch(e) {}
  }

  // De-watermark all Xiaohongshu images regardless of extraction path
  for (var di = 0; di < images.length; di++) {
    var iu = images[di];
    if (iu.indexOf('sns-webpic-qc.xhscdn.com') >= 0) {
      images[di] = iu.replace(/^(?:https?:)?\/\/sns-webpic-qc\.xhscdn\.com\/[^\/]+\/[^\/]+\/([^!]+)(?:!\w+)?$/, 'https://ci.xiaohongshu.com/$1?imageView2/2/w/0/format/jpg/v3&c=v1');
    }
  }

  var dataType = noteIsVideoType ? 'video' : (videoUrl || xhsVideoList.length ? 'video' : (images.length ? 'image' : 'video'));

  var xhsRet = {
    type: dataType, title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId || '', avatar: authorAvatar || '' },
    cover: cover || '', url: videoUrl || (xhsVideoList.length ? xhsVideoList[0] : ''), images: images,
  };
  if (xhsVideoList.length) xhsRet.videoList = xhsVideoList;
  return ok('xiaohongshu', xhsRet);
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

// ===== TikTok =====
function extractTiktokItemStruct(html) {
  try {
    var marker = '__UNIVERSAL_DATA_FOR_REHYDRATION__';
    var idx = html.indexOf(marker);
    if (idx < 0) return null;
    var scriptEnd = html.indexOf('</script>', idx);
    var jsonStart = html.indexOf('>', idx);
    if (scriptEnd < 0 || jsonStart < 0 || jsonStart > scriptEnd) return null;
    var raw = html.substring(jsonStart + 1, scriptEnd).trim();
    if (!raw) return null;
    var uni = JSON.parse(raw);
    var scope = (uni && uni.__DEFAULT_SCOPE__) || uni || {};
    var detail = scope['webapp.reflow.video.detail'] || scope['webapp.reflow.photo.detail'] || {};
    return (detail.itemInfo && detail.itemInfo.itemStruct) || null;
  } catch (e) {
    return null;
  }
}

function tiktokUrlFromField(field) {
  if (typeof field === 'string') return field;
  if (!field) return '';
  if (Array.isArray(field.urlList) && field.urlList.length) return field.urlList[0];
  if (field.imageURL) {
    if (typeof field.imageURL === 'string') return field.imageURL;
    if (Array.isArray(field.imageURL.urlList) && field.imageURL.urlList.length) return field.imageURL.urlList[0];
  }
  return '';
}

function tiktokUnescapeUrl(s) {
  if (!s) return s;
  return s.split('\\u002F').join('/').split('\\/').join('/');
}

async function parseTiktok(originalUrl) {
  var realUrl = await resolveRedirect(originalUrl);
  var html = await fetchHtml(realUrl, { Referer: 'https://www.tiktok.com/' });

  var title = '', cover = '', videoUrl = '', authorName = '', authorId = '', authorAvatar = '';
  var images = [];

  // ① 从页面提取图集图片和作者信息
  var item = extractTiktokItemStruct(html);
  if (item) {
    var a = item.author || {};
    authorName = a.nickname || '';
    authorId = a.uniqueId || a.id || '';
    authorAvatar = a.avatarLarger || a.avatarMedium || a.avatarThumb || '';
    if (item.desc) title = item.desc;
    var ip = item.imagePost;
    if (ip && Array.isArray(ip.images) && ip.images.length) {
      for (var i = 0; i < ip.images.length; i++) {
        var im = ip.images[i];
        if (!im) continue;
        var u = tiktokUrlFromField(im.imageURL);
        if (u) images.push(u);
      }
      if (!cover) cover = tiktokUrlFromField(ip.cover);
    }
  }

  // ② 正则补齐
  var allNick = html.match(/"nickname":"([^"]+)"/g);
  var allUid = html.match(/"uniqueId":"([^"]+)"/g);
  var allAvatar = html.match(/"avatarLarger":"([^"]+)"/g);
  if (!authorName && allNick && allNick.length) authorName = allNick[allNick.length - 1].match(/"nickname":"([^"]+)"/)[1];
  if (!authorId && allUid && allUid.length) authorId = allUid[allUid.length - 1].match(/"uniqueId":"([^"]+)"/)[1];
  if (!authorAvatar && allAvatar && allAvatar.length) authorAvatar = tiktokUnescapeUrl(allAvatar[allAvatar.length - 1].match(/"avatarLarger":"([^"]+)"/)[1]);

  // URL提取作者ID兜底
  if (!authorId) {
    var urlUid = realUrl.match(/@([^/?]+)/);
    if (urlUid) authorId = decodeURIComponent(urlUid[1]);
  }

  // 图集图片兜底
  if (!images.length) {
    var urlListRe = /"urlList":\["([^"]+)"/g;
    var um;
    var seenImg = {};
    while ((um = urlListRe.exec(html)) !== null) {
      var u2 = tiktokUnescapeUrl(um[1]);
      if (u2.indexOf('photomode') >= 0) {
        var keyMatch = u2.match(/photomode-sg\/([^~?]+)/);
        var key = keyMatch ? keyMatch[1] : u2;
        if (!seenImg[key]) { seenImg[key] = true; images.push(u2); }
      }
    }
  }
  if (!images.length) {
    var directImgRe = /https:\/\/[^"\\]*tos-alisg-i-photomode[^"\\]*/g;
    var dm;
    var seenDirect = {};
    while ((dm = directImgRe.exec(html)) !== null) {
      var du = tiktokUnescapeUrl(dm[0]).replace(/&amp;/g, '&');
      var dk = du.match(/photomode-sg\/([^~?]+)/);
      var dkey = dk ? dk[1] : du;
      if (!seenDirect[dkey]) { seenDirect[dkey] = true; images.push(du); }
    }
  }

  // 图集直接返回
  if (images.length) {
    return ok('tiktok', {
      type: 'image', title: title || '', desc: title || '',
      author: { name: authorName || '', id: authorId, avatar: authorAvatar || '' },
      cover: cover || images[0], url: '', images: images,
    });
  }

  // ③ 视频走 MusicalDown 拿1080P
  var mdUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  try {
    var mdGet = await fetch('https://musicaldown.com/en', { headers: { 'User-Agent': mdUA } });
    var mdGet = await fetch('https://musicaldown.com/en', { headers: { 'User-Agent': mdUA } });
    var mdHtml = await mdGet.text();
    var mdCookie = '';
    var mdSetCookie = mdGet.headers.get('set-cookie');
    if (mdSetCookie) { mdCookie = mdSetCookie.split(',').map(function(c){return c.split(';')[0].trim();}).join('; '); }
    var mdInputName = (mdHtml.match(/name="(_[a-zA-Z]+)"[^>]*id="link_url"/) || [])[1] || '';
    var mdHidden = mdHtml.match(/name="(_[a-zA-Z]+)"[^>]*type="hidden"[^>]*value="([^"]*)"/);
    if (mdInputName && mdHidden) {
      var mdPostBody = mdInputName + '=' + encodeURIComponent(originalUrl || realUrl) +
        '&' + mdHidden[1] + '=' + mdHidden[2] + '&verify=1';
      var mdPostHeaders = { 'User-Agent': mdUA, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://musicaldown.com/en' };
      if (mdCookie) mdPostHeaders['Cookie'] = mdCookie;
      var mdPost = await fetch('https://musicaldown.com/download', { method: 'POST', headers: mdPostHeaders, body: mdPostBody });
      var mdResult = await mdPost.text();
      for (var mdi = 0; mdi < mdAllLinks.length; mdi++) {
        var mdToken = mdAllLinks[mdi][2];
        var mdPayload = mdToken.split('.')[1];
        try {
          mdPayload = mdPayload.replace(/-/g, '+').replace(/_/g, '/');
          while (mdPayload.length % 4) mdPayload += '=';
          var mdJson = JSON.parse(atob(mdPayload));
          if (mdJson.filename && mdJson.filename.indexOf('[HD]') >= 0 && mdJson.url) {
            videoUrl = mdJson.url;
          } else if (!videoUrl && mdJson.url && mdJson.url.indexOf('.mp4') >= 0) {
            videoUrl = mdJson.url;
          }
        } catch(e) {}
      }
      if (!authorId) {
        var mdAuthor = mdResult.match(/@([a-zA-Z0-9._]+)/);
        if (mdAuthor) authorId = mdAuthor[1];
      }
    }
  } catch(e) {}

  if (!videoUrl) return fail('未提取到TikTok视频地址 (mdInputName=' + mdInputName + ', mdHidden=' + (mdHidden?'yes':'no') + ', mdResultLen=' + (typeof mdResult !== 'undefined' ? mdResult.length : 'undef') + ')');

  return ok('tiktok', {
    type: 'video', title: title || '', desc: title || '',
    author: { name: authorName || '', id: authorId, avatar: authorAvatar || '' },
    cover: cover, url: videoUrl, images: [],
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

// ===== Toutiao =====
async function parseToutiao(originalUrl) {
  try {
    var itemId = '';
    var directMatch = originalUrl.match(/\/(video|i|w)\/(\d+)/);
    if (directMatch) {
      itemId = directMatch[2];
    } else {
      var redirectResp = await fetch(originalUrl, {
        method: 'GET', redirect: 'manual',
        headers: { 'User-Agent': UA }
      });
      var location = redirectResp.headers.get('location') || '';
      var m = location.match(/\/(video|i|w)\/(\d+)/);
      if (m) itemId = m[2];
    }
    if (!itemId) return fail('toutiao item_id not found');

    var infoUrl = 'https://m.toutiao.com/i' + itemId + '/info/';
    var infoResp = await fetch(infoUrl, { headers: { 'User-Agent': UA } });
    var info = await infoResp.json();
    var infoData = info.data || {};

    // ===== 图集（微头条）=====
    var threadBase = infoData.thread && infoData.thread.thread_base;
    var imageList = threadBase && threadBase.large_image_list;
    if (imageList && imageList.length > 0) {
      var imgTitle = threadBase.title || threadBase.content || '';
      var imgDesc = threadBase.content || imgTitle;
      var imgAuthorName = '', imgAuthorId = '', imgAuthorAvatar = '';
      var userInfo = threadBase.user && threadBase.user.info;
      if (userInfo) {
        imgAuthorName = userInfo.name || '';
        var authorIdStr = userInfo.user_url || userInfo.schema || '';
        var uidMatch = authorIdStr.match(/uid=(\d+)/) || authorIdStr.match(/\/profile\/(\d+)/);
        imgAuthorId = uidMatch ? uidMatch[1] : '';
        imgAuthorAvatar = userInfo.avatar_url || userInfo.avatar || '';
      }
      if (!imgAuthorAvatar) {
        var avMatch = JSON.stringify(infoData).match(/(https?:\/\/[^"\s]+user-avatar[^"\s]+)/);
        if (avMatch) imgAuthorAvatar = avMatch[1];
      }
      var images = [];
      for (var ii = 0; ii < imageList.length; ii++) {
        var imgUrl = imageList[ii].url || (imageList[ii].url_list && imageList[ii].url_list[0] && imageList[ii].url_list[0].url);
        if (imgUrl) images.push(imgUrl);
      }
      if (images.length === 0) return fail('toutiao images empty');
      return ok('toutiao', {
        type: 'image', title: imgTitle, desc: imgDesc,
        author: { name: imgAuthorName, id: imgAuthorId, avatar: imgAuthorAvatar },
        cover: images[0], url: '', images: images
      });
    }

    // ===== 视频 =====
    var title = infoData.title || '';
    var cover = infoData.poster_url || '';
    var authorName = '', authorId = '', authorAvatar = '';
    var mu = infoData.media_user;
    if (mu) {
      authorName = mu.name || mu.screen_name || '';
      authorId = mu.user_id || mu.id || '';
      authorAvatar = mu.avatar_url || '';
    }

    var htmlContent = infoData.content || '';
    var tokenMatch = htmlContent.match(/data-token='([^']+)'/);
    if (!tokenMatch) return fail('toutiao data-token not found');

    var dataToken = tokenMatch[1];
    var binary = atob(dataToken);
    var bytes = new Uint8Array(binary.length);
    for (var ti = 0; ti < binary.length; ti++) bytes[ti] = binary.charCodeAt(ti);
    var decoded = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    var playToken = (decoded.GetPlayInfoToken || '').replace(/\\u0026/g, '&');
    if (!playToken) return fail('toutiao play token invalid');

    var playUrl = 'https://vod.bytedanceapi.com/?' + playToken;
    var playResp = await fetch(playUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://m.toutiao.com/' }
    });
    var playData = await playResp.json();
    var playList = playData.Result && playData.Result.Data && playData.Result.Data.PlayInfoList;
    if (!playList || playList.length === 0) return fail('toutiao playlist empty');

    var best = playList[0];
    for (var pi = 1; pi < playList.length; pi++) {
      if (playList[pi].Bitrate > best.Bitrate) best = playList[pi];
    }
    var videoUrl = best.MainPlayUrl || best.BackupPlayUrl || '';
    if (!videoUrl) return fail('toutiao video url not found');

    return ok('toutiao', {
      type: 'video', title: title, desc: title,
      author: { name: authorName, id: authorId, avatar: authorAvatar },
      cover: cover, url: videoUrl, images: []
    });
  } catch (e) {
    return fail('toutiao parse error: ' + (e && e.message ? e.message : String(e)));
  }
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
    var res = await _bugpk2Fetch(originalUrl, 8000);
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

// ===== 微信视频�?=====
async function parseWeixin(originalUrl) {

  // If finder.video.qq.com direct URL, return directly
  if (/finder\.video\.qq\.com/.test(originalUrl)) {
    return ok('weixin', {
      _source: 'direct',
      type: 'video',
      title: '',
      desc: '',
      author: { name: '', id: '', avatar: '' },
      cover: '',
      url: originalUrl,
      images: [],
    });
  }
  // 重试3次，每次使用不同的策�?
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

      // 策略4: 查找任何 JSON-LD �?video 相关 script
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
          _source: 'html',
          type: 'video', title: title || desc || '', desc: desc || title || '',
          author: { name: author || '', id: '', avatar: authorAvatar || '' },
          cover: cover || '', url: videoUrl, images: [],
        });
      }
    } catch(e) { lastErr = e; }
  }

  
  // 先调微信API获取元数据（作者/标题/封面，免费）
  var wxTitle = '', wxAuthor = '', wxAvatar = '', wxCover = '';
  try {
    var wxHeaders = {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://channels.weixin.qq.com/',
      'Origin': 'https://channels.weixin.qq.com',
      'X-Requested-With': 'XMLHttpRequest',
    };
    var shortUri = originalUrl.match(/sph\/(\w+)/);
    if (!shortUri) shortUri = originalUrl.match(/[\?&]id=(\w+)/);
    if (shortUri) {
      var wxRes = await fetch('https://channels.weixin.qq.com/finder-preview/api/feed/get_feed_info', {
        method: 'POST', headers: wxHeaders,
        body: JSON.stringify({ baseReq: { generalToken: '' }, shortUri: shortUri[1] })
      });
      if (wxRes.ok) {
        var wxJson = await wxRes.json();
        if (wxJson.errCode === 0 && wxJson.data && wxJson.data.feedInfo) {
          wxTitle = wxJson.data.feedInfo.description || '';
          wxCover = wxJson.data.feedInfo.coverUrl || '';
          if (wxJson.data.authorInfo) {
            wxAuthor = wxJson.data.authorInfo.nickname || '';
            wxAvatar = wxJson.data.authorInfo.headImgUrl || '';
          }
        }
      }
    }
  } catch(e) {}

  // 尝试 ALAPI 解析
  try {
    var alapiRes = await fetch('https://v3.alapi.cn/api/video/url?token=2hgqmh0sy3mcknephdn5yl9u2qubul&url=' + encodeURIComponent(originalUrl), {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000)
    });
    if (alapiRes.ok) {
      var alapiJson = await alapiRes.json();
      if (alapiJson.success && alapiJson.data && alapiJson.data.video_url) {
        var d = alapiJson.data;
        return ok('weixin', {
          _source: 'alapi',
          type: 'video',
          title: wxTitle || d.title || '',
          desc: wxTitle || d.title || '',
          author: { name: wxAuthor || d.author || '', id: '', avatar: wxAvatar || '' },
          cover: wxCover || d.cover_url || '', url: d.video_url || '', images: [],
        });
      }
    }
  } catch(e) {}

// 尝试 52api 解析
  try {
    var apiRes = await fetch('https://www.52api.cn/api/sph?key=SgAYGMs3AxwD47faiPUKUzM06D&url=' + encodeURIComponent(originalUrl), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (apiRes.ok) {
      var apiJson = await apiRes.json();
      if (apiJson.code === 200 && apiJson.data && apiJson.data.video_url) {
        var d = apiJson.data;
        return ok('weixin', {
          _source: '52api',
          type: 'video', title: d.video_title || d.video_desc || '', desc: d.video_desc || d.video_title || '',
          author: { name: d.video_author || '', id: '', avatar: d.video_avatar || '' },
          cover: d.video_cover || '', url: d.video_url || '', images: [],
        });
      }
    }
  } catch(e) {}

  // 全部HTML抓取失败，走BugPK
  try {
    var res = await _bugpk2Fetch(originalUrl, 8000);
    if (res.ok) {
      var json = await res.json();
      if (json.code === 200 && json.data && json.data.url) {
        var d = json.data;
        var videoUrl = d.url || '';
        // 清除画质限制参数（X-snsvideoflag/flag/basedata/sign），让CDN返回原始最高画质
        if (videoUrl) {
          videoUrl = videoUrl.replace(/&(?:X-snsvideoflag|flag|basedata|sign)=[^&]*/g, '');
        }
        return ok('weixin', {
          _source: 'bugpk',
          type: 'video', title: d.title || d.desc || '', desc: d.desc || d.title || '',
          author: { name: (d.author && d.author.name) || d.nickname || d.author_name || '', id: (d.author && d.author.id) || d.author_id || d.uid || d.user_id || '', avatar: (d.author && d.author.avatar) || d.avatar || d.author_avatar || d.face || '' },
          cover: d.cover || '', url: videoUrl, images: [],
        });
      }
    }
  } catch(e) {}

  return fail('微信视频号解析失败');
}




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

  // action=proxy 优先处理（不需�?url 参数�?
  var action = url.searchParams.get('action');
  if (action === 'proxy') {
      var videoUrl = url.searchParams.get('video');
      if (!videoUrl) return new Response(JSON.stringify(fail('缺少 video 参数')), { status: 400, headers });
      var proxyUA = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      var proxyReqHeaders = { 'User-Agent': proxyUA, 'Referer': 'https://www.tiktok.com/', 'Origin': 'https://www.tiktok.com' };
      if (videoUrl.indexOf('finder.video.qq.com') >= 0 || videoUrl.indexOf('weixin.qq.com') >= 0) {
        proxyReqHeaders = { 'User-Agent': UA_WECHAT, 'Referer': 'https://channels.weixin.qq.com/', 'Origin': 'https://channels.weixin.qq.com' };
      }
      var proxyRes = await fetch(videoUrl, { headers: proxyReqHeaders });
      if (!proxyRes.ok) return new Response(JSON.stringify(fail('代理下载失败: HTTP ' + proxyRes.status)), { status: 502, headers });
      var proxyHeaders = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': proxyRes.headers.get('Content-Type') || 'video/mp4',
        'Content-Disposition': proxyRes.headers.get('Content-Disposition') || 'inline',
        'Cache-Control': 'public, max-age=3600',
      });
      return new Response(proxyRes.body, { status: 200, headers: proxyHeaders });
    }


  // �?proxy 模式：需�?url 参数进行解析
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return new Response(JSON.stringify(fail('缺少 url 参数', 400)), { status: 400, headers });
  }

  try {
      // ===== 调试模式：返回原始item_list数据 =====
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
        // 尝试iesdouyin跳转
        var dbgFinalUrl = dbgTargetUrl;
        var dbgShareUrl = 'https://www.iesdouyin.com/share/video/' + dbgItemId + '/';
        var dbgResolved = await resolveRedirect(dbgShareUrl);
        if (dbgResolved && dbgResolved.indexOf('douyin.com') >= 0) dbgFinalUrl = dbgResolved;

        var dbgHtml = await fetchHtml(dbgFinalUrl || dbgTargetUrl, { Referer: 'https://www.douyin.com/' });
        var dbgItem = extractDouyinDataFromHtml(dbgHtml);
        
        // 提取关键字段
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
        // 也尝试iesdouyin API
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
        return new Response(JSON.stringify({ code: 200, msg: '调试信息', debug: dbgInfo }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' } });
      } else {
        return new Response(JSON.stringify({ code: 400, msg: '无法提取视频ID', debug: { targetUrl: dbgTargetUrl } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' } });
      }
    } catch(e) {
      return new Response(JSON.stringify({ code: 500, msg: '调试失败: ' + String(e) }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' } });
    }
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
      case 'toutiao': result = await parseToutiao(targetUrl); break;
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


// Vercel Node.js 入口
if (typeof module !== "undefined" && module.exports) {
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") { res.statusCode = 200; res.end(); return; }

  const request = {
    method: req.method || "GET",
    url: (req.url || "").startsWith("http") ? req.url : "https://" + (req.headers.host || "localhost") + (req.url || "/"),
    headers: {
      get: (name) => {
        const v = req.headers[(name || "").toLowerCase()];
        return Array.isArray(v) ? v[0] : (v === undefined ? null : v);
      }
    }
  };

  try {
    const response = await handleRequest(request);
    const ct = response.headers.get("Content-Type") || "application/json; charset=utf-8";
    res.statusCode = response.status;
    res.setHeader("Content-Type", ct);
    if (/video|audio|octet-stream|image/.test(ct)) {
      res.end(Buffer.from(await response.arrayBuffer()));
    } else {
      res.end(await response.text());
    }
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ code: 500, msg: "解析失败: " + (e && e.message ? e.message : String(e)) }));
  }
};
}
