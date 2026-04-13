import { useFounderIds } from '@/hooks/useFounderIds';

interface MiniFounderGemProps {
  profileId: string;
}

export function MiniFounderGem({ profileId }: MiniFounderGemProps) {
  const { data: founderIds } = useFounderIds();

  if (!founderIds?.has(profileId)) return null;

  return (
    <span className="inline-flex items-center ml-1 animate-mini-founder-glow" title="Founding Member">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="miniFounderGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7B2FBE" />
            <stop offset="50%" stopColor="#9B4DCA" />
            <stop offset="100%" stopColor="#C77DFF" />
          </linearGradient>
        </defs>
        <polygon
          points="8,0.5 15,4 15,12 8,15.5 1,12 1,4"
          fill="url(#miniFounderGrad)"
        />
        <polygon
          points="8,3 12.5,5.5 12.5,10.5 8,13 3.5,10.5 3.5,5.5"
          fill="rgba(255,255,255,0.15)"
        />
      </svg>
    </span>
  );
}
