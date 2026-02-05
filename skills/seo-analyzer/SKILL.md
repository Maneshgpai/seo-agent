# SEO Analyzer Skill

Analyzes websites for SEO issues and provides actionable recommendations. Supports both single-page and full site-wide analysis.

## Usage

When asked to analyze a website's SEO, use this skill to:
1. Crawl the target URL (or entire website)
2. Analyze SEO elements across multiple categories
3. Generate a comprehensive report with scores and recommendations

## Invocation

```
Analyze SEO for <url>
Check SEO of <url>
SEO audit for <url>
Full site SEO analysis for <url>
Analyze entire website <url>
```

## Parameters

- **url** (required): The full URL of the website to analyze (must include http:// or https://)
- **mode** (optional): Analysis mode
  - `single` - Analyze only the specified page (default)
  - `site` - Crawl and analyze the entire website
- **depth** (optional): Analysis depth level
  - `basic` - Title, meta, headings, canonical, robots, language
  - `intermediate` - Images, links, Open Graph, Twitter Cards, HTTPS
  - `advanced` - Structured data, viewport, sitemap, robots.txt, performance
  - `all` - All checks (default)
- **maxPages** (optional): Maximum pages to crawl in site mode (default: 50)

## Example Interactions

### Single Page Analysis

**User:** Analyze SEO for https://example.com

**Agent:** I'll run a comprehensive SEO analysis on https://example.com...

[Runs single page analysis]

**Overall Score: 75/100 (Grade: C)**

Critical Issues:
1. Missing meta description
2. No structured data found

---

### Site-Wide Analysis

**User:** Full site SEO analysis for https://mycompany.com

**Agent:** I'll crawl and analyze your entire website...

[Crawls site, analyzes all pages]

**Site SEO Score: 68/100 (Grade: D)**

Pages Analyzed: 35
Site-Wide Issues: 8

Critical Issues (affecting all pages):
1. [Site-wide: 100% of pages] Missing viewport meta tag
2. [Site-wide: 85% of pages] Images without alt text

Pages Needing Attention:
- /blog/old-post (Score: 42/100)
- /products/discontinued (Score: 51/100)

## Execution

```bash
# From the seo-agent directory

# Single page analysis
npx tsx src/index.ts <url>

# Site-wide analysis
npx tsx src/index.ts <url> --site --max-pages=100

# JSON output
npx tsx src/index.ts <url> --site --format=json
```

## Output Format

### Single Page Report
- **Scores**: Overall, Basic, Intermediate, Advanced (0-100)
- **Summary**: Total checks, passed, failed, warnings
- **Issues**: Categorized list with descriptions and recommendations

### Site-Wide Report
- **Crawl Stats**: Pages discovered, crawled, failed, duration
- **Scores**: Overall, category scores, page score range
- **Site-Wide Issues**: Issues affecting multiple pages with percentage
- **Page Analyses**: Individual page scores and issue counts
- **Technical Details**: robots.txt, sitemap, HTTPS coverage, load times
- **Recommendations**: Prioritized by impact (site-wide vs page-specific)

## Checks Performed

### Basic (Critical SEO)
- Title tag presence and length (50-60 chars optimal)
- Meta description presence and length (150-160 chars optimal)
- H1 tag (single, unique)
- Heading hierarchy (H1 > H2 > H3)
- Canonical URL tag
- Robots meta tag
- Language declaration
- Character encoding

### Intermediate
- Image alt attributes
- Image dimensions (for CLS)
- Image lazy loading
- Internal link structure
- External link analysis
- URL structure cleanliness
- Open Graph tags
- Twitter Card tags
- Favicon presence
- HTTPS usage

### Advanced
- JSON-LD structured data
- Mobile viewport configuration
- Render-blocking resources
- Page size and load time
- robots.txt analysis
- XML sitemap detection
- Hreflang tags (i18n)
- AMP detection

## Site-Wide Features

- **Link Discovery**: Follows internal links to find all pages
- **Sitemap Integration**: Reads sitemap.xml for URL discovery
- **Robots.txt Respect**: Honors disallow rules
- **Concurrent Crawling**: Configurable parallelism (default: 3)
- **Issue Aggregation**: Identifies patterns across pages
- **Page Ranking**: Highlights worst/best performing pages

## Reference Links

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Core Web Vitals](https://web.dev/articles/vitals)
- [Open Graph Protocol](https://ogp.me/)
