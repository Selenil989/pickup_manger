# PROJECT_STATUS.md

## 프로젝트명

AI Gacha Investment Analyzer (MVP 프로토타입)

---

## 프로젝트 목표

최종 목표

신규 픽업 캐릭터의 투자 가치를 분석하는 AI 가챠 투자 분석기
사용자 보유 캐릭터 기반으로 "이 캐릭터를 뽑아야 하는가?"를 판단
파티 추천은 보조 기능이며, 핵심 목표는 신규 픽업 투자 가치 분석

MVP 목표

로컬 단독 실행 (HTML/CSS/JS only)
7개 평가 지표 기반 최종 추천도 계산
ZZZ / HSR / WuWa / Endfield 4개 게임 지원
게임별 보유 캐릭터 localStorage 저장

---

## 현재 상태

### 완료

Stage 1: 데이터 파일 생성 완료
  - data/config.json (가중치, 지원게임 목록)
  - data/games/zzz/ characters.json(5개) · meta.json(3개) · banner.json
  - data/games/hsr/ characters.json(2개) · meta.json(2개) · banner.json
  - data/games/wuwa/ characters.json(2개) · meta.json(2개) · banner.json
  - data/games/endfield/ characters.json(2개) · meta.json(2개) · banner.json

Stage 2: evaluationEngine.js 구현 완료
  - 7개 함수 (공개 1개: evaluate, 내부 6개)
  - accountGrowth MVP 알고리즘 (역할공백 + 현재시너지 + 미래시너지)
  - itemSubWeights: characterValue 0.50 / weaponValue 0.35 / breakthroughValue 0.15
  - meta null 안전 처리, 전 점수 0–10 clamp

Stage 3: app.js 구현 완료
  - 단일 appState 객체 상태 관리
  - localStorage 로스터 저장 (pickup_manager_roster_{gameId})
  - 19개 함수 (공개 3개, 내부 16개)
  - 14개 분석 결과 블록 렌더링
  - fetch 에러 처리 및 renderError() 연동

Stage 4: index.html 구현 완료
  - 6개 DOM ID: gameSelect / characterSelect / analyzeBtn / rosterCount / rosterList / resultsPanel
  - 헤더 + 좌우 2패널 레이아웃 구조
  - aria-label 접근성 속성 적용

Stage 5: style.css 기본 디자인 적용 완료
  - 다크 테마, CSS 변수 20+개, 카드 레이아웃, 점수 게이지
  - 픽업 상태별 색상 분리 (must/recommended/optional/skip)

Stage 6: 최종 동작 테스트 완료 (10/10 PASS)
  - Playwright Chromium 자동화 테스트 전항목 통과
  - finalScore 8.4 검증 완료
  - localStorage 로스터 유지 확인
  - fetch 에러 처리 확인

Generator Tool: 캐릭터 데이터 생성기 구현 완료
  - generator.html / generator.js 신규 생성 (기존 파일 무수정)
  - images 폴더 스캔 → characters.json 초안 자동 생성
  - Rename 매핑 목록 / PowerShell Rename-Item 스크립트 생성
  - 한글 파일명 지원, id 중복 검사 (기존 characters.json 비교)

### 진행 중

없음

### 보류

없음

---

## 최근 변경 사항

2026-06-19 Generator Tool 완료: generator.html / generator.js 생성
  - 이미지 폴더 스캔 기반 characters.json 초안 생성 도구
  - 한글 파일명 → id 매핑, PowerShell rename 스크립트 생성
  - stage6_test.mjs 삭제 (테스트 임시 파일)

2026-06-19 Stage 6 완료: 최종 동작 테스트 10/10 PASS
  - Playwright 자동화 테스트 전항목 통과
  - index.html #rosterList class="roster-list" 추가 (스크롤 수정)
  - app.js onRosterToggle() 데드코드 제거

2026-06-19 Stage 5 완료: style.css 생성
  - 다크 테마 디자인 시스템 구현

2026-06-19 Stage 4 완료: index.html 생성
  - 6개 DOM ID 확정 및 레이아웃 구조 구현
  - aria-label, noscript 폴백 추가

