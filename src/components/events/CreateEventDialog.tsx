import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Loader2, RotateCcw, ChevronDown, DollarSign } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { useUploadRallyMedia } from '@/hooks/useRallyMedia';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/location/LocationSearch';
import { cn } from '@/lib/utils';
import { EVENT_TYPES } from '@/lib/eventTypes';
import { TimelineSlider } from '@/components/events/TimelineSlider';
import { StagedMediaPicker, type StagedFile } from '@/components/events/StagedMediaPicker';
import { Progress } from '@/components/ui/progress';

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
  max_attendees: z.string().optional(),
  cover_charge: z.string().optional(),
  split_check: z.boolean(),
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
  const { profile } = useAuth();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const uploadMedia = useUploadRallyMedia();
  const navigate = useNavigate();

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
      max_attendees: '',
      cover_charge: '',
      split_check: false,
    }
  });

  const onSubmit = async (data: EventFormData) => {
    if (!profile) {
      toast.error('You must be logged in to create an event');
      return;
    }

    try {
      const [hours, minutes] = data.time.split(':').map(Number);
      const startTime = new Date(data.date);
      startTime.setHours(hours, minutes, 0, 0);

      const result = await createEvent.mutateAsync({
        creator_id: profile.id,
        title: data.title,
        description: data.description || null,
        event_type: data.event_type,
        start_time: startTime.toISOString(),
        location_name: data.location_name || null,
        location_lat: data.location_lat || null,
        location_lng: data.location_lng || null,
        is_barhop: data.is_barhop,
        max_attendees: data.max_attendees ? parseInt(data.max_attendees) : null,
        cover_charge: data.cover_charge ? parseFloat(data.cover_charge) : 0,
        split_check: data.split_check,
      } as any);

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

      toast.success('Event created!');
      setOpen(false);
      setStagedMedia([]);
      form.reset();
      navigate(`/events/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
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
      <DialogContent ref={scrollContainerRef} className="max-h-[90vh] overflow-y-auto scrollbar-hide p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="rally-create-glow-wrapper">
          <div className="rally-create-inner p-6 space-y-5">
            {/* Header */}
            <div className="text-center space-y-1.5 pt-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-montserrat">
                Create a R@lly
              </h2>
              <p className="text-xs text-muted-foreground/70 font-montserrat tracking-wide">
                Set up your R@lly in under 30 seconds.
              </p>
            </div>

            <nav className="flex items-center justify-center gap-3 text-[10px] font-montserrat uppercase tracking-[0.2em] sticky top-0 z-10 py-2 bg-background/95 backdrop-blur-md -mx-6 px-6">
              {(['essentials', 'details', 'review'] as const).map((section, i) => (
                <span key={section} className="flex items-center gap-3">
                  {i > 0 && <span className="text-primary/20">·</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      if (section === 'details') setOptionalOpen(true);
                      const ref = section === 'essentials' ? essentialsRef : section === 'details' ? detailsRef : reviewRef;
                      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cn(
                      "transition-all duration-300 cursor-pointer hover:text-primary/80",
                      activeSection === section
                        ? "text-primary font-semibold drop-shadow-[0_0_6px_hsl(27_91%_53%/0.4)]"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {section === 'essentials' ? 'Essentials' : section === 'details' ? 'Details' : 'Review'}
                  </button>
                </span>
              ))}
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
                    <PopoverContent className="w-auto p-0 z-50" align="start">
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
            {/* Advanced options - collapsed by default */}
            <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" type="button" className="w-full justify-between text-muted-foreground text-xs">
                  Optional details
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What's the plan?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Attendees</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Optional" className="rally-create-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bar Hop Mode removed from creation — now available only in After R@lly */}

                {/* Cover Charge */}
                <FormField
                  control={form.control}
                  name="cover_charge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Cover Charge ($)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" className="rally-create-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Split Check */}
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="split-check" className="text-sm">Split Check</Label>
                  <Switch
                    id="split-check"
                    checked={form.watch('split_check')}
                    onCheckedChange={(v) => form.setValue('split_check', v)}
                  />
                </div>

                {/* Staged media picker — files held locally until submit */}
                <StagedMediaPicker stagedFiles={stagedMedia} onChange={setStagedMedia} />
              </CollapsibleContent>
            </Collapsible>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{uploadStatus}</p>
                <Progress value={uploadPercent} className="h-2" />
              </div>
            )}

            <div className="pt-6">
            <Button 
              type="submit" 
              className="w-full gradient-primary"
              disabled={createEvent.isPending || joinEvent.isPending || isUploading}
            >
              {isUploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploadStatus}</>
              ) : createEvent.isPending || joinEvent.isPending ? (
                'Creating...'
              ) : (
                'Create R@lly'
              )}
            </Button>

            {form.formState.isValid && (
              <p className="text-xs text-success font-medium text-center mt-1">
                Ready to rally.
              </p>
            )}

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
      </DialogContent>
    </Dialog>
  );
}
