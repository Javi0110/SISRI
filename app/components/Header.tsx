"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Home, FileText, Map, Menu, X, BarChart2 } from "lucide-react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { RidsLogo } from "./RidsLogo"

const navigation = [
  { name: "Map", href: "/", icon: Map },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="mx-auto flex items-center justify-between px-4 lg:px-8 h-16" aria-label="Global">
        {/* Logo - Left aligned and properly sized */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <RidsLogo />
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

        {/* Desktop navigation - Centered */}
        <div className="hidden lg:flex lg:gap-x-8 absolute left-1/2 transform -translate-x-1/2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2 text-sm font-semibold leading-6 px-3 py-2 rounded-lg transition-all duration-200",
                pathname === item.href
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Back to Map button - Right aligned */}
        <div className="hidden lg:flex items-center">
          {pathname !== "/" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Map className="h-4 w-4" />
                Back to Map
              </Link>
            </motion.div>
          )}
        </div>
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
          <div className="flex items-center justify-between mb-6">
            <RidsLogo />
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
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
            {pathname !== "/" && (
              <Link
                href="/"
                className="flex items-center gap-2 -mx-3 rounded-lg bg-blue-600 px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-blue-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Map className="h-5 w-5" />
                Back to Map
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </header>
  )
}

