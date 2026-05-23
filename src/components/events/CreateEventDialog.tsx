import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Loader2, RotateCcw, ChevronDown, DollarSign, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCreateEvent, useJoinEvent } from '@/hooks/useEvents';
import { useCreateEventInvites } from '@/hooks/useEventInvites';
import { useAllMySquads, type Squad } from '@/hooks/useSquads';
import { useAuth } from '@/hooks/useAuth';
import { useUploadRallyMedia } from '@/hooks/useRallyMedia';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Check } from 'lucide-react';
import { LocationSearch } from '@/components/location/LocationSearch';
import { cn } from '@/lib/utils';
import { EVENT_TYPES } from '@/lib/eventTypes';
import { TimelineSlider } from '@/components/events/TimelineSlider';
import { StagedMediaPicker, type StagedFile } from '@/components/events/StagedMediaPicker';
import { Progress } from '@/components/ui/progress';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useRecentlyFriended } from '@/hooks/useFriendships';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FlyerThemePicker } from '@/components/events/FlyerThemePicker';
import { ThemedFlyerCanvas } from '@/components/events/ThemedFlyerCanvas';
import { DEFAULT_FLYER_THEME, type FlyerThemeKey } from '@/lib/flyerThemes';
import { supabase } from '@/integrations/supabase/client';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  event_type: z.string(),
  date: z.date({
    required_error: 'Please select a date',
  }),
  time: z.string().min(1, 'Please select a time'),
  location_name: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  is_barhop: z.boolean(),
  
  cover_charge: z.string().optional(),
  split_check: z.boolean(),
  dress_code_enabled: z.boolean(),
  dress_code: z.string().max(50).optional(),
  song_recs_enabled: z.boolean(),
});

type EventFormData = z.infer<typeof eventSchema>;

