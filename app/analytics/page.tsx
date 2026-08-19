"use client"

import { BarChart2 } from "lucide-react"
import { DataAnalytics } from "../components/DataAnalytics"

export default function AnalyticsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto">
      <div className="enterprise-page-header">
        <div className="mx-auto flex max-w-[1600px] items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <BarChart2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="enterprise-section-label">Operations</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Data Analytics & Export
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, analyze, and export data from all available tables.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 p-6">
        <div className="enterprise-panel overflow-hidden rounded-lg">
          <div className="p-6">
            <DataAnalytics />
          </div>
        </div>
      </div>
    </div>
  )
}
