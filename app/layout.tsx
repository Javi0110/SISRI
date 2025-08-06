import "./globals.css"
import { Inter } from "next/font/google"
import Header from "./components/Header"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'RIDS - Risk Detection System',
  description: 'Risk Detection System - Comprehensive incident management and response system',
  viewport: 'width=device-width, initial-scale=1',
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

