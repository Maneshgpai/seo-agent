/**
 * Chrome UX Report (CrUX) API Module
 * Fetches real-user Core Web Vitals (field data) for a URL or origin.
 * Reuses rating thresholds from pagespeed.ts for consistent good/needs-improvement/poor display.
 */

import type { CruxData, CruxCollectionPeriod, CoreWebVitalMetric, MetricRating } from './types.js';
import { getRatingFromNumericValue } from './pagespeed.js';

const CRUX_API_URL = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const CRUX_TIMEOUT = 15000;

/** CrUX form factor; omit for all devices aggregated */
export type CruxFormFactor = 'PHONE' | 'TABLET' | 'DESKTOP';

/** Request body for CrUX API (origin or url, not both) */
interface CruxRequestBody {
  origin?: string;
  url?: string;
  formFactor?: CruxFormFactor;
  metrics?: string[];
}

/** Raw CrUX API response: collectionPeriod is inside record, not at top level */
interface CruxRecordResponse {
  record?: {
    key?: { origin?: string; url?: string; formFactor?: string };
    metrics?: Record<string, { histogram?: Array<{ start: number | string; end?: number | string; density: number }>; percentiles?: { p75?: number | string } }>;
    collectionPeriod?: {
      firstDate?: { year: number; month: number; day: number };
      lastDate?: { year: number; month: number; day: number };
    };
  };
}

/**
 * Fetches a single record from the CrUX API (by origin or by url).
 * Returns null on failure or when the API returns no data for the identifier.
 */
