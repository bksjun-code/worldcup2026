"""
seed_data.py의 GROUP_MATCHES 날짜를 update_match_dates.py의 NEW_SCHEDULE 기준으로 동기화.
실행: python update_seed_data.py
"""
import re
from datetime import datetime, timedelta

from update_match_dates import NEW_SCHEDULE

SCHEDULE_MAP = {(g, frozenset(t)): dt for g, t, dt in NEW_SCHEDULE}

with open("seed_data.py", "r", encoding="utf-8") as f:
    content = f.read()

start = content.index("GROUP_MATCHES = [")
end = content.index("KNOCKOUT_MATCHES = [")
section = content[start:end]

entry_re = re.compile(
    r'"home": "([^"]+)", "away": "([^"]+)".*?"date": "([^"]+)".*?"group": "([^"]+)"',
    re.DOTALL,
)

count = 0


def repl(m):
    global count
    home, away, old_date, group = m.group(1), m.group(2), m.group(3), m.group(4)
    key = (group, frozenset({home, away}))
    if key not in SCHEDULE_MAP:
        print(f"매칭 실패: {group}조 {home} vs {away}")
        return m.group(0)
    kst = SCHEDULE_MAP[key]
    utc = kst - timedelta(hours=9)
    new_date = utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    count += 1
    return m.group(0).replace(f'"date": "{old_date}"', f'"date": "{new_date}"')


new_section = entry_re.sub(repl, section)

content = content[:start] + new_section + content[end:]

with open("seed_data.py", "w", encoding="utf-8") as f:
    f.write(content)

print(f"업데이트 완료: {count}건")
