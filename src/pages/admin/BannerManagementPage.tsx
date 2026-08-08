import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PromoBanner } from '@/types/database'
import { Card } from '@/components/ui/card'
import { GoldButton } from '@/components/ui/gold-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

export const BannerManagementPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null)
  const [uploading, setUploading] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [targetLink, setTargetLink] = useState('/customer/schemes')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)

  // Carousel Preview State
  const [previewIndex, setPreviewIndex] = useState(0)

  // ── Fetch Banners ──────────────────────────────────────────────────
  const { data: banners = [], isLoading } = useQuery<PromoBanner[]>({
    queryKey: ['admin-promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('promo_banners table query fallback:', error.message)
        return []
      }
      return (data as PromoBanner[]) ?? []
    },
  })

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBanner(null)
    setTitle('')
    setDescription('')
    setImageUrl('')
    setTargetLink('/customer/schemes')
    setDisplayOrder(banners.length.toString())
    setIsActive(true)
    setModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (banner: PromoBanner) => {
    setEditingBanner(banner)
    setTitle(banner.title)
    setDescription(banner.description || '')
    setImageUrl(banner.image_url)
    setTargetLink(banner.target_link || '/customer/schemes')
    setDisplayOrder(banner.display_order.toString())
    setIsActive(banner.is_active)
    setModalOpen(true)
  }

  // Handle Image File Upload to Supabase Bucket `promo-banners`
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2 MB limit')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `banners/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('promo-banners')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) {
        // Fallback convert to Base64 Data URL if storage bucket doesn't exist yet
        console.warn('Storage upload error, using Data URL fallback:', uploadErr.message)
        const reader = new FileReader()
        reader.onloadend = () => {
          setImageUrl(reader.result as string)
          toast.success('Image loaded (Base64 Mode)')
          setUploading(false)
        }
        reader.readAsDataURL(file)
        return
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('promo-banners')
        .getPublicUrl(filePath)

      setImageUrl(publicUrlData.publicUrl)
      toast.success('Banner image uploaded successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Save Banner Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Banner title is required')
      if (!imageUrl.trim()) throw new Error('Banner image URL is required')

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim(),
        target_link: targetLink.trim() || '/customer/schemes',
        display_order: parseInt(displayOrder) || 0,
        is_active: isActive,
      }

      if (editingBanner) {
        const { error } = await supabase
          .from('promo_banners')
          .update(payload)
          .eq('id', editingBanner.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('promo_banners')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editingBanner ? 'Banner updated successfully!' : 'New promo banner created!')
      queryClient.invalidateQueries({ queryKey: ['admin-promo-banners'] })
      queryClient.invalidateQueries({ queryKey: ['customer-promo-banners'] })
      setModalOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save banner')
    },
  })

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Banner status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-promo-banners'] })
      queryClient.invalidateQueries({ queryKey: ['customer-promo-banners'] })
    },
  })

  // Delete Banner Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Banner deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-promo-banners'] })
      queryClient.invalidateQueries({ queryKey: ['customer-promo-banners'] })
    },
  })

  const activeBanners = banners.filter(b => b.is_active)

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ImageIcon className="h-3.5 w-3.5" /> Customer App Showcase
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Sliding Promo Banners
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Upload &amp; manage promotional sliders displayed on the customer mobile app dashboard.
          </p>
        </div>

        <GoldButton
          onClick={handleOpenCreate}
          className="h-11 px-5 text-sm font-extrabold shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Add New Banner
        </GoldButton>
      </div>

      {/* ── Banner Specification & Upload Recommendation Callout ────── */}
      <Card className="p-5 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
              <Info className="h-4 w-4" /> Recommended Image Dimensions for Mobile &amp; Web App
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload crisp, high-resolution promotional artwork. The app automatically scales banners responsively.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                Aspect Ratio: 2:1 or 16:9 HD
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                Size: 1200 x 600 px (or 1600 x 800 px)
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                Max Size: 2 MB (JPG, PNG, WebP)
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                Bucket: promo-banners
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Live Customer App Carousel Preview ────────────────────── */}
      {banners.length > 0 && (
        <Card className="p-5 sm:p-6 border-border shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-sm text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" /> Live Customer App Slider Preview
            </h3>
            <Badge variant="outline" className="text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30">
              {activeBanners.length} Active Banners
            </Badge>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-black aspect-[2/1] sm:aspect-[21/9] max-h-[260px] group shadow-inner">
            {activeBanners[previewIndex % (activeBanners.length || 1)] ? (
              <>
                <img
                  src={activeBanners[previewIndex % activeBanners.length].image_url}
                  alt={activeBanners[previewIndex % activeBanners.length].title || 'Banner Preview'}
                  className="w-full h-full object-cover transition-all duration-500"
                />

                {/* Arrow Controls */}
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev > 0 ? prev - 1 : activeBanners.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-amber-500 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev + 1) % activeBanners.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-amber-500 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {activeBanners.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        (previewIndex % activeBanners.length) === idx ? 'w-6 bg-amber-500' : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <ImageIcon className="h-10 w-10 text-amber-500 mb-2 opacity-50" />
                <p className="text-xs font-bold">No active promo banners currently published.</p>
                <p className="text-[11px] text-muted-foreground">Default promotional cards will be shown to customers.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Banners List Grid ─────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-heading font-extrabold text-base text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-500" /> Uploaded Banner Sliders ({banners.length})
        </h3>

        {banners.length === 0 ? (
          <Card className="p-8 text-center space-y-3 border-dashed border-2 border-border">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-foreground">No Custom Banners Uploaded Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add your first promotional banner to highlight festive offers, 0% making charges, or scheme bonuses on the customer app.
              </p>
            </div>
            <GoldButton onClick={handleOpenCreate} className="px-5 py-2 text-xs font-extrabold">
              <Plus className="h-4 w-4 inline mr-1" /> Upload First Banner
            </GoldButton>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <Card
                key={banner.id}
                className={`overflow-hidden border transition-all ${
                  banner.is_active ? 'border-amber-500/40 shadow-md' : 'border-border opacity-70'
                }`}
              >
                <div className="relative aspect-[2/1] bg-muted overflow-hidden">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <Badge
                      className={`text-[10px] font-black uppercase ${
                        banner.is_active ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {banner.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    Order: #{banner.display_order}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground line-clamp-1">{banner.title}</h4>
                    {banner.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {banner.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[150px]">
                      Target: {banner.target_link || '/customer/schemes'}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                        title={banner.is_active ? 'Disable Banner' : 'Enable Banner'}
                        className="h-8 w-8"
                      >
                        <CheckCircle2 className={`h-4 w-4 ${banner.is_active ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(banner)}
                        title="Edit Banner"
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4 text-amber-500" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete banner "${banner.title}"?`)) {
                            deleteMutation.mutate(banner.id)
                          }
                        }}
                        title="Delete Banner"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Banner Dialog ───────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-extrabold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              {editingBanner ? 'Edit Promo Banner' : 'Upload New Promo Banner'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
            className="space-y-4 py-2"
          >
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Banner Title <span className="text-amber-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Akshaya Tritiya 100% Bonus Scheme"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Subtitle / Short Description</Label>
              <Input
                placeholder="e.g. Get 1-month bonus installment on maturity & flat 0% making charges."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Image File Upload / Image URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Banner Image File / URL <span className="text-amber-500">*</span>
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://... or upload below"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-10 text-sm"
                  required
                />

                <label className="h-10 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30 shrink-0">
                  {uploading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Upload
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-amber-500/30 aspect-[2/1] bg-black max-h-[140px] mt-2">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
                    Image Preview
                  </span>
                </div>
              )}
            </div>

            {/* Target Link & Display Order */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">App Target Link</Label>
                <Input
                  placeholder="/customer/schemes"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Display Priority Order</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Is Active Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-amber-500/40 text-amber-500 focus:ring-amber-500 h-4 w-4 accent-amber-500 cursor-pointer"
                />
                <span>Active Banner (Show in Customer App)</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="h-10 text-xs font-bold"
              >
                Cancel
              </Button>
              <GoldButton
                type="submit"
                disabled={saveMutation.isPending || uploading}
                className="h-10 px-5 text-xs font-extrabold shadow-lg shadow-amber-500/20"
              >
                {saveMutation.isPending ? 'Saving...' : editingBanner ? 'Update Banner' : 'Upload Banner'}
              </GoldButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
