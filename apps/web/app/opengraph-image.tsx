import { ImageResponse } from 'next/og';

export const alt = 'Jamwave — Listen together, for free';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #0b0b10 0%, #17111f 60%, #1f1017 100%)',
        color: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 56 }}>
          {[24, 56, 40, 64].map((h, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: h,
                borderRadius: 7,
                background: 'linear-gradient(180deg, #a855f7, #ec4899, #f97316)',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Jamwave</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
          Listen together.
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
            background: 'linear-gradient(90deg, #c084fc, #f472b6, #fb923c)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          For free.
        </div>
        <div style={{ fontSize: 30, color: '#a1a1aa', marginTop: 10 }}>
          Same song, same second, anywhere. No app, no account, no subscription.
        </div>
      </div>
    </div>,
    size,
  );
}
