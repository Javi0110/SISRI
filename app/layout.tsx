import "./globals.css"
import { Inter } from "next/font/google"
import Header from "./components/Header"
import { MuiThemeProvider } from "../components/mui-theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata = {
  title: "RIDS - Risk Detection System",
  description:
    "Risk Detection System - Comprehensive incident management and response system",
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable}`}>
        <MuiThemeProvider>
          <div className="flex min-h-screen flex-col bg-background">
            <Header />
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
          </div>
        </MuiThemeProvider>
      </body>
    </html>
  )
}
