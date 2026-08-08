import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerChit, Scheme, Payment } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatINR, formatDate } from '@/lib/utils'
import {
  BookText, Search, IndianRupee, Calendar,
  Receipt, ShieldCheck, Layers, FileText, Download
} from 'lucide-react'

export const Passbook: React.FC = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChitId, setSelectedChitId] = useState<string>('all')

  // ── Fetch Enrolled Schemes & Payments (Resilient) ────────────
  const { data: customerChits = [], isLoading: loadingChits } = useQuery({
    queryKey: ['my-chits-passbook-resilient', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      let { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*), payments(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        const fallback = await supabase
          .from('customer_chits')
          .select('*, scheme:chit_schemes(*)')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
        data = fallback.data as any
      }
      return (data ?? []) as (CustomerChit & { scheme?: Scheme; payments?: Payment[] })[]
    },
    enabled: !!user?.id,
  })

  // ── Fetch All Payments for Combined Statement (Resilient) ────
  const { data: allPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['my-passbook-all-payments-resilient', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      let { data, error } = await supabase
        .from('payments')
        .select('*, customer_chit:customer_chits(*, scheme:chit_schemes(name))')
        .eq('customer_id', user.id)
        .order('payment_date', { ascending: false })

      if (error) {
        const fallback = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', user.id)
          .order('payment_date', { ascending: false })
        data = fallback.data as any
      }
      return (data ?? []) as (Payment & { customer_chit?: any })[]
    },
    enabled: !!user?.id,
  })

  const isLoading = loadingChits || loadingPayments

  // Calculate Overall Totals
  const grandTotalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const activeSchemesCount = customerChits.filter(c => c.status === 'active').length

  // Selected Chit Data
  const selectedChit = selectedChitId !== 'all'
    ? customerChits.find(c => c.id === selectedChitId)
    : null

  // Payments for active view (All or Specific Chit)
  const activeViewPayments = selectedChitId === 'all'
    ? allPayments
    : (selectedChit?.payments || [])

  // Filtered Payments matching Search Term
  const filteredPayments = activeViewPayments.filter(p => {
    const schemeName = p.customer_chit?.scheme?.name || selectedChit?.scheme?.name || ''
    const mode = p.payment_mode || ''
    const notes = p.notes || ''
    const receiptNo = p.id || ''
    const term = searchTerm.toLowerCase()
    return (
      schemeName.toLowerCase().includes(term) ||
      mode.toLowerCase().includes(term) ||
      notes.toLowerCase().includes(term) ||
      receiptNo.toLowerCase().includes(term)
    )
  })

  // Group filtered payments by scheme and calculate sub totals
  const schemeGroups = React.useMemo(() => {
    const map = new Map<string, {
      chitId: string;
      schemeName: string;
      payments: typeof filteredPayments;
      subTotal: number;
      subTotalGrams: number;
    }>()

    filteredPayments.forEach(p => {
      const key = p.customer_chit_id || p.customer_chit?.scheme?.name || 'other'
      const schemeName = p.customer_chit?.scheme?.name || 'Gold Chit Plan'

      if (!map.has(key)) {
        map.set(key, {
          chitId: key,
          schemeName,
          payments: [],
          subTotal: 0,
          subTotalGrams: 0,
        })
      }

      const group = map.get(key)!
      group.payments.push(p)
      group.subTotal += (p.amount || 0)
      group.subTotalGrams += (p.gold_weight_grams || 0)
    })

    return Array.from(map.values())
  }, [filteredPayments])

  // Download Passbook PDF Statement Generator
  const handleDownloadPassbookPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const groupedTablesHtml = schemeGroups.map((group) => {
      const rows = group.payments.map((p, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 9px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 9px; font-weight: 500;">${formatDate(p.payment_date)}</td>
          <td style="padding: 9px; font-weight: bold; color: #1e293b;">${p.customer_chit?.scheme?.name || group.schemeName}</td>
          <td style="padding: 9px; color: #475569;">${(p.payment_mode || 'CASH').toUpperCase()} (REC-${p.id.slice(0, 8).toUpperCase()})</td>
          <td style="padding: 9px; text-align: right; font-weight: bold; color: #059669;">${formatINR(p.amount)}</td>
        </tr>
      `).join('')

      return `
        <div style="margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; page-break-inside: avoid;">
          <div style="background: #fef3c7; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fde68a;">
            <div style="font-weight: bold; font-size: 13px; color: #92400e;">📜 ${group.schemeName} (${group.payments.length} Payments)</div>
            <div style="font-weight: bold; font-size: 13px; color: #b45309;">Sub Total: ${formatINR(group.subTotal)}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="width: 40px; text-align: center; padding: 8px;">#</th>
                <th style="padding: 8px; text-align: left;">Payment Date</th>
                <th style="padding: 8px; text-align: left;">Scheme Name</th>
                <th style="padding: 8px; text-align: left;">Paid By (Receipt No)</th>
                <th style="text-align: right; padding: 8px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="background: #f8fafc; padding: 8px 15px; text-align: right; font-size: 12px; font-weight: bold; border-top: 1px solid #e2e8f0; color: #059669;">
            Sub Total for ${group.schemeName}: ${formatINR(group.subTotal)}
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DigiGold - Combined Passbook Ledger Statement</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #111; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #DAA520; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #B8860B; }
            .meta { font-size: 12px; color: #555; }
            .summary { display: flex; gap: 20px; margin-bottom: 25px; }
            .card { background: #fffbe6; border: 1px solid #f0c040; padding: 12px 20px; border-radius: 8px; flex: 1; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">✨ DigiGold - Combined Passbook Ledger Statement</div>
              <div class="meta">Official Customer Statement • Account: ${user?.email || 'Valued Customer'}</div>
            </div>
            <div class="meta" style="text-align: right;">
              <div>Date Generated: ${new Date().toLocaleDateString()}</div>
              <div>Status: Verified Official Ledger</div>
            </div>
          </div>

          <div class="summary">
            <div class="card">
              <div style="font-size: 10px; text-transform: uppercase; color: #888;">Total Money Saved</div>
              <div style="font-size: 20px; font-weight: bold; color: #B8860B;">${formatINR(grandTotalPaid)}</div>
            </div>
            <div class="card">
              <div style="font-size: 10px; text-transform: uppercase; color: #888;">Enrolled Schemes</div>
              <div style="font-size: 20px; font-weight: bold; color: #059669;">${customerChits.length} Active Plans</div>
            </div>
          </div>

          ${groupedTablesHtml}

          <div class="footer">
            Official Computer Generated Passbook Ledger Statement • DigiGold Jewellery Chits System
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── Page Header (Single Row with Title & Download PDF Icon) ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BookText className="h-6 w-6 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-heading text-lg sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
              Digital Gold Passbook
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Combined Passbook Ledger Statement &amp; transaction receipts
            </p>
          </div>
        </div>

        {/* Small Icon Button to Download Passbook PDF */}
        <Button
          onClick={handleDownloadPassbookPDF}
          disabled={allPayments.length === 0}
          variant="outline"
          size="icon"
          title="Download Combined Passbook Ledger Statement PDF"
          className="h-9 w-9 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs shrink-0"
        >
          <Download className="h-4.5 w-4.5" />
        </Button>
      </div>

      {/* ── Overall Summary Header KPIs (Center Aligned) ──────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 sm:p-5 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent relative overflow-hidden shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mb-1.5 mx-auto">
            <IndianRupee className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate w-full text-center">Total Money Saved</p>
          <div className="flex items-center justify-center w-full text-center mx-auto my-0.5">
            <p className="text-lg sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono text-center">{formatINR(grandTotalPaid)}</p>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate w-full text-center">Across all schemes</p>
        </Card>

        <Card className="p-4 sm:p-5 border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mb-1.5 mx-auto">
            <Layers className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate w-full text-center">Enrolled Schemes</p>
          <div className="flex items-center justify-center w-full text-center mx-auto my-0.5">
            <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-center">{customerChits.length}</p>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate w-full text-center">{activeSchemesCount} Active Plans</p>
        </Card>
      </div>

      {/* ── Passbook Statement Ledger (Single Row Layout) ──────── */}
      <Card className="border-border/60 shadow-md overflow-hidden">
        {/* Ledger Header & Search */}
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            <h2 className="font-bold text-sm text-foreground">
              Combined Passbook Ledger Statement
            </h2>
            <Badge variant="outline" className="text-[10px] font-bold">
              {filteredPayments.length} Receipts
            </Badge>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search receipts by mode or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Quick Download Statement PDF Icon */}
            <Button
              onClick={handleDownloadPassbookPDF}
              disabled={allPayments.length === 0}
              variant="outline"
              size="icon"
              title="Download Combined Passbook Ledger Statement PDF"
              className="h-8 w-8 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Table Row Header: Date, Scheme Name, Payment Mode, Amount ── */}
        <div className="grid grid-cols-12 gap-2 sm:gap-3 px-4 py-2.5 bg-muted/50 text-[10px] sm:text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider border-b border-border/50 items-center">
          <div className="col-span-3 sm:col-span-2 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-amber-500 shrink-0" /> Date
          </div>
          <div className="col-span-4 flex items-center gap-1">
            <Layers className="h-3 w-3 text-amber-500 shrink-0" /> Scheme
          </div>
          <div className="col-span-2 sm:col-span-4 flex items-center gap-1 justify-center sm:justify-start">
            <Receipt className="h-3 w-3 text-amber-500 shrink-0" /> Mode
          </div>
          <div className="col-span-3 sm:col-span-2 text-right flex items-center justify-end gap-1">
            <IndianRupee className="h-3 w-3 text-emerald-500 shrink-0" /> Amount
          </div>
        </div>

        {/* ── Grouped Scheme Ledger List Items ────────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading passbook statement...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <BookText className="h-8 w-8 mx-auto opacity-30" />
            <p className="font-bold text-foreground">No payment receipts found</p>
            <p>Your deposit receipts will appear here as soon as payments are recorded for this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {schemeGroups.map((group, gIdx) => (
              <div key={group.chitId || gIdx} className="space-y-0">
                {/* ── Scheme Group Header Bar ── */}
                <div className="px-4 py-2 bg-amber-500/10 border-y border-amber-500/20 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-extrabold text-foreground truncate">{group.schemeName}</span>
                    <Badge variant="outline" className="text-[9px] font-extrabold bg-background/60">
                      {group.payments.length} Receipt{group.payments.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground font-semibold mr-1.5">Sub Total:</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-xs">
                      {formatINR(group.subTotal)}
                    </span>
                  </div>
                </div>

                {/* ── Scheme Transactions (Aligned 12-Column Grid) ── */}
                <div className="divide-y divide-border/40">
                  {group.payments.map((p, idx) => {
                    const pSchemeName = p.customer_chit?.scheme?.name || group.schemeName

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="px-4 py-3 grid grid-cols-12 gap-2 sm:gap-3 items-center hover:bg-muted/30 transition-colors text-xs overflow-hidden"
                      >
                        {/* 1. Date */}
                        <div className="col-span-3 sm:col-span-2 text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                          {formatDate(p.payment_date)}
                        </div>

                        {/* 2. Scheme Name */}
                        <div className="col-span-4 font-extrabold text-foreground text-[11px] sm:text-xs truncate">
                          {pSchemeName}
                        </div>

                        {/* 3. Payment Mode */}
                        <div className="col-span-2 sm:col-span-4 text-[10px] sm:text-xs text-muted-foreground truncate text-center sm:text-left">
                          <span className="font-extrabold text-foreground uppercase">{p.payment_mode || 'cash'}</span>
                        </div>

                        {/* 4. Amount */}
                        <div className="col-span-3 sm:col-span-2 text-right font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          +{formatINR(p.amount)}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
