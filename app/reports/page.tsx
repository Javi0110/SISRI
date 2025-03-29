import { ReportForm } from "../components/ReportForm"

export default function ReportsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-primary/5">
          <h1 className="text-2xl font-semibold">Submit New Report</h1>
          <p className="text-muted-foreground mt-1">
            Fill out the form below to submit a new incident report.
          </p>
        </div>
        <div className="p-6">
          <ReportForm />
        </div>
      </div>
    </div>
  )
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Add any other viewport configurations you need
}