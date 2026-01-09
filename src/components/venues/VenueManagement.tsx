import React, { useState } from 'react';
import { Plus, MapPin, Radio, Building2, Trash2, Edit2, ChevronRight, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  useMyVenues, 
  useVenueWithBeacons, 
  useCreateVenue, 
  useUpdateVenue, 
  useDeleteVenue,
  useCreateBeacon,
  useUpdateBeacon,
  useDeleteBeacon,
  Venue,
  VenueBeacon
} from '@/hooks/useVenueManagement';

interface AddVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue?: Venue;
}

function AddVenueDialog({ open, onOpenChange, venue }: AddVenueDialogProps) {
  const [formData, setFormData] = useState({
    name: venue?.name || '',
    address: venue?.address || '',
    lat: venue?.lat?.toString() || '',
    lng: venue?.lng?.toString() || '',
    floor_count: venue?.floor_count || 1,
    venue_type: venue?.venue_type || 'bar',
  });
  
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      address: formData.address || null,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      floor_count: formData.floor_count,
      venue_type: formData.venue_type,
      image_url: null,
    };
    
    if (venue) {
      await updateVenue.mutateAsync({ id: venue.id, ...data });
    } else {
      await createVenue.mutateAsync(data);
    }
    
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{venue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Venue Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="The Rally Bar"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="40.7128"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="-74.0060"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue_type">Venue Type</Label>
              <Select
                value={formData.venue_type}
                onValueChange={(value) => setFormData({ ...formData, venue_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="event_space">Event Space</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor_count">Number of Floors</Label>
              <Input
                id="floor_count"
                type="number"
                min="1"
                value={formData.floor_count}
                onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVenue.isPending || updateVenue.isPending}>
              {venue ? 'Save Changes' : 'Create Venue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddBeaconDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  venueLat: number;
  venueLng: number;
  floorCount: number;
  beacon?: VenueBeacon;
}

function AddBeaconDialog({ open, onOpenChange, venueId, venueLat, venueLng, floorCount, beacon }: AddBeaconDialogProps) {
  const [formData, setFormData] = useState({
    name: beacon?.name || '',
    beacon_uuid: beacon?.beacon_uuid || '',
    major: beacon?.major?.toString() || '',
    minor: beacon?.minor?.toString() || '',
    lat: beacon?.lat?.toString() || venueLat.toString(),
    lng: beacon?.lng?.toString() || venueLng.toString(),
    floor: beacon?.floor || 1,
    tx_power: beacon?.tx_power || -59,
    zone_name: beacon?.zone_name || '',
    is_active: beacon?.is_active ?? true,
  });
  
  const createBeacon = useCreateBeacon();
  const updateBeacon = useUpdateBeacon();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      venue_id: venueId,
      name: formData.name,
      beacon_uuid: formData.beacon_uuid,
      major: formData.major ? parseInt(formData.major) : null,
      minor: formData.minor ? parseInt(formData.minor) : null,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      floor: formData.floor,
      tx_power: formData.tx_power,
      zone_name: formData.zone_name || null,
      is_active: formData.is_active,
    };
    
    if (beacon) {
      await updateBeacon.mutateAsync({ id: beacon.id, ...data });
    } else {
      await createBeacon.mutateAsync(data);
    }
    
    onOpenChange(false);
  };
  
  // Generate floors array
  const floors = Array.from({ length: floorCount }, (_, i) => i + 1);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{beacon ? 'Edit Beacon' : 'Add New Beacon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="beacon_name">Beacon Name</Label>
            <Input
              id="beacon_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Main Entrance"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="beacon_uuid">Beacon UUID</Label>
            <Input
              id="beacon_uuid"
              value={formData.beacon_uuid}
              onChange={(e) => setFormData({ ...formData, beacon_uuid: e.target.value })}
              placeholder="e.g., E2C56DB5-DFFB-48D2-B060-D0F5A71096E0"
              required
            />
            <p className="text-xs text-muted-foreground">
              The UUID is usually found on the beacon device or in manufacturer docs
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="major">Major ID</Label>
              <Input
                id="major"
                type="number"
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minor">Minor ID</Label>
              <Input
                id="minor"
                type="number"
                value={formData.minor}
                onChange={(e) => setFormData({ ...formData, minor: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beacon_lat">Latitude</Label>
              <Input
                id="beacon_lat"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beacon_lng">Longitude</Label>
              <Input
                id="beacon_lng"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Select
                value={formData.floor.toString()}
                onValueChange={(value) => setFormData({ ...formData, floor: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor} value={floor.toString()}>
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx_power">TX Power (dBm)</Label>
              <Input
                id="tx_power"
                type="number"
                value={formData.tx_power}
                onChange={(e) => setFormData({ ...formData, tx_power: parseInt(e.target.value) || -59 })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zone_name">Zone Name (Optional)</Label>
            <Input
              id="zone_name"
              value={formData.zone_name}
              onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
              placeholder="e.g., VIP Area, Dance Floor"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive beacons won't be used for positioning</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBeacon.isPending || updateBeacon.isPending}>
              {beacon ? 'Save Changes' : 'Add Beacon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VenueDetailProps {
  venueId: string;
  onBack: () => void;
}

function VenueDetail({ venueId, onBack }: VenueDetailProps) {
  const { data: venue, isLoading } = useVenueWithBeacons(venueId);
  const [editVenueOpen, setEditVenueOpen] = useState(false);
  const [addBeaconOpen, setAddBeaconOpen] = useState(false);
  const [editingBeacon, setEditingBeacon] = useState<VenueBeacon | null>(null);
  const deleteBeacon = useDeleteBeacon();
  
  if (isLoading || !venue) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {venue.name}
            </CardTitle>
            <CardDescription>{venue.address}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditVenueOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{' '}
              <span className="capitalize">{venue.venue_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Floors:</span>{' '}
              {venue.floor_count}
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>{' '}
              {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Beacons ({venue.beacons.length})
        </h3>
        <Button size="sm" onClick={() => setAddBeaconOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Beacon
        </Button>
      </div>
      
      {venue.beacons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-1">No beacons yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add Bluetooth beacons to enable indoor positioning at this venue
            </p>
            <Button onClick={() => setAddBeaconOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Beacon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {venue.beacons.map((beacon) => (
            <Card key={beacon.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${beacon.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Radio className={`h-4 w-4 ${beacon.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{beacon.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Floor {beacon.floor} {beacon.zone_name && `• ${beacon.zone_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                      {beacon.beacon_uuid}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={beacon.is_active ? 'default' : 'secondary'}>
                    {beacon.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingBeacon(beacon);
                      setAddBeaconOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Beacon</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{beacon.name}"? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground"
                          onClick={() => deleteBeacon.mutate({ beaconId: beacon.id, venueId: venue.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <AddVenueDialog
        open={editVenueOpen}
        onOpenChange={setEditVenueOpen}
        venue={venue}
      />
      
      <AddBeaconDialog
        open={addBeaconOpen}
        onOpenChange={(open) => {
          setAddBeaconOpen(open);
          if (!open) setEditingBeacon(null);
        }}
        venueId={venue.id}
        venueLat={venue.lat}
        venueLng={venue.lng}
        floorCount={venue.floor_count}
        beacon={editingBeacon || undefined}
      />
    </div>
  );
}

export function VenueManagement() {
  const { data: venues, isLoading } = useMyVenues();
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const deleteVenue = useDeleteVenue();
  
  if (selectedVenueId) {
    return (
      <VenueDetail
        venueId={selectedVenueId}
        onBack={() => setSelectedVenueId(null)}
      />
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Venue Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage venues and beacons for indoor positioning
          </p>
        </div>
        <Button onClick={() => setAddVenueOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Venue
        </Button>
      </div>
      
      {!venues || venues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No venues yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create venues and add Bluetooth beacons to enable indoor positioning for your events
            </p>
            <Button onClick={() => setAddVenueOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {venues.map((venue) => (
            <Card
              key={venue.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedVenueId(venue.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{venue.name}</p>
                    <p className="text-sm text-muted-foreground">{venue.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {venue.venue_type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {venue.floor_count} floor{venue.floor_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Venue</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{venue.name}"? All beacons will also be deleted. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground"
                          onClick={() => deleteVenue.mutate(venue.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <AddVenueDialog
        open={addVenueOpen}
        onOpenChange={setAddVenueOpen}
      />
    </div>
  );
}
