import { FileText } from "lucide-react"
import { ReportForm } from "../components/ReportForm"

export default function ReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto">
      <div className="enterprise-page-header">
        <div className="mx-auto flex max-w-4xl items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="enterprise-section-label">Incident Management</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Submit New Report
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill out the form below to submit a new incident report.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 p-6">
        <div className="enterprise-panel overflow-hidden rounded-lg">
          <div className="p-6">
            <ReportForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}
