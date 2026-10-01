# Creatio ROI Calculator (SYNTECH)

An embeddable ROI/TCO calculator for Creatio with SYNTECH products, in Ukrainian.

## Embedding

Paste the contents of `index.html` into the site. The styles and script load from `raw.githack.com/syntechcompany/roi/main/…`, and the calculator renders itself into `<div class="roi-calculator">`.

## Methodology

The model follows the **Forrester Total Economic Impact (TEI)** approach:

- **TCO**: year 0 (partner services, internal team hours, training) plus years 1…N (Creatio and SYNTECH licenses with annual price indexation, administration, support and other costs).
- **Benefits by category**: sales productivity, extra gross profit from a higher win rate, customer retention, service efficiency, process automation and retirement of legacy systems. Saved time is monetized with a capture rate (the share that turns into productive work). Revenue counts at gross margin.
- **Risk adjustment**: benefits are reduced and costs increased by a configurable percentage.
- **Adoption curve**: benefits start after go-live, then follow year-1 / year-2 adoption and reach 100% from year 3.
- **Metrics**: PV, NPV, ROI = NPV / PV of costs, IRR, monthly payback, and sensitivity at 50–125% of the expected benefits.

## Pricing (as of 2026-10-01)

- **Creatio**: data from the calculator at <https://www.creatio.com/products/pricing>. It includes the global price list (USD, EUR, GBP, AUD, JPY) and a separate price list for Ukraine (USD).
  - Ukraine: Growth $33.75, Enterprise $61.25, Sales/Marketing/Service $11.25 per user per month.
  - Global: Growth $40, Enterprise $75, products $15.
  - Also covered: additional user types, B2B/B2C portals, Governance, the AI packages Start/Grow/Accelerate/Scale, and support at 0/10/20%.
  - Minimum purchase is $10,000 per year. The standard contract term is 3 years.
- **SYNTECH**: <https://syntech.digital/uk/products>, annual prices in USD.
- **UAH**: converted at the NBU rate, which the page loads online from `bank.gov.ua`. A built-in rate is used as a fallback.

All prices live in the `PRICING` object at the top of `creatio-roi-calculator.js`.
