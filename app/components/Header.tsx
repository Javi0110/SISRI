"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Map, Menu, X, BarChart2, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { cn } from "../../lib/utils"

const navigation = [
  { name: "Map", href: "/", icon: Map },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900 text-white shadow-md">
      <nav
        className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6"
        aria-label="Global"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 ring-1 ring-slate-700">
            <ShieldAlert className="h-4 w-4 text-slate-200" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-wide text-white">
              RIDS
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Risk Detection System
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 opacity-80" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="hidden lg:flex lg:items-center lg:gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          <span className="text-xs font-medium text-slate-400">System Online</span>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-900 lg:hidden">
          <div className="space-y-1 px-4 py-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
