"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Home, FileText, Map, Menu, X, BarChart2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Map", href: "/", icon: Map },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center"
            >
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                SISRI-PR
              </span>
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

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
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

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Home className="h-4 w-4" />
              Back to Map
            </Link>
          </motion.div>
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
            <Link
              href="/"
              className="flex items-center gap-2 -mx-3 rounded-lg bg-blue-600 px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-blue-500"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-5 w-5" />
              Back to Map
            </Link>
          </div>
        </div>
      </motion.div>
    </header>
  )
}

