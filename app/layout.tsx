import "./globals.css"
import { Inter } from "next/font/google"
import Header from "./components/Header"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'RIDS - Risks and Impacts Detection System',
  description: 'Comprehensive risk and impact detection system for incident management and response',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}

