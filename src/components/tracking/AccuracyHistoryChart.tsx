import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface AccuracyDataPoint {
  timestamp: number;
  accuracy: number;
  source: 'gps' | 'wifi' | 'network' | 'indoor' | 'hybrid';
}

interface AccuracyHistoryChartProps {
  data: AccuracyDataPoint[];
  showTitle?: boolean;
  height?: number;
  className?: string;
}

export function AccuracyHistoryChart({
  data,
  showTitle = true,
  height = 120,
  className,
}: AccuracyHistoryChartProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        current: 0,
        average: 0,
        best: 0,
        worst: 0,
        trend: 'stable' as const,
        percentGood: 0,
      };
    }

    const accuracies = data.map(d => d.accuracy);
    const current = accuracies[accuracies.length - 1];
    const average = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const best = Math.min(...accuracies);
    const worst = Math.max(...accuracies);

    // Calculate trend from last 5 readings
    const recentReadings = accuracies.slice(-5);
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (recentReadings.length >= 3) {
      const firstHalf = recentReadings.slice(0, Math.floor(recentReadings.length / 2));
      const secondHalf = recentReadings.slice(Math.floor(recentReadings.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg < firstAvg - 5) trend = 'improving';
      else if (secondAvg > firstAvg + 5) trend = 'declining';
    }

    // Calculate percentage of readings with good accuracy (< 20m)
    const goodReadings = accuracies.filter(a => a < 20).length;
    const percentGood = Math.round((goodReadings / accuracies.length) * 100);

    return { current, average, best, worst, trend, percentGood };
  }, [data]);

  // Format data for chart
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      time: format(new Date(point.timestamp), 'HH:mm'),
      // Invert for visual (lower accuracy number = better = higher on chart)
      quality: Math.max(0, 100 - point.accuracy),
    }));
  }, [data]);

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (stats.trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  const getQualityColor = (accuracy: number) => {
    if (accuracy <= 10) return 'hsl(142, 76%, 36%)'; // green
    if (accuracy <= 30) return 'hsl(47, 96%, 53%)'; // yellow
    return 'hsl(0, 84%, 60%)'; // red
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Signal Quality History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="pb-4">
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Collecting accuracy data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Signal Quality History
            </CardTitle>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-xs text-muted-foreground">{getTrendLabel()}</span>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="pb-4 space-y-3">
        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis 
                domain={[0, 100]}
                tick={false}
                axisLine={false}
                width={0}
              />

              {/* Reference lines for quality thresholds */}
              <ReferenceLine y={90} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={70} stroke="hsl(47, 96%, 53%)" strokeDasharray="3 3" strokeOpacity={0.5} />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
                      <p className="font-medium">±{Math.round(point.accuracy)}m</p>
                      <p className="text-xs text-muted-foreground">{point.time}</p>
                      <p className="text-xs text-muted-foreground capitalize">{point.source}</p>
                    </div>
                  );
                }}
              />
              
              <Area
                type="monotone"
                dataKey="quality"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#accuracyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span 
                className="font-mono font-medium"
                style={{ color: getQualityColor(stats.current) }}
              >
                ±{Math.round(stats.current)}m
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg: </span>
              <span className="font-mono">±{Math.round(stats.average)}m</span>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={
              stats.percentGood >= 70 
                ? 'text-green-600 border-green-200 bg-green-50' 
                : stats.percentGood >= 40 
                  ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
                  : 'text-red-600 border-red-200 bg-red-50'
            }
          >
            {stats.percentGood}% good
          </Badge>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>&lt;10m</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>10-30m</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>&gt;30m</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini inline version
export function AccuracySparkline({
  data,
  width = 80,
  height = 24,
}: {
  data: AccuracyDataPoint[];
  width?: number;
  height?: number;
}) {
  const chartData = useMemo(() => {
    return data.slice(-20).map(point => ({
      quality: Math.max(0, 100 - point.accuracy),
    }));
  }, [data]);

  if (data.length < 2) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey="quality"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="hsl(var(--primary) / 0.2)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
