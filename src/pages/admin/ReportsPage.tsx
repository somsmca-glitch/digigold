import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { FileText, Download, Printer } from 'lucide-react'

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Business Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Export collection summaries, overdue reports & GST statements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <FileText className="h-8 w-8 text-amber-500" />
          <div>
            <h3 className="font-semibold text-base">Monthly Collection Report</h3>
            <p className="text-xs text-muted-foreground mt-1">Detailed list of all installment payments collected this month</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print / Export PDF
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <FileText className="h-8 w-8 text-amber-500" />
          <div>
            <h3 className="font-semibold text-base">Overdue Chit Members</h3>
            <p className="text-xs text-muted-foreground mt-1">Report of members with unpaid dues for the current cycle</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print / Export PDF
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <FileText className="h-8 w-8 text-amber-500" />
          <div>
            <h3 className="font-semibold text-base">Maturity & Redemption Statement</h3>
            <p className="text-xs text-muted-foreground mt-1">List of schemes maturing in the next 30 to 60 days</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print / Export PDF
          </Button>
        </Card>
      </div>
    </div>
  )
}
