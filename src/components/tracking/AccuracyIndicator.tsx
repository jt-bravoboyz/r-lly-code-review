import { 
  Signal, 
  SignalLow, 
  SignalZero, 
  Building2, 
  TreePine, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AccuracyIndicatorProps {
  accuracy: number;
  signalQuality: 'good' | 'fair' | 'poor';
  isIndoor?: boolean;
  indoorConfidence?: number;
  source?: 'gps' | 'wifi' | 'network' | 'indoor' | 'hybrid';
  compact?: boolean;
  showDetails?: boolean;
}

export function AccuracyIndicator({
  accuracy,
  signalQuality,
  isIndoor = false,
  indoorConfidence = 0,
  source = 'gps',
  compact = false,
  showDetails = true,
}: AccuracyIndicatorProps) {
  const getSignalIcon = () => {
    switch (signalQuality) {
      case 'good':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'fair':
        return <SignalLow className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <SignalZero className="h-4 w-4 text-red-500" />;
    }
  };

  const getEnvironmentIcon = () => {
    if (isIndoor && indoorConfidence > 0.5) {
      return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
    return <TreePine className="h-4 w-4 text-green-600" />;
  };

  const getSourceIcon = () => {
    switch (source) {
      case 'wifi':
      case 'network':
        return <Wifi className="h-3 w-3" />;
      case 'indoor':
      case 'hybrid':
        return <Building2 className="h-3 w-3" />;
      default:
        return <Signal className="h-3 w-3" />;
    }
  };

  const getQualityLabel = () => {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Good';
    if (accuracy <= 30) return 'Fair';
    if (accuracy <= 50) return 'Poor';
    return 'Very Poor';
  };

  const getQualityColor = () => {
    if (accuracy <= 5) return 'text-green-600 bg-green-100';
    if (accuracy <= 10) return 'text-green-500 bg-green-50';
    if (accuracy <= 30) return 'text-yellow-600 bg-yellow-100';
    if (accuracy <= 50) return 'text-orange-500 bg-orange-100';
    return 'text-red-500 bg-red-100';
  };

  const getRecommendation = () => {
    if (isIndoor && accuracy > 30) {
      return 'Indoor location - accuracy limited. Try moving near windows.';
    }
    if (accuracy > 50) {
      return 'Weak GPS signal. Move to an open area for better accuracy.';
    }
    if (accuracy > 30) {
      return 'Moderate accuracy. Results may vary by a few meters.';
    }
    if (accuracy <= 10) {
      return 'High accuracy - location is reliable.';
    }
    return 'Good signal - location is accurate.';
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {getSignalIcon()}
            <span className="text-xs font-mono">±{Math.round(accuracy)}m</span>
            {isIndoor && indoorConfidence > 0.5 && (
              <Building2 className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{getQualityLabel()} Accuracy</p>
            <p className="text-xs text-muted-foreground">{getRecommendation()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      {/* Main accuracy display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getSignalIcon()}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">±{Math.round(accuracy)}m</span>
              <Badge variant="outline" className={cn("text-xs", getQualityColor())}>
                {getQualityLabel()}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Environment indicator */}
        <div className="flex items-center gap-2">
          {getEnvironmentIcon()}
          <span className="text-xs text-muted-foreground">
            {isIndoor && indoorConfidence > 0.5 ? 'Indoor' : 'Outdoor'}
          </span>
        </div>
      </div>

      {/* Source and details */}
      {showDetails && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getSourceIcon()}
              <span className="text-muted-foreground">
                Source: {source === 'gps' ? 'GPS' : source === 'wifi' ? 'Wi-Fi' : source === 'network' ? 'Network' : 'Indoor'}
              </span>
            </div>
            {isIndoor && (
              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {Math.round(indoorConfidence * 100)}% indoor
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            {accuracy <= 10 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            ) : accuracy > 50 ? (
              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            {getRecommendation()}
          </p>
        </div>
      )}
    </div>
  );
}

// Simple signal quality badge for compact displays
export function SignalQualityBadge({ 
  quality, 
  accuracy 
}: { 
  quality: 'good' | 'fair' | 'poor'; 
  accuracy?: number;
}) {
  const config = {
    good: { icon: Signal, color: 'text-green-500', bg: 'bg-green-100' },
    fair: { icon: SignalLow, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    poor: { icon: SignalZero, color: 'text-red-500', bg: 'bg-red-100' },
  }[quality];

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className="h-3 w-3" />
      {accuracy !== undefined && (
        <span className="font-mono text-xs">±{Math.round(accuracy)}m</span>
      )}
    </Badge>
  );
}

// Indoor/outdoor indicator
export function EnvironmentBadge({
  isIndoor,
  confidence,
}: {
  isIndoor: boolean;
  confidence: number;
}) {
  if (isIndoor && confidence > 0.5) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Building2 className="h-3 w-3" />
        <span>Indoor</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
      <TreePine className="h-3 w-3" />
      <span>Outdoor</span>
    </Badge>
  );
}
