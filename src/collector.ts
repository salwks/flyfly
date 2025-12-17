// src/collector.ts - 항공권 최저가 수집기
const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

// 한국인이 가장 많이 가는 Top 10 도시 (IATA 코드)
const TARGET_CITIES = [
  { code: "KIX", name: "오사카" },
  { code: "NRT", name: "도쿄/나리타" },
  { code: "FUK", name: "후쿠오카" },
  { code: "HKG", name: "홍콩" },
  { code: "BKK", name: "방콕" },
  { code: "DAD", name: "다낭" },
  { code: "TPE", name: "타이베이" },
  { code: "SIN", name: "싱가포르" },
  { code: "GUM", name: "괌" },
  { code: "CDG", name: "파리" },
];

// 인증 토큰 발급 함수 (OAuth2)
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
    console.error("토큰 응답:", data);
    throw new Error("토큰 발급 실패! .env를 확인하세요.");
  }
  return data.access_token;
}

// 개별 도시 최저가 조회 함수 (Inspiration Search)
async function fetchCheapestPrice(token: string, destinationCode: string) {
  const params = new URLSearchParams({
    origin: "ICN",
    destination: destinationCode,
    viewBy: "DATE",
    currency: "KRW",
    nonStop: "true",
  });

  const response = await fetch(
    `${AMADEUS_BASE_URL}/v1/shopping/flight-destinations?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const json = await response.json();

  if (!json.data || json.data.length === 0) return null;

  const bestOffer = json.data[0];
  return {
    price: Math.round(parseFloat(bestOffer.price.total)),
    departureDate: bestOffer.departureDate,
    returnDate: bestOffer.returnDate,
  };
}

// 메인 실행 함수
async function main() {
  console.log("🚀 Flight Ticker: 데이터 수집 시작...\n");

  try {
    const token = await getAccessToken();
    console.log("✅ 인증 토큰 획득 완료\n");

    console.log("| 도시 | 최저가 (KRW) | 출발일 | 상태 |");
    console.log("|---|---|---|---|");

    for (const city of TARGET_CITIES) {
      try {
        const result = await fetchCheapestPrice(token, city.code);

        if (result) {
          console.log(
            `| ${city.name} (${city.code}) | ${result.price.toLocaleString()}원 | ${result.departureDate} | 🟢 수집성공 |`
          );
        } else {
          console.log(
            `| ${city.name} (${city.code}) | 데이터 없음 | - | 🔴 조회불가 |`
          );
        }

        // API 호출 제한 고려하여 0.5초 대기
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`❌ ${city.name} 조회 중 에러:`, err);
      }
    }

    console.log("\n🏁 수집 종료");
  } catch (error) {
    console.error("치명적 오류 발생:", error);
  }
}

main();
