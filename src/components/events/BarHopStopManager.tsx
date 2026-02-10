import { useState } from 'react';
import { GripVertical, Trash2, Clock, MapPin, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LocationSearch } from '@/components/location/LocationSearch';

interface BarHopStop {
  id: string;
  name: string;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
  stop_order: number;
  eta: string | null;
  arrived_at: string | null;
  departed_at: string | null;
}

interface BarHopStopManagerProps {
  eventId: string;
  stops: BarHopStop[];
  canManage: boolean;
}

export function BarHopStopManager({ eventId, stops, canManage }: BarHopStopManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');
  const [newStopLat, setNewStopLat] = useState<number | null>(null);
  const [newStopLng, setNewStopLng] = useState<number | null>(null);
  const [newStopEta, setNewStopEta] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingEta, setEditingEta] = useState<string | null>(null);
  const [etaValue, setEtaValue] = useState('');
  const queryClient = useQueryClient();

  const sortedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order);

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopName.trim()) {
      toast.error('Please enter a stop name');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('barhop_stops')
        .insert({
          event_id: eventId,
          name: newStopName.trim(),
          address: newStopAddress.trim() || null,
          lat: newStopLat,
          lng: newStopLng,
          stop_order: stops.length + 1,
          eta: newStopEta ? new Date(newStopEta).toISOString() : null,
        });

      if (error) throw error;

      toast.success('Stop added! 🍺');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setNewStopName('');
      setNewStopAddress('');
      setNewStopLat(null);
      setNewStopLng(null);
      setNewStopEta('');
      setIsAddOpen(false);
    } catch (error) {
      console.error('Error adding stop:', error);
      toast.error('Failed to add stop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStop = async (stopId: string) => {
    try {
      const { error } = await supabase
        .from('barhop_stops')
        .delete()
        .eq('id', stopId);

      if (error) throw error;

      // Reorder remaining stops
      const remainingStops = sortedStops.filter(s => s.id !== stopId);
      for (let i = 0; i < remainingStops.length; i++) {
        await supabase
          .from('barhop_stops')
          .update({ stop_order: i + 1 })
          .eq('id', remainingStops[i].id);
      }

      toast.success('Stop removed');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (error) {
      console.error('Error removing stop:', error);
      toast.error('Failed to remove stop');
    }
  };

  const handleReorder = async (stopId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedStops.findIndex(s => s.id === stopId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedStops.length - 1)
    ) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentStop = sortedStops[currentIndex];
    const targetStop = sortedStops[targetIndex];

    try {
      // Swap orders
      await supabase
        .from('barhop_stops')
        .update({ stop_order: targetStop.stop_order })
        .eq('id', currentStop.id);

      await supabase
        .from('barhop_stops')
        .update({ stop_order: currentStop.stop_order })
        .eq('id', targetStop.id);

      toast.success('Stops reordered');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to reorder');
    }
  };

  const handleSetEta = async (stopId: string) => {
    if (!etaValue) {
      setEditingEta(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('barhop_stops')
        .update({ eta: new Date(etaValue).toISOString() })
        .eq('id', stopId);

      if (error) throw error;

      toast.success('ETA updated');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setEditingEta(null);
      setEtaValue('');
    } catch (error) {
      console.error('Error setting ETA:', error);
      toast.error('Failed to update ETA');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-secondary" />
          Bar Hop Stops
        </CardTitle>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Stop
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-secondary" />
                  Add Bar Hop Stop
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddStop} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Search for a bar or venue</Label>
                  <LocationSearch
                    value={newStopName}
                    onChange={setNewStopName}
                    onLocationSelect={(loc) => {
                      setNewStopName(loc.name);
                      setNewStopAddress(loc.address);
                      setNewStopLat(loc.lat);
                      setNewStopLng(loc.lng);
                    }}
                    placeholder="Search bar, restaurant, or address..."
                    allowCustomName={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eta">Estimated Arrival Time (optional)</Label>
                  <Input
                    id="eta"
                    type="datetime-local"
                    value={newStopEta}
                    onChange={(e) => setNewStopEta(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Stop'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {sortedStops.length > 0 ? (
          <div className="space-y-3">
            {sortedStops.map((stop, index) => (
              <div
                key={stop.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  stop.arrived_at && !stop.departed_at
                    ? 'bg-secondary/10 border-secondary'
                    : stop.departed_at
                    ? 'bg-muted/50 opacity-60'
                    : 'bg-background'
                }`}
              >
                {canManage && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleReorder(stop.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                    <button
                      onClick={() => handleReorder(stop.id, 'down')}
                      disabled={index === sortedStops.length - 1}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 -rotate-90" />
                    </button>
                  </div>
                )}

                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stop.arrived_at
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {stop.arrived_at ? <Check className="h-4 w-4" /> : index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{stop.name}</p>
                  {stop.address && (
                    <p className="text-sm text-muted-foreground truncate">{stop.address}</p>
                  )}
                  {stop.eta && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      ETA: {format(new Date(stop.eta), 'h:mm a')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {stop.arrived_at && !stop.departed_at && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                  {stop.departed_at && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Visited</Badge>
                  )}

                  {canManage && !stop.arrived_at && (
                    <>
                      {editingEta === stop.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="datetime-local"
                            className="h-7 w-36 text-xs"
                            value={etaValue}
                            onChange={(e) => setEtaValue(e.target.value)}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSetEta(stop.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingEta(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingEta(stop.id);
                            setEtaValue(stop.eta ? format(new Date(stop.eta), "yyyy-MM-dd'T'HH:mm") : '');
                          }}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Stop?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{stop.name}" from the bar hop?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveStop(stop.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No stops added yet. {canManage && 'Add your first stop!'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
