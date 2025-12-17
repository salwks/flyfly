import { Database } from "bun:sqlite";

// 1. DB 및 설정
const db = new Database("flight_ticker.db");
const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

// DB 테이블 생성 (없으면)
db.run(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_code TEXT NOT NULL,
    price INTEGER NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    collected_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// 2. 타겟 날짜 생성 (향후 4번의 주말 금~일)
function getNextWeekends(count = 4) {
  const dates: { outbound: string; inbound: string }[] = [];
  let current = new Date();

  while (dates.length < count) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() === 5) {
      // 금요일 찾기
      const friday = new Date(current);
      const sunday = new Date(current);
      sunday.setDate(friday.getDate() + 2); // 금요일 + 2일 = 일요일

      dates.push({
        outbound: friday.toISOString().split("T")[0],
        inbound: sunday.toISOString().split("T")[0],
      });
    }
  }
  return dates;
}

// 3. 토큰 발급
async function getAccessToken() {
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
  return data.access_token;
}

// 4. 실시간 가격 조회 (Flight Offers Search v2)
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
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const json = await response.json();
  if (!json.data || json.data.length === 0) return null;

  return {
    price: Math.round(parseFloat(json.data[0].price.total)),
    airline: json.data[0].validatingAirlineCodes[0],
  };
}

// 5. 메인 실행
async function run() {
  console.log("✈️  ICN 주말 최저가 수집기 가동...");
  const token = await getAccessToken();
  const weekends = getNextWeekends(4);
  const targets = ["HKG", "NRT", "KIX"]; // 홍콩, 나리타, 오사카

  const insertStmt = db.prepare(`
    INSERT INTO price_history (route_code, price, departure_date, return_date)
    VALUES (?, ?, ?, ?)
  `);

  for (const city of targets) {
    console.log(`\n📍 목적지: ${city}`);
    for (const week of weekends) {
      try {
        const result = await fetchFlightPrice(
          token,
          city,
          week.outbound,
          week.inbound
        );
        if (result) {
          insertStmt.run(city, result.price, week.outbound, week.inbound);
          console.log(
            `  ✅ [${week.outbound}] ${result.price.toLocaleString()}원 (${result.airline})`
          );
        } else {
          console.log(`  ❌ [${week.outbound}] 직항 데이터 없음`);
        }
        // API 과부하 방지
        await new Promise((r) => setTimeout(r, 800));
      } catch (e: any) {
        console.error("  ⚠️ 에러 발생:", e.message);
      }
    }
  }
  console.log("\n✨ 수집 완료! DB에 데이터가 저장되었습니다.");
}

run();
