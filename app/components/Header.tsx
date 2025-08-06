"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { FileText, Map, Menu, X, BarChart2 } from "lucide-react"
import { useState } from "react"
import { cn } from "../../lib/utils"

const navigation = [
  { name: "Map", href: "/", icon: Map },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
]

// Custom Shield Icon Component
const ShieldIcon = () => (
  <div className="relative w-8 h-8">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-8 h-8"
    >
      {/* Shield shape */}
      <path
        d="M12 2L3 7V12C3 16.4183 6.58172 20 11 20H13C17.4183 20 21 16.4183 21 12V7L12 2Z"
        fill="#DC2626"
        stroke="#DC2626"
        strokeWidth="1.5"
      />
      {/* Exclamation mark */}
      <path
        d="M12 8V12M12 16H12.01"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
)

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        {/* Logo - positioned exactly where the black rectangle is drawn */}
        <div className="flex-shrink-0 -ml-10">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <ShieldIcon />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900">
                  RIDS
                </span>
                <span className="text-sm text-gray-500 -mt-1">
                  RISK DETECTION SYSTEM
                </span>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Desktop navigation - centered */}
        <div className="hidden lg:flex lg:gap-x-12 lg:flex-1 lg:justify-center">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2 text-sm font-semibold leading-6",
                pathname === item.href
                  ? "text-blue-600"
                  : "text-gray-900 hover:text-blue-600 transition-colors"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {pathname === item.href && (
                <motion.div
                  className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-blue-600"
                  layoutId="underline"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Empty div to maintain layout balance */}
        <div className="hidden lg:flex lg:flex-1"></div>
      </nav>

      {/* Mobile menu */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{
          opacity: mobileMenuOpen ? 1 : 0,
          y: mobileMenuOpen ? 0 : -10,
        }}
        className={cn(
          "lg:hidden",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <div className="fixed inset-0 z-50" />
        <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex flex-col gap-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 -mx-3 rounded-lg px-3 py-2 text-base font-semibold leading-7",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-900 hover:bg-gray-50"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </header>
  )
}

