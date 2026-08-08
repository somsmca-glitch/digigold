import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDate, formatINR, getInitials } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  IndianRupee, TrendingUp, Layers,
  Calendar, Users, AlertTriangle, ChevronRight, History, UserCheck2, Clock,
} from 'lucide-react'

const reports = [
  {
    id: 'monthly-collection',
    title: 'Monthly Collection',
    description: 'Payments collected filtered by month with mode split & CSV export',
    icon: IndianRupee,
    color: 'amber',
    badge: 'Finance',
  },
  {
    id: 'collection-trend',
    title: '6-Month Trend',
    description: 'Month-over-month bar chart of all payment collections',
    icon: TrendingUp,
    color: 'emerald',
    badge: 'Analytics',
  },
  {
    id: 'scheme-status',
    title: 'Scheme Status Overview',
    description: 'Active, redeemed, closed & defaulted chit breakdown with revenue potential',
    icon: Layers,
    color: 'blue',
    badge: 'Schemes',
  },
  {
    id: 'maturities',
    title: 'Upcoming Maturities',
    description: 'Schemes maturing in next 30–60 days with urgency highlights',
    icon: Calendar,
    color: 'orange',
    badge: 'Action Required',
  },
  {
    id: 'customer-distribution',
    title: 'Customer Distribution',
    description: 'City-wise customer spread and recently enrolled members',
    icon: Users,
    color: 'purple',
    badge: 'Customers',
  },
  {
    id: 'defaulted-chits',
    title: 'Defaulted & Closed Chits',
    description: 'Members with defaulted or manually closed schemes',
    icon: AlertTriangle,
    color: 'red',
    badge: 'Risk',
  },
]

const colorMap: Record<string, {
  bg: string; border: string; icon: string; badge: string; glow: string; shine: string
}> = {
  amber:   {
    bg:    'from-amber-500/10 via-yellow-500/5 to-transparent',
    border:'border-amber-500/30 hover:border-amber-500/60',
    icon:  'text-amber-600 dark:text-amber-400 bg-amber-500/15 group-hover:bg-amber-500/25',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    glow:  'group-hover:shadow-amber-500/20',
    shine: 'from-amber-400/0 via-amber-400/10 to-amber-400/0',
  },
  emerald: {
    bg:    'from-emerald-500/10 via-green-500/5 to-transparent',
    border:'border-emerald-500/30 hover:border-emerald-500/60',
    icon:  'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 group-hover:bg-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    glow:  'group-hover:shadow-emerald-500/20',
    shine: 'from-emerald-400/0 via-emerald-400/10 to-emerald-400/0',
  },
  blue:    {
    bg:    'from-blue-500/10 via-indigo-500/5 to-transparent',
    border:'border-blue-500/30 hover:border-blue-500/60',
    icon:  'text-blue-600 dark:text-blue-400 bg-blue-500/15 group-hover:bg-blue-500/25',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    glow:  'group-hover:shadow-blue-500/20',
    shine: 'from-blue-400/0 via-blue-400/10 to-blue-400/0',
  },
  orange:  {
    bg:    'from-orange-500/10 via-red-500/5 to-transparent',
    border:'border-orange-500/30 hover:border-orange-500/60',
    icon:  'text-orange-600 dark:text-orange-400 bg-orange-500/15 group-hover:bg-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    glow:  'group-hover:shadow-orange-500/20',
    shine: 'from-orange-400/0 via-orange-400/10 to-orange-400/0',
  },
  purple:  {
    bg:    'from-purple-500/10 via-violet-500/5 to-transparent',
    border:'border-purple-500/30 hover:border-purple-500/60',
    icon:  'text-purple-600 dark:text-purple-400 bg-purple-500/15 group-hover:bg-purple-500/25',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    glow:  'group-hover:shadow-purple-500/20',
    shine: 'from-purple-400/0 via-purple-400/10 to-purple-400/0',
  },
  red:     {
    bg:    'from-red-500/10 via-rose-500/5 to-transparent',
    border:'border-red-500/30 hover:border-red-500/60',
    icon:  'text-red-600 dark:text-red-400 bg-red-500/15 group-hover:bg-red-500/25',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    glow:  'group-hover:shadow-red-500/20',
    shine: 'from-red-400/0 via-red-400/10 to-red-400/0',
  },
}

// Shimmer animation variants for the shine overlay
const shineVariants = {
  rest: { x: '-100%', opacity: 0 },
  hover: {
    x: '200%',
    opacity: 1,
    transition: { duration: 0.55, ease: 'easeInOut' },
  },
}

