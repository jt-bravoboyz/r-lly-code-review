const STATUS_ROWS = [
  { dot: 'bg-green-500', label: '3 Arrived', pulse: false },
  { dot: 'bg-orange-500', label: '2 En Route', pulse: true },
  { dot: 'bg-blue-500', label: '1 Still Out', pulse: false },
];

export function LiveStatusPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-2.5 uppercase">
        Live Status
      </p>
      <div className="space-y-2">
        {STATUS_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {row.pulse && (
                <span className={`absolute inset-0 rounded-full ${row.dot} animate-ping opacity-50`} />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${row.dot}`} />
            </span>
            <span className="text-sm text-white/80">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
