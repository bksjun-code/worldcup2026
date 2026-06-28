"""
32강 실제 대진표 업데이트 스크립트
이미지 기준 실제 확정된 32강 매치업으로 DB를 갱신한다.
실행: python update_r32_matches.py
"""
from datetime import datetime
from database import SessionLocal
from models import Match, MatchStage, MatchStatus

# KST 시간 그대로 저장 (DB는 KST naive datetime 사용)
R32_MATCHES = [
    # ── 좌측 브래킷 (Match 73~80) ─────────────────────────────────────────
    {
        "home": "남아프리카공화국", "away": "캐나다",
        "home_f": "🇿🇦", "away_f": "🇨🇦",
        "date": datetime(2026, 6, 29, 4, 0),
        "venue": "SoFi Stadium", "city": "LA",
    },
    {
        "home": "네덜란드", "away": "모로코",
        "home_f": "🇳🇱", "away_f": "🇲🇦",
        "date": datetime(2026, 6, 30, 9, 0),
        "venue": "Estadio BBVA", "city": "몬테레이",
    },
    {
        "home": "독일", "away": "파라과이",
        "home_f": "🇩🇪", "away_f": "🇵🇾",
        "date": datetime(2026, 6, 30, 2, 30),
        "venue": "Gillette Stadium", "city": "보스턴",
    },
    {
        "home": "프랑스", "away": "스웨덴",
        "home_f": "🇫🇷", "away_f": "🇸🇪",
        "date": datetime(2026, 7, 1, 3, 0),
        "venue": "MetLife Stadium", "city": "뉴저지",
    },
    {
        "home": "포르투갈", "away": "크로아티아",
        "home_f": "🇵🇹", "away_f": "🇭🇷",
        "date": datetime(2026, 7, 3, 5, 0),
        "venue": "BMO Field", "city": "토론토",
    },
    {
        "home": "스페인", "away": "오스트리아",
        "home_f": "🇪🇸", "away_f": "🇦🇹",
        "date": datetime(2026, 7, 3, 4, 0),
        "venue": "Rose Bowl", "city": "LA",
    },
    {
        "home": "미국", "away": "보스니아·헤르체고비나",
        "home_f": "🇺🇸", "away_f": "🇧🇦",
        "date": datetime(2026, 7, 2, 9, 0),
        "venue": "Levi's Stadium", "city": "샌프란시스코",
    },
    {
        "home": "벨기에", "away": "세네갈",
        "home_f": "🇧🇪", "away_f": "🇸🇳",
        "date": datetime(2026, 7, 2, 5, 0),
        "venue": "Lumen Field", "city": "시애틀",
    },

    # ── 우측 브래킷 (Match 81~88) ─────────────────────────────────────────
    {
        "home": "브라질", "away": "일본",
        "home_f": "🇧🇷", "away_f": "🇯🇵",
        "date": datetime(2026, 6, 30, 0, 0),
        "venue": "NRG Stadium", "city": "휴스턴",
    },
    {
        "home": "코트디부아르", "away": "노르웨이",
        "home_f": "🇨🇮", "away_f": "🇳🇴",
        "date": datetime(2026, 7, 1, 0, 0),
        "venue": "AT&T Stadium", "city": "댈러스",
    },
    {
        "home": "멕시코", "away": "에콰도르",
        "home_f": "🇲🇽", "away_f": "🇪🇨",
        "date": datetime(2026, 7, 1, 9, 0),
        "venue": "Estadio Azteca", "city": "멕시코시티",
    },
    {
        "home": "잉글랜드", "away": "콩고민주공화국",
        "home_f": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "away_f": "🇨🇩",
        "date": datetime(2026, 7, 1, 22, 0),
        "venue": "Mercedes-Benz Stadium", "city": "애틀란타",
    },
    {
        "home": "아르헨티나", "away": "카보베르데",
        "home_f": "🇦🇷", "away_f": "🇨🇻",
        "date": datetime(2026, 7, 4, 4, 0),
        "venue": "Hard Rock Stadium", "city": "마이애미",
    },
    {
        "home": "호주", "away": "이집트",
        "home_f": "🇦🇺", "away_f": "🇪🇬",
        "date": datetime(2026, 7, 4, 0, 0),
        "venue": "Mercedes-Benz Stadium", "city": "애틀란타",
    },
    {
        "home": "스위스", "away": "알제리",
        "home_f": "🇨🇭", "away_f": "🇩🇿",
        "date": datetime(2026, 7, 3, 12, 0),
        "venue": "BC Place", "city": "밴쿠버",
    },
    {
        "home": "콜롬비아", "away": "가나",
        "home_f": "🇨🇴", "away_f": "🇬🇭",
        "date": datetime(2026, 7, 4, 8, 30),
        "venue": "Arrowhead Stadium", "city": "캔자스시티",
    },
]


def main():
    db = SessionLocal()
    try:
        existing = db.query(Match).filter(Match.stage == MatchStage.R32).all()
        print(f"기존 32강 경기 {len(existing)}건 삭제")
        for m in existing:
            db.delete(m)
        db.flush()

        for m in R32_MATCHES:
            db.add(Match(
                home_team=m["home"],
                away_team=m["away"],
                home_flag=m["home_f"],
                away_flag=m["away_f"],
                match_date=m["date"],
                venue=m["venue"],
                city=m["city"],
                stage=MatchStage.R32,
                group_name=None,
                status=MatchStatus.UPCOMING,
                is_korea_match=False,
                home_slot=None,
                away_slot=None,
            ))

        db.commit()
        print(f"32강 경기 {len(R32_MATCHES)}건 삽입 완료")
    except Exception as e:
        db.rollback()
        print(f"오류: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
