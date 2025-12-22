/**
 * Chart Export Utilities
 * Provides functions to export charts as images or copy to clipboard
 */

export interface ExportOptions {
    filename?: string;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number; // 0-1 for jpeg/webp
    includeWatermark?: boolean;
    watermarkText?: string;
}

/**
 * Convert a canvas or DOM element to a data URL
 */
export const elementToDataURL = async (
    element: HTMLElement,
    options: ExportOptions = {}
): Promise<string> => {
    const { format = 'png', quality = 0.95 } = options;
    
    // Use html2canvas-like approach with native canvas
    const canvas = document.createElement('canvas');
    const rect = element.getBoundingClientRect();
    
    // Set canvas size (use devicePixelRatio for high DPI)
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.scale(scale, scale);
    
    // Draw background
    ctx.fillStyle = getComputedStyle(element).backgroundColor || '#131722';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Find all canvases within the element and composite them
    const canvases = element.querySelectorAll('canvas');
    
    for (const sourceCanvas of canvases) {
        const sourceRect = sourceCanvas.getBoundingClientRect();
        const x = sourceRect.left - rect.left;
        const y = sourceRect.top - rect.top;
        
        try {
            ctx.drawImage(sourceCanvas, x, y, sourceRect.width, sourceRect.height);
        } catch (e) {
            console.warn('Could not draw canvas:', e);
        }
    }
    
    // Add watermark if requested
    if (options.includeWatermark) {
        const watermark = options.watermarkText || 'TradeVision AI';
        
        // Draw semi-transparent background for watermark
        const watermarkPadding = 16;
        const watermarkHeight = 28;
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        const textMetrics = ctx.measureText(watermark);
        const watermarkWidth = textMetrics.width + watermarkPadding * 2;
        
        // Position at bottom-right
        const watermarkX = rect.width - watermarkWidth - 12;
        const watermarkY = rect.height - watermarkHeight - 12;
        
        // Draw rounded background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(watermarkX, watermarkY, watermarkWidth, watermarkHeight, 6);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(watermark, watermarkX + watermarkWidth / 2, watermarkY + watermarkHeight / 2);
        
        // Add timestamp
        const timestamp = new Date().toLocaleString();
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(timestamp, rect.width - 12, watermarkY - 4);
    }
    
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
};

/**
 * Download a chart as an image file
 */
export const downloadChart = async (
    element: HTMLElement,
    options: ExportOptions = {}
): Promise<void> => {
    const { 
        filename = `tradevision-chart-${Date.now()}`,
        format = 'png'
    } = options;
    
    try {
        const dataURL = await elementToDataURL(element, options);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataURL;
        link.click();
    } catch (error) {
        console.error('Failed to download chart:', error);
        throw error;
    }
};

/**
 * Copy chart to clipboard
 */
export const copyChartToClipboard = async (
    element: HTMLElement,
    options: ExportOptions = {}
): Promise<boolean> => {
    try {
        const dataURL = await elementToDataURL(element, { ...options, format: 'png' });
        
        // Convert data URL to blob
        const response = await fetch(dataURL);
        const blob = await response.blob();
        
        // Use Clipboard API
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        
        return true;
    } catch (error) {
        console.error('Failed to copy chart to clipboard:', error);
        
        // Fallback: Try to copy data URL as text
        try {
            const dataURL = await elementToDataURL(element, options);
            await navigator.clipboard.writeText(dataURL);
            return true;
        } catch {
            return false;
        }
    }
};

/**
 * Create a shareable link (placeholder - would need backend)
 */
export const createShareableLink = async (
    _element: HTMLElement,
    _options: ExportOptions = {}
): Promise<string | null> => {
    // This would require a backend to upload and generate a shareable link
    // For now, return null to indicate not available
    console.info('Shareable links require backend integration');
    return null;
};

/**
 * Export chart with symbol and timestamp in filename
 */
export const exportChartWithMetadata = async (
    element: HTMLElement,
    symbol: string,
    timeframe: string,
    options: ExportOptions = {}
): Promise<void> => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${symbol}-${timeframe}-${timestamp}`;
    
    await downloadChart(element, {
        ...options,
        filename,
        includeWatermark: true,
        watermarkText: `${symbol} • ${timeframe} • TradeVision AI`
    });
};
