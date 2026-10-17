// Cloudflare Worker: Google Cloud Translation 프록시
// API 키를 브라우저에 노출하지 않기 위해 사용합니다.
// 배포 후 `GOOGLE_API_KEY` 를 Worker 의 Secret 으로 등록하세요.
//   요청: POST { q, source, target }
//   응답: { translatedText }

const ALLOWED_ORIGIN = "*"; // 배포한 페이지 주소로 바꾸는 것을 권장합니다.
const MAX_CHARS = 1000;

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const { q, source, target } = body || {};
    if (typeof q !== "string" || !q.trim() || typeof target !== "string") {
      return json({ error: "q and target are required" }, 400);
    }
    if (q.length > MAX_CHARS) return json({ error: "text too long" }, 413);

    const res = await fetch(
      "https://translation.googleapis.com/language/translate/v2?key=" + env.GOOGLE_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, source, target, format: "text" }),
      }
    );
    if (!res.ok) return json({ error: "translation failed" }, 502);
    const data = await res.json();
    return json({ translatedText: data.data.translations[0].translatedText });
  },
};
