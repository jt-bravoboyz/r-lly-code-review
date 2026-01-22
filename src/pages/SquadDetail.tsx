import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, MessageCircle, UserPlus, Zap, Trash2, Crown, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/layout/BottomNav';
import { SquadChatSheet } from '@/components/chat/SquadChatSheet';
import { SquadInviteDialog } from '@/components/squads/SquadInviteDialog';
import { GroupPhotoCropperDialog } from '@/components/squads/GroupPhotoCropperDialog';
import { getSquadIcon, type SquadSymbol } from '@/components/squads/SquadSymbolPicker';
import { useSquadDetail, useUpdateSquadPhoto, useSquadEventHistory } from '@/hooks/useSquadDetail';
import { useDeleteSquad, useRemoveSquadMember } from '@/hooks/useSquads';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SquadDetail() {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: squad, isLoading } = useSquadDetail(squadId);
  const { data: eventHistory } = useSquadEventHistory(squadId);
  const updatePhoto = useUpdateSquadPhoto();
  const deleteSquad = useDeleteSquad();
  const removeMember = useRemoveSquadMember();
  
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Squad not found</h1>
        <Button onClick={() => navigate('/squads')}>Back to Squads</Button>
      </div>
    );
  }

  const isOwner = squad.owner_id === profile?.id;
  const Icon = getSquadIcon((squad.symbol || 'shield') as SquadSymbol);
  const allMembers = [
    // Owner first
    { profile_id: squad.owner_id, profile: squad.owner_profile, isOwner: true, added_at: squad.created_at },
    // Then other members
    ...(squad.members || []).map(m => ({ ...m, isOwner: false }))
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !squadId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Create object URL and open cropper
    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    setCropperOpen(true);
    
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!squadId) return;
    
    setUploadingPhoto(true);
    try {
      const fileName = `${squadId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('squad-images')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('squad-images')
        .getPublicUrl(fileName);

      await updatePhoto.mutateAsync({ squadId, photoUrl: publicUrl });
      toast.success('Group photo updated!');
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Clean up object URL
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc(null);
      }
    }
  };

  const handleDeleteSquad = async () => {
    try {
      await deleteSquad.mutateAsync(squad.id);
      toast.success('Squad deleted');
      navigate('/squads');
    } catch (error) {
      toast.error('Failed to delete squad');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMember.mutateAsync({ squadId: squad.id, profileId: memberId });
      toast.success(`Removed ${memberName} from squad`);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleQuickRally = () => {
    navigate('/events', { 
      state: { 
        openQuickRally: true, 
        preselectedSquad: squad 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/squads')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold font-montserrat">{squad.name}</h1>
              <p className="text-xs text-muted-foreground">
                {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          {/* Group Photo Section */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                {squad.group_photo_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={squad.group_photo_url} 
                      alt="Squad group photo"
                      className="w-full h-full object-cover"
                    />
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-2 right-2 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        <Camera className="h-4 w-4" />
                        {uploadingPhoto ? 'Uploading...' : 'Change'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div 
                    className={`aspect-video rounded-lg bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center gap-2 ${isOwner ? 'cursor-pointer hover:bg-muted/70 transition-colors' : ''}`}
                    onClick={() => isOwner && fileInputRef.current?.click()}
                  >
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    {isOwner ? (
                      <>
                        <p className="text-sm text-muted-foreground">Add a group photo</p>
                        <p className="text-xs text-muted-foreground">Click to upload</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No group photo yet</p>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </CardContent>
          </Card>

          {/* Group Photo Cropper Dialog */}
          {selectedImageSrc && (
            <GroupPhotoCropperDialog
              open={cropperOpen}
              onOpenChange={(open) => {
                setCropperOpen(open);
                if (!open && selectedImageSrc) {
                  URL.revokeObjectURL(selectedImageSrc);
                  setSelectedImageSrc(null);
                }
              }}
              imageSrc={selectedImageSrc}
              onCropComplete={handleCroppedImage}
            />
          )}
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
            <SquadInviteDialog
              squadId={squad.id}
              squadName={squad.name}
              trigger={
                <Button variant="outline" className="gap-2 w-full">
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
              }
            />
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 col-span-2"
              onClick={handleQuickRally}
            >
              <Zap className="h-4 w-4" />
              Quick R@lly with Squad
            </Button>
          </div>

          <Separator />

          {/* Members Section */}
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </h2>
            <div className="space-y-2">
              {allMembers.map((member) => (
                <Card key={member.profile_id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {member.profile?.display_name || 'Unknown'}
                          {member.isOwner && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Crown className="h-3 w-3" />
                              Owner
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.isOwner ? 'Created squad' : 'Member since'}{' '}
                          {format(new Date(member.added_at || squad.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {isOwner && !member.isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {member.profile?.display_name || 'this member'} from {squad.name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.profile_id, member.profile?.display_name || 'member')}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Previous Events Section */}
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Previous Events
            </h2>
            {eventHistory && eventHistory.length > 0 ? (
              <div className="space-y-2">
                {eventHistory.map((event) => (
                  <Card 
                    key={event.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.start_time), 'MMM d, yyyy')}
                            </span>
                            {event.location_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {event.attendee_count} attended
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events yet</p>
                <p className="text-xs">Start a Rally to create memories!</p>
              </div>
            )}
          </div>

          {/* Delete Squad - Owner Only */}
          {isOwner && (
            <>
              <Separator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Squad
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this squad?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{squad.name}" and remove all members. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSquad}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete Squad
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Squad Chat Sheet */}
      <SquadChatSheet
        squadId={squad.id}
        squadName={squad.name}
        squadSymbol={squad.symbol}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />

      <BottomNav />
    </div>
  );
}