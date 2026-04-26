import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Download, ArrowUpDown, Award } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

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
    const header = ['Name', 'Email', 'Joined', 'Last Active', 'Referrals', 'R@llies Joined', 'R@llies Hosted', 'Founding Member'].join(',');
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

  const HeaderButton = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <BentoCard span={12}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            User Directory
          </span>
          <MetricPill tone="muted">
            <span className="tabular-nums">{users.length}</span>
          </MetricPill>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-48 sm:w-64 bg-background/40 border-border/40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">User</th>
              <th className="text-left py-2 px-2"><HeaderButton k="email" label="Email" /></th>
              <th className="text-left py-2 px-2"><HeaderButton k="createdAt" label="Joined" /></th>
              <th className="text-left py-2 px-2"><HeaderButton k="lastSignInAt" label="Last Active" /></th>
              <th className="text-right py-2 px-2"><HeaderButton k="referralCount" label="Refs" align="right" /></th>
              <th className="text-right py-2 px-2"><HeaderButton k="ralliesJoined" label="Joined" align="right" /></th>
              <th className="text-right py-2 px-2"><HeaderButton k="ralliesCreated" label="Hosted" align="right" /></th>
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
              <tr key={u.profileId} className="border-b border-border/20 last:border-0 hover:bg-background/40 transition-colors">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {u.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate max-w-[160px]">
                        {u.displayName || 'Unnamed'}
                      </span>
                      {u.foundingMember && (
                        <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px]">
                  {u.email ?? '—'}
                </td>
                <td className="py-2 px-2 text-muted-foreground tabular-nums">{formatDate(u.createdAt)}</td>
                <td className="py-2 px-2 text-muted-foreground tabular-nums">{formatDate(u.lastSignInAt)}</td>
                <td className="py-2 px-2 text-right">
                  <span className="inline-flex h-5 items-center rounded-full bg-muted/40 px-2 text-xs font-medium tabular-nums">
                    {u.referralCount}
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-medium tabular-nums">{u.ralliesJoined}</td>
                <td className="py-2 px-2 text-right font-medium tabular-nums">{u.ralliesCreated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BentoCard>
  );
}
