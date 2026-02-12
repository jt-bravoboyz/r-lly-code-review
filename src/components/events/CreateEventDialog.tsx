import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  max_attendees: z.string().optional()
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

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [failedUploads, setFailedUploads] = useState<{ file: File; type: 'photo' | 'video'; orderIndex: number }[]>([]);
  const { profile } = useAuth();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const uploadMedia = useUploadRallyMedia();
  const navigate = useNavigate();

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
      max_attendees: ''
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
        max_attendees: data.max_attendees ? parseInt(data.max_attendees) : null
      });

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
        <Button className="bg-white text-primary hover:bg-white/90 rounded-full shadow-md font-montserrat font-bold">
          <Plus className="h-4 w-4 mr-2" />
          Create R@lly
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Saturday Night Rally" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="max_attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attendees</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Bar Hop Mode removed from creation — now available only in After R@lly */}

            {/* Staged media picker — files held locally until submit */}
            <StagedMediaPicker stagedFiles={stagedMedia} onChange={setStagedMedia} />

            {isUploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{uploadStatus}</p>
                <Progress value={uploadPercent} className="h-2" />
              </div>
            )}

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
                'Create Event'
              )}
            </Button>

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
                      // We need the event ID from the URL since we already navigated
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
