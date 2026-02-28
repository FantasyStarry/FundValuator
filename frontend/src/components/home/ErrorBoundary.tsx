"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="space-y-4">
            <div className="text-lg font-medium text-[var(--foreground)]">
              页面出现了一些问题
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              请尝试刷新页面或联系技术支持
            </div>
            {this.state.error && (
              <div className="text-xs text-[var(--muted-foreground)] font-mono p-2 bg-[var(--muted)] rounded max-w-md overflow-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                重试
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-[var(--border)] rounded-lg bg-[var(--card)]">
      <div className="text-sm text-[var(--muted-foreground)] mb-3">
        {message || "数据加载失败"}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}
