"""Build the US snapshot without altering the existing Australian dataset."""
from pathlib import Path
import json
import math
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
data = ROOT / 'data'
table = pd.read_html(data / 'us-minneapolis-history.html')[0]
historical = {int(str(row.iloc[0]).strip()): float(row.iloc[1]) for _, row in table.iterrows() if str(row.iloc[0]).strip().isdigit()}
assert set(range(1800, 1914)).issubset(historical)
replies = json.loads((data / 'us-bls-history.json').read_text(encoding='utf-8'))
replies.append({'response': json.loads((data / 'us-bls-2025-2026.json').read_text(encoding='utf-8'))})
monthly = {}
for reply in replies:
    series = reply['response']['Results']['series'][0]
    assert series['seriesID'] == 'CUUR0000SA0'
    for observation in series['data']:
        period = observation['period']
        if period.startswith('M') and 1 <= int(period[1:]) <= 12:
            key = f"{observation['year']}-{period[1:]}"
            if observation['value'] == '-':
                assert key == '2025-10'
                continue
            value = float(observation['value'])
            assert key not in monthly or monthly[key] == value
            monthly[key] = value
annual = {}
for year in range(1913, 2026):
    values = [monthly[f'{year}-{month:02d}'] for month in range(1, 13) if f'{year}-{month:02d}' in monthly]
    assert len(values) == (11 if year == 2025 else 12)
    annual[year] = sum(values) / len(values)
factor = annual[1913] / historical[1913]
rows = []
for year in range(1800, 2026):
    index = historical[year] * factor if year < 1913 else annual[year]
    assert math.isfinite(index) and index > 0
    basis = 'Vermont family-living price estimate' if year <= 1851 else 'Hoover historical price estimate' if year < 1890 else 'Rees historical cost-of-living estimate' if year < 1913 else 'Annual average CPI-U'
    if year == 2025:
        basis = 'Annual average CPI-U (11 published months)'
    rows.append({'year': year, 'index': index, 'basis': basis})
current = [(period, value) for period, value in sorted(monthly.items()) if period.startswith('2026-')]
assert [period for period, _ in current] == [f'2026-{month:02d}' for month in range(1, 9)]
assert current[-1][1] == 334.980
snapshot = {
    'checkedAt': '2026-10-10', 'releasedAt': '2026-09-11', 'base': '1982–1984 = 100',
    'link': {'year': 1913, 'historicalIndex': historical[1913], 'monthlyAnnualIndex': annual[1913], 'factor': factor},
    'seriesId': 'CUUR0000SA0',
    'missingPeriods': ['2025-10'],
    'sources': {
        'history': 'https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1800-',
        'monthly': 'https://www.bls.gov/news.release/archives/cpi_09112026.htm',
        'annual': 'https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0',
        'method': 'https://www.bls.gov/cpi/overview.htm',
        'missingMonth': 'https://www.bls.gov/cpi/additional-resources/2025-federal-government-shutdown-impact-cpi-faq.htm'
    },
    'annual': rows,
    'reference2026': {
        'latest': {'index': current[-1][1], 'label': 'August 2026', 'short': 'Aug 2026'},
        'ytd': {'index': sum(value for _, value in current) / len(current), 'label': 'January–August 2026 average', 'short': 'Jan–Aug average'},
        'monthly': [{'period': period, 'index': value} for period, value in current]
    }
}
(data / 'us-cpi.json').write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
print(f'Built {len(rows)} US annual observations (1800–2025) and 8 published months in 2026.')
print(f'1913 link factor: {factor}; August 2026 CPI-U: {current[-1][1]}')
