/**
 * Onboarding Tutorial
 * Step-by-step walkthrough for new users
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, TrendingUp, Bell, BookOpen, BarChart2 } from './Icons';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSS selector to highlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to TradeVision AI',
    description: 'Your intelligent trading companion. Let us show you around the key features.',
    icon: <Sparkles className="w-8 h-8 text-[var(--accent-blue)]" />,
  },
  {
    id: 'chart',
    title: 'Interactive Charts',
    description: 'Real-time price data from Binance. Zoom, pan, and analyze with professional-grade charts.',
    icon: <TrendingUp className="w-8 h-8 text-green-400" />,
  },
  {
    id: 'drawing',
    title: 'Drawing Tools',
    description: 'Use the left toolbar to draw trendlines, support/resistance levels, and more. Save as templates for quick reuse.',
    icon: (
      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: 'alerts',
    title: 'Price Alerts',
    description: 'Set alerts for any price level. Get notified via push notifications when prices cross your targets.',
    icon: <Bell className="w-8 h-8 text-yellow-400" />,
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    description: 'Get AI-powered market analysis, support/resistance detection, and trading insights.',
    icon: <Sparkles className="w-8 h-8 text-blue-400" />,
  },
  {
    id: 'journal',
    title: 'Trading Journal',
    description: 'Log your trades, track P&L, and review your trading history to improve your strategy.',
    icon: <BookOpen className="w-8 h-8 text-cyan-400" />,
  },
  {
    id: 'orderbook',
    title: 'Order Book',
    description: 'View live market depth with bids and asks to understand market liquidity.',
    icon: <BarChart2 className="w-8 h-8 text-orange-400" />,
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Press "?" or "Shift+/" anytime to see all available keyboard shortcuts for faster navigation.',
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ONBOARDING_STORAGE_KEY = 'tv_onboarding_completed';

// Check if onboarding has been completed
export const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
};

// Mark onboarding as completed
export const markOnboardingComplete = (): void => {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
};

// Reset onboarding
export const resetOnboarding = (): void => {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
};

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const goToNext = () => {
    if (isLastStep) {
      markOnboardingComplete();
      onComplete();
      onClose();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const goToPrevious = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const skipTutorial = () => {
    markOnboardingComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[var(--accent-blue)]/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Progress Bar */}
        <div className="h-1 bg-[var(--bg-primary)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-purple-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4">
          <span className="text-xs text-gray-500">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={skipTutorial}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Skip Tutorial
          </button>
        </div>

        {/* Content */}
        <div className={`p-8 text-center transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bg-primary)] rounded-2xl flex items-center justify-center shadow-lg">
            {step.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 pb-4">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-[var(--accent-blue)]'
                  : index < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-600'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={goToPrevious}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isFirstStep
                ? 'opacity-0 cursor-default'
                : 'text-gray-400 hover:text-white hover:bg-[var(--bg-primary)]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goToNext}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isLastStep
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-[var(--accent-blue)] hover:bg-blue-600 text-white'
            }`}
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
