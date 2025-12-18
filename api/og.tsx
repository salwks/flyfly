import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(request: Request) {
  const { searchParams } = new URL(request.url);

  // 파라미터에서 데이터 추출 (기본값 설정)
  const city = searchParams.get('city') || '도쿄';
  const price = searchParams.get('price') || '250000';
  const drop = searchParams.get('drop') || '15000';
  const date = searchParams.get('date') || '';

  const priceNum = Number(price);
  const dropNum = Number(drop);
  const dropPercent = Math.round((dropNum / (priceNum + dropNum)) * 100);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* 상단 로고 영역 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ✈
          </div>
          <span style={{ color: '#10b981', fontSize: '32px', fontWeight: 'bold' }}>
            FLY TICKER
          </span>
        </div>

        {/* 특가 알림 배지 */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '8px 24px',
            borderRadius: '20px',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '30px',
          }}
        >
          특가 포착!
        </div>

        {/* 도시명 */}
        <h1
          style={{
            color: 'white',
            fontSize: '80px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            textAlign: 'center',
          }}
        >
          인천 → {city}
        </h1>

        {/* 출발일 */}
        {date && (
          <p style={{ color: '#94a3b8', fontSize: '28px', margin: '0 0 30px 0' }}>
            {date} 출발
          </p>
        )}

        {/* 가격 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '16px',
          }}
        >
          <span style={{ color: '#10b981', fontSize: '100px', fontWeight: 'bold' }}>
            {priceNum.toLocaleString()}
          </span>
          <span style={{ color: '#10b981', fontSize: '48px' }}>원</span>
        </div>

        {/* 하락 정보 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            padding: '12px 28px',
            borderRadius: '12px',
          }}
        >
          <span style={{ color: '#10b981', fontSize: '36px' }}>▼</span>
          <span style={{ color: '#10b981', fontSize: '36px', fontWeight: 'bold' }}>
            {dropNum.toLocaleString()}원 ({dropPercent}%) 하락
          </span>
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748b',
            fontSize: '24px',
          }}
        >
          <span>실시간 시세 확인</span>
          <span style={{ color: '#10b981' }}>flyfly.vercel.app</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
