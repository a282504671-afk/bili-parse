const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function ok(data) {
  return JSON.stringify({ code: 200, msg: "解析成功", platform: "bilibili", data });
}
function fail(msg, code = 500) {
  return JSON.stringify({ code, msg });
}

async function fetchText(url, headers = {}) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.bilibili.com/", Accept: "application/json, text/plain, */*", ...headers },
  });
  return r.text();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") return res.status(200).end();

  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json(fail("缺少 url 参数", 400));

  try {
    // 跟随短链
    let realUrl = targetUrl;
    if (realUrl.includes("b23.tv")) {
      const resp = await fetch(realUrl, { method: "GET", redirect: "follow", headers: { "User-Agent": UA } });
      realUrl = resp.url || realUrl;
    }

    // 提取 BV 号
    let bvMatch = realUrl.match(/BV[0-9A-Za-z]+/);
    if (!bvMatch) {
      const avMatch = realUrl.match(/av(\d+)/i);
      if (!avMatch) return res.status(400).json(fail("未识别到BV号"));
      bvMatch = { 0: avMatch[0] };
    }
    const bvid = bvMatch[0];

    // 从页面 HTML + API 获取视频信息
    let info = null;
    let videoUrl = "";

    // 方式1: 页面 HTML 提取
    try {
      const html = await fetchText(realUrl, { Accept: "text/html,*/*" });
      const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*;?\s*(?:<\/script>|\(function)/);
      if (stateMatch) {
        const state = JSON.parse(stateMatch[1].replace(/undefined/g, "null"));
        const vd = state.videoData || state.videoInfo || (state.video && state.video.info);
        if (vd) info = { title: vd.title, desc: vd.desc, pic: vd.pic, owner: vd.owner || {}, cid: vd.cid, aid: vd.aid };
      }
    } catch (e) {}

    // 方式2: B站官方 API
    if (!info) {
      try {
        const viewText = await fetchText("https://api.bilibili.com/x/web-interface/view?bvid=" + bvid);
        if (viewText.startsWith("{")) {
          const viewJson = JSON.parse(viewText);
          if (viewJson.code === 0) {
            const vd = viewJson.data;
            info = {
              title: vd.title || "", desc: vd.desc || "", pic: vd.pic || "",
              owner: vd.owner || { name: "", mid: "", face: "" },
              cid: vd.cid || 0, aid: vd.aid || 0,
            };
          }
        }
      } catch (e) {}
    }

    if (!info) return res.status(500).json(fail("获取B站视频信息失败"));

    // 获取视频流地址
    if (info.cid && info.aid) {
      try {
        const playText = await fetchText("https://api.bilibili.com/x/player/playurl?avid=" + info.aid + "&cid=" + info.cid + "&qn=80&fnval=16&fourk=1");
        if (playText.startsWith("{")) {
          const playJson = JSON.parse(playText);
          if (playJson.code === 0) {
            const d = playJson.data;
            if (d.dash && d.dash.video && d.dash.video.length) {
              videoUrl = d.dash.video[0].baseUrl || d.dash.video[0].base_url || "";
            } else if (d.durl && d.durl.length) {
              videoUrl = d.durl[0].url;
            }
          }
        }
      } catch (e) {}
    }

    res.json(ok({
      type: "video",
      title: info.title || "",
      desc: info.desc || "",
      author: {
        name: (info.owner && info.owner.name) || "",
        id: (info.owner && info.owner.mid && String(info.owner.mid)) || "",
        avatar: (info.owner && info.owner.face) || "",
      },
      cover: info.pic || "",
      url: videoUrl || "",
      images: [],
    }));
  } catch (e) {
    res.status(500).json(fail("解析失败: " + e.message));
  }
};
