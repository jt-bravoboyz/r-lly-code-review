import { useState, useRef } from 'react';
import { Ban, Camera, Check } from 'lucide-react';
import { FLYER_THEMES, FLYER_THEME_KEYS, NO_FLYER_THEME, type FlyerThemeSelection, getFlyerTheme, isThemedFlyerKey } from '@/lib/flyerThemes';
import { cn } from '@/lib/utils';

export interface FlyerThemePickerProps {
  value: FlyerThemeSelection | null;
  customImageUrl?: string | null;
  onChange: (key: FlyerThemeSelection) => void;
  onUploadCustom?: (file: File) => Promise<void> | void;
  className?: string;
}

/**
 * Snap-scroll horizontal carousel: "Upload photo" tile + No Theme + 5 themed flyer miniatures.
 * Mounted inside the CreateEventDialog "Optional details" section.
 */
export function FlyerThemePicker({
  value,
  customImageUrl,
  onChange,
  onUploadCustom,
  className,
}: FlyerThemePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file || !onUploadCustom) return;
    try {
      setUploading(true);
      await onUploadCustom(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-montserrat font-semibold">Flyer Vibe</div>
          <div className="text-[11px] text-muted-foreground">Pick a look, or drop your own photo.</div>
        </div>
      </div>
      <div className="-mx-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-3 px-2 pb-1">
          {/* No Theme tile */}
          {(() => {
            const noneSelected = !customImageUrl && (!value || value === NO_FLYER_THEME);
            return (
              <button
                type="button"
                onClick={() => onChange(NO_FLYER_THEME)}
                className={cn(
                  'relative shrink-0 snap-start rounded-2xl overflow-hidden border-2 transition-all',
                  'w-[120px] h-[160px] flex flex-col items-center justify-center gap-1.5 bg-zinc-900',
                  noneSelected ? 'border-primary scale-[1.02]' : 'border-white/15',
                )}
              >
                <Ban className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-montserrat uppercase tracking-wider text-white">
                  No Theme
                </span>
                <span className="text-[8px] font-montserrat uppercase tracking-wider text-white/60">
                  Classic R@lly
                </span>
                {noneSelected && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })()}

          {/* Upload photo tile */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative shrink-0 snap-start rounded-2xl overflow-hidden border-2 transition-all',
              'w-[120px] h-[160px] flex flex-col items-center justify-center gap-1.5',
              customImageUrl ? 'border-primary' : 'border-white/20 bg-white/5',
            )}
            style={customImageUrl ? {
              backgroundImage: `url(${customImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            {!customImageUrl && (
              <>
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-montserrat uppercase tracking-wider text-muted-foreground">
                  {uploading ? 'Uploading…' : 'Your photo'}
                </span>
              </>
            )}
            {customImageUrl && (
              <span className="absolute bottom-1 right-1 rounded-full bg-primary p-1">
                <Check className="h-3 w-3 text-primary-foreground" />
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />

          {/* 9 theme tiles */}
          {FLYER_THEME_KEYS.map(key => {
            const t = FLYER_THEMES[key];
            const selected = value === key && !customImageUrl;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  'relative shrink-0 snap-start rounded-2xl overflow-hidden border-2 transition-all',
                  'w-[120px] h-[160px] text-left',
                  selected ? 'border-primary scale-[1.02]' : 'border-white/15',
                )}
                style={{
                  backgroundImage: `url(${t.bg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0" style={{ background: t.archTint }} />
                <div className="absolute inset-x-2 bottom-2 rounded-lg px-2 py-1.5 backdrop-blur-md"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <div
                    className="text-[10px] font-bold leading-tight"
                    style={{ color: t.titleColor, fontFamily: `'${t.headingFont}', serif` }}
                  >
                    {t.label}
                  </div>
                  <div className="text-[8px] font-montserrat uppercase tracking-wider opacity-80"
                    style={{ color: t.metaColor }}>
                    {t.vibe}
                  </div>
                </div>
                {selected && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground/70">
        Showing: <span className="font-semibold">{customImageUrl ? 'Custom photo' : isThemedFlyerKey(value) ? getFlyerTheme(value).label : 'No Theme'}</span>
      </div>
    </div>
  );
}
