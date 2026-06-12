"""
2026 FIFA 월드컵 초기 경기 데이터 시드
실행: python seed_data.py
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import text

KST = timezone(timedelta(hours=9))


def to_kst_naive(date_str: str) -> datetime:
    """UTC ISO 문자열을 KST 벽시계 시각의 naive datetime으로 변환.
    SQLite는 타임존 정보를 보존하지 못하므로, 저장값 자체를 KST로 맞춘다."""
    return datetime.fromisoformat(date_str.replace("Z", "+00:00")).astimezone(KST).replace(tzinfo=None)

from database import SessionLocal, engine, Base
from models import Match, MatchStage, MatchStatus, User
from auth import hash_password
import os
from dotenv import load_dotenv

load_dotenv()

# UTC 기준 경기 일정 (한국시간 = UTC+9)
# 예선 전체 일정은 6/11~6/27 이내 종료, 토너먼트는 6/28부터 시작
GROUP_MATCHES = [
    # ── Group A (한국 조) ──────────────────────────────────────────────
    {"home": "대한민국", "away": "체코", "home_f": "🇰🇷", "away_f": "🇨🇿",
     "date": "2026-06-12T02:00:00Z", "venue": "Estadio Akron", "city": "과달라하라", "group": "A", "korea": True},
    {"home": "멕시코", "away": "남아프리카공화국", "home_f": "🇲🇽", "away_f": "🇿🇦",
     "date": "2026-06-11T19:00:00Z", "venue": "Estadio Akron", "city": "과달라하라", "group": "A", "korea": False},
    {"home": "대한민국", "away": "멕시코", "home_f": "🇰🇷", "away_f": "🇲🇽",
     "date": "2026-06-19T01:00:00Z", "venue": "Estadio Akron", "city": "과달라하라", "group": "A", "korea": True},
    {"home": "체코", "away": "남아프리카공화국", "home_f": "🇨🇿", "away_f": "🇿🇦",
     "date": "2026-06-18T16:00:00Z", "venue": "Estadio BBVA", "city": "몬테레이", "group": "A", "korea": False},
    {"home": "대한민국", "away": "남아프리카공화국", "home_f": "🇰🇷", "away_f": "🇿🇦",
     "date": "2026-06-25T01:00:00Z", "venue": "Estadio BBVA", "city": "몬테레이", "group": "A", "korea": True},
    {"home": "멕시코", "away": "체코", "home_f": "🇲🇽", "away_f": "🇨🇿",
     "date": "2026-06-25T01:00:00Z", "venue": "Estadio Akron", "city": "과달라하라", "group": "A", "korea": False},

    # ── Group B ────────────────────────────────────────────────────────
    {"home": "캐나다", "away": "보스니아·헤르체고비나", "home_f": "🇨🇦", "away_f": "🇧🇦",
     "date": "2026-06-12T19:00:00Z", "venue": "SoFi Stadium", "city": "LA", "group": "B", "korea": False},
    {"home": "카타르", "away": "스위스", "home_f": "🇶🇦", "away_f": "🇨🇭",
     "date": "2026-06-13T19:00:00Z", "venue": "AT&T Stadium", "city": "댈러스", "group": "B", "korea": False},
    {"home": "캐나다", "away": "카타르", "home_f": "🇨🇦", "away_f": "🇶🇦",
     "date": "2026-06-18T22:00:00Z", "venue": "MetLife Stadium", "city": "뉴저지", "group": "B", "korea": False},
    {"home": "보스니아·헤르체고비나", "away": "스위스", "home_f": "🇧🇦", "away_f": "🇨🇭",
     "date": "2026-06-18T19:00:00Z", "venue": "BC Place", "city": "밴쿠버", "group": "B", "korea": False},
    {"home": "캐나다", "away": "스위스", "home_f": "🇨🇦", "away_f": "🇨🇭",
     "date": "2026-06-24T19:00:00Z", "venue": "Levi's Stadium", "city": "샌프란시스코", "group": "B", "korea": False},
    {"home": "보스니아·헤르체고비나", "away": "카타르", "home_f": "🇧🇦", "away_f": "🇶🇦",
     "date": "2026-06-24T19:00:00Z", "venue": "BMO Field", "city": "토론토", "group": "B", "korea": False},

    # ── Group C ────────────────────────────────────────────────────────
    {"home": "브라질", "away": "모로코", "home_f": "🇧🇷", "away_f": "🇲🇦",
     "date": "2026-06-13T22:00:00Z", "venue": "Hard Rock Stadium", "city": "마이애미", "group": "C", "korea": False},
    {"home": "아이티", "away": "스코틀랜드", "home_f": "🇭🇹", "away_f": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
     "date": "2026-06-14T01:00:00Z", "venue": "Lincoln Financial Field", "city": "필라델피아", "group": "C", "korea": False},
    {"home": "브라질", "away": "아이티", "home_f": "🇧🇷", "away_f": "🇭🇹",
     "date": "2026-06-20T00:30:00Z", "venue": "Arrowhead Stadium", "city": "캔자스시티", "group": "C", "korea": False},
    {"home": "모로코", "away": "스코틀랜드", "home_f": "🇲🇦", "away_f": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
     "date": "2026-06-19T22:00:00Z", "venue": "Gillette Stadium", "city": "보스턴", "group": "C", "korea": False},
    {"home": "브라질", "away": "스코틀랜드", "home_f": "🇧🇷", "away_f": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
     "date": "2026-06-24T22:00:00Z", "venue": "Rose Bowl", "city": "LA", "group": "C", "korea": False},
    {"home": "모로코", "away": "아이티", "home_f": "🇲🇦", "away_f": "🇭🇹",
     "date": "2026-06-24T22:00:00Z", "venue": "Allegiant Stadium", "city": "라스베이거스", "group": "C", "korea": False},

    # ── Group D ────────────────────────────────────────────────────────
    {"home": "미국", "away": "파라과이", "home_f": "🇺🇸", "away_f": "🇵🇾",
     "date": "2026-06-13T01:00:00Z", "venue": "Estadio Azteca", "city": "멕시코시티", "group": "D", "korea": False},
    {"home": "호주", "away": "터키", "home_f": "🇦🇺", "away_f": "🇹🇷",
     "date": "2026-06-14T04:00:00Z", "venue": "NRG Stadium", "city": "휴스턴", "group": "D", "korea": False},
    {"home": "미국", "away": "호주", "home_f": "🇺🇸", "away_f": "🇦🇺",
     "date": "2026-06-19T19:00:00Z", "venue": "Lumen Field", "city": "시애틀", "group": "D", "korea": False},
    {"home": "파라과이", "away": "터키", "home_f": "🇵🇾", "away_f": "🇹🇷",
     "date": "2026-06-20T03:00:00Z", "venue": "Estadio Jalisco", "city": "과달라하라", "group": "D", "korea": False},
    {"home": "미국", "away": "터키", "home_f": "🇺🇸", "away_f": "🇹🇷",
     "date": "2026-06-26T02:00:00Z", "venue": "Hard Rock Stadium", "city": "마이애미", "group": "D", "korea": False},
    {"home": "파라과이", "away": "호주", "home_f": "🇵🇾", "away_f": "🇦🇺",
     "date": "2026-06-26T02:00:00Z", "venue": "MetLife Stadium", "city": "뉴저지", "group": "D", "korea": False},

    # ── Group E ────────────────────────────────────────────────────────
    {"home": "독일", "away": "퀴라소", "home_f": "🇩🇪", "away_f": "🇨🇼",
     "date": "2026-06-14T17:00:00Z", "venue": "AT&T Stadium", "city": "댈러스", "group": "E", "korea": False},
    {"home": "코트디부아르", "away": "에콰도르", "home_f": "🇨🇮", "away_f": "🇪🇨",
     "date": "2026-06-14T23:00:00Z", "venue": "SoFi Stadium", "city": "LA", "group": "E", "korea": False},
    {"home": "독일", "away": "코트디부아르", "home_f": "🇩🇪", "away_f": "🇨🇮",
     "date": "2026-06-20T20:00:00Z", "venue": "Lincoln Financial Field", "city": "필라델피아", "group": "E", "korea": False},
    {"home": "퀴라소", "away": "에콰도르", "home_f": "🇨🇼", "away_f": "🇪🇨",
     "date": "2026-06-21T00:00:00Z", "venue": "Estadio Azteca", "city": "멕시코시티", "group": "E", "korea": False},
    {"home": "독일", "away": "에콰도르", "home_f": "🇩🇪", "away_f": "🇪🇨",
     "date": "2026-06-25T20:00:00Z", "venue": "BC Place", "city": "밴쿠버", "group": "E", "korea": False},
    {"home": "퀴라소", "away": "코트디부아르", "home_f": "🇨🇼", "away_f": "🇨🇮",
     "date": "2026-06-25T20:00:00Z", "venue": "BMO Field", "city": "토론토", "group": "E", "korea": False},

    # ── Group F ────────────────────────────────────────────────────────
    {"home": "네덜란드", "away": "일본", "home_f": "🇳🇱", "away_f": "🇯🇵",
     "date": "2026-06-14T20:00:00Z", "venue": "Gillette Stadium", "city": "보스턴", "group": "F", "korea": False},
    {"home": "스웨덴", "away": "튀니지", "home_f": "🇸🇪", "away_f": "🇹🇳",
     "date": "2026-06-15T02:00:00Z", "venue": "Rose Bowl", "city": "LA", "group": "F", "korea": False},
    {"home": "네덜란드", "away": "스웨덴", "home_f": "🇳🇱", "away_f": "🇸🇪",
     "date": "2026-06-20T17:00:00Z", "venue": "Levi's Stadium", "city": "샌프란시스코", "group": "F", "korea": False},
    {"home": "일본", "away": "튀니지", "home_f": "🇯🇵", "away_f": "🇹🇳",
     "date": "2026-06-21T02:00:00Z", "venue": "Arrowhead Stadium", "city": "캔자스시티", "group": "F", "korea": False},
    {"home": "네덜란드", "away": "튀니지", "home_f": "🇳🇱", "away_f": "🇹🇳",
     "date": "2026-06-25T23:00:00Z", "venue": "Estadio Jalisco", "city": "과달라하라", "group": "F", "korea": False},
    {"home": "일본", "away": "스웨덴", "home_f": "🇯🇵", "away_f": "🇸🇪",
     "date": "2026-06-25T23:00:00Z", "venue": "NRG Stadium", "city": "휴스턴", "group": "F", "korea": False},

    # ── Group G ────────────────────────────────────────────────────────
    {"home": "벨기에", "away": "이집트", "home_f": "🇧🇪", "away_f": "🇪🇬",
     "date": "2026-06-15T19:00:00Z", "venue": "Lumen Field", "city": "시애틀", "group": "G", "korea": False},
    {"home": "이란", "away": "뉴질랜드", "home_f": "🇮🇷", "away_f": "🇳🇿",
     "date": "2026-06-16T01:00:00Z", "venue": "Allegiant Stadium", "city": "라스베이거스", "group": "G", "korea": False},
    {"home": "벨기에", "away": "이란", "home_f": "🇧🇪", "away_f": "🇮🇷",
     "date": "2026-06-21T19:00:00Z", "venue": "AT&T Stadium", "city": "댈러스", "group": "G", "korea": False},
    {"home": "이집트", "away": "뉴질랜드", "home_f": "🇪🇬", "away_f": "🇳🇿",
     "date": "2026-06-22T01:00:00Z", "venue": "MetLife Stadium", "city": "뉴저지", "group": "G", "korea": False},
    {"home": "벨기에", "away": "뉴질랜드", "home_f": "🇧🇪", "away_f": "🇳🇿",
     "date": "2026-06-27T03:00:00Z", "venue": "SoFi Stadium", "city": "LA", "group": "G", "korea": False},
    {"home": "이집트", "away": "이란", "home_f": "🇪🇬", "away_f": "🇮🇷",
     "date": "2026-06-27T03:00:00Z", "venue": "Hard Rock Stadium", "city": "마이애미", "group": "G", "korea": False},

    # ── Group H ────────────────────────────────────────────────────────
    {"home": "스페인", "away": "카보베르데", "home_f": "🇪🇸", "away_f": "🇨🇻",
     "date": "2026-06-15T16:00:00Z", "venue": "Rose Bowl", "city": "LA", "group": "H", "korea": False},
    {"home": "사우디아라비아", "away": "우루과이", "home_f": "🇸🇦", "away_f": "🇺🇾",
     "date": "2026-06-15T22:00:00Z", "venue": "Estadio Akron", "city": "과달라하라", "group": "H", "korea": False},
    {"home": "스페인", "away": "사우디아라비아", "home_f": "🇪🇸", "away_f": "🇸🇦",
     "date": "2026-06-21T16:00:00Z", "venue": "Lincoln Financial Field", "city": "필라델피아", "group": "H", "korea": False},
    {"home": "카보베르데", "away": "우루과이", "home_f": "🇨🇻", "away_f": "🇺🇾",
     "date": "2026-06-21T22:00:00Z", "venue": "Estadio BBVA", "city": "몬테레이", "group": "H", "korea": False},
    {"home": "스페인", "away": "우루과이", "home_f": "🇪🇸", "away_f": "🇺🇾",
     "date": "2026-06-27T00:00:00Z", "venue": "Arrowhead Stadium", "city": "캔자스시티", "group": "H", "korea": False},
    {"home": "카보베르데", "away": "사우디아라비아", "home_f": "🇨🇻", "away_f": "🇸🇦",
     "date": "2026-06-27T00:00:00Z", "venue": "Gillette Stadium", "city": "보스턴", "group": "H", "korea": False},

    # ── Group I ────────────────────────────────────────────────────────
    {"home": "프랑스", "away": "세네갈", "home_f": "🇫🇷", "away_f": "🇸🇳",
     "date": "2026-06-16T19:00:00Z", "venue": "BC Place", "city": "밴쿠버", "group": "I", "korea": False},
    {"home": "이라크", "away": "노르웨이", "home_f": "🇮🇶", "away_f": "🇳🇴",
     "date": "2026-06-16T22:00:00Z", "venue": "BMO Field", "city": "토론토", "group": "I", "korea": False},
    {"home": "프랑스", "away": "이라크", "home_f": "🇫🇷", "away_f": "🇮🇶",
     "date": "2026-06-22T21:00:00Z", "venue": "NRG Stadium", "city": "휴스턴", "group": "I", "korea": False},
    {"home": "세네갈", "away": "노르웨이", "home_f": "🇸🇳", "away_f": "🇳🇴",
     "date": "2026-06-23T00:00:00Z", "venue": "Lumen Field", "city": "시애틀", "group": "I", "korea": False},
    {"home": "프랑스", "away": "노르웨이", "home_f": "🇫🇷", "away_f": "🇳🇴",
     "date": "2026-06-26T19:00:00Z", "venue": "Estadio Azteca", "city": "멕시코시티", "group": "I", "korea": False},
    {"home": "세네갈", "away": "이라크", "home_f": "🇸🇳", "away_f": "🇮🇶",
     "date": "2026-06-26T19:00:00Z", "venue": "Allegiant Stadium", "city": "라스베이거스", "group": "I", "korea": False},

    # ── Group J ────────────────────────────────────────────────────────
    {"home": "아르헨티나", "away": "알제리", "home_f": "🇦🇷", "away_f": "🇩🇿",
     "date": "2026-06-17T01:00:00Z", "venue": "Estadio Azteca", "city": "멕시코시티", "group": "J", "korea": False},
    {"home": "오스트리아", "away": "요르단", "home_f": "🇦🇹", "away_f": "🇯🇴",
     "date": "2026-06-17T04:00:00Z", "venue": "Levi's Stadium", "city": "샌프란시스코", "group": "J", "korea": False},
    {"home": "아르헨티나", "away": "오스트리아", "home_f": "🇦🇷", "away_f": "🇦🇹",
     "date": "2026-06-22T17:00:00Z", "venue": "Estadio BBVA", "city": "몬테레이", "group": "J", "korea": False},
    {"home": "알제리", "away": "요르단", "home_f": "🇩🇿", "away_f": "🇯🇴",
     "date": "2026-06-23T03:00:00Z", "venue": "Rose Bowl", "city": "LA", "group": "J", "korea": False},
    {"home": "아르헨티나", "away": "요르단", "home_f": "🇦🇷", "away_f": "🇯🇴",
     "date": "2026-06-27T23:30:00Z", "venue": "SoFi Stadium", "city": "LA", "group": "J", "korea": False},
    {"home": "알제리", "away": "오스트리아", "home_f": "🇩🇿", "away_f": "🇦🇹",
     "date": "2026-06-27T23:30:00Z", "venue": "Lincoln Financial Field", "city": "필라델피아", "group": "J", "korea": False},

    # ── Group K ────────────────────────────────────────────────────────
    {"home": "포르투갈", "away": "콩고민주공화국", "home_f": "🇵🇹", "away_f": "🇨🇩",
     "date": "2026-06-17T17:00:00Z", "venue": "BMO Field", "city": "토론토", "group": "K", "korea": False},
    {"home": "우즈베키스탄", "away": "콜롬비아", "home_f": "🇺🇿", "away_f": "🇨🇴",
     "date": "2026-06-18T02:00:00Z", "venue": "Gillette Stadium", "city": "보스턴", "group": "K", "korea": False},
    {"home": "포르투갈", "away": "우즈베키스탄", "home_f": "🇵🇹", "away_f": "🇺🇿",
     "date": "2026-06-23T17:00:00Z", "venue": "Estadio Jalisco", "city": "과달라하라", "group": "K", "korea": False},
    {"home": "콩고민주공화국", "away": "콜롬비아", "home_f": "🇨🇩", "away_f": "🇨🇴",
     "date": "2026-06-24T02:00:00Z", "venue": "AT&T Stadium", "city": "댈러스", "group": "K", "korea": False},
    {"home": "포르투갈", "away": "콜롬비아", "home_f": "🇵🇹", "away_f": "🇨🇴",
     "date": "2026-06-27T21:00:00Z", "venue": "MetLife Stadium", "city": "뉴저지", "group": "K", "korea": False},
    {"home": "콩고민주공화국", "away": "우즈베키스탄", "home_f": "🇨🇩", "away_f": "🇺🇿",
     "date": "2026-06-27T21:00:00Z", "venue": "NRG Stadium", "city": "휴스턴", "group": "K", "korea": False},

    # ── Group L ────────────────────────────────────────────────────────
    {"home": "잉글랜드", "away": "크로아티아", "home_f": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "away_f": "🇭🇷",
     "date": "2026-06-17T20:00:00Z", "venue": "Arrowhead Stadium", "city": "캔자스시티", "group": "L", "korea": False},
    {"home": "가나", "away": "파나마", "home_f": "🇬🇭", "away_f": "🇵🇦",
     "date": "2026-06-17T23:00:00Z", "venue": "BC Place", "city": "밴쿠버", "group": "L", "korea": False},
    {"home": "잉글랜드", "away": "가나", "home_f": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "away_f": "🇬🇭",
     "date": "2026-06-23T20:00:00Z", "venue": "Lumen Field", "city": "시애틀", "group": "L", "korea": False},
    {"home": "크로아티아", "away": "파나마", "home_f": "🇭🇷", "away_f": "🇵🇦",
     "date": "2026-06-23T23:00:00Z", "venue": "Estadio Azteca", "city": "멕시코시티", "group": "L", "korea": False},
    {"home": "잉글랜드", "away": "파나마", "home_f": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "away_f": "🇵🇦",
     "date": "2026-06-27T18:30:00Z", "venue": "Allegiant Stadium", "city": "라스베이거스", "group": "L", "korea": False},
    {"home": "크로아티아", "away": "가나", "home_f": "🇭🇷", "away_f": "🇬🇭",
     "date": "2026-06-27T18:30:00Z", "venue": "Estadio BBVA", "city": "몬테레이", "group": "L", "korea": False},
]

# UTC 기준 토너먼트 경기 일정 (KST = UTC+9)
KNOCKOUT_MATCHES = [
    # ── 32강 (Round of 32) : 6/28 ~ 7/3 ─────────────────────────────────────
    # 슬롯 레이블: FIFA 2026 공식 대진 규정 (Wikipedia 기준)
    {"date": "2026-06-28T00:00:00Z", "venue": "MetLife Stadium",          "city": "뉴저지",       "stage": "round_of_32", "home_slot": "A조 2위",  "away_slot": "B조 2위"},
    {"date": "2026-06-28T03:00:00Z", "venue": "AT&T Stadium",             "city": "댈러스",       "stage": "round_of_32", "home_slot": "E조 1위",  "away_slot": "3위(A/B/C/D/F조)"},
    {"date": "2026-06-29T00:00:00Z", "venue": "SoFi Stadium",             "city": "LA",           "stage": "round_of_32", "home_slot": "F조 1위",  "away_slot": "C조 2위"},
    {"date": "2026-06-29T03:00:00Z", "venue": "Hard Rock Stadium",        "city": "마이애미",     "stage": "round_of_32", "home_slot": "C조 1위",  "away_slot": "F조 2위"},
    {"date": "2026-06-30T00:00:00Z", "venue": "Levi's Stadium",           "city": "샌프란시스코", "stage": "round_of_32", "home_slot": "I조 1위",  "away_slot": "3위(C/D/F/G/H조)"},
    {"date": "2026-06-30T03:00:00Z", "venue": "Gillette Stadium",         "city": "보스턴",       "stage": "round_of_32", "home_slot": "E조 2위",  "away_slot": "I조 2위"},
    {"date": "2026-07-01T00:00:00Z", "venue": "Lincoln Financial Field",  "city": "필라델피아",   "stage": "round_of_32", "home_slot": "A조 1위",  "away_slot": "3위(C/E/F/H/I조)"},
    {"date": "2026-07-01T03:00:00Z", "venue": "Arrowhead Stadium",        "city": "캔자스시티",   "stage": "round_of_32", "home_slot": "L조 1위",  "away_slot": "3위(E/H/I/J/K조)"},
    {"date": "2026-07-01T20:00:00Z", "venue": "Rose Bowl",                "city": "LA",           "stage": "round_of_32", "home_slot": "D조 1위",  "away_slot": "3위(B/E/F/I/J조)"},
    {"date": "2026-07-01T23:00:00Z", "venue": "Allegiant Stadium",        "city": "라스베이거스", "stage": "round_of_32", "home_slot": "G조 1위",  "away_slot": "3위(A/E/H/I/J조)"},
    {"date": "2026-07-02T00:00:00Z", "venue": "BC Place",                 "city": "밴쿠버",       "stage": "round_of_32", "home_slot": "K조 2위",  "away_slot": "L조 2위"},
    {"date": "2026-07-02T03:00:00Z", "venue": "BMO Field",                "city": "토론토",       "stage": "round_of_32", "home_slot": "H조 1위",  "away_slot": "J조 2위"},
    {"date": "2026-07-02T20:00:00Z", "venue": "Estadio Azteca",           "city": "멕시코시티",   "stage": "round_of_32", "home_slot": "B조 1위",  "away_slot": "3위(E/F/G/I/J조)"},
    {"date": "2026-07-02T23:00:00Z", "venue": "Estadio BBVA",             "city": "몬테레이",     "stage": "round_of_32", "home_slot": "J조 1위",  "away_slot": "H조 2위"},
    {"date": "2026-07-03T20:00:00Z", "venue": "Estadio Akron",            "city": "과달라하라",   "stage": "round_of_32", "home_slot": "K조 1위",  "away_slot": "3위(D/E/I/J/L조)"},
    {"date": "2026-07-03T23:00:00Z", "venue": "NRG Stadium",              "city": "휴스턴",       "stage": "round_of_32", "home_slot": "D조 2위",  "away_slot": "G조 2위"},

    # ── 16강 (Round of 16) : 7/4 ~ 7/7 ──────────────────────────────────────
    {"date": "2026-07-04T17:00:00Z", "venue": "MetLife Stadium",          "city": "뉴저지",      "stage": "round_of_16"},
    {"date": "2026-07-04T21:00:00Z", "venue": "AT&T Stadium",             "city": "댈러스",      "stage": "round_of_16"},
    {"date": "2026-07-05T17:00:00Z", "venue": "SoFi Stadium",             "city": "LA",          "stage": "round_of_16"},
    {"date": "2026-07-05T21:00:00Z", "venue": "Hard Rock Stadium",        "city": "마이애미",    "stage": "round_of_16"},
    {"date": "2026-07-06T17:00:00Z", "venue": "Arrowhead Stadium",        "city": "캔자스시티",  "stage": "round_of_16"},
    {"date": "2026-07-06T21:00:00Z", "venue": "Levi's Stadium",           "city": "샌프란시스코", "stage": "round_of_16"},
    {"date": "2026-07-07T17:00:00Z", "venue": "Allegiant Stadium",        "city": "라스베이거스", "stage": "round_of_16"},
    {"date": "2026-07-07T21:00:00Z", "venue": "Rose Bowl",                "city": "LA",          "stage": "round_of_16"},

    # ── 8강 (Quarterfinals) : 7/9, 7/11 ──────────────────────────────────────
    {"date": "2026-07-09T17:00:00Z", "venue": "MetLife Stadium",          "city": "뉴저지",      "stage": "quarterfinal"},
    {"date": "2026-07-09T21:00:00Z", "venue": "SoFi Stadium",             "city": "LA",          "stage": "quarterfinal"},
    {"date": "2026-07-11T17:00:00Z", "venue": "AT&T Stadium",             "city": "댈러스",      "stage": "quarterfinal"},
    {"date": "2026-07-11T21:00:00Z", "venue": "Hard Rock Stadium",        "city": "마이애미",    "stage": "quarterfinal"},

    # ── 4강 (Semifinals) : 7/14, 7/15 ────────────────────────────────────────
    {"date": "2026-07-14T19:00:00Z", "venue": "AT&T Stadium",             "city": "댈러스",      "stage": "semifinal"},
    {"date": "2026-07-15T19:00:00Z", "venue": "Mercedes-Benz Stadium",    "city": "애틀랜타",    "stage": "semifinal"},

    # ── 3·4위전 : 7/18 ───────────────────────────────────────────────────────
    {"date": "2026-07-18T19:00:00Z", "venue": "Hard Rock Stadium",        "city": "마이애미",    "stage": "third_place"},

    # ── 결승 : 7/19 ──────────────────────────────────────────────────────────
    {"date": "2026-07-19T19:00:00Z", "venue": "MetLife Stadium",          "city": "뉴저지",      "stage": "final"},
]

STAGE_MAP = {
    "round_of_32":  MatchStage.R32,
    "round_of_16":  MatchStage.R16,
    "quarterfinal": MatchStage.QF,
    "semifinal":    MatchStage.SF,
    "third_place":  MatchStage.THIRD,
    "final":        MatchStage.FINAL,
}


def seed():
    Base.metadata.create_all(bind=engine)

    # 기존 DB에 posts.view_count 컬럼이 없으면 추가 (조회수 기능 마이그레이션)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0"))
            conn.commit()
        except Exception:
            conn.rollback()

    db = SessionLocal()

    # 조별예선 삽입
    if db.query(Match).filter(Match.stage == MatchStage.GROUP).count() == 0:
        for m in GROUP_MATCHES:
            db.add(Match(
                home_team=m["home"],
                away_team=m["away"],
                home_flag=m["home_f"],
                away_flag=m["away_f"],
                match_date=to_kst_naive(m["date"]),
                venue=m["venue"],
                city=m["city"],
                stage=MatchStage.GROUP,
                group_name=m["group"],
                status=MatchStatus.UPCOMING,
                is_korea_match=m["korea"],
            ))
        print(f"조별예선 {len(GROUP_MATCHES)}경기 삽입")

    # 토너먼트(32강~결승) 삽입
    if db.query(Match).filter(Match.stage != MatchStage.GROUP).count() == 0:
        for m in KNOCKOUT_MATCHES:
            db.add(Match(
                home_team="미정",
                away_team="미정",
                home_flag="❓",
                away_flag="❓",
                match_date=to_kst_naive(m["date"]),
                venue=m["venue"],
                city=m["city"],
                stage=STAGE_MAP[m["stage"]],
                group_name=None,
                status=MatchStatus.UPCOMING,
                is_korea_match=False,
                home_slot=m.get("home_slot"),
                away_slot=m.get("away_slot"),
            ))
        print(f"토너먼트 {len(KNOCKOUT_MATCHES)}경기 삽입")

    # 관리자 계정 생성
    admin_email = os.getenv("ADMIN_EMAIL", "admin@worldcup2026.com")
    if not db.query(User).filter(User.email == admin_email).first():
        admin = User(
            email=admin_email,
            nickname="관리자",
            hashed_password=hash_password("admin1234!"),
            points=0,
            is_admin=True,
        )
        db.add(admin)
        print(f"관리자 계정 생성: {admin_email} / admin1234!")

    db.commit()
    db.close()
    print("시드 완료")


if __name__ == "__main__":
    seed()
