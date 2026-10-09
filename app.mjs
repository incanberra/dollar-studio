import australianData from './data/cpi.json' with { type: 'json' };
import usData from './data/us-cpi.json' with { type: 'json' };
import { parseAmount, convert, money, number } from './lib.mjs';

const $ = id => document.getElementById(id);
let currency = 'AUD';
let data = australianData;
let years = new Map(data.annual.map(row => [row.year, row]));
const currencyMoney = value => money(value, currency);
const isUS = () => currency === 'USD';
const australianText = Object.fromEntries(['history-description', 'history-method'].map(id => [id, $(id).innerHTML]));
let direction = 'forward';
let state;
let copyTimer;
function configureCurrency() {
  const previousYear = Number($('year').value) || 2000;
  currency = $('currency').value;
  data = isUS() ? usData : australianData;
  years = new Map(data.annual.map(row => [row.year, row]));
  const earliest = data.annual[0].year;
  $('year').replaceChildren();
  for (let year = 2026; year >= earliest; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}${year === 2026 ? ' · partial year' : isUS() && year < 1913 ? ' · historical estimate' : !isUS() && year < 1901 ? ' · Sydney estimate' : isUS() && year === 2025 ? ' · 11-month average' : ''}`;
    $('year').append(option);
  }
  $('year').value = String(Math.max(earliest, previousYear));
  $('year-range').min = earliest;
  $('earliest-year').textContent = earliest;
  const quickYears = isUS() ? [1800, 1913, 1978, 2000, 2020] : [1850, 1901, 1966, 2000, 2020];
  document.querySelectorAll('[data-year]').forEach((button, i) => { button.dataset.year = quickYears[i]; button.textContent = quickYears[i]; });
  $('currency-badge').textContent = currency;
  $('country-range').textContent = `${isUS() ? 'UNITED STATES' : 'AUSTRALIA'} · ${earliest}–2026`;
  $('intro-description').textContent = `Compare the buying power of ${isUS() ? 'US' : 'Australian'} money, then and now.`;
  $('source-label').textContent = isUS() ? 'BLS CPI-U & Federal Reserve historical prices' : 'ABS historical prices & CPI';
  $('data-period').textContent = '2026 data through August';
  $('converter').setAttribute('aria-label', `${isUS() ? 'US' : 'Australian'} dollar converter`);
  const studioName = `${isUS() ? 'US' : 'Australian'} Dollar Studio`;
  document.querySelector('.brand strong').textContent = studioName;
  document.querySelector('.brand').setAttribute('aria-label', `${studioName} home`);
  document.title = `${studioName} · Inflation converter`;
  $('footer-studio-name').textContent = studioName;
  $('footer-source-note').textContent = `Historical estimates · Official ${isUS() ? 'BLS' : 'ABS'} data · Works offline`;
  $('history-heading').textContent = `From ${earliest} to the present`;
  $('history-description').innerHTML = isUS() ? '<strong>1800–1912:</strong> historical estimates compiled by the Minneapolis Fed, including Vermont family-living prices, Hoover’s price series and Rees’s cost-of-living series. <strong>1913–2025:</strong> annual averages of published monthly all-items, US city average CPI-U indexes (not seasonally adjusted).' : australianText['history-description'];
  $('history-method').innerHTML = isUS() ? 'Early indexes cover different populations and are rounded, so long comparisons are approximate. The historical series is linked to the modern index at 1913. The 2025 average uses the 11 published months; October data were unavailable.' : australianText['history-method'];
  $('release-note').textContent = `Data released ${new Date(data.releasedAt + 'T00:00:00Z').toLocaleDateString('en-AU', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}. Checked ${new Date(data.checkedAt + 'T00:00:00Z').toLocaleDateString('en-AU', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}.`;
  $('history-source').textContent = isUS() ? 'Minneapolis Fed historical prices, 1800 onward ↗' : 'ABS Year Book Australia, Table 28.4 ↗';
  $('monthly-source').textContent = isUS() ? 'BLS August 2026 CPI release ↗' : 'ABS monthly CPI, Table 1 ↗';
  $('quarterly-source').textContent = isUS() ? 'BLS public CPI-U series, CUUR0000SA0 ↗' : 'ABS quarterly CPI, Table 17 ↗';
  $('australian-currency-details').hidden = isUS();
  $('missing-month-source').hidden = !isUS();
  for (const [id, source] of [['history-source', data.sources.history], ['monthly-source', data.sources.monthly], ['quarterly-source', isUS() ? data.sources.annual : data.sources.quarterly], ['rba-source', australianData.sources.method], ['missing-month-source', usData.sources.missingMonth]]) {
    $(id).href = source;
    $(id).target = '_blank';
    $(id).rel = 'noopener';
  }
  $('table-value-heading').textContent = `Value in 2026 (${currency})`;
  $('table-index-note').textContent = `Indexes share a linked reference scale (${data.base}). 2026 uses the selected partial-year price reference.`;
}

function update() {
  const year = Number($('year').value);
  const ref = data.reference2026[$('basis').value];
  const historical = year === 2026 ? { year, index: ref.index, basis: ref.label } : years.get(year);
  const pounds = !isUS() && year < 1966 && $('unit').value === 'pounds';
  const amount = parseAmount($('amount').value);
  const valid = amount !== null;
  $('amount').setAttribute('aria-invalid', String(!valid));
  $('amount-error').hidden = valid;
  $('amount-error').textContent = valid ? '' : 'Enter an amount from 0 to 1 trillion, with up to two decimal places (for example, 1,250.50).';
  $('amount-label').textContent = direction === 'forward' ? `Amount in ${year}` : 'Amount in 2026';
  $('currency-symbol').textContent = direction === 'forward' && pounds ? '£' : '$';
  $('amount-hint').textContent = isUS() ? 'US dollars. Commas are welcome.' : direction === 'forward' && pounds ? 'Australian pounds, in decimal form. £1 = A$2.' : year < 1966 && direction === 'forward' ? 'Hypothetical AUD equivalent. You can enter pounds below.' : 'Australian dollars. Commas are welcome.';
  $('currency-control').hidden = isUS() || year >= 1966;
  $('period-kind').textContent = year === 2026 ? 'Partial year' : isUS() && year === 2025 ? '11-month average' : year < (isUS() ? 1913 : 1949) ? 'Historical series' : 'Annual average';
  $('year-range').value = year;
  $('historical-note').hidden = isUS() ? year >= 1913 && year !== 2025 && year !== 2026 : year >= 1966 && year !== 2026;
  $('historical-note').textContent = isUS() ? year < 1913 ? `Before 1913, US prices are historical estimates. ${historical.basis}; coverage differs from modern CPI-U.` : year === 2025 ? 'The US 2025 average uses 11 published months. BLS did not publish October CPI because of the federal funding lapse.' : year === 2026 ? 'Both sides use the same 2026 price reference, so the amount is unchanged.' : '' : year < 1901 ? '1850–1900 uses Sydney retail prices as a historical estimate. Dollars are hypothetical equivalents; Australian pounds were used at the time.' : year < 1966 ? 'Dollars before 1966 are hypothetical equivalents. For an actual price in Australian pounds, change the currency below.' : year === 2026 ? 'Both sides use the same 2026 price reference, so the amount is unchanged.' : '';
  document.querySelectorAll('[data-year]').forEach(button => button.classList.toggle('chosen', Number(button.dataset.year) === year));
  const fromIndex = direction === 'forward' ? historical.index : ref.index;
  const toIndex = direction === 'forward' ? ref.index : historical.index;
  const unitFactor = pounds ? 2 : 1;
  const value = valid ? direction === 'forward' ? convert(amount * unitFactor, fromIndex, toIndex) : convert(amount, fromIndex, toIndex) / unitFactor : null;
  const historicalMoney = n => pounds ? `£${number(n)}` : currencyMoney(n);
  const fromLabel = direction === 'forward' ? year === 2026 ? ref.label : String(year) : ref.label;
  const toLabel = direction === 'forward' ? ref.label : year === 2026 ? ref.label : String(year);
  const formattedInput = valid ? direction === 'forward' ? historicalMoney(amount) : currencyMoney(amount) : '';
  const formattedResult = valid ? direction === 'forward' ? currencyMoney(value) : historicalMoney(value) : '';
  $('result-context').textContent = valid ? `${formattedInput} in ${fromLabel} has the buying power of` : 'Enter an amount to see its equivalent buying power.';
  $('result-value').textContent = valid ? formattedResult : '—';
  $('result-explanation').textContent = valid ? `in ${toLabel}${!isUS() && direction === 'reverse' && year < 1966 && !pounds ? ' (AUD equivalent)' : ''}.` : 'The conversion will update automatically.';
  $('result-period').textContent = direction === 'forward' ? ref.short.toUpperCase() : `${year}${year < (isUS() ? 1913 : 1901) ? ' · ESTIMATE' : ''}`;
  $('multiplier').textContent = `${number(toIndex / fromIndex)}×`;
  $('multiplier-note').textContent = `Prices in ${direction === 'forward' ? '2026' : year} ÷ ${direction === 'forward' ? year : '2026'}`;
  const change = (toIndex / fromIndex - 1) * 100;
  $('price-change').textContent = `${change > 0 ? '+' : ''}${number(change, 1)}%`;
  $('price-note').textContent = 'For the selected direction';
  $('span').textContent = number(2026 - year, 0);
  $('copy').disabled = !valid;
  $('swap').disabled = !valid;
  $('csv').disabled = !valid;
  $('calculation').textContent = valid ? `${formattedInput}${pounds ? direction === 'forward' ? ' × 2' : '' : ''} × ${number(toIndex, 4)} ÷ ${number(fromIndex, 4)}${pounds && direction === 'reverse' ? ' ÷ 2' : ''} = ${formattedResult}` : 'Amount × destination index ÷ starting index';
  $('current-method').textContent = `Selected reference: ${ref.label}, with a ${isUS() ? 'CPI-U' : 'CPI'} index of ${number(ref.index, 4)} (${data.base}). Choose the latest published month or the average of all eight published months in 2026.`;
  const baseAmount = valid ? direction === 'forward' ? amount * unitFactor : convert(amount, ref.index, historical.index) : 0;
  const resultText = valid ? `${formattedInput} in ${fromLabel} ≈ ${formattedResult} in ${toLabel}${!isUS() && direction === 'reverse' && year < 1966 && !pounds ? ' (AUD equivalent)' : ''}. Currency: ${currency}. ${historical.basis}. 2026 reference: ${ref.label}. ${isUS() ? 'BLS / Minneapolis Fed' : 'ABS'} data checked ${data.checkedAt}.${!isUS() && year < 1966 ? ' Pre-1966 dollars are hypothetical equivalents; £1 = A$2.' : ''}${!isUS() && year < 1901 ? ' Sydney historical estimate.' : ''}` : '';
  state = { year, ref, historical, amount, value, valid, pounds, baseAmount, resultText };
  drawChart();
  updateTable();
}

function drawChart() {
  const { year, ref, historical, baseAmount, valid } = state;
  if (!valid) {
    $('chart').replaceChildren();
    $('chart-subtitle').textContent = 'Enter a valid amount to draw the comparison.';
    $('chart-footnote').textContent = '';
    return;
  }
  const points = data.annual.filter(row => row.year >= year).map(row => ({ year: row.year, value: convert(baseAmount, historical.index, row.index) }));
  points.push({ year: 2026, value: convert(baseAmount, historical.index, ref.index) });
  const w = 820, h = 280, left = 72, right = 760, top = 30, bottom = 224;
  const max = Math.max(...points.map(p => p.value), 1) * 1.15;
  const x = y => year === 2026 ? (left + right) / 2 : left + (y - year) / (2026 - year) * (right - left);
  const y = value => bottom - value / max * (bottom - top);
  const compact = n => new Intl.NumberFormat('en-AU', { notation: Math.abs(n) >= 1e4 ? 'compact' : 'standard', maximumFractionDigits: n < 1 ? 2 : 0 }).format(n);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Equivalent ${currency} purchasing power, ${year} to 2026</title><desc id="chart-desc">${currencyMoney(baseAmount)} in ${year} corresponds to ${currencyMoney(points.at(-1).value)} in ${ref.label}. All plotted values are ${currency}${isUS() ? '' : ' equivalents'}. Historical years use annual averages; the final point uses a partial-year 2026 reference. The complete values are available in the data table below.</desc>`;
  for (let tick = 0; tick <= 4; tick++) {
    const val = max * tick / 4, yy = y(val);
    svg += `<line x1="${left}" x2="${right}" y1="${yy}" y2="${yy}" stroke="#e1e7e5" /><text x="${left - 12}" y="${yy + 4}" text-anchor="end" fill="#536970" font-size="12">$${compact(val)}</text>`;
  }
  const tickYears = year === 2026 ? [2026] : [...new Set([year, Math.round(year + (2026 - year) / 3), Math.round(year + (2026 - year) * 2 / 3), 2026])];
  for (const tick of tickYears) svg += `<text x="${x(tick)}" y="${bottom + 30}" text-anchor="middle" fill="#536970" font-size="12">${tick}</text>`;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year)},${y(p.value)}`).join(' ');
  if (points.length > 1) svg += `<path d="${path} L${x(2026)},${bottom} L${x(year)},${bottom} Z" fill="#17595b" opacity=".06"/><path d="${path}" fill="none" stroke="#17595b" stroke-width="3" stroke-linejoin="round"/>`;
  const last = points.at(-1);
  svg += `<circle cx="${x(last.year)}" cy="${y(last.value)}" r="5" fill="#a56925" stroke="white" stroke-width="2"/><text x="${right}" y="16" text-anchor="end" fill="#855921" font-size="12">2026: ${compact(last.value)} ${currency}</text></svg>`;
  $('chart').innerHTML = svg;
  $('chart-subtitle').textContent = `Cost of the same basket, starting at ${currencyMoney(baseAmount)} in ${year}.`;
  $('chart-footnote').textContent = `Annual averages through 2025 · 2026 endpoint: ${ref.label}${isUS() ? year < 1913 ? ' · Pre-1913 values are historical estimates' : '' : year < 1901 ? ' · Pre-1901 values are Sydney estimates' : ''}${isUS() && year <= 2025 ? ' · 2025 uses 11 published months' : ''}.`;
}

function comparisonRows() {
  const { ref, baseAmount, valid } = state;
  const rows = [...data.annual, { year: 2026, index: ref.index, basis: ref.label }];
  return rows.map(row => ({ ...row, value: valid ? convert(baseAmount, row.index, ref.index) : null }));
}

function updateTable() {
  $('table-caption').textContent = state.valid ? `What ${currencyMoney(state.baseAmount)} in each historical year buys in ${state.ref.label}. The chart above follows one basket from the selected year; this table compares the same nominal amount across all years.` : 'Enter a valid amount to view converted values.';
  $('data-rows').replaceChildren(...comparisonRows().map(row => {
    const tr = document.createElement('tr');
    for (const value of [row.year, row.basis, number(row.index, 4), row.value === null ? '—' : currencyMoney(row.value)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    }
    if (row.year === state.year) tr.className = 'selected-row';
    return tr;
  }));
}

$('conversion-form').addEventListener('submit', event => event.preventDefault());
$('amount').addEventListener('input', update);
$('currency').addEventListener('change', () => { configureCurrency(); update(); });
$('year').addEventListener('change', update);
$('year-range').addEventListener('input', event => { $('year').value = event.target.value; update(); });
$('basis').addEventListener('change', update);
$('unit').addEventListener('change', () => {
  if (direction === 'forward' && state.valid) $('amount').value = ($('unit').value === 'pounds' ? state.amount / 2 : state.amount * 2).toFixed(2);
  update();
});
document.querySelectorAll('input[name="direction"]').forEach(input => input.addEventListener('change', () => { direction = input.value; update(); }));
document.querySelectorAll('[data-year]').forEach(button => button.addEventListener('click', () => { $('year').value = button.dataset.year; update(); }));
$('swap').addEventListener('click', () => {
  $('amount').value = state.value.toFixed(2);
  direction = direction === 'forward' ? 'reverse' : 'forward';
  document.querySelector(`input[name="direction"][value="${direction}"]`).checked = true;
  update();
});
$('reset-comparison').addEventListener('click', () => {
  direction = 'forward';
  $('conversion-form').reset();
  $('currency').value = currency;
  $('year').value = '2000';
  $('amount').value = '100';
  update();
});
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.resultText);
    $('copy').textContent = 'Copied';
    $('action-status').textContent = 'Conversion copied with its data reference.';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { $('copy').textContent = 'Copy result'; }, 2200);
  } catch {
    $('action-status').textContent = 'Automatic copying is unavailable. Select and copy the result below.';
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($('result'));
    selection.removeAllRanges();
    selection.addRange(range);
    $('copy').textContent = 'Select result to copy';
  }
});
$('csv').addEventListener('click', () => {
  const rows = comparisonRows();
  const encode = value => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [['Year', 'Series', `Linked index (${data.base})`, `Nominal amount (${currency}${isUS() ? '' : ' equivalent'})`, `Equivalent value in 2026 (${currency})`, '2026 reference', '2026 index', 'Data checked', 'Historical source', isUS() ? 'Annual CPI-U source' : 'Quarterly source', 'Monthly source'], ...rows.map(row => [row.year, row.basis, row.index, state.baseAmount, row.value.toFixed(2), state.ref.label, state.ref.index, data.checkedAt, data.sources.history, isUS() ? data.sources.annual : data.sources.quarterly, data.sources.monthly])].map(row => row.map(encode).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${isUS() ? 'us' : 'australian'}-dollar-comparison-${data.annual[0].year}-2026-${$('basis').value}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('action-status').textContent = 'Comparison CSV downloaded.';
});
$('print').addEventListener('click', () => window.print());
configureCurrency();
update();
