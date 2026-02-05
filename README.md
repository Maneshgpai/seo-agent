# SEO Agent

**AI-powered SEO analysis.** Get comprehensive insights with Core Web Vitals, Lighthouse scores, and actionable recommendations. Always free and open source.

---

## What It Does

- **Single page analysis** — Analyze one URL for SEO issues
- **Full site analysis** — Crawl your whole website and get a site-wide report
- **Core Web Vitals** — LCP, CLS, INP, TTFB (the metrics Google cares about)
- **Lighthouse scores** — Performance, Accessibility, Best Practices, SEO
- **Downloadable reports** — JSON or text, with clear next steps

## What It Checks

| Level | Examples |
|-------|----------|
| **Basic** | Title tag, meta description, headings, canonical URL, language |
| **Intermediate** | Image alt text, links, Open Graph, Twitter Cards, HTTPS, favicon |
| **Advanced** | Structured data, viewport, sitemap, robots.txt, PageSpeed metrics |

---

## Quick Start

**Run on your computer (localhost):**

```bash
git clone https://github.com/your-org/seo-agent.git
cd seo-agent
npm install
cp .env.example .env
npm run dev:server
```

Then open **http://localhost:8080** in your browser.

**Full setup guide:** See [SETUP.md](./SETUP.md) for:

- **Localhost** — Run on your own machine
- **Google Cloud (GCP)** — Deploy to Cloud Run
- **Azure** — Deploy to Container Apps
- **AWS** — Deploy to App Runner or ECS

---

## How to Use

### Web interface

1. Open the app (e.g. http://localhost:8080 or your deployed URL).
2. Enter your **email** and **website URL**.
3. Choose **analysis depth** (Basic, Intermediate, or Complete).
4. Click **Start Analysis** and wait for the report.
5. Download the report as **JSON** or **Text**.

### Command line

```bash
# Single page
npm run analyze https://example.com

# Full site
npx tsx src/index.ts https://example.com --site --max-pages=100
```

---

## Tech Stack

- **Node.js / TypeScript** — Backend and tooling
- **Puppeteer** — Page loading and rendering
- **Cheerio** — HTML parsing
- **Google PageSpeed API** — Core Web Vitals and Lighthouse (optional)

---

## Optional: Google PageSpeed API

For Core Web Vitals and Lighthouse scores:

1. Get an API key: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create API key.
2. Enable **PageSpeed Insights API** for your project.
3. In API key restrictions, set **Application restrictions** to **None** (or **IP addresses** for production).
4. Put the key in `.env`: `GOOGLE_PAGESPEED_API_KEY=your_key`

Without this key, the app still runs; PageSpeed checks are skipped and a short message is shown.

---

## Optional: reCAPTCHA

To protect the analysis form from abuse:

1. Create reCAPTCHA v3 keys: [Google reCAPTCHA](https://www.google.com/recaptcha/admin).
2. In `.env`: set `ENABLE_RECAPTCHA=true` and `RECAPTCHA_SECRET_KEY=your_secret`.
3. In the frontend (`frontend/app.ts`), set `RECAPTCHA_SITE_KEY` to your site key.

---

## Project Structure

```
seo-agent/
├── src/           # Backend (crawler, analyzers, server)
├── frontend/      # Web UI (HTML, CSS, JS)
├── SETUP.md       # Installation for localhost, GCP, Azure, AWS
├── .env.example   # Copy to .env and fill in
└── package.json
```

---

## Contributing

1. Fork the repo
2. Create a branch, make your changes
3. Open a pull request

---

## License

MIT — see [LICENSE](./LICENSE).
