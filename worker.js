// Cloudflare Worker: Azure Translator(F0 무료 등급) 프록시
// API 키를 브라우저에 노출하지 않기 위해 사용합니다.
//
// Worker 설정 (README 참고)
//   Secret      AZURE_KEY     Azure Translator 키
//   Secret      AZURE_REGION  Azure Translator 지역 (예: koreacentral)
//   KV 바인딩    USAGE         하루 사용량 기록용 KV namespace
//
//   요청: POST { q, source, target }
//   응답: { translatedText }

// 이 주소에서 온 요청만 받습니다.
const ALLOWED_ORIGINS = ["https://luckyeonu-afk.github.io"];
// 한 번에 받는 최대 글자 수
const MAX_CHARS = 500;
// 하루(한국 시간 기준) 최대 번역 글자 수. 매일 꽉 채워도 한 달 약 150만 자로 F0 무료 200만 자 안에 들어옵니다.
const DAILY_CHAR_LIMIT = 50000;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

// 한국 시간 기준 날짜 (YYYY-MM-DD)
function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, origin);

    // 설정이 빠져 있으면 번역하지 않습니다 (한도 없이 열리는 것을 막기 위해)
    if (!env.AZURE_KEY || !env.AZURE_REGION || !env.USAGE) {
      return json({ error: "번역 서버 설정이 끝나지 않았습니다" }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400, origin);
    }
    const { q, source, target } = body || {};
    if (typeof q !== "string" || !q.trim() || typeof target !== "string") {
      return json({ error: "q and target are required" }, 400, origin);
    }
    if (q.length > MAX_CHARS) return json({ error: "한 번에 " + MAX_CHARS + "자까지 번역됩니다" }, 413, origin);

    // 하루 사용량 확인 후 기록
    const key = "chars:" + todayKST();
    const used = parseInt((await env.USAGE.get(key)) || "0", 10);
    if (used + q.length > DAILY_CHAR_LIMIT) {
      return json({ error: "오늘 번역 한도를 다 썼습니다. 내일 다시 사용할 수 있습니다" }, 429, origin);
    }
    try {
      await env.USAGE.put(key, String(used + q.length), { expirationTtl: 3 * 24 * 60 * 60 });
    } catch {
      return json({ error: "사용량 기록 실패로 번역을 멈췄습니다" }, 503, origin);
    }

    const url = new URL("https://api.cognitive.microsofttranslator.com/translate");
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("to", target);
    if (source) url.searchParams.set("from", source);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": env.AZURE_KEY,
        "Ocp-Apim-Subscription-Region": env.AZURE_REGION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: q }]),
    });
    if (res.status === 403 || res.status === 429) {
      return json({ error: "Azure 무료 번역 한도에 닿았습니다" }, 429, origin);
    }
    if (!res.ok) return json({ error: "번역 실패" }, 502, origin);
    const data = await res.json();
    return json({ translatedText: data[0].translations[0].text }, 200, origin);
  },
};
