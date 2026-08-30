// 호요(스타레일 등) 가챠기록 프록시 — 브라우저 CORS 우회용. 로그인 유저만(JWT) 호출됨.
//
// 입력(POST JSON): { url: "<게임에서 추출한 가챠기록 링크>", gachaType?: "11" }
//   gachaType(스타레일): 11=캐릭이벤트워프(기본), 12=광추이벤트, 1=스텔라(상시), 2=초심
// 출력: { ok:true, count, pulls:[{id,rank,name,itemType,time,gachaType}] }  (id 내림차순=최신순)
//       또는 { ok:false, error, retcode? }
//
// 링크의 host + 인증파라미터(authkey 등)를 그대로 재사용하고 path만 getGachaLog로 →
// 글로벌/아시아/유럽/CN 등 리전 자동 대응. authkey는 ~24h 만료(유저 본인 것, 읽기전용).

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST만 허용" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "잘못된 요청(JSON 아님)" }, 400); }

  const rawUrl = String(body?.url || "").trim();
  const gachaType = String(body?.gachaType || "11");
  if (!rawUrl) return json({ ok: false, error: "가챠기록 링크(url)가 없습니다" }, 400);

  let src: URL;
  try { src = new URL(rawUrl); } catch { return json({ ok: false, error: "링크 형식이 올바르지 않습니다" }, 400); }

  const p = src.searchParams;
  if (!p.get("authkey")) return json({ ok: false, error: "링크에 authkey가 없습니다(만료됐거나 잘못된 링크)" }, 400);

  const base = `${src.origin}/common/gacha_record/api/getGachaLog`;
  function pageUrl(endId: string): string {
    const q = new URLSearchParams();
    for (const k of ["authkey", "authkey_ver", "sign_type", "game_biz", "lang", "region", "plat_type"]) {
      const v = p.get(k); if (v) q.set(k, v);
    }
    if (!q.get("lang")) q.set("lang", "ko-kr");
    q.set("gacha_type", gachaType);
    q.set("size", "20");
    q.set("end_id", endId);
    return `${base}?${q.toString()}`;
  }

  const pulls: any[] = [];
  let endId = "0";
  try {
    for (let page = 0; page < 60; page++) {              // 안전상한 60p(=1200뽑)
      const r = await fetch(pageUrl(endId), { headers: { "User-Agent": "Mozilla/5.0" } });
      const j: any = await r.json();
      if (j.retcode !== 0) {
        return json({ ok: false, error: `게임서버 오류: ${j.message || j.retcode} (링크 만료면 새로 추출하세요)`, retcode: j.retcode });
      }
      const list: any[] = j?.data?.list || [];
      if (!list.length) break;
      for (const it of list) {
        pulls.push({ id: it.id, rank: it.rank_type, name: it.name, itemType: it.item_type, time: it.time, gachaType: it.gacha_type });
      }
      endId = list[list.length - 1].id;
      await new Promise((res) => setTimeout(res, 300));   // 레이트리밋 예의(너무 빠르면 게임서버가 차단)
    }
  } catch (e: any) {
    return json({ ok: false, error: "게임 서버 호출 실패: " + (e?.message || e) });
  }

  return json({ ok: true, count: pulls.length, pulls });
});
