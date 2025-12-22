/**
 * Skip Links Component for TradeVision
 * Accessibility feature for keyboard navigation
 */

import React from 'react';
import { useSkipLinks } from '../hooks/useAccessibility';

export function SkipLinks() {
  const { skipToContent, skipToChart, skipToWatchlist } = useSkipLinks();

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-[9999] p-2 bg-gray-900 flex gap-2">
        <button
          onClick={skipToContent}
          className="px-4 py-2 bg-white text-black rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          Skip to main content
        </button>
        <button
          onClick={skipToChart}
          className="px-4 py-2 bg-white text-black rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          Skip to chart
        </button>
        <button
          onClick={skipToWatchlist}
          className="px-4 py-2 bg-white text-black rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          Skip to watchlist
        </button>
      </div>
    </div>
  );
}

export default SkipLinks;
