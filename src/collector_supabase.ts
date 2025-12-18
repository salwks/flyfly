// src/collector_supabase.ts - 하이브리드 수집 엔진 (Amadeus 2,000회/월 최적화)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

// 🎯 하이브리드 수집 전략
// - Core: 6시간마다 수집 (인기 노선, 변동성 높음)
// - Normal: 24시간마다 수집 (09시 KST에만)
const CORE_CITIES = [
  { code: "NRT", name: "도쿄" },
  { code: "KIX", name: "오사카" },
  { code: "HKG", name: "홍콩" },
];

const NORMAL_CITIES = [
  { code: "FUK", name: "후쿠오카" },
  { code: "BKK", name: "방콕" },
  { code: "DAD", name: "다낭" },
  { code: "TPE", name: "타이베이" },
  { code: "SIN", name: "싱가포르" },
  { code: "GUM", name: "괌" },
  { code: "CDG", name: "파리" },
];

const TARGET_WEEKS = 2; // 향후 2주 주말만 수집 (4주 → 2주 축소)

// 월간 API 호출량 계산:
// Core: 3도시 × 2주 × 4회/일 × 30일 = 720회
// Normal: 7도시 × 2주 × 1회/일 × 30일 = 420회
// Total: 1,140회/월 (무료 한도 2,000회 대비 57%)

// Make.com Webhook으로 특가 데이터 전송
async function sendToMakeWebhook(
  city: string,
  cityCode: string,
  price: number,
  diff: number,
  departureDate: string
) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const dropPercent = Math.abs(Math.round((diff / (price - diff)) * 100));

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_name: city,
        city_code: cityCode,
        price: price,
        drop_amount: Math.abs(diff),
        drop_percent: dropPercent,
        departure_date: departureDate,
        booking_url: `https://www.skyscanner.co.kr/transport/flights/icn/${cityCode.toLowerCase()}/`,
        dashboard_url: "https://flyfly.vercel.app",
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`  🔗 Make.com Webhook 전송 완료`);
  } catch (e) {
    console.error(`  ⚠️ Webhook 전송 실패`);
  }
}

// 텔레그램 알림 발송 (이미지 + 버튼 버전)
async function sendTelegramAlert(
  city: string,
  cityCode: string,
  price: number,
  diff: number,
  departureDate: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const dropPercent = Math.abs(Math.round((diff / (price - diff)) * 100));
  const bookingUrl = `https://www.skyscanner.co.kr/transport/flights/icn/${cityCode.toLowerCase()}/`;

  // 동적 이미지 생성 (quickchart.io 활용)
  const chartData = {
    type: "bar",
    data: {
      labels: ["이전 가격", "현재 가격"],
      datasets: [{
        data: [price - diff, price],
        backgroundColor: ["#64748b", "#10b981"],
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `${city} 항공권 ${dropPercent}% 하락!`, font: { size: 24 } },
        legend: { display: false },
      },
    },
  };
  const imageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartData))}&w=600&h=400&bkg=white`;

  const caption = `
✈️ *[FLY TICKER] 역대급 특가 포착!*

📍 노선: 인천 → ${city} (${cityCode})
💰 현재가: *${price.toLocaleString()}원*
📉 하락폭: *-${Math.abs(diff).toLocaleString()}원* (${dropPercent}%)
📅 출발일: ${departureDate}

⚠️ 이 가격은 보통 1시간 이내에 사라집니다!
지금 바로 확인하세요!
  `.trim();

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "📈 실시간 시세", url: "https://flyfly.vercel.app" },
        { text: "✈️ 바로 예약", url: bookingUrl },
      ],
    ],
  };

  try {
    // 이미지와 함께 전송
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: caption,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      }),
    });
    console.log(`  📱 텔레그램 이미지 알림 발송 완료`);
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

// 향후 N번의 주말 (금~일) 날짜 생성
function getNextWeekends(count = TARGET_WEEKS) {
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

// 도시 그룹 수집 함수
async function collectCities(
  token: string,
  cities: { code: string; name: string }[],
  weekends: { outbound: string; inbound: string }[],
  groupName: string
) {
  console.log(`\n📦 ${groupName} 수집 시작 (${cities.length}개 도시)\n`);

  let apiCalls = 0;

  for (const city of cities) {
    console.log(`📍 ${city.name} (${city.code})`);

    for (const week of weekends) {
      try {
        const result = await fetchFlightPrice(
          token,
          city.code,
          week.outbound,
          week.inbound
        );
        apiCalls++;

        if (result) {
          const prevPrice = await getPreviousPrice(city.code, week.outbound);
          const diff = prevPrice ? result.price - prevPrice : 0;

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
            console.log(`  ✅ [${week.outbound}] ${result.price.toLocaleString()}원${diffStr}`);

            if (diff < -10000) {
              await sendTelegramAlert(city.name, city.code, result.price, diff, week.outbound);
              await sendToMakeWebhook(city.name, city.code, result.price, diff, week.outbound);
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

  return apiCalls;
}

// 메인 실행 - 하이브리드 수집 엔진
async function run() {
  console.log("✈️ 하이브리드 수집 엔진 시작...\n");
  console.log("=".repeat(50));

  // 현재 시간 (KST)
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  console.log(`⏰ 현재 시간: ${kstHour}시 (KST)\n`);

  // 수집 대상 결정
  const isDailyTime = kstHour >= 8 && kstHour <= 10; // 08~10시 사이면 일일 수집
  const weekends = getNextWeekends();

  console.log(`📅 수집 대상 주말: ${weekends.map((w) => w.outbound).join(", ")}`);
  console.log(`🎯 Core 도시: ${CORE_CITIES.map((c) => c.code).join(", ")} (매 6시간)`);
  console.log(`📌 Normal 도시: ${NORMAL_CITIES.map((c) => c.code).join(", ")} (1일 1회)`);
  console.log("=".repeat(50));

  try {
    const token = await getAccessToken();
    console.log("\n✅ Amadeus 토큰 획득");

    let totalCalls = 0;

    // 1. Core 도시는 항상 수집 (6시간마다 실행되므로)
    totalCalls += await collectCities(token, CORE_CITIES, weekends, "🔥 Core Cities");

    // 2. Normal 도시는 하루에 한 번만 (09시 KST)
    if (isDailyTime) {
      totalCalls += await collectCities(token, NORMAL_CITIES, weekends, "📊 Normal Cities");
    } else {
      console.log(`\n⏭️ Normal Cities 스킵 (일일 수집 시간 아님, 현재: ${kstHour}시)`);
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✨ 수집 완료! API 호출: ${totalCalls}회`);
    console.log(`📊 예상 월간 사용량: ~${Math.round(totalCalls * 30 * (isDailyTime ? 1 : 4))}회`);
    console.log("=".repeat(50));
  } catch (error: any) {
    console.error("치명적 오류:", error.message);
    process.exit(1);
  }
}

run();
