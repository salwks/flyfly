// src/collector_supabase.ts - Supabase 버전 항공권 수집기
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
            const { error } = await supabase.from("price_history").insert({
              route_code: city.code,
              price: result.price,
              departure_date: week.outbound,
              return_date: week.inbound,
            });

            if (error) {
              console.error(`  ❌ [${week.outbound}] DB 에러:`, error.message);
            } else {
              console.log(
                `  ✅ [${week.outbound}] ${result.price.toLocaleString()}원 저장`
              );
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
