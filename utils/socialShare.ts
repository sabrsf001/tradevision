/**
 * Social Sharing Utilities for TradeVision
 * Share charts to Twitter, Discord, Telegram, and more
 */

export interface ShareOptions {
  title?: string;
  description?: string;
  url?: string;
  imageDataUrl?: string;
  hashtags?: string[];
}

export interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  share: (options: ShareOptions) => Promise<void> | void;
}

/**
 * Generate shareable URL with chart state
 */
export function generateShareableUrl(params: {
  symbol: string;
  timeframe: string;
  indicators?: string[];
  drawings?: string;
}): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('symbol', params.symbol);
  url.searchParams.set('tf', params.timeframe);
  if (params.indicators?.length) {
    url.searchParams.set('ind', params.indicators.join(','));
  }
  if (params.drawings) {
    url.searchParams.set('d', params.drawings);
  }
  return url.toString();
}

/**
 * Share to Twitter/X
 */
export function shareToTwitter(options: ShareOptions): void {
  const { title = '', description = '', url = window.location.href, hashtags = [] } = options;
  const text = [title, description].filter(Boolean).join(' - ');
  const hashtagString = hashtags.length > 0 ? hashtags.map(h => h.replace('#', '')).join(',') : '';
  
  const twitterUrl = new URL('https://twitter.com/intent/tweet');
  twitterUrl.searchParams.set('text', text);
  twitterUrl.searchParams.set('url', url);
  if (hashtagString) {
    twitterUrl.searchParams.set('hashtags', hashtagString);
  }
  
  window.open(twitterUrl.toString(), '_blank', 'width=550,height=420');
}

/**
 * Share to Discord via Webhook
 */
export async function shareToDiscord(
  webhookUrl: string,
  options: ShareOptions
): Promise<boolean> {
  const { title = 'Chart Analysis', description = '', url, imageDataUrl } = options;
  
  try {
    const embed = {
      title,
      description,
      url,
      color: 0x5865F2, // Discord blurple
      timestamp: new Date().toISOString(),
      footer: {
        text: 'TradeVision AI',
      },
      ...(imageDataUrl && { image: { url: imageDataUrl } }),
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to share to Discord:', error);
    return false;
  }
}

/**
 * Share to Telegram
 */
export function shareToTelegram(options: ShareOptions): void {
  const { title = '', url = window.location.href } = options;
  const telegramUrl = new URL('https://t.me/share/url');
  telegramUrl.searchParams.set('url', url);
  telegramUrl.searchParams.set('text', title);
  
  window.open(telegramUrl.toString(), '_blank', 'width=550,height=420');
}

/**
 * Share to Reddit
 */
export function shareToReddit(options: ShareOptions): void {
  const { title = '', url = window.location.href } = options;
  const redditUrl = new URL('https://www.reddit.com/submit');
  redditUrl.searchParams.set('url', url);
  redditUrl.searchParams.set('title', title);
  
  window.open(redditUrl.toString(), '_blank');
}

/**
 * Share to LinkedIn
 */
export function shareToLinkedIn(options: ShareOptions): void {
  const { title = '', url = window.location.href } = options;
  const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  linkedInUrl.searchParams.set('url', url);
  
  window.open(linkedInUrl.toString(), '_blank', 'width=550,height=420');
}

/**
 * Copy link to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Native Web Share API
 */
export async function nativeShare(options: ShareOptions): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }
  
  try {
    const shareData: ShareData = {
      title: options.title,
      text: options.description,
      url: options.url || window.location.href,
    };
    
    // Add image if available and supported
    if (options.imageDataUrl && navigator.canShare) {
      const response = await fetch(options.imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'chart.png', { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        (shareData as ShareData & { files: File[] }).files = [file];
      }
    }
    
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Native share failed:', error);
    }
    return false;
  }
}

/**
 * Get available share platforms
 */
export function getSharePlatforms(): SharePlatform[] {
  return [
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: '𝕏',
      share: shareToTwitter,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      share: shareToTelegram,
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '🔴',
      share: shareToReddit,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      share: shareToLinkedIn,
    },
  ];
}

/**
 * Create chart share card with metadata
 */
export function createShareCard(params: {
  symbol: string;
  timeframe: string;
  price: number;
  change: number;
  analysis?: string;
}): ShareOptions {
  const { symbol, timeframe, price, change, analysis } = params;
  const changeEmoji = change >= 0 ? '📈' : '📉';
  const changeStr = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
  
  return {
    title: `${symbol} ${changeEmoji} ${changeStr}`,
    description: analysis || `${symbol} at $${price.toLocaleString()} on ${timeframe} timeframe`,
    hashtags: ['trading', 'crypto', symbol.toLowerCase(), 'tradevision'],
    url: generateShareableUrl({ symbol, timeframe }),
  };
}
