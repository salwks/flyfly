// robots.txt 생성
export const config = {
  runtime: 'edge',
};

export default function handler() {
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://flyfly.vercel.app/api/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
