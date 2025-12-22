/**
 * Component tests for UI components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// We need to mock the Icons component to avoid import issues
vi.mock('../components/Icons', () => ({
  BellRing: ({ className }: { className?: string }) => <span data-testid="bell-icon" className={className}>🔔</span>,
  X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className}>✕</span>,
  Check: ({ className }: { className?: string }) => <span data-testid="check-icon" className={className}>✓</span>,
  AlertTriangle: ({ className }: { className?: string }) => <span data-testid="alert-icon" className={className}>⚠</span>,
  RefreshCw: ({ className }: { className?: string }) => <span data-testid="refresh-icon" className={className}>↻</span>,
  Home: ({ className }: { className?: string }) => <span data-testid="home-icon" className={className}>🏠</span>,
}));

// Import components after mocking
import Toast from '../components/Toast';
import { Skeleton, ChartSkeleton, WatchlistSkeleton } from '../components/LoadingSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast with message', () => {
    const onClose = vi.fn();
    render(<Toast message="Trade executed!" type="success" onClose={onClose} />);
    
    expect(screen.getByText('Trade executed!')).toBeInTheDocument();
  });

  it('renders alert toast with message', () => {
    const onClose = vi.fn();
    render(<Toast message="Price reached target!" type="alert" onClose={onClose} />);
    
    expect(screen.getByText('Price reached target!')).toBeInTheDocument();
    expect(screen.getByText('Price Alert')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after 5 seconds', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);
    
    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton Components', () => {
  it('renders base Skeleton with correct classes', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.style.width).toBe('100px');
    expect(skeleton.style.height).toBe('50px');
  });

  it('renders Skeleton with different rounded options', () => {
    const { container: c1 } = render(<Skeleton rounded="full" />);
    const { container: c2 } = render(<Skeleton rounded="none" />);
    
    expect((c1.firstChild as HTMLElement).className).toContain('rounded-full');
    expect((c2.firstChild as HTMLElement).className).not.toContain('rounded-');
  });

  it('renders ChartSkeleton', () => {
    const { container } = render(<ChartSkeleton />);
    
    // Should render a container div
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders WatchlistSkeleton with custom item count', () => {
    const { container } = render(<WatchlistSkeleton itemCount={5} />);
    
    // Should render items
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ErrorBoundary Component', () => {
  // Component that throws an error
  const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload App')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('shows Try Again button when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Try Again button should be clickable
    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();
    
    // Clicking it shouldn't throw
    expect(() => fireEvent.click(tryAgainButton)).not.toThrow();
  });
});