export async function fetchCruxRecord(
  body: CruxRequestBody,
  apiKey: string
): Promise<CruxData | null> {
  if ((body.origin && body.url) || (!body.origin && !body.url)) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CRUX_TIMEOUT);
    const response = await fetch(`${CRUX_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text();
      console.error(`CrUX API error (${response.status}): ${text}`);
      return null;
    }
    const data = (await response.json()) as CruxRecordResponse;
    return parseCruxResponse(data, body);
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error('CrUX API request timed out');
    } else {
      console.error(`CrUX API error: ${(err as Error).message}`);
    }
    return null;
  }
}

/**
 * Fetches CrUX data for a specific page URL (real-user CWV for that URL).
 * Many low-traffic URLs have no CrUX data; returns null in that case.
 */
export async function fetchCruxForUrl(
  url: string,
  apiKey: string,
  formFactor?: CruxFormFactor
): Promise<CruxData | null> {
  return fetchCruxRecord({ url, formFactor, metrics: cruxCwvMetricNames() }, apiKey);
}

/**
 * Tries URL-level CrUX first; if no data (common for low-traffic pages), falls back to origin-level.
 * Use for single-page analysis so reports can show real-user metrics at least at site level.
 */
export async function fetchCruxForUrlWithOriginFallback(
  url: string,
  apiKey: string
): Promise<CruxData | null> {
  const data = await fetchCruxForUrl(url, apiKey);
  if (data) return data;
  try {
    const origin = new URL(url).origin;
    return await fetchCruxForOrigin(origin, apiKey);
  } catch {
    return null;
  }
}

/**
 * Fetches CrUX data for an origin (aggregate real-user CWV for all pages under that origin).
 */
export async function fetchCruxForOrigin(
  origin: string,
  apiKey: string,
  formFactor?: CruxFormFactor
): Promise<CruxData | null> {
  return fetchCruxRecord({ origin, formFactor, metrics: cruxCwvMetricNames() }, apiKey);
}

/** Metric names used in CrUX requests for Core Web Vitals */
function cruxCwvMetricNames(): string[] {
  return [
    'largest_contentful_paint',
    'cumulative_layout_shift',
    'first_contentful_paint',
    'interaction_to_next_paint',
    'experimental_time_to_first_byte',
  ];
}

/**
 * Fetches CrUX for site mode: one origin record plus per-URL records for the first maxPages pages.
 * Returns { originData, byUrl }. Runs origin + per-URL fetches in parallel (well under 150 req/min for single run).
 */
export async function fetchCruxForSite(
  origin: string,
  pageUrls: { url: string }[],
  apiKey: string,
  maxPages: number
): Promise<{ originData: CruxData | null; byUrl: Map<string, CruxData> }> {
  const toFetch = pageUrls.slice(0, maxPages);
  // Run origin + all per-URL fetches in parallel (1 + N requests still under CrUX 150 req/min)
  const [originData, ...urlResults] = await Promise.all([
    fetchCruxForOrigin(origin, apiKey),
    ...toFetch.map(({ url }) => fetchCruxForUrl(url, apiKey)),
  ]);
  const byUrl = new Map<string, CruxData>();
  toFetch.forEach(({ url }, i) => {
    const data = urlResults[i];
    if (data) byUrl.set(url, data);
  });
  return { originData, byUrl };
}

function parseCruxResponse(data: CruxRecordResponse, requestBody: CruxRequestBody): CruxData | null {
  const record = data.record;
  const collectionPeriod = record?.collectionPeriod;
  if (!record?.metrics || !collectionPeriod?.firstDate || !collectionPeriod?.lastDate) {
    return null;
  }

  const period: CruxCollectionPeriod = {
    firstDate: collectionPeriod.firstDate,
    lastDate: collectionPeriod.lastDate,
  };

  const key = record.key || {};
  const cruxData: CruxData = {
    origin: key.origin ?? requestBody.origin,
    url: key.url ?? requestBody.url,
    formFactor: key.formFactor as CruxData['formFactor'],
    collectionPeriod: period,
    coreWebVitals: {
      lcp: metricFromCrux(record.metrics, 'largest_contentful_paint', 'lcp'),
      cls: metricFromCrux(record.metrics, 'cumulative_layout_shift', 'cls'),
      fcp: metricFromCrux(record.metrics, 'first_contentful_paint', 'fcp'),
      inp: metricFromCrux(record.metrics, 'interaction_to_next_paint', 'inp'),
      ttfb: metricFromCrux(record.metrics, 'experimental_time_to_first_byte', 'ttfb'),
    },
  };

  const hasAny =
    cruxData.coreWebVitals.lcp ||
    cruxData.coreWebVitals.cls ||
    cruxData.coreWebVitals.fcp ||
    cruxData.coreWebVitals.inp ||
    cruxData.coreWebVitals.ttfb;
  return hasAny ? cruxData : null;
}

function metricFromCrux(
  metrics: Record<string, { percentiles?: { p75?: number | string } }> | undefined,
  cruxName: string,
  ourKey: 'lcp' | 'cls' | 'fcp' | 'inp' | 'ttfb'
): CoreWebVitalMetric | null {
  const m = metrics?.[cruxName];
  const p75 = m?.percentiles?.p75;
  if (p75 === undefined || p75 === null) return null;

  const value = typeof p75 === 'string' ? parseFloat(p75) : p75;
  if (Number.isNaN(value)) return null;

  const rating: MetricRating = getRatingFromNumericValue(ourKey, value);
  const displayValue = formatCruxValue(ourKey, value);
  return {
    value,
    rating,
    displayValue,
  };
}

function formatCruxValue(metricKey: string, value: number): string {
  if (metricKey === 'cls') {
    return `${value.toFixed(3)} (${value <= 0.1 ? 'good' : value <= 0.25 ? 'needs improvement' : 'poor'})`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s (75th %ile)`;
  }
  return `${Math.round(value)} ms (75th %ile)`;
}

/**
 * Formats CrUX collection period for display (e.g. "Sep 12 – Oct 9, 2022").
 */
export function formatCruxCollectionPeriod(p: CruxCollectionPeriod): string {
  const f = p.firstDate;
  const l = p.lastDate;
  const toStr = (d: { year: number; month: number; day: number }) => {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.month - 1];
    return `${m} ${d.day}, ${d.year}`;
  };
  return `${toStr(f)} – ${toStr(l)} (28-day)`;
}
