import { useEffect, useMemo, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, MessageCircle, UserPlus, Zap, Trash2, Crown, Calendar, MapPin, Users, RefreshCw } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: squad, isLoading } = useSquadDetail(squadId);
  const { data: eventHistory } = useSquadEventHistory(squadId);
  const updatePhoto = useUpdateSquadPhoto();
  const deleteSquad = useDeleteSquad();
  const removeMember = useRemoveSquadMember();
  const [refreshing, setRefreshing] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [signedGroupPhotoUrl, setSignedGroupPhotoUrl] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(() => Date.now());
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  const squadImagePath = useMemo(() => {
    if (!squad?.group_photo_url) return null;

    try {
      const url = new URL(squad.group_photo_url);
      const marker = '/object/public/squad-images/';
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }, [squad?.group_photo_url]);

  useEffect(() => {
    let active = true;

    const loadSignedGroupPhoto = async () => {
      if (!squad?.group_photo_url) {
        setSignedGroupPhotoUrl(null);
        return;
      }

      if (!squadImagePath) {
        setSignedGroupPhotoUrl(squad.group_photo_url);
        return;
      }

      const { data, error } = await supabase.storage
        .from('squad-images')
        .createSignedUrl(squadImagePath, 3600);

      if (!active) return;

      if (error || !data?.signedUrl) {
        console.error('Failed to create signed squad photo URL:', error);
        setSignedGroupPhotoUrl(squad.group_photo_url);
        return;
      }

      setSignedGroupPhotoUrl(data.signedUrl);
    };

    void loadSignedGroupPhoto();

    return () => {
      active = false;
    };
  }, [squad?.group_photo_url, squadImagePath, photoVersion]);

  const displayGroupPhotoUrl = signedGroupPhotoUrl
    ? `${signedGroupPhotoUrl}${signedGroupPhotoUrl.includes('?') ? '&' : '?'}v=${photoVersion}`
    : null;

  useEffect(() => {
    if (searchParams.get('chat')) {
      setChatOpen(true);
    }
  }, [searchParams]);

  const isOwner = squad?.owner_id === profile?.id;
  const Icon = getSquadIcon((squad?.symbol || 'shield') as SquadSymbol);
  const allMembers = squad
    ? [
        { profile_id: squad.owner_id, profile: squad.owner_profile, isOwner: true, added_at: squad.created_at },
        ...(squad.members || []).map(m => ({ ...m, isOwner: false }))
      ]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Squad not found</h1>
        <Button onClick={() => navigate('/squads')}>Back to Squads</Button>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !squadId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    setCropperOpen(true);
    e.target.value = '';
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!squadId) {
      toast.error('Missing squad ID. Cannot upload photo.');
      return;
    }
    
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

      const { data } = await supabase.storage
        .from('squad-images')
        .createSignedUrl(fileName, 3600);

      if (!data?.signedUrl) {
        throw new Error('Could not create signed URL for uploaded squad photo');
      }

      await updatePhoto.mutateAsync({ squadId, photoUrl: data.signedUrl });
      setPhotoVersion(Date.now());
      setPhotoLoadFailed(false);
      toast.success('Group photo updated!');
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
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
  const handleRefreshSquad = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['squad-detail', squadId] });
    await queryClient.invalidateQueries({ queryKey: ['squad-event-history', squadId] });
    await queryClient.invalidateQueries({ queryKey: ['rally-media'] });
    toast.success('Squad refreshed');
    setRefreshing(false);
  };

  const handleChatOpenChange = (open: boolean) => {
    setChatOpen(open);

    if (!open && searchParams.get('chat')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('chat');
      setSearchParams(nextParams, { replace: true });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted pb-24">
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
          <Button variant="ghost" size="icon" onClick={handleRefreshSquad} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          {/* Group Photo Section — Premium Photo Card */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {displayGroupPhotoUrl ? (
                <div 
                  className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_8px_32px_hsl(var(--primary)/0.15)] ring-1 ring-white/[0.08] group transition-all duration-300 hover:shadow-[0_12px_40px_hsl(var(--primary)/0.25)] hover:-translate-y-0.5"
                >
                  <img 
                    src={displayGroupPhotoUrl}
                    alt="Squad group photo"
                    className="w-full h-full object-contain bg-black"
                    onLoad={() => setPhotoLoadFailed(false)}
                    onError={() => setPhotoLoadFailed(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
                  {photoLoadFailed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                      <Button variant="secondary" className="gap-2" onClick={handleRefreshSquad}>
                        <RefreshCw className="h-4 w-4" />
                        Reload Photos
                      </Button>
                    </div>
                  )}
                  {isOwner && (
                    <button
                      className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 text-xs font-medium ring-1 ring-white/10 transition-all duration-200 hover:bg-black/70 hover:ring-white/20 active:scale-95"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className={`w-full aspect-video rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                    isOwner
                      ? 'cursor-pointer active:scale-[0.97] hover:-translate-y-0.5'
                      : 'cursor-default'
                  } bg-card/60 backdrop-blur-xl ring-1 ring-white/[0.06] shadow-[0_8px_32px_hsl(0_0%_0%/0.12)] dark:shadow-[0_8px_32px_hsl(0_0%_0%/0.3)] hover:ring-primary/20 hover:shadow-[0_12px_40px_hsl(var(--primary)/0.12)]`}
                  style={{ WebkitBackdropFilter: 'blur(20px)' }}
                  onClick={() => isOwner && fileInputRef.current?.click()}
                  disabled={!isOwner}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                    <Camera className="h-6 w-6 text-primary/70" strokeWidth={1.5} />
                  </div>
                  {isOwner ? (
                    <>
                      <span className="text-sm font-medium text-foreground/80 font-montserrat">
                        Add Squad Photo
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        Tap to upload
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">No group photo yet</span>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

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
        onOpenChange={handleChatOpenChange}
      />

      <BottomNav />
    </div>
  );
}