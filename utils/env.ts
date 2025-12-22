/**
 * Environment Configuration & Validation
 * 
 * This module provides type-safe access to environment variables
 * and validates that required variables are present at startup.
 */

interface EnvConfig {
    // API Keys
    GEMINI_API_KEY: string | undefined;
    
    // Feature Flags
    ENABLE_AI_FEATURES: boolean;
    ENABLE_ANALYTICS: boolean;
    
    // API Endpoints
    BINANCE_API_URL: string;
    BINANCE_WS_URL: string;
    
    // App Config
    APP_NAME: string;
    APP_VERSION: string;
    
    // Environment
    IS_DEV: boolean;
    IS_PROD: boolean;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Parse boolean environment variable
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
};

/**
 * Get environment configuration with defaults
 */
export const getEnvConfig = (): EnvConfig => {
    return {
        // API Keys
        GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || undefined,
        
        // Feature Flags
        ENABLE_AI_FEATURES: parseBoolean(import.meta.env.VITE_ENABLE_AI_FEATURES, true),
        ENABLE_ANALYTICS: parseBoolean(import.meta.env.VITE_ENABLE_ANALYTICS, false),
        
        // API Endpoints
        BINANCE_API_URL: import.meta.env.VITE_BINANCE_API_URL || 'https://api.binance.com',
        BINANCE_WS_URL: import.meta.env.VITE_BINANCE_WS_URL || 'wss://stream.binance.com:9443',
        
        // App Config
        APP_NAME: import.meta.env.VITE_APP_NAME || 'TradeVision AI',
        APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.0.1',
        
        // Environment
        IS_DEV: import.meta.env.DEV,
        IS_PROD: import.meta.env.PROD,
    };
};

/**
 * Validate environment configuration
 * Returns validation result with errors and warnings
 */
export const validateEnv = (): ValidationResult => {
    const config = getEnvConfig();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for required API keys (only warn, don't error - features will be disabled)
    if (!config.GEMINI_API_KEY) {
        warnings.push(
            'VITE_GEMINI_API_KEY is not set. AI features will be disabled. ' +
            'Get your API key at https://makersuite.google.com/app/apikey'
        );
    }
    
    // Validate API endpoints
    if (!config.BINANCE_API_URL.startsWith('http')) {
        errors.push('VITE_BINANCE_API_URL must be a valid HTTP(S) URL');
    }
    
    if (!config.BINANCE_WS_URL.startsWith('ws')) {
        errors.push('VITE_BINANCE_WS_URL must be a valid WebSocket URL');
    }
    
    // Production-specific checks
    if (config.IS_PROD) {
        if (!config.GEMINI_API_KEY) {
            warnings.push('Running in production without GEMINI_API_KEY');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
};

/**
 * Log environment validation results to console
 */
export const logEnvValidation = (): void => {
    const result = validateEnv();
    const config = getEnvConfig();
    
    // Log environment info
    console.info(
        `%c🚀 ${config.APP_NAME} v${config.APP_VERSION}`,
        'font-size: 14px; font-weight: bold; color: #3b82f6;'
    );
    console.info(
        `%c   Environment: ${config.IS_DEV ? 'Development' : 'Production'}`,
        'color: #6b7280;'
    );
    
    // Log errors
    if (result.errors.length > 0) {
        console.error('%c❌ Environment Errors:', 'font-weight: bold; color: #ef4444;');
        result.errors.forEach(error => {
            console.error(`   • ${error}`);
        });
    }
    
    // Log warnings
    if (result.warnings.length > 0) {
        console.warn('%c⚠️ Environment Warnings:', 'font-weight: bold; color: #f59e0b;');
        result.warnings.forEach(warning => {
            console.warn(`   • ${warning}`);
        });
    }
    
    // Log success
    if (result.isValid && result.warnings.length === 0) {
        console.info('%c✅ Environment configured correctly', 'color: #22c55e;');
    }
    
    // Log feature status
    console.info('%c📦 Features:', 'font-weight: bold; color: #8b5cf6;');
    console.info(`   • AI Features: ${config.GEMINI_API_KEY ? '✅ Enabled' : '❌ Disabled'}`);
    console.info(`   • Analytics: ${config.ENABLE_ANALYTICS ? '✅ Enabled' : '❌ Disabled'}`);
};

/**
 * Assert environment is valid - throws if critical errors exist
 */
export const assertEnvValid = (): void => {
    const result = validateEnv();
    
    if (!result.isValid) {
        const errorMessage = `Environment configuration errors:\n${result.errors.join('\n')}`;
        throw new Error(errorMessage);
    }
};

/**
 * Get a specific environment variable with type safety
 */
export const env = getEnvConfig();

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: 'ai' | 'analytics'): boolean => {
    const config = getEnvConfig();
    
    switch (feature) {
        case 'ai':
            return config.ENABLE_AI_FEATURES && !!config.GEMINI_API_KEY;
        case 'analytics':
            return config.ENABLE_ANALYTICS;
        default:
            return false;
    }
};

// Export a singleton config for easy access
export default env;
