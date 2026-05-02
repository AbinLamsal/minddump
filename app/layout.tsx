import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

export const viewport: Viewport = {
  themeColor: '#eabc70',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export const metadata: Metadata = {
  title: "MindDump — for the brain that won't switch off",
  description: "A calm place to dump what's in your head.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MindDump',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
