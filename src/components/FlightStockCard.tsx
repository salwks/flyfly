import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceData {
  time: string;
  price: number;
  departure_date: string;
  return_date: string;
}

interface FlightStockCardProps {
  city: string;
  code: string;
  data: PriceData[];
  emoji?: string;
}

export function FlightStockCard({ city, code, data, emoji = "✈️" }: FlightStockCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-slate-500 text-sm">{city}</span>
        </div>
        <div className="text-slate-600 text-xs mt-2">데이터 수집 중...</div>
      </div>
    );
  }

  const currentPrice = data[data.length - 1]?.price || 0;
  const previousPrice = data.length > 1 ? data[data.length - 2]?.price : currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice > 0 ? ((change / previousPrice) * 100).toFixed(1) : "0.0";

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));

  const isUp = change > 0;
  const isDown = change < 0;

  // 주식 스타일: 하락 = 파란색(매수 기회), 상승 = 빨간색
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const priceColor = isUp ? "text-red-400" : isDown ? "text-blue-400" : "text-slate-400";
  const chartColor = isUp ? "#f87171" : isDown ? "#60a5fa" : "#64748b";
  const bgGlow = isUp ? "shadow-red-500/5" : isDown ? "shadow-blue-500/5" : "";

  return (
    <div className={`bg-slate-900/80 border border-slate-800/50 rounded-2xl p-3 shadow-lg ${bgGlow} backdrop-blur-sm`}>
      <div className="flex justify-between items-start">
        {/* 왼쪽: 도시 정보 */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <h3 className="text-white font-bold text-sm">{city}</h3>
            <p className="text-slate-500 text-[10px]">ICN → {code}</p>
          </div>
        </div>

        {/* 오른쪽: 가격 */}
        <div className="text-right">
          <p className={`text-lg font-black ${priceColor}`}>
            {currentPrice.toLocaleString()}
            <span className="text-[10px] font-normal text-slate-500">원</span>
          </p>
          <div className={`flex items-center justify-end gap-0.5 ${priceColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-[10px] font-bold">
              {isUp ? "+" : ""}{change.toLocaleString()} ({changePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* 미니 차트 */}
      <div className="h-12 mt-2 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={[minPrice * 0.98, maxPrice * 1.02]} hide />
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 하단 정보 */}
      <div className="flex justify-between text-[9px] text-slate-600 mt-1">
        <span>최저 {minPrice.toLocaleString()}</span>
        <span>최고 {maxPrice.toLocaleString()}</span>
      </div>
    </div>
  );
}
