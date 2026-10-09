"""Save public BLS CPI-U responses; run only when intentionally updating the snapshot."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
periods = [(year, year + 9) for year in range(1913, 2023, 10)] + [(2023, 2024)]

def download(period):
    start, end = period
    url = f'https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?startyear={start}&endyear={end}'
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = json.load(response)
    assert payload['status'] == 'REQUEST_SUCCEEDED', payload.get('message')
    assert payload['Results']['series'][0]['seriesID'] == 'CUUR0000SA0'
    return {'url': url, 'response': payload}

with ThreadPoolExecutor(max_workers=3) as executor:
    replies = list(executor.map(download, periods))
(ROOT / 'data/us-bls-history.json').write_text(json.dumps(replies, indent=2) + '\n', encoding='utf-8')
print(f'Saved {len(replies)} BLS public API responses covering 1913–2024.')
