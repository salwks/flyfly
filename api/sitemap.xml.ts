// 동적 sitemap.xml 생성
export const config = {
  runtime: 'edge',
};

const CITIES = [
  { code: "HKG", name: "홍콩" },
  { code: "NRT", name: "도쿄" },
  { code: "KIX", name: "오사카" },
  { code: "FUK", name: "후쿠오카" },
  { code: "BKK", name: "방콕" },
  { code: "DAD", name: "다낭" },
  { code: "TPE", name: "타이베이" },
  { code: "SIN", name: "싱가포르" },
  { code: "GUM", name: "괌" },
  { code: "CDG", name: "파리" },
];

export default function handler() {
  const baseUrl = "https://flyfly.vercel.app";
  const today = new Date().toISOString().split('T')[0];

  const urls = [
    // 메인 페이지
    `<url>
      <loc>${baseUrl}/</loc>
      <lastmod>${today}</lastmod>
      <changefreq>hourly</changefreq>
      <priority>1.0</priority>
    </url>`,
    // OG 이미지 API (검색엔진 참고용)
    `<url>
      <loc>${baseUrl}/api/og</loc>
      <lastmod>${today}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.5</priority>
    </url>`,
  ];

  // 도시별 페이지 (향후 확장용)
  for (const city of CITIES) {
    urls.push(`<url>
      <loc>${baseUrl}/?city=${city.code}</loc>
      <lastmod>${today}</lastmod>
      <changefreq>hourly</changefreq>
      <priority>0.8</priority>
    </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
