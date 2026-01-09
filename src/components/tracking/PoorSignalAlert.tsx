import { useState, useEffect } from 'react';
import { AlertTriangle, X, MapPin, Wifi, Building2, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PoorSignalAlertProps {
  accuracy: number;
  isIndoor: boolean;
  indoorConfidence: number;
  signalQuality: 'good' | 'fair' | 'poor';
  onDismiss?: () => void;
  className?: string;
}

export function PoorSignalAlert({
  accuracy,
  isIndoor,
  indoorConfidence,
  signalQuality,
  onDismiss,
  className,
}: PoorSignalAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Show alert when signal is poor for a sustained period
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (signalQuality === 'poor' && accuracy > 50) {
      // Wait 5 seconds of poor signal before showing alert
      timeout = setTimeout(() => {
        setShowAlert(true);
        setIsDismissed(false);
      }, 5000);
    } else if (signalQuality === 'good') {
      setShowAlert(false);
      setIsDismissed(false);
    }

    return () => clearTimeout(timeout);
  }, [signalQuality, accuracy]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!showAlert || isDismissed) return null;

  const getSeverity = () => {
    if (accuracy > 100) return 'critical';
    if (accuracy > 50) return 'warning';
    return 'info';
  };

  const severity = getSeverity();

  const getSuggestions = () => {
    const suggestions: { icon: React.ReactNode; text: string }[] = [];

    if (isIndoor && indoorConfidence > 0.5) {
      suggestions.push({
        icon: <Building2 className="h-4 w-4 text-orange-500" />,
        text: 'Move near windows or doorways for better GPS signal',
      });
      suggestions.push({
        icon: <Navigation className="h-4 w-4 text-blue-500" />,
        text: 'Step outside briefly to get a GPS fix',
      });
    } else {
      suggestions.push({
        icon: <MapPin className="h-4 w-4 text-green-500" />,
        text: 'Move to an open area away from tall buildings',
      });
    }

    suggestions.push({
      icon: <Wifi className="h-4 w-4 text-purple-500" />,
      text: 'Ensure Wi-Fi is enabled to improve location accuracy',
    });

    if (accuracy > 100) {
      suggestions.push({
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        text: 'Check if location services are enabled in device settings',
      });
    }

    return suggestions;
  };

  return (
    <Alert
      variant="destructive"
      className={cn(
        'relative transition-all duration-300',
        severity === 'critical' 
          ? 'border-red-500 bg-red-50 dark:bg-red-950/30' 
          : 'border-orange-500 bg-orange-50 dark:bg-orange-950/30',
        className
      )}
    >
      <AlertTriangle className={cn(
        'h-5 w-5',
        severity === 'critical' ? 'text-red-500' : 'text-orange-500'
      )} />
      
      <div className="flex-1">
        <AlertTitle className={cn(
          'flex items-center justify-between',
          severity === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
        )}>
          <span>
            {severity === 'critical' ? 'Very Poor GPS Signal' : 'Poor GPS Signal'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono opacity-80">±{Math.round(accuracy)}m</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertTitle>
        
        <AlertDescription className={cn(
          'mt-1',
          severity === 'critical' ? 'text-red-600 dark:text-red-300' : 'text-orange-600 dark:text-orange-300'
        )}>
          Location accuracy is reduced. Friend finding may be less precise.
        </AlertDescription>

        {/* Expandable suggestions */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-8 px-2 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide suggestions
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              How to improve
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {getSuggestions().map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm bg-background/50 rounded-lg p-2"
              >
                {suggestion.icon}
                <span className="text-foreground/80">{suggestion.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Alert>
  );
}

// Compact inline version for headers
export function PoorSignalBadge({
  accuracy,
  signalQuality,
  onClick,
}: {
  accuracy: number;
  signalQuality: 'good' | 'fair' | 'poor';
  onClick?: () => void;
}) {
  if (signalQuality !== 'poor' || accuracy <= 30) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors',
        'animate-pulse'
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Poor Signal</span>
    </button>
  );
}