// Icon pulse animation
const iconVariants = {
  rest: { rotate: 0, scale: 1 },
  hover: {
    scale: 1.18,
    rotate: [0, -8, 8, -4, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  }),
}

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Business Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select a report to view live analytics from your DigiGold database
        </p>
      </motion.div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((r, i) => {
          const Icon = r.icon
          const c = colorMap[r.color]
          return (
            <motion.div
              key={r.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
              className="group"
            >
              <Link to={`/admin/reports/${r.id}`} className="block h-full">
                <Card
                  className={`
                    relative h-full p-6 overflow-hidden cursor-pointer
                    bg-gradient-to-br ${c.bg}
                    border ${c.border}
                    shadow-sm hover:shadow-xl ${c.glow}
                    transition-all duration-300
                  `}
                >
                  {/* Shimmer sweep on hover */}
                  <motion.div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${c.shine} skew-x-12`}
                    variants={shineVariants}
                    initial="rest"
                    whileHover="hover"
                  />

                  {/* Subtle corner glow */}
                  <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-current opacity-[0.04] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.12]" />

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <motion.div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors duration-300 ${c.icon}`}
                        variants={iconVariants}
                        initial="rest"
                        whileHover="hover"
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${c.badge}`}>
                        {r.badge}
                      </Badge>
                    </div>

                    <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors duration-200 leading-snug">
                      {r.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {r.description}
                    </p>

                    <div className="flex items-center gap-1 mt-5 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors duration-200">
                      <span>View Report</span>
                      <motion.div
                        initial={{ x: 0 }}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </motion.div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Live Activity & Audit Timeline Feed */}
      <ActivityFeedSection />
    </div>
  )
}

const ActivityFeedSection: React.FC = () => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['live-activity-feed'],
    queryFn: async () => {
      const [paymentsRes, chitsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*, customer:customers(id, name, phone, photo_url), recorder:profiles!recorded_by(full_name, role), customer_chit:customer_chits(scheme:chit_schemes(name))')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('customer_chits')
          .select('*, customer:customers(id, name, phone, photo_url), enroller:profiles!enrolled_by(full_name, role), scheme:chit_schemes(name)')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      if (paymentsRes.error) throw paymentsRes.error

      let chitsData: any[] = []
      if (chitsRes.error) {
        const fallbackRes = await supabase
          .from('customer_chits')
          .select('*, customer:customers(id, name, phone, photo_url), scheme:chit_schemes(name)')
          .order('created_at', { ascending: false })
          .limit(10)
        chitsData = fallbackRes.data || []
      } else {
        chitsData = chitsRes.data || []
      }

      const paymentsData = (paymentsRes.data || []) as any[]

      const normalizedPayments = paymentsData.map(p => {
        const custName = p.customer?.name || 'Customer'
        const actorName = p.recorder?.full_name && p.recorder?.role !== 'customer'
          ? `${p.recorder.full_name} (${p.recorder.role === 'admin' ? 'Admin' : 'Staff'})`
          : custName

        return {
          id: `payment-${p.id}`,
          type: 'payment',
          created_at: p.created_at,
          customerName: custName,
          schemeName: p.customer_chit?.scheme?.name || 'Chit Plan',
          staffName: actorName,
          amount: p.amount,
          payment_mode: p.payment_mode,
          payment_date: p.payment_date,
        }
      })

      const normalizedEnrolments = chitsData.map(c => {
        const custName = c.customer?.name || 'Customer'
        const actorName = c.enroller?.full_name && c.enroller?.role !== 'customer'
          ? `${c.enroller.full_name} (${c.enroller.role === 'admin' ? 'Admin' : 'Staff'})`
          : custName

        return {
          id: `enrolment-${c.id}`,
          type: 'enrolment',
          created_at: c.created_at,
          customerName: custName,
          schemeName: c.scheme?.name || 'Chit Plan',
          staffName: actorName,
          amount: undefined,
          payment_mode: undefined,
          payment_date: undefined,
        }
      })

      const combined = [...normalizedPayments, ...normalizedEnrolments]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return combined.slice(0, 15) as any[]
    },
    refetchInterval: 10000,
  })

  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#activity-feed') {
      const el = document.getElementById('activity-feed')
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      }
    }
  }, [location.hash])

  return (
    <Card id="activity-feed" className="p-6 border-amber-500/20 shadow-md scroll-mt-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-500" />
          <h2 className="font-heading text-lg font-extrabold text-foreground">Recent Activity &amp; Audit Feed</h2>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold uppercase text-amber-600 border-amber-500/30 bg-amber-500/10">
          Live Tracker
        </Badge>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading activity feed...</div>
      ) : activities.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">No activities recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => {
            const isPayment = act.type === 'payment'

            return (
              <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:bg-muted/30 transition-all text-xs">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-background">
                    <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-xs">
                      {getInitials(act.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{act.customerName}</span>
                      <span className="text-[10px] text-muted-foreground">({act.schemeName})</span>
                    </div>
                    {isPayment ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="uppercase font-bold text-[9px] px-1.5 py-0.2 rounded bg-muted">
                          {act.payment_mode}
                        </span>
                        <span>Paid <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(act.amount)}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="uppercase font-bold text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          NEW ENROLMENT
                        </span>
                        <span>Enrolled in scheme</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                      <UserCheck2 className="h-3 w-3" />
                      <span>By: {act.staffName}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(act.payment_date || act.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

