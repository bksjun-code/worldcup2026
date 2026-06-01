# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

2026 FIFA 북중미 월드컵 팬 사이트. 전체 대진표 조회, 참가국 소개, 전체 경기 파리무추엘 베팅 기능을 제공한다.

- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: React 18 + Vite + Tailwind CSS (`frontend/`)

---

## Commands

### Backend
```bash
cd backend

# 개발 서버 실행 (포트 8000)
uvicorn main:app --reload --port 8000

# 의존성 설치
pip install -r requirements.txt

# 시드 데이터 단독 실행 (서버 시작 시 자동 실행됨)
python seed_data.py
```

### Frontend
```bash
cd frontend

# 개발 서버 실행 (포트 5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview

# 의존성 설치
npm install
```

---

## Architecture

### Backend 구조

`main.py`에서 앱을 초기화하고 `seed()`를 호출해 DB 테이블 생성 및 초기 경기 데이터·관리자 계정을 삽입한다 (이미 데이터가 있으면 스킵).

**라우터 분리:**
- `routers/auth.py` — 회원가입·로그인·현재 유저 조회 (`/api/auth`)
- `routers/matches.py` — 경기 조회 (전체·한국·조별) (`/api/matches`)
- `routers/bets.py` — 베팅 생성·조회·배당률·리더보드 (`/api/bets`)
- `routers/admin.py` — 결과 입력·정산·상태 변경·통계 (`/api/admin`)

**인증 흐름:**
`auth.py`에서 `bcrypt`로 비밀번호 해싱(passlib 사용 안 함 — 버전 충돌로 직접 bcrypt 호출), `python-jose`로 JWT 발급. `get_current_user` / `get_current_admin` Depends로 보호.

**베팅 정산 (파리무추엘):**
`routers/admin.py`의 `_settle_bets()`에서 처리. 경기 결과 입력 시 전체 경기에 대해 자동 실행. 총 베팅 풀에서 수수료 5% 차감 후 승리 측 베터에게 배분.

**DB 모델 관계:**
`User` —(1:N)→ `Bet` —(N:1)→ `Match`

**환경변수** (`backend/.env`):
- `SECRET_KEY` — JWT 서명 키
- `DATABASE_URL` — 기본값 `sqlite:///./worldcup.db`
- `ADMIN_EMAIL` — 기본값 `admin@worldcup2026.com` / 초기 비밀번호 `admin1234!`
- `INITIAL_POINTS` — 신규 회원 지급 포인트, 기본값 `100000`

### Frontend 구조

Vite base URL이 `/worldcup2026/`으로 설정되어 있어 GitHub Pages 배포를 가정한다. 개발 서버의 `/api` 경로는 `http://localhost:8000`으로 프록시된다.

**상태 관리:** `src/store/useStore.js` — Zustand + persist 미들웨어로 `token`·`user`를 localStorage에 저장. `initAuth()`는 앱 최초 마운트 시(`App.jsx useEffect`) 저장된 토큰을 axios 헤더에 복원한다.

**API 클라이언트:** `src/api.js` — axios 인스턴스. 401 응답 시 localStorage 초기화 후 홈으로 리다이렉트.

**페이지 구성:**
- `LandingPage` — 개막 카운트다운(GSAP), 파티클 캔버스, 한국 조 일정 하이라이트
- `SchedulePage` — 전체 경기를 A~L조 탭으로 조회, 백엔드 `/api/matches`에서 데이터 fetch
- `CountriesPage` — 48개 참가국 카드 + 클릭 시 모달로 FIFA 랭킹·선수·감독·설명 표시 (정적 데이터)
- `BettingPage` — 전체 경기 베팅 폼, 파리무추엘 배당률 바 시각화, 리더보드
- `AdminPage` — 관리자 전용(비관리자 접근 시 `/`로 리다이렉트), 경기 결과 입력·상태 변경
- `AuthPage` — 로그인/회원가입 탭 전환 폼

**디자인 시스템 (`tailwind.config.js`):**
- 색상: `wc-gold(#C8A84B)`, `wc-red(#8B1E2F)`, `wc-blue(#1B3D6E)`, `wc-dark(#07090F)`, `wc-card(#0C1220)`
- 폰트: `'Apple SD Gothic Neo'`, `'Malgun Gothic'`, `'맑은 고딕'` 순으로 적용 (시스템 폰트 스택). `font-sans`·`font-bebas`·`font-noto` 모두 동일 스택 사용.
- 공통 클래스: `.wc-card`, `.btn-gold`, `.glow-gold`, `.glow-box-gold` (`src/index.css` 정의)
- 테마: `data-theme` 속성으로 9가지 테마 전환 (dark/ocean/forest/purple/sunset/crimson/slate/rose/gold), Zustand persist로 저장
- 국기 이미지: `frontend/public/flags/` 에 43개국 PNG 저장, `src/utils/flags.js`에서 팀명→ISO 매핑 후 `import.meta.env.BASE_URL` 기반 경로 반환
