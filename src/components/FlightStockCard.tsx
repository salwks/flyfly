import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus, Plane } from "lucide-react";

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
      <Card className="bg-white rounded-xl">
        <CardContent className="p-4 text-center text-slate-400 text-sm">
          데이터를 불러오는 중...
        </CardContent>
      </Card>
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

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp ? "text-red-500" : isDown ? "text-green-500" : "text-slate-400";
  const chartColor = isUp ? "#ef4444" : isDown ? "#22c55e" : "#94a3b8";

  return (
    <Card className="bg-white overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="px-3 py-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <div>
              <CardTitle className="text-base font-bold">{city}</CardTitle>
              <p className="text-[10px] text-slate-400">ICN → {code}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">
              {currentPrice.toLocaleString()}
              <span className="text-xs font-normal text-slate-400">원</span>
            </p>
            <div className={`flex items-center justify-end gap-0.5 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {isUp ? "+" : ""}
                {change.toLocaleString()}원 ({changePercent}%)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pt-1 pb-2.5">
        {/* 차트 */}
        <div className="h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[minPrice * 0.95, maxPrice * 1.05]} hide />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()}원`, "가격"]}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "4px 8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: chartColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 하단 정보 */}
        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">
          <span>최저 {minPrice.toLocaleString()}원</span>
          <span>최고 {maxPrice.toLocaleString()}원</span>
        </div>
      </CardContent>
    </Card>
  );
}
