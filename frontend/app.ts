/**
 * SEO Agent Frontend Application
 * Handles form submission, reCAPTCHA verification, analysis process, and report display
 * Connects to backend API for real SEO analysis.
 * All keys/IDs (e.g. RECAPTCHA_SITE_KEY) are injected by the server from env - never hardcoded.
 */

// Configuration: keys and feature flags come from window.__ENV__ (injected by server from .env)
declare global {
  interface Window {
    __ENV__?: {
      RECAPTCHA_SITE_KEY?: string;
      ENABLE_RECAPTCHA?: boolean;
    };
  }
}

const CONFIG = {
  RECAPTCHA_SITE_KEY: (typeof window !== 'undefined' && window.__ENV__?.RECAPTCHA_SITE_KEY) || '',
  ENABLE_RECAPTCHA: (typeof window !== 'undefined' && window.__ENV__?.ENABLE_RECAPTCHA) === true,
  API_ENDPOINT: '/api/analyze',
  API_STREAM_ENDPOINT: '/api/analyze/stream',
  USE_STREAMING: true,
};

// Type definitions
interface AnalysisOptions {
  email: string;
  url: string;
  depth: 'basic' | 'intermediate' | 'all';
  mode: 'single' | 'site';
  maxPages?: number;
}

interface ThinkingStep {
  id: string;
  title: string;
  detail?: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'warning' | 'skipped';
}

interface SEOReport {
  url: string;
  analyzedAt: string;
  scores: {
    overall: number;
    basic: number;
    intermediate: number;
    advanced: number;
  };
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  issues: Array<{
    category: string;
    checkName: string;
    status: string;
    description: string;
    recommendation: string;
  }>;
  pageSpeed?: {
    coreWebVitals: Record<string, { value: number; rating: string; displayValue: string }>;
    lighthouseScores: Record<string, number | null>;
  };
}

interface ApiResponse {
  success: boolean;
  report: SEOReport;
  textReport: string;
  error?: string;
}

// DOM Elements
const seoForm = document.getElementById('seo-form') as HTMLFormElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const btnText = submitBtn.querySelector('.btn-text') as HTMLSpanElement;
const btnLoader = submitBtn.querySelector('.btn-loader') as HTMLSpanElement;
const thinkingPanel = document.getElementById('thinking-panel') as HTMLDivElement;
const thinkingContent = document.getElementById('thinking-content') as HTMLDivElement;
const resultsSection = document.getElementById('results-section') as HTMLDivElement;
const resultsSummary = document.getElementById('results-summary') as HTMLDivElement;
const overallScore = document.getElementById('overall-score') as HTMLDivElement;
const toggleBtns = document.querySelectorAll('.toggle-btn') as NodeListOf<HTMLButtonElement>;
const modeInput = document.getElementById('mode') as HTMLInputElement;
const siteOptions = document.querySelector('.site-options') as HTMLDivElement;
const downloadJsonBtn = document.getElementById('download-json') as HTMLButtonElement;
const downloadTextBtn = document.getElementById('download-text') as HTMLButtonElement;
const newAnalysisBtn = document.getElementById('new-analysis') as HTMLButtonElement;
const minimizeThinkingBtn = document.getElementById('minimize-thinking') as HTMLButtonElement;

// State
let currentReport: SEOReport | null = null;
let currentTextReport: string = '';
let thinkingSteps: ThinkingStep[] = [];

/**
 * Initialize the application
 */
function init(): void {
  // Form submission handler
  seoForm.addEventListener('submit', handleFormSubmit);

  // Toggle buttons for analysis mode
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => handleModeToggle(btn));
  });

  // Download buttons
  downloadJsonBtn.addEventListener('click', () => downloadReport('json'));
  downloadTextBtn.addEventListener('click', () => downloadReport('text'));

  // New analysis button
  newAnalysisBtn.addEventListener('click', resetForm);

  // Minimize thinking panel
  minimizeThinkingBtn.addEventListener('click', toggleThinkingPanel);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector((anchor as HTMLAnchorElement).getAttribute('href')!);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/**
 * Handle mode toggle between single page and full site
 */
