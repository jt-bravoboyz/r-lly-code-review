import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Award } from 'lucide-react';

interface UserIntelligenceProps {
  profiles: Array<{
    id: string;
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    founding_member: boolean | null;
    founder_number: number | null;
    created_at: string | null;
  }>;
  attendees: Array<{
    profile_id: string;
    event_id: string;
    arrived_safely: boolean | null;
    status: string | null;
  }>;
  rallyEvents: Array<{
    id: string;
    creator_id: string;
  }>;
}

export function UserIntelligence({ profiles, attendees, rallyEvents }: UserIntelligenceProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filtered = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = profiles.find(p => p.id === selectedUser);
  const userAttendees = selectedUser ? attendees.filter(a => a.profile_id === selectedUser) : [];
  const userEvents = selectedUser ? rallyEvents.filter(e => e.creator_id === selectedUser) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">User Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User list */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filtered.slice(0, 20).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedUser(p.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                  selectedUser === p.id ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{p.display_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{p.display_name || 'Unnamed'}</span>
                {p.founding_member && <Award className="h-3 w-3 text-yellow-500 shrink-0" />}
              </button>
            ))}
          </div>

          {/* User detail */}
          {selected ? (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selected.avatar_url || undefined} />
                  <AvatarFallback>{selected.display_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selected.display_name}</div>
                  {selected.founding_member && (
                    <Badge variant="secondary" className="text-xs">
                      Founder #{selected.founder_number || '—'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-bold">{userEvents.length}</div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-bold">{userAttendees.filter(a => a.status === 'attending').length}</div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-bold">{userAttendees.filter(a => a.arrived_safely).length}</div>
                  <div className="text-xs text-muted-foreground">Safe Confirms</div>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-bold">{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground border rounded-lg">
              Select a user to view details
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
