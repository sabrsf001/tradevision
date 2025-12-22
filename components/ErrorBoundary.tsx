import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from './Icons';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
        
        // In production, you could send this to an error tracking service
        // Example: Sentry.captureException(error);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-8 text-center">
                        {/* Error Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        {/* Error Title */}
                        <h1 className="text-xl font-bold text-white mb-2">
                            Something went wrong
                        </h1>
                        
                        <p className="text-[var(--text-secondary)] text-sm mb-6">
                            TradeVision encountered an unexpected error. Your data has been saved.
                        </p>

                        {/* Error Details (Development only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-left">
                                <p className="text-red-400 text-xs font-mono break-all">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-red-400/70 text-xs cursor-pointer hover:text-red-400">
                                            Stack trace
                                        </summary>
                                        <pre className="mt-2 text-[10px] text-red-400/60 overflow-auto max-h-32">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 text-white rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-panel)] hover:bg-[var(--bg-primary)] text-white border border-[var(--border-color)] rounded-lg font-medium transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Reload App
                            </button>
                        </div>

                        {/* Support Link */}
                        <p className="mt-6 text-xs text-[var(--text-secondary)]">
                            If this keeps happening, please{' '}
                            <a 
                                href="mailto:support@tradevision.ai" 
                                className="text-[var(--accent-blue)] hover:underline"
                            >
                                contact support
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