// Generate time options in 15-minute increments
const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const value = `${h}:${m}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour}:${m} ${period}`;
      times.push({ value, label });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export function CreateEventDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [failedUploads, setFailedUploads] = useState<{ file: File; type: 'photo' | 'video'; orderIndex: number }[]>([]);
  const [activeSection, setActiveSection] = useState<'essentials' | 'details' | 'review'>('essentials');
  const [optionalOpen, setOptionalOpen] = useState(false);
  const essentialsRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSquads, setSelectedSquads] = useState<Squad[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [flyerTheme, setFlyerTheme] = useState<FlyerThemeKey>(DEFAULT_FLYER_THEME);
  const [flyerCustomUrl, setFlyerCustomUrl] = useState<string | null>(null);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const { profile } = useAuth();
  const { data: mySquads } = useAllMySquads();
  const { data: rallyFriends = [] } = useRallyFriends();
  const { data: recentlyFriended = [] } = useRecentlyFriended(8);
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const createInvites = useCreateEventInvites();
  const uploadMedia = useUploadRallyMedia();
  const navigate = useNavigate();

  const toggleSquadSelection = (squad: Squad) => {
    setSelectedSquads(prev => {
      const exists = prev.some(s => s.id === squad.id);
      return exists ? prev.filter(s => s.id !== squad.id) : [...prev, squad];
    });
  };

  const hasAudience = selectedSquads.length > 0;

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds(prev => prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]);
  };

  const handleFlyerUpload = async (file: File) => {
    if (!profile?.id) return;
    try {
      setFlyerUploading(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile.id}/custom/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event_flyers').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('event_flyers').getPublicUrl(path);
      setFlyerCustomUrl(data.publicUrl);
      toast.success('Photo set as flyer');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setFlyerUploading(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const reviewTop = reviewRef.current?.offsetTop ?? Infinity;
    const detailsTop = detailsRef.current?.offsetTop ?? Infinity;
    const offset = 120;
    if (scrollTop + offset >= reviewTop) setActiveSection('review');
    else if (scrollTop + offset >= detailsTop) setActiveSection('details');
    else setActiveSection('essentials');
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !open) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [open, handleScroll]);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: 'rally',
      date: undefined,
      time: '',
      location_name: '',
      location_lat: undefined,
      location_lng: undefined,
      is_barhop: false,
      
      cover_charge: '',
      split_check: true,
      dress_code_enabled: false,
      dress_code: '',
      song_recs_enabled: false,
    }
  });

  const isSubmittingRef = useRef(false);

  const onSubmit = async (data: EventFormData) => {
    if (!profile?.id) {
      toast.error('You must be logged in to create an event');
      return;
    }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const [hours, minutes] = data.time.split(':').map(Number);
      const startTime = new Date(data.date);
      startTime.setHours(hours, minutes, 0, 0);

      let result;
      try {
        result = await createEvent.mutateAsync({
          creator_id: profile.id,
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_time: startTime.toISOString(),
          location_name: data.location_name || null,
          location_lat: data.location_lat || null,
          location_lng: data.location_lng || null,
          is_barhop: data.is_barhop,
          
          cover_charge: data.cover_charge ? parseFloat(data.cover_charge) : 0,
          split_check: data.split_check,
          dress_code: data.dress_code_enabled && data.dress_code?.trim()
            ? data.dress_code.trim()
            : null,
          song_recs_enabled: data.song_recs_enabled,
          flyer_theme: flyerTheme,
          flyer_custom_image_url: flyerCustomUrl,
        } as any);
      } catch (insertErr: any) {
        console.error('[CreateEvent] insert failed', {
          code: insertErr?.code,
          message: insertErr?.message,
          details: insertErr?.details,
          hint: insertErr?.hint,
        });
        if (insertErr?.code === '23505') {
          toast.error("Looks like that R@lly already exists — give it a sec.");
        } else if (insertErr?.code === '42501' || /row-level security/i.test(insertErr?.message ?? '')) {
          toast.error('Permission denied. Try logging out and back in.');
        } else {
          toast.error(insertErr?.message || 'Could not create R@lly');
        }
        throw insertErr;
      }

      await joinEvent.mutateAsync({ eventId: result.id, profileId: profile.id });

      // Upload staged media
      if (stagedMedia.length > 0) {
        setIsUploading(true);
        const photos = stagedMedia.filter(f => f.type === 'photo');
        const videos = stagedMedia.filter(f => f.type === 'video');
        const failed: { file: File; type: 'photo' | 'video'; orderIndex: number }[] = [];

        for (let i = 0; i < photos.length; i++) {
          setUploadStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
          setUploadPercent(0);
          try {
            await uploadMedia.mutateAsync({
              eventId: result.id,
              profileId: profile.id,
              file: photos[i].file,
              type: 'photo',
              orderIndex: i,
              isFeatured: true,
              onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
            });
          } catch { failed.push({ file: photos[i].file, type: 'photo', orderIndex: i }); }
        }
        for (const v of videos) {
          setUploadStatus('Uploading video…');
          setUploadPercent(0);
          try {
            await uploadMedia.mutateAsync({
              eventId: result.id,
              profileId: profile.id,
              file: v.file,
              type: 'video',
              orderIndex: 0,
              isFeatured: true,
              onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
            });
          } catch { failed.push({ file: v.file, type: 'video', orderIndex: 0 }); }
        }
        setIsUploading(false);
        setUploadStatus('');
        setUploadPercent(0);
        if (failed.length > 0) {
          setFailedUploads(failed);
          toast.error(`${failed.length} file(s) failed to upload`);
        }
      }

      const allMemberIds = new Set<string>(selectedFriendIds.filter(id => id !== profile.id));

      // Auto-invite selected friends and all members from selected squads
      if (selectedSquads.length > 0) {
        selectedSquads.forEach(squad => {
          if (squad.owner_id && squad.owner_id !== profile.id) {
            allMemberIds.add(squad.owner_id);
          }
          squad.members?.forEach(member => {
            const memberId = member.profile_id || member.profile?.id;
            if (memberId && memberId !== profile.id) {
              allMemberIds.add(memberId);
            }
          });
        });
      }

      const uniqueMemberIds = Array.from(allMemberIds);
      if (uniqueMemberIds.length > 0) {
        try {
          await createInvites.mutateAsync({
            eventId: result.id,
            profileIds: uniqueMemberIds,
            eventTitle: data.title,
          });
          toast.success(`Invited ${uniqueMemberIds.length} friend${uniqueMemberIds.length > 1 ? 's' : ''}!`);
        } catch (inviteError: any) {
          console.error('Failed to send invites:', inviteError);
          toast.error('R@lly created but some invites failed');
        }
      }

      toast.success('Event created!');
      // Fire-and-forget: bake the OG flyer image to storage so first share is instant.
      supabase.functions.invoke('render-event-og-image', { body: { id: result.id } }).catch(() => {});
      setOpen(false);
      setStagedMedia([]);
      setSelectedSquads([]);
      setSelectedFriendIds([]);
      form.reset();
      navigate(`/events/${result.id}`);
    } catch (error: any) {
      // Insert path already toasted; only fall back for non-DB errors.
      if (!error?.code && !/row-level security/i.test(error?.message ?? '')) {
        toast.error(error?.message || 'Failed to create event');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-white text-primary hover:bg-white/90 rounded-full shadow-md font-montserrat font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Create R@lly
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        ref={scrollContainerRef}
        hideCloseButton
        className="create-rally-scroll p-0 border-0 bg-transparent shadow-none gap-0 max-w-lg w-full top-0 left-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-none sm:rounded-2xl"
      >
        <ErrorBoundary name="CreateEventDialog">
        <div className="rally-create-glow-wrapper min-h-full sm:min-h-0">
          <div
            className="rally-create-inner px-6 pt-6 space-y-5 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 1.25rem)' }}
          >
            {/* Header — Apple-quiet */}
            <div className="text-center space-y-1 pt-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground font-montserrat">
                Create a R@lly
              </h2>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 font-montserrat">
                Nights That Matter · Built in seconds
              </p>
            </div>

            {/* Segmented control — sliding orange pill */}
            <nav
              className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/40"
              style={{ WebkitBackdropFilter: 'saturate(150%) blur(24px)' }}
            >
              <div className="relative grid grid-cols-3 gap-1 p-1 rounded-full bg-muted/50 dark:bg-white/[0.04] border border-border/40">
                <div
                  className="absolute top-1 bottom-1 left-1 rounded-full bg-primary shadow-[0_4px_18px_-4px_hsl(27_91%_53%/0.5)] transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.5rem) / 3)',
                    transform: `translateX(calc(${
                      activeSection === 'essentials' ? 0 : activeSection === 'details' ? 100 : 200
                    }% + ${activeSection === 'essentials' ? 0 : activeSection === 'details' ? 0.25 : 0.5}rem))`,
                  }}
                />
                {(['essentials', 'details', 'review'] as const).map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      const ref = section === 'essentials' ? essentialsRef : section === 'details' ? detailsRef : reviewRef;
                      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cn(
                      'relative z-10 h-9 rounded-full text-[11px] uppercase tracking-[0.16em] font-semibold font-montserrat transition-colors duration-200',
                      activeSection === section
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {section === 'essentials' ? 'Essentials' : section === 'details' ? 'Details' : 'Review'}
                  </button>
                ))}
              </div>
            </nav>

        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div ref={essentialsRef} className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-montserrat -mb-2">Essentials</p>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Saturday Night Rally" className="rally-create-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div ref={detailsRef}>
            {/* Date Picker */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "EEEE, MMMM d, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
            {/* Time Picker - Timeline Slider */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TimelineSlider
                      value={field.value}
                      onChange={field.onChange}
                      selectedDate={form.watch('date')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <FormField
              control={form.control}
              name="location_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <LocationSearch
                      value={field.value || ''}
                      onChange={field.onChange}
                      onLocationSelect={(loc) => {
                        field.onChange(loc.name);
                        form.setValue('location_lat', loc.lat);
                        form.setValue('location_lng', loc.lng);
                      }}
                      placeholder="Search venue, restaurant, or address..."
                      allowCustomName={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            <div ref={reviewRef}>
            {/* Advanced options — premium glass disclosure */}
            <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-background/50 dark:bg-white/[0.03] border border-border/50 backdrop-blur-xl hover:bg-background/70 transition-all"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-semibold text-foreground font-montserrat">Add the extras</span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 font-montserrat">Dress code · Songs · Flyer · Cover</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", optionalOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3 pl-1">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-montserrat">Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What's the plan?" className="rally-field min-h-[88px] py-3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Charge */}
                <FormField
                  control={form.control}
                  name="cover_charge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-montserrat flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        Cover Charge
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" className="rally-field" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dress Code — glass row */}
                <div className="space-y-2">
                  <div className="rally-row">
                    <div className="flex flex-col min-w-0">
                      <Label htmlFor="dress-code-toggle" className="text-[15px] font-semibold text-foreground">Dress Code</Label>
                      <span className="text-[12px] text-muted-foreground">Set the vibe for the night</span>
                    </div>
                    <Switch
                      id="dress-code-toggle"
                      checked={form.watch('dress_code_enabled')}
                      onCheckedChange={(v) => {
                        form.setValue('dress_code_enabled', v);
                        if (!v) form.setValue('dress_code', '');
                      }}
                    />
                  </div>
                  {form.watch('dress_code_enabled') && (
                    <div className="overflow-hidden animate-accordion-down">
                      <Input
                        {...form.register('dress_code')}
                        maxLength={50}
                        placeholder="e.g. Black Tie, All White, Casual"
                        className="rally-field"
                      />
                    </div>
                  )}
                </div>

                {/* Song Rec's — glass row */}
                <div className="rally-row">
                  <div className="flex flex-col min-w-0">
                    <Label htmlFor="song-recs-toggle" className="text-[15px] font-semibold text-foreground">Song Rec's</Label>
                    <span className="text-[12px] text-muted-foreground">Let friends drop song recommendations</span>
                  </div>
                  <Switch
                    id="song-recs-toggle"
                    checked={form.watch('song_recs_enabled')}
                    onCheckedChange={(v) => form.setValue('song_recs_enabled', v)}
                  />
                </div>



                {/* Staged media picker — files held locally until submit */}
                <StagedMediaPicker stagedFiles={stagedMedia} onChange={setStagedMedia} />

                {/* Themed Flyer */}
                <FlyerThemePicker
                  value={flyerTheme}
                  customImageUrl={flyerCustomUrl}
                  onChange={(k) => { setFlyerTheme(k); setFlyerCustomUrl(null); }}
                  onUploadCustom={handleFlyerUpload}
                />
                {(form.watch('title')?.length ?? 0) >= 3 && (
                  <div className="mx-auto w-[220px]">
                    <ThemedFlyerCanvas
                      themeKey={flyerTheme}
                      customImageUrl={flyerCustomUrl}
                      title={form.watch('title')}
                      startTime={form.watch('date') && form.watch('time') ? (() => {
                        const [h, m] = form.watch('time').split(':').map(Number);
                        const d = new Date(form.watch('date'));
                        d.setHours(h || 20, m || 0, 0, 0);
                        return d;
                      })() : null}
                      locationName={form.watch('location_name') || null}
                      dressCode={form.watch('dress_code_enabled') ? form.watch('dress_code') || null : null}
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Audience picker — Recently Friended → All Friends → Squads */}
            {recentlyFriended.length > 0 && (
              <div className="space-y-2 pt-2">
                <FormLabel>Recently Friended</FormLabel>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2 pb-2">
                    {recentlyFriended.map((friend: any) => {
                      const isSelected = selectedFriendIds.includes(friend.profile_id);
                      return (
                        <button
                          key={friend.profile_id}
                          type="button"
                          onClick={() => toggleFriendSelection(friend.profile_id)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-primary/10 hover:bg-primary/20 border-primary/30'
                          )}
                        >
                          <UserPlus className="h-3 w-3" />
                          <span className="text-sm font-medium">{friend.display_name || 'R@lly Friend'}</span>
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {rallyFriends.length > 0 && (
              <div className="space-y-2 pt-2">
                <FormLabel>All Friends (optional)</FormLabel>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2 pb-2">
                    {rallyFriends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend.id);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => toggleFriendSelection(friend.id)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          <UserPlus className="h-3 w-3" />
                          <span className="text-sm font-medium">{friend.display_name || 'R@lly Friend'}</span>
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {mySquads && mySquads.length > 0 ? (
              <div className="space-y-2 pt-2">
                <FormLabel>Invite Squads (optional)</FormLabel>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2 pb-2">
                    {mySquads.map((squad) => {
                      const isSelected = selectedSquads.some(s => s.id === squad.id);
                      return (
                        <button
                          key={squad.id}
                          type="button"
                          onClick={() => toggleSquadSelection(squad)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          <Users className="h-3 w-3" />
                          <span className="text-sm font-medium">{squad.name}</span>
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                {!hasAudience && (
                  <p className="text-xs text-muted-foreground">
                    You can invite people now or after the R@lly is created.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No squads yet.</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Create the R@lly first, then invite people by contact, phone number, or share link.
                    </p>
                  </div>
                </div>
              </div>
            )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{uploadStatus}</p>
                <Progress value={uploadPercent} className="h-2" />
              </div>
            )}

            {/* Sticky premium action bar */}
            <div
              className="fixed sm:absolute left-0 right-0 bottom-0 z-30 px-5 pt-4 bg-background/80 backdrop-blur-2xl border-t border-border/40"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
                WebkitBackdropFilter: 'saturate(150%) blur(28px)',
              }}
            >
              <Button
                type="submit"
                className="w-full h-12 rounded-full gradient-primary text-base font-bold font-montserrat shadow-[0_8px_28px_-8px_hsl(27_91%_53%/0.55)]"
                aria-busy={createEvent.isPending || joinEvent.isPending || isUploading || isSubmittingRef.current}
                disabled={createEvent.isPending || joinEvent.isPending || isUploading || isSubmittingRef.current}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploadStatus}</>
                ) : createEvent.isPending || joinEvent.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
                ) : (
                  'Create R@lly'
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/join'); }}
                className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                Got an invite code? <span className="text-primary font-medium">Join a R@lly →</span>
              </button>
            </div>

            <div className="hidden">


            {failedUploads.length > 0 && !isUploading && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!profile) return;
                  setIsUploading(true);
                  const stillFailed: typeof failedUploads = [];
                  for (let i = 0; i < failedUploads.length; i++) {
                    const f = failedUploads[i];
                    setUploadStatus(`Retrying ${f.type} ${i + 1} of ${failedUploads.length}…`);
                    setUploadPercent(0);
                    try {
                      const eventId = window.location.pathname.split('/events/')[1];
                      if (!eventId) { stillFailed.push(f); continue; }
                      await uploadMedia.mutateAsync({
                        eventId,
                        profileId: profile.id,
                        file: f.file,
                        type: f.type,
                        orderIndex: f.orderIndex,
                        isFeatured: true,
                        onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
                      });
                    } catch { stillFailed.push(f); }
                  }
                  setIsUploading(false);
                  setUploadStatus('');
                  setUploadPercent(0);
                  setFailedUploads(stillFailed);
                  if (stillFailed.length > 0) toast.error(`${stillFailed.length} file(s) still failed`);
                  else toast.success('All files uploaded!');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Retry {failedUploads.length} failed upload{failedUploads.length > 1 ? 's' : ''}
              </Button>
            )}
            </div>
          </form>
        </Form>
          </div>
        </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
