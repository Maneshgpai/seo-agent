/**
 * SSL Certificate and Mixed Content Verification
 * Verifies valid SSL certificate and detects insecure resources on HTTPS pages.
 * Results are returned only for inclusion in reports—no logging.
 */

import * as https from 'node:https';
import * as cheerio from 'cheerio';
import type { SslSecurityCheck } from './types.js';

/** Resolves a URL against base, returns absolute href */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Verifies SSL certificate validity and detects mixed content on an HTTPS page.
 * Runs silently—no console output. Results are for report inclusion only.
 */
export async function verifySslAndMixedContent(url: string, html: string): Promise<SslSecurityCheck> {
  const result: SslSecurityCheck = {
    sslValid: true,
    mixedContent: { hasMixedContent: false, insecureUrls: [] },
  };

  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';

  if (!isHttps) {
    result.sslValid = false;
    result.sslError = 'Page is not served over HTTPS';
    return result;
  }

  // 1. Verify SSL certificate (Node https rejects invalid certs by default)
  try {
    await new Promise<void>((resolve, reject) => {
      const req = https.get(url, { method: 'HEAD', timeout: 10000 }, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SSL verification timeout'));
      });
    });
    result.sslValid = true;
  } catch (err) {
    result.sslValid = false;
    result.sslError = (err as Error).message;
  }

  // 2. Mixed content: find HTTP resources on this HTTPS page
  const insecureUrls: string[] = [];
  const seen = new Set<string>();

  const addIfInsecure = (href: string | undefined) => {
    if (!href || href.trim() === '') return;
    const resolved = resolveUrl(href.trim(), url);
    if (resolved.startsWith('http://') && !seen.has(resolved)) {
      seen.add(resolved);
      insecureUrls.push(resolved);
    }
  };

  const $ = cheerio.load(html);

  // Scripts, stylesheets, images, iframes, media, preload/prefetch
  $('script[src]').each((_, el) => addIfInsecure($(el).attr('src')));
  $('link[rel="stylesheet"], link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"]').each((_, el) =>
    addIfInsecure($(el).attr('href'))
  );
  $('img[src]').each((_, el) => addIfInsecure($(el).attr('src')));
  $('iframe[src]').each((_, el) => addIfInsecure($(el).attr('src')));
  $('source[src]').each((_, el) => addIfInsecure($(el).attr('src')));
  $('object[data]').each((_, el) => addIfInsecure($(el).attr('data')));
  $('embed[src]').each((_, el) => addIfInsecure($(el).attr('src')));
  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => addIfInsecure($(el).attr('href')));
  $('meta[property="og:image"]').each((_, el) => addIfInsecure($(el).attr('content')));
  $('meta[name="twitter:image"]').each((_, el) => addIfInsecure($(el).attr('content')));

  result.mixedContent = {
    hasMixedContent: insecureUrls.length > 0,
    insecureUrls,
  };

  return result;
}
