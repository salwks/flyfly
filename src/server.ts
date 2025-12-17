// server.ts - 항공권 가격 API 서버
import { Database } from "bun:sqlite";

const db = new Database("flight_ticker.db");

const server = Bun.serve({
  port: 4000,
  fetch(req) {
    const url = new URL(req.url);

    // CORS 처리
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 가격 히스토리 API
    if (url.pathname === "/api/prices") {
      const route = url.searchParams.get("route") || "HKG";

      const query = db.query(`
        SELECT
          strftime('%m/%d %H:%M', collected_at) as time,
          price,
          departure_date,
          return_date
        FROM price_history
        WHERE route_code = ?
        ORDER BY collected_at ASC
        LIMIT 30
      `);

      const data = query.all(route);

      return Response.json(data, { headers: corsHeaders });
    }

    // 모든 노선 최신 가격 API
    if (url.pathname === "/api/latest") {
      const query = db.query(`
        SELECT
          route_code,
          price,
          departure_date,
          return_date,
          collected_at
        FROM price_history p1
        WHERE collected_at = (
          SELECT MAX(collected_at)
          FROM price_history p2
          WHERE p2.route_code = p1.route_code
            AND p2.departure_date = p1.departure_date
        )
        ORDER BY route_code, departure_date
      `);

      const data = query.all();

      return Response.json(data, { headers: corsHeaders });
    }

    // 노선별 요약 API (차트용)
    if (url.pathname === "/api/summary") {
      const query = db.query(`
        SELECT
          route_code,
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price,
          COUNT(*) as data_points
        FROM price_history
        GROUP BY route_code
      `);

      const data = query.all();

      return Response.json(data, { headers: corsHeaders });
    }

    return new Response("Flight Ticker API Server - /api/prices, /api/latest, /api/summary");
  },
});

console.log(`🌐 API 서버: http://localhost:${server.port}`);
