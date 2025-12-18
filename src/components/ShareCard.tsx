import { useRef } from "react";
import { Download, Instagram } from "lucide-react";

interface Deal {
  city: string;
  code: string;
  price: number;
  emoji: string;
}

interface ShareCardProps {
  deals: Deal[];
}

export function ShareCard({ deals }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawAndDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || deals.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;

    // 1. 배경 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. 상단 장식 라인
    ctx.fillStyle = "#10b981";
    ctx.fillRect(0, 0, width, 8);

    // 3. 타이틀
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("✈️ FLY TICKER", 80, 100);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("오늘의 최저가 TOP 3", 80, 180);

    // 4. 날짜
    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    ctx.fillStyle = "#64748b";
    ctx.font = "32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(today, 80, 240);

    // 5. 카드 리스트
    const topDeals = deals.slice(0, 3);
    topDeals.forEach((deal, i) => {
      const y = 320 + i * 200;

      // 카드 배경
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(60, y, 960, 170, 24);
      ctx.fill();

      // 순위 뱃지
      const rankColors = ["#fbbf24", "#94a3b8", "#b45309"];
      ctx.fillStyle = rankColors[i];
      ctx.beginPath();
      ctx.roundRect(90, y + 30, 60, 60, 12);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, 120, y + 72);
      ctx.textAlign = "left";

      // 이모지 + 도시명
      ctx.font = "48px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(deal.emoji, 180, y + 75);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(deal.city, 250, y + 75);

      // 공항코드
      ctx.fillStyle = "#64748b";
      ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(`ICN → ${deal.code}`, 180, y + 125);

      // 가격
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${deal.price.toLocaleString()}원`, 980, y + 100);
      ctx.textAlign = "left";
    });

    // 6. 하단 CTA
    ctx.fillStyle = "#475569";
    ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("인천 출발 · 주말 2박3일 · 직항 최저가", width / 2, 920);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("flyfly.vercel.app", width / 2, 970);

    ctx.fillStyle = "#334155";
    ctx.font = "24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("실시간 항공권 시세 전광판", width / 2, 1010);
    ctx.textAlign = "left";

    // 7. 다운로드
    const link = document.createElement("a");
    link.download = `FlyTicker_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (deals.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Instagram className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-bold text-slate-400">SNS 공유용 이미지</span>
        </div>
      </div>

      <p className="text-slate-500 text-[10px] mb-3">
        현재 최저가 TOP 3를 인스타그램/카카오톡에 공유할 수 있는 이미지로 생성합니다.
      </p>

      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />

      <button
        onClick={drawAndDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        카드뉴스 이미지 생성
      </button>
    </div>
  );
}
