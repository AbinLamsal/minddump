import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0c878 0%, #eabc70 50%, #d4a85a 100%)',
        }}
      >
        <span
          style={{
            fontSize: 78,
            fontWeight: 800,
            color: '#2D1A0A',
            letterSpacing: '-3px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          MD
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
