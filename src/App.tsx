import { useEffect, useState } from "react";
import { FlightStockCard } from "./components/FlightStockCard";
import { Plane, RefreshCw } from "lucide-react";
import "./index.css";

const API_BASE = "http://localhost:4000";

const CITIES = [
  { code: "HKG", name: "홍콩", emoji: "🇭🇰" },
  { code: "NRT", name: "도쿄", emoji: "🇯🇵" },
  { code: "KIX", name: "오사카", emoji: "🏯" },
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
        const res = await fetch(`${API_BASE}/api/prices?route=${city.code}`);
        if (res.ok) {
          results[city.code] = await res.json();
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
    // 5분마다 자동 새로고침
    const interval = setInterval(fetchAllPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-black text-white">항공권 시세판</h1>
          </div>
          <button
            onClick={fetchAllPrices}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 출발지 배너 */}
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-4 py-3 text-center">
          <p className="text-sky-400 text-sm font-medium">
            🛫 인천(ICN) 출발 · 주말 2박3일 직항 기준
          </p>
        </div>

        {/* 가격 카드들 */}
        {CITIES.map((city) => (
          <FlightStockCard
            key={city.code}
            city={city.name}
            code={city.code}
            emoji={city.emoji}
            data={priceData[city.code] || []}
          />
        ))}

        {/* 푸터 정보 */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-slate-500 text-xs">
            마지막 업데이트: {lastUpdate || "로딩 중..."}
          </p>
          <p className="text-slate-600 text-xs">
            데이터 출처: Amadeus API (테스트 환경)
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
