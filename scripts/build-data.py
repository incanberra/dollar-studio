"""Rebuild the bundled snapshot from the saved, unmodified ABS source files."""
from pathlib import Path
import json
import math
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
data = ROOT / 'data'
historical = {}
table = pd.read_html(data / 'abs-yearbook-2003.html')[2]
for row in table.itertuples(index=False, name=None):
    for col in range(0, 12, 2):
        try:
            year = int(str(row[col]))
            value = float(str(row[col + 1]).replace(',', ''))
            if 1850 <= year <= 2001:
                historical[year] = value
        except (ValueError, TypeError):
            pass
assert len(historical) == 152

def observations(filename, series_id):
    frame = pd.read_excel(data / filename, sheet_name='Data1', header=None)
    col = next(c for c in frame.columns if frame.iloc[9, c] == series_id)
    return [(date, float(value)) for date, value in zip(frame.iloc[10:, 0], frame.iloc[10:, col])]

quarters = observations('abs-6401017.xlsx', 'A2325846C')
months = observations('abs-640101.xlsx', 'A130393720C')
annual = {}
for year in range(1949, 2026):
    values = [value for date, value in quarters if date.year == year]
    assert len(values) == 4
    annual[year] = sum(values) / 4
# Link at a complete overlapping calendar year, preserving historical ratios.
factor = annual[1949] / historical[1949]
rows = []
for year in range(1850, 2026):
    index = historical[year] * factor if year < 1949 else annual[year]
    assert math.isfinite(index) and index > 0
    rows.append({'year': year, 'index': index, 'basis': 'Sydney retail prices' if year < 1901 else 'Linked retail price index' if year < 1949 else 'Annual average CPI'})
current = [(date, value) for date, value in months if date.year == 2026]
assert len(current) == 8 and current[-1][0].month == 8
snapshot = {
    'checkedAt': '2026-10-09',
    'releasedAt': '2026-09-30',
    'base': 'September 2025 = 100',
    'link': {'year': 1949, 'historicalIndex': historical[1949], 'quarterlyAnnualIndex': annual[1949], 'factor': factor},
    'sources': {
        'history': 'https://www.abs.gov.au/ausstats/abs@.nsf/9e1dd9680bdd9821ca257090002029cc/09BFC87C87DC317FCA256CAE00166AB4',
        'quarterly': 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/aug-2026/6401017.xlsx',
        'monthly': 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/aug-2026/640101.xlsx',
        'method': 'https://www.rba.gov.au/calculator/'
    },
    'annual': rows,
    'reference2026': {
        'latest': {'index': current[-1][1], 'label': 'August 2026', 'short': 'Aug 2026'},
        'ytd': {'index': sum(v for _, v in current) / len(current), 'label': 'January–August 2026 average', 'short': 'Jan–Aug average'},
        'monthly': [{'period': date.strftime('%Y-%m'), 'index': value} for date, value in current]
    }
}
(data / 'cpi.json').write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
print(f'Built {len(rows)} complete annual observations (1850–2025) and 8 months in 2026.')
print(f'1949 link factor: {factor}; August 2026: {current[-1][1]}')
