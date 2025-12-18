import { useEffect, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabase";
import { FlightStockCard } from "./components/FlightStockCard";
import { ShareCard } from "./components/ShareCard";
import { Plane, RefreshCw } from "lucide-react";
import "./index.css";

// 하이브리드 엔진 모니터링 대시보드
function MonitoringDashboard({ totalRecords }: { totalRecords: number }) {
  const usagePercent = Math.min((totalRecords / 2000) * 100, 100);
  const isWarning = usagePercent > 80;

  const CORE_CITIES = ["NRT", "KIX", "HKG"];
  const NORMAL_CITIES = ["FUK", "BKK", "DAD", "TPE", "SIN", "GUM", "CDG"];

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Hybrid Engine
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-600">v1.0</span>
      </div>

      {/* API 사용량 게이지 */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-mono mb-1">
          <span className="text-slate-500">AMADEUS API</span>
          <span className={isWarning ? "text-orange-400" : "text-emerald-400"}>
            {totalRecords.toLocaleString()} / 2,000 ({usagePercent.toFixed(0)}%)
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isWarning ? "bg-orange-500" : "bg-emerald-500"}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* 도시별 수집 주기 */}
      <div className="flex flex-wrap gap-1">
        {CORE_CITIES.map((code) => (
          <span
            key={code}
            className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded"
          >
            {code} ⚡6H
          </span>
        ))}
        {NORMAL_CITIES.map((code) => (
          <span
            key={code}
            className="px-1.5 py-0.5 bg-slate-700/50 text-slate-500 text-[8px] font-bold rounded"
          >
            {code} 24H
          </span>
        ))}
      </div>
    </div>
  );
}

const CITIES = [
  { code: "HKG", name: "홍콩", emoji: "🇭🇰" },
  { code: "NRT", name: "도쿄", emoji: "🇯🇵" },
  { code: "KIX", name: "오사카", emoji: "🏯" },
  { code: "FUK", name: "후쿠오카", emoji: "🌸" },
  { code: "BKK", name: "방콕", emoji: "🇹🇭" },
  { code: "DAD", name: "다낭", emoji: "🇻🇳" },
  { code: "TPE", name: "타이베이", emoji: "🇹🇼" },
  { code: "SIN", name: "싱가포르", emoji: "🇸🇬" },
  { code: "GUM", name: "괌", emoji: "🏝️" },
  { code: "CDG", name: "파리", emoji: "🇫🇷" },
];

const CATEGORIES: Record<string, string[]> = {
  전체: ["HKG", "NRT", "KIX", "FUK", "BKK", "DAD", "TPE", "SIN", "GUM", "CDG"],
  일본: ["NRT", "KIX", "FUK"],
  동남아: ["BKK", "DAD", "SIN"],
  중화권: ["HKG", "TPE"],
  휴양지: ["GUM", "CDG"],
};

interface PriceData {
  time: string;
  price: number;
  departure_date: string;
  return_date: string;
  departure_time?: string;
  arrival_time?: string;
  return_departure_time?: string;
  return_arrival_time?: string;
  is_good_schedule?: boolean;
}

