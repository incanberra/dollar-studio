import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseAmount, convert, money } from '../lib.mjs';
const data = JSON.parse(await readFile(new URL('../data/cpi.json', import.meta.url)));
const usData = JSON.parse(await readFile(new URL('../data/us-cpi.json', import.meta.url)));
test('historical data is continuous, positive and correctly linked at 1949', () => {
  assert.equal(data.annual.length, 176);
  data.annual.forEach((row, i) => { assert.equal(row.year, 1850 + i); assert.ok(row.index > 0); });
  assert.equal(data.annual[0].index / data.link.factor, 53);
  assert.ok(Math.abs(data.annual[95].index / data.link.factor - 100) < 1e-10);
  assert.equal(data.annual[99].index, data.link.quarterlyAnnualIndex);
  assert.equal(data.annual[50].basis, 'Sydney retail prices');
  assert.equal(data.annual[51].basis, 'Linked retail price index');
});
test('2026 references use published observations, not a fabricated annual forecast', () => {
  const months = data.reference2026.monthly;
  assert.equal(months.length, 8);
  months.forEach((row, i) => assert.equal(row.period, `2026-${String(i + 1).padStart(2, '0')}`));
  assert.equal(data.reference2026.latest.index, 103.5);
  assert.equal(data.reference2026.ytd.index, months.reduce((sum, row) => sum + row.index, 0) / 8);
});
test('conversion ratio, same-period identity, round trip and decimalisation', () => {
  assert.equal(convert(100, 50, 100), 200);
  assert.equal(convert(100, 100, 50), 50);
  assert.equal(convert(100, 103.5, 103.5), 100);
  assert.equal(convert(0, 10, 100), 0);
  for (const row of data.annual) {
    const value = convert(1234.56, row.index, 103.5);
    assert.ok(Math.abs(convert(value, 103.5, row.index) - 1234.56) < 1e-8);
    assert.equal(convert(2, row.index, 103.5), convert(1, row.index, 103.5) * 2);
  }
  assert.throws(() => convert(100, 0, 1), RangeError);
});
test('formatted amounts work and ambiguous or invalid inputs are rejected', () => {
  for (const [raw, expected] of [['1,250.50', 1250.5], ['0', 0], ['100.', 100], [' 25.10 ', 25.1], ['1000000000000', 1e12]]) assert.equal(parseAmount(raw), expected);
  for (const raw of ['', '-1', 'NaN', '1e3', '12,34', '1,5', '2.001', '100abc', '1000000000001']) assert.equal(parseAmount(raw), null);
});
test('portable app bundles all data and assets with valid JavaScript', async () => {
  await import('../scripts/build-standalone.mjs');
  const html = await readFile(new URL('../dist/Australian Dollar Studio.html', import.meta.url), 'utf8');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(code));
  assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/.test(html));
  assert.ok(code.includes("'£' : '$'"));
  assert.ok(code.includes('Sydney retail prices'));
  assert.ok(code.includes('Vermont family-living price estimate'));
  assert.ok(code.includes('const usData ='));
});
test('US history is continuous back to 1800 and links at the 1913 overlap', () => {
  assert.equal(usData.annual.length, 226);
  usData.annual.forEach((row, i) => { assert.equal(row.year, 1800 + i); assert.ok(row.index > 0); });
  assert.ok(Math.abs(usData.annual[0].index / usData.link.factor - 51) < 1e-10);
  assert.equal(usData.annual[113].index, usData.link.monthlyAnnualIndex);
  assert.equal(usData.annual[112].basis, 'Rees historical cost-of-living estimate');
  assert.equal(usData.annual[113].basis, 'Annual average CPI-U');
  assert.equal(usData.base, '1982–1984 = 100');
  for (const row of usData.annual) {
    const result = convert(1234.56, row.index, usData.reference2026.latest.index);
    assert.ok(Math.abs(convert(result, usData.reference2026.latest.index, row.index) - 1234.56) < 1e-8);
  }
});
test('US current-year references use all eight published BLS months', async () => {
  const raw = JSON.parse(await readFile(new URL('../data/us-bls-2025-2026.json', import.meta.url)));
  assert.equal(raw.Results.series[0].seriesID, 'CUUR0000SA0');
  const source = raw.Results.series[0].data.filter(row => row.year === '2026' && /^M0[1-8]$/.test(row.period));
  assert.equal(source.length, 8);
  assert.equal(usData.reference2026.latest.index, 334.980);
  assert.equal(usData.reference2026.ytd.index, source.sort((a, b) => a.period.localeCompare(b.period)).reduce((sum, row) => sum + Number(row.value), 0) / 8);
  usData.reference2026.monthly.forEach((row, i) => {
    assert.equal(row.period, `2026-${String(i + 1).padStart(2, '0')}`);
    assert.equal(row.index, Number(source[i].value));
  });
});
test('US 2025 averages the eleven published months without imputing October', async () => {
  const raw = JSON.parse(await readFile(new URL('../data/us-bls-2025-2026.json', import.meta.url)));
  const source = raw.Results.series[0].data.filter(row => row.year === '2025' && row.period !== 'M13');
  assert.equal(source.find(row => row.period === 'M10').value, '-');
  const available = source.filter(row => row.value !== '-').sort((a, b) => a.period.localeCompare(b.period));
  assert.equal(available.length, 11);
  const row = usData.annual.find(row => row.year === 2025);
  assert.equal(row.index, available.reduce((sum, row) => sum + Number(row.value), 0) / 11);
  assert.match(row.basis, /11 published months/);
  assert.deepEqual(usData.missingPeriods, ['2025-10']);
});
test('Australian results remain unchanged and US amounts are clearly identified', () => {
  const au2000 = data.annual.find(row => row.year === 2000);
  const us2000 = usData.annual.find(row => row.year === 2000);
  assert.equal(money(convert(100, au2000.index, data.reference2026.latest.index)), '$208.54');
  assert.equal(convert(100, us2000.index, usData.reference2026.latest.index).toFixed(2), '194.53');
  assert.match(money(100, 'USD'), /USD/);
  assert.equal(convert(100, usData.reference2026.latest.index, usData.reference2026.latest.index), 100);
});

