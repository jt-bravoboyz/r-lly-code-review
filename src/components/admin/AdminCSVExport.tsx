import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface EventRow {
  id: string;
  location_name?: string | null;
  status?: string | null;
}

interface Attendee {
  event_id: string;
  arrived_safely?: boolean | null;
  departure_transport_mode?: string | null;
  departure_provider?: string | null;
}

interface AdminCSVExportProps {
  events: EventRow[];
  attendees: Attendee[];
  label?: string;
}

export function AdminCSVExport({ events, attendees, label = 'Export CSV' }: AdminCSVExportProps) {
  const handleExport = () => {
    const header = 'Event Name (Masked),City,Total Attendees,% Safety Confirmed,Transit Provider Used';
    const rows = events.map((event, i) => {
      const ea = attendees.filter(a => a.event_id === event.id);
      const total = ea.length;
      const safeCount = ea.filter(a => a.arrived_safely === true).length;
      const safetyPct = total > 0 ? ((safeCount / total) * 100).toFixed(1) : '0.0';
      const providers = [...new Set(ea.map(a => a.departure_provider).filter(Boolean))].join('; ') || 'N/A';
      const city = event.location_name || 'Unknown';
      return `"R@lly #${i + 1}","${city}",${total},${safetyPct}%,"${providers}"`;
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rally-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
