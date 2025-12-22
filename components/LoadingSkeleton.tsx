import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    animate?: boolean;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    rounded = 'md',
    animate = true,
}) => {
    const roundedClasses = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
    };

    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div
            className={`
                bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-panel)] to-[var(--bg-secondary)]
                ${roundedClasses[rounded]}
                ${animate ? 'animate-shimmer' : ''}
                ${className}
            `}
            style={{
                ...style,
                backgroundSize: '200% 100%',
                animation: animate ? 'shimmer 1.5s infinite' : 'none',
            }}
        />
    );
};

/**
 * Chart loading skeleton - mimics the chart area
 */
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`flex flex-col h-full w-full p-4 ${className}`}>
            {/* Price info bar */}
            <div className="flex items-center gap-4 mb-4">
                <Skeleton width={120} height={32} />
                <Skeleton width={80} height={24} />
                <Skeleton width={60} height={24} />
                <Skeleton width={60} height={24} />
                <Skeleton width={60} height={24} />
            </div>

            {/* Chart area with candlestick-like shapes */}
            <div className="flex-1 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} width={50} height={12} />
                    ))}
                </div>

                {/* Chart grid and candles */}
                <div className="ml-20 h-full flex items-end gap-1 pb-8">
                    {[...Array(40)].map((_, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end">
                            <Skeleton
                                width="60%"
                                height={`${20 + Math.random() * 60}%`}
                                rounded="sm"
                            />
                        </div>
                    ))}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-20 right-0 flex justify-between">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} width={40} height={12} />
                    ))}
                </div>
            </div>

            {/* Volume bars */}
            <div className="h-16 flex items-end gap-1 mt-2 ml-20">
                {[...Array(40)].map((_, i) => (
                    <Skeleton
                        key={i}
                        width="100%"
                        height={`${10 + Math.random() * 90}%`}
                        rounded="sm"
                        className="flex-1"
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Watchlist loading skeleton
 */
export const WatchlistSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 8 }) => {
    return (
        <div className="flex flex-col gap-2 p-3">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <Skeleton width={80} height={20} />
                <Skeleton width={24} height={24} rounded="full" />
            </div>

            {/* Items */}
            {[...Array(itemCount)].map((_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]"
                >
                    <div className="flex items-center gap-2">
                        <Skeleton width={32} height={32} rounded="full" />
                        <div className="flex flex-col gap-1">
                            <Skeleton width={60} height={14} />
                            <Skeleton width={40} height={10} />
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Skeleton width={70} height={14} />
                        <Skeleton width={50} height={12} />
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * AI Panel loading skeleton
 */
export const AIPanelSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-full p-4 gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Skeleton width={40} height={40} rounded="full" />
                <div className="flex flex-col gap-1">
                    <Skeleton width={120} height={18} />
                    <Skeleton width={80} height={12} />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <Skeleton
                                width={`${150 + Math.random() * 100}px`}
                                height={60 + Math.random() * 40}
                                rounded="lg"
                            />
                            <Skeleton width={50} height={10} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Input area */}
            <div className="flex gap-2">
                <Skeleton height={44} className="flex-1" rounded="lg" />
                <Skeleton width={44} height={44} rounded="lg" />
            </div>
        </div>
    );
};

/**
 * Sidebar loading skeleton
 */
export const SidebarSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col items-center gap-4 p-3 w-14">
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} width={36} height={36} rounded="lg" />
            ))}
            <div className="flex-1" />
            <Skeleton width={36} height={36} rounded="full" />
        </div>
    );
};

/**
 * TopBar loading skeleton
 */
export const TopBarSkeleton: React.FC = () => {
    return (
        <div className="flex items-center justify-between h-12 px-4 border-b border-[var(--border-color)]">
            {/* Left section */}
            <div className="flex items-center gap-4">
                <Skeleton width={100} height={28} />
                <Skeleton width={60} height={24} />
                <div className="flex gap-1">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} width={32} height={24} rounded="sm" />
                    ))}
                </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
                <Skeleton width={32} height={32} rounded="md" />
                <Skeleton width={32} height={32} rounded="md" />
                <Skeleton width={60} height={28} rounded="md" />
                <Skeleton width={80} height={32} rounded="md" />
            </div>
        </div>
    );
};

/**
 * Full page loading skeleton
 */
export const FullPageSkeleton: React.FC = () => {
    return (
        <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
            <TopBarSkeleton />
            <div className="flex flex-1 overflow-hidden">
                <SidebarSkeleton />
                <div className="flex-1">
                    <ChartSkeleton />
                </div>
                <div className="w-64 border-l border-[var(--border-color)]">
                    <WatchlistSkeleton />
                </div>
            </div>
        </div>
    );
};

// Add shimmer animation to global styles
const shimmerKeyframes = `
@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}
`;

// Inject keyframes if not already present
if (typeof document !== 'undefined') {
    const styleId = 'skeleton-shimmer-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = shimmerKeyframes;
        document.head.appendChild(style);
    }
}

export default {
    Skeleton,
    ChartSkeleton,
    WatchlistSkeleton,
    AIPanelSkeleton,
    SidebarSkeleton,
    TopBarSkeleton,
    FullPageSkeleton,
};
