import { useEffect, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabase";
import { FlightStockCard } from "./components/FlightStockCard";
import { Plane, RefreshCw } from "lucide-react";
import "./index.css";

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
}

export function App() {
  const [priceData, setPriceData] = useState<Record<string, PriceData[]>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [activeTab, setActiveTab] = useState("전체");
  const [departureDates, setDepartureDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

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

  const seoTitle = cheapest
    ? `${cheapest.name} 항공권 ${cheapest.price.toLocaleString()}원! | FLY 시세판`
    : "FLY 시세판 - 인천발 항공권 실시간 최저가";

  const seoDescription = cheapest
    ? `인천발 ${cheapest.name} 항공권 ${cheapest.price.toLocaleString()}원. 10개 도시 실시간 최저가를 확인하고 현명하게 예약하세요.`
    : "인천발 주말 항공권 실시간 시세 전광판. 홍콩, 도쿄, 오사카, 방콕 등 10개 도시 최저가를 한눈에!";

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
        <meta property="og:image" content="https://flyfly.vercel.app/og-image.png" />
        <meta property="og:url" content="https://flyfly.vercel.app/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
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
          {/* 출발지 배너 + 날짜 선택 */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 py-2.5">
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
          </div>

          {/* 필터 탭 */}
          <nav className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
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
          <div className="space-y-2">
            {filteredCities.map((city) => (
              <FlightStockCard
                key={city.code}
                city={city.name}
                code={city.code}
                emoji={city.emoji}
                data={priceData[city.code] || []}
              />
            ))}
          </div>

          {/* 푸터 정보 */}
          <div className="text-center pt-3 pb-4 space-y-0.5">
            <p className="text-slate-600 text-[9px]">
              {lastUpdate ? `업데이트: ${lastUpdate}` : "로딩 중..."}
            </p>
            <p className="text-slate-700 text-[9px]">6시간마다 자동 수집 · Amadeus API</p>
          </div>
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;
