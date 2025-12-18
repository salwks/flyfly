import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
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

// 저점 판독기
function getPriceStatus(current: number, data: PriceData[]) {
  if (data.length < 3) return { label: "수집중", color: "bg-slate-700", animate: false };

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b) / prices.length;

  if (current <= min) return { label: "역대 저점", color: "bg-blue-600", animate: true };
  if (current < avg * 0.95) return { label: "저점 근접", color: "bg-emerald-600", animate: false };
  if (current > max * 0.98) return { label: "고점 주의", color: "bg-red-600", animate: false };
  return { label: "관망", color: "bg-slate-600", animate: false };
}

// 가격 인사이트 생성기
function getPriceInsight(current: number, data: PriceData[], change: number) {
  if (data.length < 3) return null;

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const avg = prices.reduce((a, b) => a + b) / prices.length;
  const changePercent = Math.abs(Math.round((change / (current - change)) * 100));

  // 역대 최저가
  if (current <= min) {
    return { text: "🔥 추적 기간 중 최저가! 지금이 구매 적기", highlight: true };
  }

  // 큰 폭 하락
  if (change < -10000) {
    return { text: `📉 ${Math.abs(change).toLocaleString()}원 급락! 놓치면 후회`, highlight: true };
  }

  // 평균 대비 저렴
  if (current < avg * 0.95) {
    const discount = Math.round(((avg - current) / avg) * 100);
    return { text: `💡 평균보다 ${discount}% 저렴한 가격대`, highlight: false };
  }

  // 하락 추세
  if (change < 0) {
    return { text: `📊 전 수집 대비 ${changePercent}% 하락 중`, highlight: false };
  }

  // 상승 추세
  if (change > 10000) {
    return { text: `⚠️ 가격 상승 중, 추가 상승 가능성`, highlight: false };
  }

  return null;
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

  const latestData = data[data.length - 1];
  const currentPrice = latestData?.price || 0;
  const previousPrice = data.length > 1 ? data[data.length - 2]?.price : currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice > 0 ? ((change / previousPrice) * 100).toFixed(1) : "0.0";

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));

  // Skyscanner URL용 날짜 포맷 (YYMMDD)
  const formatDateForUrl = (dateStr: string) => {
    const date = new Date(dateStr);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  };

  const departureDate = latestData?.departure_date;
  const returnDate = latestData?.return_date;

  const bookingUrl = departureDate && returnDate
    ? `https://www.skyscanner.co.kr/transport/flights/icn/${code.toLowerCase()}/${formatDateForUrl(departureDate)}/${formatDateForUrl(returnDate)}/`
    : `https://www.skyscanner.co.kr/transport/flights/icn/${code.toLowerCase()}/`;

  const isUp = change > 0;
  const isDown = change < 0;

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const priceColor = isUp ? "text-red-400" : isDown ? "text-blue-400" : "text-slate-400";
  const chartColor = isUp ? "#f87171" : isDown ? "#60a5fa" : "#64748b";

  // 저점 판독
  const status = getPriceStatus(currentPrice, data);

  // 가격 인사이트
  const insight = getPriceInsight(currentPrice, data, change);

  return (
    <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-3 shadow-lg backdrop-blur-sm">
      <div className="flex justify-between items-start">
        {/* 왼쪽: 도시 정보 */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-white font-bold text-sm">{city}</h3>
              <span
                className={`${status.color} text-[8px] px-1.5 py-0.5 rounded-full font-bold text-white ${
                  status.animate ? "animate-pulse" : ""
                }`}
              >
                {status.label}
              </span>
            </div>
            <p className="text-slate-500 text-[10px]">ICN → {code}</p>
          </div>
        </div>

        {/* 오른쪽: 가격 + 예약 버튼 */}
        <div className="text-right flex items-center gap-2">
          <div>
            <p className={`text-lg font-black ${priceColor}`}>
              {currentPrice.toLocaleString()}
              <span className="text-[10px] font-normal text-slate-500">원</span>
            </p>
            <div className={`flex items-center justify-end gap-0.5 ${priceColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {isUp ? "+" : ""}
                {change.toLocaleString()} ({changePercent}%)
              </span>
            </div>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            예약
          </a>
        </div>
      </div>

      {/* 미니 차트 */}
      <div className="h-12 mt-2 -mx-1 outline-none" style={{ outline: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} style={{ outline: "none" }}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[minPrice * 0.98, maxPrice * 1.02]} hide />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()}원`, "가격"]}
              labelFormatter={(label) => `수집: ${label}`}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "11px",
                padding: "6px 10px",
              }}
              cursor={{ stroke: "#475569", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: chartColor, stroke: "#fff", strokeWidth: 1 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 가격 인사이트 */}
      {insight && (
        <div className={`mt-2 px-2 py-1.5 rounded-lg text-[10px] text-center ${
          insight.highlight
            ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 font-bold"
            : "bg-slate-800/50 text-slate-400"
        }`}>
          {insight.text}
        </div>
      )}

      {/* 하단 정보 */}
      <div className="mt-2 pt-2 border-t border-slate-800/50">
        <div className="text-[9px] text-slate-600 text-center">
          <span>최저 {minPrice.toLocaleString()}</span>
          <span className="mx-1">·</span>
          <span>최고 {maxPrice.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