function handleModeToggle(clickedBtn: HTMLButtonElement): void {
  toggleBtns.forEach(btn => btn.classList.remove('active'));
  clickedBtn.classList.add('active');
  
  const mode = clickedBtn.dataset.mode as 'single' | 'site';
  modeInput.value = mode;
  
  // Show/hide site-specific options
  siteOptions.style.display = mode === 'site' ? 'block' : 'none';
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  // Validate form
  const formData = new FormData(seoForm);
  const email = formData.get('email') as string;
  const url = formData.get('url') as string;
  const depth = formData.get('depth') as 'basic' | 'intermediate' | 'all';
  const mode = formData.get('mode') as 'single' | 'site';
  const maxPages = parseInt(formData.get('maxPages') as string) || 50;

  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (!validateUrl(url)) {
    showError('Please enter a valid URL starting with http:// or https://');
    return;
  }

  // Execute reCAPTCHA if enabled
  let recaptchaToken = '';
  if (CONFIG.ENABLE_RECAPTCHA) {
    try {
      recaptchaToken = await executeRecaptcha();
    } catch (error) {
      showError('reCAPTCHA verification failed. Please try again.');
      return;
    }
  }

  // Start analysis
  const options: AnalysisOptions = {
    email,
    url,
    depth,
    mode,
    maxPages: mode === 'site' ? maxPages : undefined,
  };

  await startAnalysis(options, recaptchaToken);
}

/**
 * Execute reCAPTCHA v3
 */
function executeRecaptcha(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CONFIG.RECAPTCHA_SITE_KEY) {
      reject(new Error('reCAPTCHA site key not configured'));
      return;
    }
    if (typeof grecaptcha === 'undefined') {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha
        .execute(CONFIG.RECAPTCHA_SITE_KEY, { action: 'analyze' })
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Start the analysis process
 */
async function startAnalysis(options: AnalysisOptions, recaptchaToken: string): Promise<void> {
  // Update UI to loading state
  setLoadingState(true);
  showThinkingPanel();
  hideResults();

  // Initialize thinking steps
  initThinkingSteps(options);

  try {
    let report: SEOReport;

    if (CONFIG.USE_STREAMING) {
      // Use Server-Sent Events for real-time progress
      report = await performStreamingAnalysis(options);
    } else {
      // Use regular POST request
      report = await performAnalysis(options, recaptchaToken);
    }
    
    // Store report and show results
    currentReport = report;
    showResults(report);
  } catch (error) {
    const errorMessage = (error as Error).message || 'Analysis failed. Please try again.';
    addThinkingStep('error', 'Analysis failed', errorMessage, 'error');
    showError(errorMessage);
  } finally {
    setLoadingState(false);
  }
}

/**
 * Initialize thinking steps based on analysis options
 */
function initThinkingSteps(options: AnalysisOptions): void {
  thinkingSteps = [
    { id: 'validate', title: 'Validating URL', status: 'pending' },
    { id: 'crawl', title: options.mode === 'site' ? 'Crawling website' : 'Loading page', status: 'pending' },
  ];

  // Add steps based on depth
  thinkingSteps.push({ id: 'basic', title: 'Running basic SEO checks', status: 'pending' });

  if (options.depth === 'intermediate' || options.depth === 'all') {
    thinkingSteps.push({ id: 'intermediate', title: 'Running intermediate checks', status: 'pending' });
  }

  if (options.depth === 'all') {
    thinkingSteps.push(
      { id: 'advanced', title: 'Running advanced checks', status: 'pending' },
      { id: 'pagespeed', title: 'Fetching PageSpeed Insights', status: 'pending' }
    );
  }

  thinkingSteps.push({ id: 'report', title: 'Generating report', status: 'pending' });

  renderThinkingSteps();
}

/**
 * Add a new thinking step dynamically
 */
function addThinkingStep(id: string, title: string, detail: string, status: ThinkingStep['status']): void {
  const existingIndex = thinkingSteps.findIndex(s => s.id === id);
  if (existingIndex >= 0) {
    thinkingSteps[existingIndex] = { id, title, detail, status };
  } else {
    thinkingSteps.push({ id, title, detail, status });
  }
  renderThinkingSteps();
}

/**
 * Render thinking steps in the UI
 */
function renderThinkingSteps(): void {
  thinkingContent.innerHTML = thinkingSteps.map(step => `
    <div class="thinking-step" data-step-id="${step.id}">
      <div class="step-icon ${step.status}">${getStepIcon(step.status)}</div>
      <div class="step-content">
        <div class="step-title">${step.title}</div>
        ${step.detail ? `<div class="step-detail">${step.detail}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  // Auto-scroll to latest step
  thinkingContent.scrollTop = thinkingContent.scrollHeight;
}

/**
 * Get icon for step status
 */
function getStepIcon(status: string): string {
  switch (status) {
    case 'pending': return '○';
    case 'running': return '◐';
    case 'done': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    case 'skipped': return '−';
    default: return '○';
  }
}

/**
 * Update a thinking step's status
 */
function updateThinkingStep(stepId: string, status: ThinkingStep['status'], detail?: string): void {
  const step = thinkingSteps.find(s => s.id === stepId);
  if (step) {
    step.status = status;
    if (detail !== undefined) step.detail = detail;
    renderThinkingSteps();
  }
}

/**
 * Perform analysis using Server-Sent Events for real-time progress
 */
async function performStreamingAnalysis(options: AnalysisOptions): Promise<SEOReport> {
  return new Promise((resolve, reject) => {
    // Build URL with query parameters
    const params = new URLSearchParams({
      url: options.url,
      depth: options.depth,
    });

    const eventSource = new EventSource(`${CONFIG.API_STREAM_ENDPOINT}?${params}`);

    eventSource.addEventListener('step', (event) => {
      const data = JSON.parse(event.data);
      updateThinkingStep(data.id, data.status, data.detail || data.title);
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      currentTextReport = data.textReport || '';
      eventSource.close();
      resolve(data.report);
    });

    eventSource.addEventListener('error', (event) => {
      // Check if it's a custom error event or connection error
      if (event instanceof MessageEvent) {
        const data = JSON.parse(event.data);
        eventSource.close();
        reject(new Error(data.message || 'Analysis failed'));
      } else {
        // Connection error - might just be the stream ending
        eventSource.close();
        // Only reject if we haven't received a complete event
        if (!currentReport) {
          reject(new Error('Connection to server lost'));
        }
      }
    });

    // Timeout after 3 minutes
    setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
        reject(new Error('Analysis timed out. Please try again.'));
      }
    }, 180000);
  });
}

