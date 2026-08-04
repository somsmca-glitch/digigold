import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getInitials, formatDate } from '@/lib/utils'
import { Search, Plus, User, Phone, MapPin, ChevronRight } from 'lucide-react'

async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [openAdd, setOpenAdd] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  const addCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone,
          address,
          city,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Customer added successfully!')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setOpenAdd(false)
      setName('')
      setPhone('')
      setAddress('')
      setCity('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add customer')
    },
  })

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage members enrolled in gold chit schemes</p>
        </div>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <GoldButton>
              <Plus className="h-4 w-4 mr-2" /> Add New Customer
            </GoldButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enroll New Customer</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addCustomerMutation.mutate()
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label htmlFor="cname">Full Name</Label>
                <Input
                  id="cname"
                  placeholder="Customer Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Mobile Phone</Label>
                <Input
                  id="cphone"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caddr">Address</Label>
                <Input
                  id="caddr"
                  placeholder="Door No, Street Name"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccity">City</Label>
                <Input
                  id="ccity"
                  placeholder="Chennai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>
                  Cancel
                </Button>
                <GoldButton type="submit" disabled={addCustomerMutation.isPending}>
                  {addCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
                </GoldButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customers List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-full mb-3" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <h3 className="font-semibold text-lg">No customers found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query or add a new customer.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Link key={customer.id} to={`/admin/customers/${customer.id}`}>
              <Card className="p-4 hover:border-amber-500/50 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={customer.photo_url ?? undefined} />
                      <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                        {customer.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                {customer.city && (
                  <div className="mt-3 border-t border-border/60 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {customer.city}
                    </span>
                    <span>Joined {formatDate(customer.created_at)}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