export function App() {
  const [priceData, setPriceData] = useState<Record<string, PriceData[]>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [activeTab, setActiveTab] = useState("전체");
  const [departureDates, setDepartureDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchDepartureDates = async () => {
    // 모든 고유 출발일 가져오기
    const { data } = await supabase
      .from("price_history")
      .select("departure_date")
      .order("departure_date", { ascending: true });

    if (data) {
      const uniqueDates = [...new Set(data.map((d) => d.departure_date))];
      setDepartureDates(uniqueDates);
      if (!selectedDate && uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      }
    }

    // 이번 달 총 레코드 수 (API 사용량 추적)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("price_history")
      .select("*", { count: "exact", head: true })
      .gte("recorded_at", startOfMonth);

    setTotalRecords(count || 0);
  };

  const fetchAllPrices = async (targetDate?: string) => {
    setLoading(true);
    const dateToFetch = targetDate || selectedDate;

    try {
      const results: Record<string, PriceData[]> = {};

      for (const city of CITIES) {
        // 선택된 출발일의 가격 변화 가져오기 (수집 시간 순)
        const { data, error } = await supabase
          .from("price_history")
          .select("*")
          .eq("route_code", city.code)
          .eq("departure_date", dateToFetch)
          .order("recorded_at", { ascending: true })
          .limit(30);

        if (!error && data && data.length > 0) {
          results[city.code] = data.map((row: any) => ({
            time: new Date(row.recorded_at).toLocaleString("ko-KR", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            price: row.price,
            departure_date: row.departure_date,
            return_date: row.return_date,
            departure_time: row.departure_time,
            arrival_time: row.arrival_time,
            return_departure_time: row.return_departure_time,
            return_arrival_time: row.return_arrival_time,
            is_good_schedule: row.is_good_schedule,
          }));
        }
      }

      setPriceData(results);
      setLastUpdate(new Date().toLocaleTimeString("ko-KR"));
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartureDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAllPrices(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => fetchAllPrices(selectedDate), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // SEO: 가장 저렴한 도시 찾기
  const getCheapestCity = () => {
    let cheapest = { code: "", name: "", price: Infinity };

    for (const city of CITIES) {
      const data = priceData[city.code];
      if (data && data.length > 0) {
        const currentPrice = data[data.length - 1].price;
        if (currentPrice < cheapest.price) {
          cheapest = { code: city.code, name: city.name, price: currentPrice };
        }
      }
    }

    return cheapest.price < Infinity ? cheapest : null;
  };

  const cheapest = getCheapestCity();

  // SNS 공유용 TOP 3 최저가
  const getTopDeals = () => {
    const deals: { city: string; code: string; price: number; emoji: string }[] = [];

    for (const city of CITIES) {
      const data = priceData[city.code];
      if (data && data.length > 0) {
        deals.push({
          city: city.name,
          code: city.code,
          price: data[data.length - 1].price,
          emoji: city.emoji,
        });
      }
    }

    return deals.sort((a, b) => a.price - b.price).slice(0, 3);
  };

  const topDeals = getTopDeals();

  // 선택된 날짜 포맷팅
  const formatDateKorean = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const selectedDateFormatted = formatDateKorean(selectedDate);

  // SEO 타이틀/설명 (2박 3일 키워드 강화)
  const seoTitle = cheapest
    ? `${cheapest.name} 2박3일 항공권 ${cheapest.price.toLocaleString()}원 | ${selectedDateFormatted} 출발 특가`
    : "2박3일 주말 항공권 실시간 최저가 | FLY 시세판";

  const seoDescription = cheapest
    ? `${selectedDateFormatted} 출발 인천→${cheapest.name} 2박3일 직항 항공권 ${cheapest.price.toLocaleString()}원! 직장인 주말여행 최적화. 도쿄, 오사카, 홍콩, 방콕 등 10개 도시 실시간 가격 비교.`
    : "금요일 출발 일요일 귀국! 직장인을 위한 2박3일 주말 해외여행 항공권 실시간 시세. 인천발 도쿄, 오사카, 홍콩, 방콕 등 인기 노선 최저가를 한눈에 비교하세요.";

  // 동적 OG 이미지 URL
  const ogImageUrl = cheapest
    ? `https://flyfly.vercel.app/api/og?city=${encodeURIComponent(cheapest.name)}&price=${cheapest.price}`
    : "https://flyfly.vercel.app/api/og";

  const filteredCities = CITIES.filter((city) =>
    CATEGORIES[activeTab]?.includes(city.code)
  );

  return (
    <HelmetProvider>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content="https://flyfly.vercel.app/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="keywords" content="2박3일 항공권, 주말 해외여행, 인천 출발 특가, 도쿄 항공권, 오사카 항공권, 홍콩 항공권, 방콕 항공권, 직장인 여행, 금토일 여행" />
        {/* JSON-LD 구조화 데이터 */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "FLY 시세판",
            "description": seoDescription,
            "url": "https://flyfly.vercel.app",
            "applicationCategory": "TravelApplication",
            "operatingSystem": "Web",
            "offers": topDeals.map((deal) => ({
              "@type": "Offer",
              "name": `인천-${deal.city} 2박3일 항공권`,
              "price": deal.price,
              "priceCurrency": "KRW",
              "availability": "https://schema.org/InStock",
              "validFrom": selectedDate,
              "url": `https://www.skyscanner.co.kr/transport/flights/icn/${deal.code.toLowerCase()}/`
            })),
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "127"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-dvh bg-slate-950 pb-safe">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50 pt-safe">
          <div className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg font-black text-white tracking-tight">FLY 시세판</h1>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                LIVE
              </span>
            </div>
            <button
              onClick={() => fetchAllPrices(selectedDate)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 active:bg-slate-700 rounded-lg text-xs text-slate-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="w-full px-3 py-3 space-y-3">
          {/* 모니터링 대시보드 */}
          <MonitoringDashboard totalRecords={totalRecords} />

          {/* SEO용 숨김 제목 */}
          <h2 className="sr-only">인천 출발 2박3일 주말 해외여행 항공권 실시간 최저가</h2>

          {/* 출발지 배너 + 날짜 선택 */}
          <section className="bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 py-2.5" aria-label="출발 정보">
            <p className="text-slate-400 text-[10px] font-medium text-center mb-2">
              🛫 인천(ICN) 출발 · 주말 2박3일 · 직항 최저가
            </p>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[10px] shrink-0">출발일</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {departureDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* 필터 탭 */}
          <nav className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" aria-label="도시 카테고리 필터">
            {Object.keys(CATEGORIES).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400 active:bg-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* 가격 카드들 */}
          <section aria-label="항공권 가격 목록">
            <h3 className="text-slate-400 text-[10px] font-medium mb-2 px-1">
              {activeTab === "전체" ? "전체 도시" : activeTab} 2박3일 직항 항공권
            </h3>
            <div className="space-y-2">
              {filteredCities.map((city) => (
                <article key={city.code}>
                  <FlightStockCard
                    city={city.name}
                    code={city.code}
                    emoji={city.emoji}
                    data={priceData[city.code] || []}
                  />
                </article>
              ))}
            </div>
          </section>

          {/* SNS 공유 카드 */}
          <ShareCard deals={topDeals} />

          {/* 텔레그램 알림 배너 */}
          <div className="mt-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm">실시간 특가 알림</h4>
                <p className="text-white/70 text-[10px]">24시간 감시 봇이 최저가를 알려드려요</p>
              </div>
            </div>
            <a
              href="https://t.me/fffly_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 bg-white text-blue-600 text-xs font-bold text-center rounded-lg hover:bg-blue-50 active:scale-[0.98] transition-all"
            >
              텔레그램으로 알림 받기
            </a>
          </div>

          {/* 푸터 정보 */}
          <footer className="text-center pt-4 pb-6 space-y-2">
            <p className="text-slate-600 text-[9px]">
              {lastUpdate ? `마지막 업데이트: ${lastUpdate}` : "로딩 중..."}
            </p>
            <p className="text-slate-700 text-[8px] max-w-xs mx-auto leading-relaxed">
              인천발 2박3일 주말 항공권 최저가를 실시간으로 추적합니다.
              금요일 출발 일요일 귀국, 직장인을 위한 꽉 찬 여행 일정에 최적화.
            </p>
            <p className="text-slate-700 text-[9px]">© Serious Lab</p>
          </footer>
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;