/**
 * Perform analysis using regular POST request
 */
async function performAnalysis(options: AnalysisOptions, recaptchaToken: string): Promise<SEOReport> {
  // Simulate step updates for non-streaming mode
  const simulateSteps = async () => {
    updateThinkingStep('validate', 'running');
    await delay(300);
    updateThinkingStep('validate', 'done');
    updateThinkingStep('crawl', 'running');
  };

  // Start simulating while waiting for response
  simulateSteps();

  const response = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: options.url,
      email: options.email,
      depth: options.depth,
      recaptchaToken,
    }),
  });

  const data: ApiResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  // Mark all steps as done
  thinkingSteps.forEach(step => {
    step.status = 'done';
  });
  renderThinkingSteps();

  // Store text report
  currentTextReport = data.textReport || '';

  return data.report;
}

/**
 * Show the results section with the report data
 */
function showResults(report: SEOReport): void {
  // Update overall score
  const scoreValue = overallScore.querySelector('.score-value') as HTMLSpanElement;
  scoreValue.textContent = report.scores.overall.toString();

  // Update score badge color based on score
  overallScore.style.background = getScoreGradient(report.scores.overall);

  // Populate summary cards
  resultsSummary.innerHTML = `
    <div class="summary-card">
      <div class="value">${report.summary.totalChecks}</div>
      <div class="label">Total Checks</div>
    </div>
    <div class="summary-card passed">
      <div class="value">${report.summary.passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card failed">
      <div class="value">${report.summary.failed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-card warnings">
      <div class="value">${report.summary.warnings}</div>
      <div class="label">Warnings</div>
    </div>
  `;

  // Show results section
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Get gradient color based on score
 */
function getScoreGradient(score: number): string {
  if (score >= 90) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (score >= 70) return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
  if (score >= 50) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
}

/**
 * Download the report in specified format
 */
function downloadReport(format: 'json' | 'text'): void {
  if (!currentReport) return;

  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'json') {
    content = JSON.stringify(currentReport, null, 2);
    filename = `seo-report-${getFilenameDate()}.json`;
    mimeType = 'application/json';
  } else {
    // Use the text report from the server if available
    content = currentTextReport || formatReportAsText(currentReport);
    filename = `seo-report-${getFilenameDate()}.txt`;
    mimeType = 'text/plain';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format report as readable text (fallback if server doesn't provide)
 */
function formatReportAsText(report: SEOReport): string {
  const lines: string[] = [
    '═'.repeat(70),
    '                        SEO ANALYSIS REPORT',
    '═'.repeat(70),
    '',
    `URL: ${report.url}`,
    `Analyzed: ${new Date(report.analyzedAt).toLocaleString()}`,
    '',
    '─'.repeat(70),
    '                           SCORES',
    '─'.repeat(70),
    '',
    `  Overall:      ${report.scores.overall}/100`,
    `  Basic:        ${report.scores.basic}/100`,
    `  Intermediate: ${report.scores.intermediate}/100`,
    `  Advanced:     ${report.scores.advanced}/100`,
    '',
    '─'.repeat(70),
    '                          SUMMARY',
    '─'.repeat(70),
    '',
    `  Total Checks: ${report.summary.totalChecks}`,
    `  Passed:       ${report.summary.passed}`,
    `  Failed:       ${report.summary.failed}`,
    `  Warnings:     ${report.summary.warnings}`,
    '',
  ];

  if (report.pageSpeed) {
    lines.push(
      '─'.repeat(70),
      '                     CORE WEB VITALS',
      '─'.repeat(70),
      ''
    );

    const cwv = report.pageSpeed.coreWebVitals;
    for (const [key, value] of Object.entries(cwv)) {
      if (value) {
        const icon = value.rating === 'good' ? '✓' : value.rating === 'needs-improvement' ? '⚠' : '✗';
        lines.push(`  ${key.toUpperCase()}: ${icon} ${value.displayValue}`);
      }
    }

    lines.push(
      '',
      '─'.repeat(70),
      '                    LIGHTHOUSE SCORES',
      '─'.repeat(70),
      ''
    );

    const lh = report.pageSpeed.lighthouseScores;
    for (const [key, value] of Object.entries(lh)) {
      if (value !== null) {
        lines.push(`  ${key}: ${value}/100`);
      }
    }
    lines.push('');
  }

  lines.push(
    '═'.repeat(70),
    '                  End of SEO Analysis Report',
    '═'.repeat(70)
  );

  return lines.join('\n');
}

/**
 * Get formatted date for filename
 */
function getFilenameDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Reset the form for a new analysis
 */
function resetForm(): void {
  seoForm.reset();
  hideResults();
  hideThinkingPanel();
  currentReport = null;
  currentTextReport = '';
  thinkingSteps = [];
  
  // Reset toggle buttons
  toggleBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'single');
  });
  modeInput.value = 'single';
  siteOptions.style.display = 'none';

  // Scroll to form
  document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * UI Helper Functions
 */
function setLoadingState(loading: boolean): void {
  submitBtn.disabled = loading;
  btnText.style.display = loading ? 'none' : 'inline';
  btnLoader.style.display = loading ? 'flex' : 'none';
}

function showThinkingPanel(): void {
  thinkingPanel.style.display = 'block';
}

function hideThinkingPanel(): void {
  thinkingPanel.style.display = 'none';
}

function toggleThinkingPanel(): void {
  const content = thinkingContent;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  minimizeThinkingBtn.textContent = isHidden ? '−' : '+';
}

function hideResults(): void {
  resultsSection.style.display = 'none';
}

function showError(message: string): void {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'toast-error';
  toast.innerHTML = `
    <span class="toast-icon">✗</span>
    <span class="toast-message">${message}</span>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #ef4444;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add toast animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Declare grecaptcha for TypeScript
declare const grecaptcha: {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
