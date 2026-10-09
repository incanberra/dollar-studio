# Validation · 10 October 2026

## Standalone repository packaging

- The AUD/USD app source, saved CPI sources, datasets, screenshots and portable HTML are packaged independently of the FRED project.
- All nine converter tests pass in this repository, and the portable build succeeds without installing dependencies.
- A local Node.js development server and automated GitHub checks are included. The original browser validation below was performed before extraction; app features and datasets are unchanged.

- All 16 project tests passed, including five CPI-specific tests for uninterrupted annual coverage, linking at 1949, published 2026 observations, conversion reversibility, decimalisation, invalid amounts and the portable app bundle.
- Production build passed for the FRED studio and the new `/inflation/` entry.
- Browser checks passed: $100 in 2000 → $208.54 in August 2026; $100 → $206.17 using the January–August average; identical 2026 references return the same amount.
- Reverse-direction action returns the displayed amount to its original year; switching the direction selector also supports an independent 2026 input.
- £50 in 1850 gives the same modern-dollar value as A$100 equivalent in 1850. Sydney and pre-decimal notices are visible.
- Invalid grouping (`12,34`) shows a labelled error and disables copying and CSV download. Reset restores valid default inputs and results.
- Copy includes the amount, historical year, 2026 period and checked date. CSV export was downloaded and inspected: 177 year rows, series labels, nominal amounts, converted values, reference index and source URLs.
- Mobile layout checked at a 375px content width: no page-level horizontal overflow; native year slider responds to keyboard arrow keys. Desktop preview saved in `artifacts/desktop-preview.png`.
- Portable HTML JavaScript parses successfully and contains its CSS, logic and entire dataset. Direct file navigation is blocked by the automation browser's HTTP/HTTPS-only policy, so direct file opening was not browser-tested.

Data snapshot was checked on 9 October 2026. This is not an automatic live-data refresh app. Complete calendar-year 2026 CPI is unavailable; both current-year reference options are explicitly labelled partial-year values.

## US dollar addition · 10 October 2026

- Added an AUD/USD selector. Original Australian data is unchanged and remains the default.
- Saved primary-source BLS public API observations and Minneapolis Fed historical estimates. US coverage is continuous from 1800 to 2025, plus January–August 2026; the two reference scales are linked at 1913.
- US$100 in 2000 produces USD 194.53 using August 2026, or USD 192.60 using the January–August average. Reverse direction returns USD 100.00. Australian $100 in 2000 still produces $208.54.
- The unavailable October 2025 BLS observation is excluded from the annual mean following BLS's documented eleven-month rule, with a visible note and source link.
- US mode hides Australian pound controls and updates the historical year range, quick years, chart, method text, source links, currency labels and exports. All original calculation, amount-validation, chart, copy, CSV, print/PDF, year-slider and offline features are retained.
- All 20 project tests passed and the two-app production build passed. The portable HTML was rebuilt with both datasets and its bundled JavaScript passed parsing checks.
- Browser verified USD copy text and CSV export: 227 year rows, USD column headings, the US reference scale and BLS/Federal Reserve source links. Switching US 1800 to AUD clamps to 1850, restores pound controls and preserves the original £50 → $8,983.37 result.
- US mobile layout checked at 375px content width with no page-level horizontal overflow; the year slider responds to keyboard arrows, invalid amounts show the same error, and reset keeps the selected currency. No browser console errors were observed. Final US preview saved in `artifacts/us-dollar-preview.png`.
