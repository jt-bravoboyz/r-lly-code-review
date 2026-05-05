import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  name?: string;
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Always log so we can diagnose the Drunkies-night crashes quickly
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="rounded-2xl border border-destructive/30 bg-background/60 backdrop-blur-xl p-5 flex flex-col items-center gap-3 text-center font-montserrat">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Something glitched</p>
          <p className="text-xs text-muted-foreground">
            This part of the screen hit a snag. Try again.
          </p>
          {import.meta.env.DEV && (
            <p className="text-[10px] text-destructive/70 mt-2 font-mono break-all">
              {error.message}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={this.reset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }
}