2026-06-19 Stage 3 완료: app.js 생성
  - appState 단일 객체 상태 관리 구조 확정
  - toggleRosterCharacter null 가드 추가

2026-06-19 Stage 2 완료: evaluationEngine.js 생성
  - banner.currentBanners null 가드 추가
  - itemAverageScore 이중 계산 제거

2026-06-19 Stage 1 완료: 데이터 파일 13개 생성

---

## 현재 문제점

- 알려진 버그 없음 (Stage 6 테스트 통과)
- file:// 직접 실행 미지원: fetch() API 제한으로 HTTP 서버 또는 Electron 환경 필요
  → 실행: npx http-server . -p 8080

---

## 주요 시스템 구조

데이터 계층: data/config.json + data/games/{gameId}/*.json (정적 JSON)
평가 엔진:   evaluationEngine.js (순수 함수, DOM 접근 없음)
앱 레이어:   app.js (상태 관리, fetch, localStorage, 렌더링)
UI 셸:       index.html (레이아웃 구조)
스타일:      style.css (다크 테마, CSS 변수 기반)

평가 공식:
finalScore = basePerformance×0.25 + accountGrowth×0.30 + futureScore×0.25
           + (10-replacementScore)×0.10 + itemAverageScore×0.10

itemAverageScore = characterScore×0.50 + weaponScore×0.35 + breakthroughScore×0.15

---

## 중요 경로

프로젝트 경로: c:\Users\dbdjv\Desktop\PickupManger\
구현 플랜:     docs/superpowers/plans/2026-06-18-ai-gacha-investment-analyzer.md
GitHub 미설정 (MVP 단계)

---

## 프로젝트 전용 규칙

- 기술 스택: HTML / CSS / JavaScript 외 사용 금지 (AI 검색, 외부 API, DB, 백엔드 불가)
- 평가 엔진 7개 지표 절대 제거/통합 금지
  (ownPerformance, accountGrowth, futureMetaValue, replaceability,
   characterValue, breakthroughValue, weaponValue)
- meta.json은 향후 AI 생성 데이터 교체 가능 구조 유지 (version 필드 보존)
- accountGrowthMethod: mvp → synergy 교체 가능 구조 유지
- 사용자 입력 기반 XSS 가능성 없음 (모든 데이터는 로컬 JSON)

---

## 다음 작업 우선순위

1. (선택) AI 메타 분석 시스템 연동 (웹 커뮤니티 → meta.json 자동 생성)
2. (선택) synergy 방식 accountGrowth 구현
3. (선택) ZZZ lycaon, jane 메타 데이터 등록
4. (선택) HSR / WuWa / Endfield 메타 데이터 충실화

---

## 참고 파일

CLAUDE.md           프로젝트 규칙 및 협업 방식
data/config.json    평가 가중치 및 지원 게임 목록
evaluationEngine.js 평가 엔진 (공개 함수: evaluate())
generator.html      캐릭터 데이터 생성기 UI
generator.js        캐릭터 데이터 생성기 로직
docs/superpowers/plans/2026-06-18-ai-gacha-investment-analyzer.md  구현 플랜

---

## 비고

실행 환경
- HTTP 서버 또는 Electron 환경에서만 동작 (fetch() API 제한)
- file:// 직접 실행 미지원
- 실행 방법: npx http-server . -p 8080 → http://localhost:8080

메타 데이터 현황
- 현재 포함된 meta.json은 MVP 검증용 샘플 데이터
- 최종 목표: AI가 웹 커뮤니티 데이터를 분석하여 meta.json을 자동 생성하는 구조
- ZZZ lycaon, jane은 샘플 미등록 (intentional)

다음 마일스톤 (MVP 이후)
- AI 메타 분석 시스템 연동 (웹 커뮤니티 → meta.json 자동 생성)
- synergy 방식 accountGrowth 구현
- HSR / WuWa / Endfield 메타 데이터 충실화


**버전: MVP v1.0 | 상태: 완료**
