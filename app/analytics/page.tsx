"use client"

import { DataAnalytics } from "../components/DataAnalytics"

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-primary/5">
          <h1 className="text-2xl font-semibold">Data Analytics & Export</h1>
          <p className="text-muted-foreground mt-1">
            Search, analyze, and export data from all available tables.
          </p>
        </div>
        <div className="p-6">
          <DataAnalytics />
        </div>
      </div>
    </div>
  )
} 