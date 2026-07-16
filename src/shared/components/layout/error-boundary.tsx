"use client";

import { AlertTriangle } from "lucide-react";
import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Localized copy — callers own translation, this component owns recovery. */
  title?: string;
  retryLabel?: string;
  fallback?: (reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * React error boundaries must be class components. Reserved for isolating
 * a single risky widget (e.g. one dashboard card) so it can fail without
 * taking the rest of the page down with it — route-level failures are
 * already covered by Next's file-based error.tsx.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[error-boundary]", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(this.reset);
    }

    return (
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
        <AlertTriangle className="text-destructive size-8" />
        <p className="text-muted-foreground text-sm">{this.props.title ?? "Something went wrong."}</p>
        <Button size="sm" variant="outline" onClick={this.reset}>
          {this.props.retryLabel ?? "Try again"}
        </Button>
      </div>
    );
  }
}
