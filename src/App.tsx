import { useEffect, useState } from "react";
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

  const fetchAllPrices = async () => {
    setLoading(true);
    try {
      const results: Record<string, PriceData[]> = {};

      for (const city of CITIES) {
        const { data, error } = await supabase
          .from("price_history")
          .select("*")
          .eq("route_code", city.code)
          .order("recorded_at", { ascending: true })
          .limit(30);

        if (!error && data) {
          results[city.code] = data.map((row: any) => ({
            time: new Date(row.recorded_at).toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
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
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh bg-slate-950 pb-safe">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50 pt-safe">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-black text-white tracking-tight">FLY 시세판</h1>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>
          <button
            onClick={fetchAllPrices}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 active:bg-slate-700 rounded-lg text-xs text-slate-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="w-full px-3 py-3 space-y-2">
        {/* 출발지 배너 */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 py-2 text-center">
          <p className="text-slate-400 text-[10px] font-medium">
            🛫 인천(ICN) 출발 · 주말 2박3일 · 직항 최저가
          </p>
        </div>

        {/* 가격 카드들 */}
        <div className="space-y-2">
          {CITIES.map((city) => (
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
          <p className="text-slate-700 text-[9px]">
            6시간마다 자동 수집 · Amadeus API
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
