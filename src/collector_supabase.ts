// src/collector_supabase.ts - Supabase 버전 항공권 수집기 + 텔레그램 알림
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

const TARGET_CITIES = [
  { code: "HKG", name: "홍콩" },
  { code: "NRT", name: "도쿄" },
  { code: "KIX", name: "오사카" },
  { code: "FUK", name: "후쿠오카" },
  { code: "BKK", name: "방콕" },
  { code: "DAD", name: "다낭" },
  { code: "TPE", name: "타이베이" },
  { code: "SIN", name: "싱가포르" },
  { code: "GUM", name: "괌" },
  { code: "CDG", name: "파리" },
];

// 텔레그램 알림 발송
async function sendTelegramAlert(city: string, price: number, diff: number, departureDate: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return; // 토큰 없으면 스킵

  const message = `
🚨 [매수 신호] ${city} 항공권 급락!

✈️ 노선: 인천 → ${city}
💰 현재가: ${price.toLocaleString()}원
📉 변동폭: ${diff.toLocaleString()}원 하락
📅 출발일: ${departureDate}

지금이 예약 찬스! 🔥
  `.trim();

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    console.log(`  📱 텔레그램 알림 발송 완료`);
  } catch (e) {
    console.error(`  ⚠️ 텔레그램 알림 실패`);
  }
}

// 이전 가격 조회
async function getPreviousPrice(routeCode: string, departureDate: string): Promise<number | null> {
  const { data } = await supabase
    .from("price_history")
    .select("price")
    .eq("route_code", routeCode)
    .eq("departure_date", departureDate)
    .order("recorded_at", { ascending: false })
    .limit(1);

  return data && data.length > 0 ? data[0].price : null;
}

// 향후 4번의 주말 (금~일) 날짜 생성
function getNextWeekends(count = 4) {
  const dates: { outbound: string; inbound: string }[] = [];
  let current = new Date();

  while (dates.length < count) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() === 5) {
      const friday = new Date(current);
      const sunday = new Date(current);
      sunday.setDate(friday.getDate() + 2);

      dates.push({
        outbound: friday.toISOString().split("T")[0],
        inbound: sunday.toISOString().split("T")[0],
      });
    }
  }
  return dates;
}

// Amadeus 토큰 발급
async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", process.env.AMADEUS_CLIENT_ID!);
  params.append("client_secret", process.env.AMADEUS_CLIENT_SECRET!);

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Amadeus 토큰 발급 실패");
  }
  return data.access_token;
}

// 항공권 가격 조회
async function fetchFlightPrice(
  token: string,
  dest: string,
  outDate: string,
  inDate: string
) {
  const query = new URLSearchParams({
    originLocationCode: "ICN",
    destinationLocationCode: dest,
    departureDate: outDate,
    returnDate: inDate,
    adults: "1",
    currencyCode: "KRW",
    max: "1",
    nonStop: "true",
  });

  const response = await fetch(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const json = await response.json();
  if (!json.data || json.data.length === 0) return null;

  return {
    price: Math.round(parseFloat(json.data[0].price.total)),
    airline: json.data[0].validatingAirlineCodes[0],
  };
}

// 메인 실행
async function run() {
  console.log("✈️ Supabase 수집기 시작...\n");

  try {
    const token = await getAccessToken();
    console.log("✅ Amadeus 토큰 획득\n");

    const weekends = getNextWeekends(4);

    for (const city of TARGET_CITIES) {
      console.log(`📍 ${city.name} (${city.code})`);

      for (const week of weekends) {
        try {
          const result = await fetchFlightPrice(
            token,
            city.code,
            week.outbound,
            week.inbound
          );

          if (result) {
            // 이전 가격과 비교
            const prevPrice = await getPreviousPrice(city.code, week.outbound);
            const diff = prevPrice ? result.price - prevPrice : 0;

            // DB 저장
            const { error } = await supabase.from("price_history").insert({
              route_code: city.code,
              price: result.price,
              departure_date: week.outbound,
              return_date: week.inbound,
            });

            if (error) {
              console.error(`  ❌ [${week.outbound}] DB 에러:`, error.message);
            } else {
              const diffStr = diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff.toLocaleString()})` : "";
              console.log(
                `  ✅ [${week.outbound}] ${result.price.toLocaleString()}원${diffStr}`
              );

              // 1만원 이상 하락시 텔레그램 알림
              if (diff < -10000) {
                await sendTelegramAlert(city.name, result.price, diff, week.outbound);
              }
            }
          } else {
            console.log(`  ⚠️ [${week.outbound}] 직항 없음`);
          }

          await new Promise((r) => setTimeout(r, 800));
        } catch (e: any) {
          console.error(`  ❌ [${week.outbound}] 에러:`, e.message);
        }
      }
      console.log();
    }

    console.log("✨ 수집 완료!");
  } catch (error: any) {
    console.error("치명적 오류:", error.message);
    process.exit(1);
  }
}

run();
