import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ArrowUpDown, Award } from 'lucide-react';

export interface DirectoryUser {
  profileId: string;
  userId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  foundingMember: boolean;
  referralCount: number;
  ralliesJoined: number;
  ralliesCreated: number;
}

type SortKey =
  | 'displayName'
  | 'email'
  | 'createdAt'
  | 'lastSignInAt'
  | 'referralCount'
  | 'ralliesJoined'
  | 'ralliesCreated';

interface UserDirectoryProps {
  users: DirectoryUser[];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '—';
  }
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function UserDirectory({ users }: UserDirectoryProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? users.filter(
          u =>
            (u.displayName ?? '').toLowerCase().includes(q) ||
            (u.email ?? '').toLowerCase().includes(q),
        )
      : users.slice();

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = -1;
      else if (bv == null) cmp = 1;
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'displayName' || key === 'email' ? 'asc' : 'desc');
    }
  };

  const exportCSV = () => {
    const header = [
      'Name',
      'Email',
      'Joined',
      'Last Active',
      'Referrals',
      'R@llies Joined',
      'R@llies Hosted',
      'Founding Member',
    ].join(',');
    const rows = filtered.map(u =>
      [
        csvEscape(u.displayName ?? ''),
        csvEscape(u.email ?? ''),
        csvEscape(u.createdAt ?? ''),
        csvEscape(u.lastSignInAt ?? ''),
        u.referralCount,
        u.ralliesJoined,
        u.ralliesCreated,
        u.foundingMember ? 'yes' : 'no',
      ].join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-directory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const HeaderButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">User Directory</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3">User</th>
                <th className="text-left py-2 pr-3">
                  <HeaderButton k="email" label="Email" />
                </th>
                <th className="text-left py-2 pr-3">
                  <HeaderButton k="createdAt" label="Joined" />
                </th>
                <th className="text-left py-2 pr-3">
                  <HeaderButton k="lastSignInAt" label="Last Active" />
                </th>
                <th className="text-right py-2 pr-3">
                  <HeaderButton k="referralCount" label="Referrals" />
                </th>
                <th className="text-right py-2 pr-3">
                  <HeaderButton k="ralliesJoined" label="Joined" />
                </th>
                <th className="text-right py-2">
                  <HeaderButton k="ralliesCreated" label="Hosted" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No users match.
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.profileId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {u.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate max-w-[180px]">
                          {u.displayName || 'Unnamed'}
                        </span>
                        {u.foundingMember && (
                          <Award className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground truncate max-w-[220px]">
                    {u.email ?? '—'}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {formatDate(u.lastSignInAt)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Badge variant="secondary">{u.referralCount}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-medium">{u.ralliesJoined}</td>
                  <td className="py-2 text-right font-medium">{u.ralliesCreated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
