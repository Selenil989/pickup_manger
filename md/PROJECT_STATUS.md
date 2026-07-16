# PROJECT_STATUS.md

## 프로젝트명

AI Gacha Investment Analyzer

---

## 프로젝트 목표

**핵심 질문**

"이 캐릭터가 강한가?"가 아니라
"내 계정에 지금 돈을 써도 후회하지 않을 가능성이 높은가?"

**MVP 목표**

ZZZ 1개 게임 기준 신규 픽업 투자 의사결정 지원
명전 추천 / 명함 추천 / 전무 보류 / 2주 대기 / 스킵 판단 출력

---

## 현재 상태

### 완료

**Stage 1: 데이터 파일 생성 완료**
- data/config.json (가중치, 지원게임 목록)
- ZZZ characters.json 55개 / meta.json 7개 / banner.json
- HSR / WuWa / Endfield characters.json(2개) · meta.json(2개) · banner.json 각각

**Stage 2: evaluationEngine.js 구현 완료**
- 7개 함수 (공개 1개: evaluate, 내부 6개)
- accountGrowth MVP 알고리즘 (역할공백 + 메타등급 + 시너지 + 파티기여 + 대체불가능성)
- finalScore 계산식: metaScore×0.25 + accountGrowth×0.30 + futureScore×0.25 + (10-replacementScore)×0.10 + itemAvg×0.10
- itemSubWeights: characterValue 0.50 / weaponValue 0.35 / breakthroughValue 0.15
- basePerformance → meta.metaScore 교체 완료 (commit 6407a82)

**Stage 3: app.js 구현 완료**
- 단일 appState 객체 상태 관리
- localStorage 로스터 저장 (pickup_manager_roster_{gameId}) + roster.json 병행 저장
- renderResults() 15개 블록 렌더링 (아래 목록 참조)
- ZZZ 카드 그리드 renderCardGrid()
- Character Detail Modal openCharacterDetail()
- Character Manager openCharacterEdit() / openCharacterCreate()

**Stage 4: index.html 구현 완료**
- 6개 주요 DOM ID: gameSelect / characterSelect / analyzeBtn / rosterCount / rosterList / resultsPanel
- charDetailModal / charEditModal: 동적 렌더링 대상
- 헤더 + 좌우 2패널 레이아웃

**Stage 5: style.css 디자인 완료**
- 다크 테마, CSS 변수 24개 섹션
- 카드 그리드 / 점수 게이지 / 배지 / 액션 블록 / 요약 섹션 / 최종 판단

**ZZZ DB 확장 완료**
- characters.json: 5개 → 55개 (S랭크 35 / A랭크 13 / placeholder 7)
- image 필드 (한글 webp 파일명), specialElement 필드 (MIYABI / YIXUAN / SHUNGUANG)
- nameKo 필드 추가 (한글 표시 전용)

**ZZZ Character Card UI 완료**
- 55명 인게임 로스터 느낌 세로형 카드 그리드
- rarity / role / element 아이콘 표시
- 보유 캐릭터 owned 상태 시각화 (accent 테두리)
- 분석 실행 시 분석 결과로 전환 / 해제 시 카드 그리드 복귀

**Character Detail Modal 완료 (Account Manager)**
- 카드 클릭 → 보유여부 / 명수 / 전무 / 레벨업 / 메모 입력
- 보유 상태에 따라 입력 필드 활성/비활성 자동 처리
- 저장 시 localStorage 반영 + 즉시 재분석

**Character Manager 완료 (Edit / Create)**
- 캐릭터 수정 모달: name / nameKo / image / rarity / role / element / releaseDate 편집
- 캐릭터 추가 모달: id 중복 검사 + 실시간 유효성 검사
- 편집 내용은 _charEdits / _charAdds에만 반영 (data JSON 직접 수정 없음)
- Preview 다운로드 버튼으로 수정본 characters.json 출력

**Result UI 통일 완료 (commit 6407a82)**
- scoreBar(): `.score-display` (X.X / 10) + `.score-bar-track` 게이지
- scoreBadge(): HIGH / MEDIUM / LOW 배지 (≥9.0 / ≥6.0 / 미만)
- verdict-inline 배지: 미보유=점수기반(필수/추천/선택/비추천) / 보유=보유중(Accent 보라)
- confidence-note: 동적 색상 (high=초록 / mid=주황 / low=빨강), 13px bold
- 명함/돌파 분할 카드 (rec-split 2열)

**MVP 투자 의사결정 기능 완료 (미커밋)**
- 추천 행동 블록: 명전 추천 / 명함 추천 / 명함만 확보 후 전무 보류 / 2주 대기 / 스킵
- 불확실성 블록: uncertainty.score 게이지 + reasons 목록
- FOMO 위험도 블록: fomoRisk.score 게이지 + reason + ≥7점 경고
- 공식 자료 요약 블록: sourceSummary / skillSummary / synergySummary (공식 출처 전용)
- 커뮤니티 요약 블록: commonOpinion / positive / negative / concern
- 최종 판단 문장 블록: 캐릭터명 + 행동 + 계정기여/대체성/보유여부/FOMO 자동 조합
- meta.json 7개 캐릭터에 4개 신규 필드 추가 (officialSummary / communitySummary / uncertainty / fomoRisk)

**Generator Tools 완료**
- generator.html / generator.js: 이미지 폴더 스캔 → characters.json 초안 생성
- meta-generator.html / meta-generator.js: 수동 티어 입력 → meta.json 초안 생성

### 진행 중

없음 (미커밋 변경사항 존재 — MVP 투자 의사결정 기능)

### 보류

GPT API 연동 (Node.js 서버 + /api/meta-update 엔드포인트)

---

## 현재 renderResults() 블록 목록 (15개)

| 블록 | 내용 | 비고 |
|---|---|---|
| 1 | 최종 추천도 | finalScore + verdict-inline 배지 |
| 2 | 추천 행동 | 명전/명함/전무보류/2주대기/스킵 |
| 3 | 현재 메타 성능 | metaScore + 신뢰도 |
| 4 | 계정 체급 상승량 | accountGrowth |
| 5 | 미래 메타 가치 | futureScore |
| 6 | 대체 가능성 | replacementScore (역점수 개념) |
| 7 | 명함 / 돌파 추천도 | 2열 분할 카드 |
| 8 | 전무 가치 | weaponRecommendation |
| 9 | 향후 시너지 캐릭터 | futureLinks |
| 10 | 뽑아야 할 이유 | pullReasons |
| 11 | 뽑지 말아야 할 이유 | skipReasons |
| 12 | 불확실성 | uncertainty.score + reasons |
| 13 | FOMO 위험도 | fomoRisk.score + ≥7 경고 |
| 14 | 공식 자료 요약 | officialSummary (공식 출처 전용) |
| 15 | 커뮤니티 요약 | communitySummary |
| 16 | 최종 판단 문장 | 자동 조합 텍스트 |

---

## 최근 변경 사항

**2026-06-22 userRoster 파일 저장 구조 완료**
- data/user/ 폴더 신설 (roster.json / settings.json / history.json)
- localStorage 캐시 유지 + roster.json 병행 저장 (localStorage는 캐시로 전환)
- 서버 미실행 시 localStorage fallback 유지
- /api/save-roster 저장 테스트 PASS
- .gitignore 개인 데이터 보호 완료 (data/user/ 3개 파일)
- settings.json / history.json: 파일만 생성, 앱 연동 미구현
- 브라우저 migration 실확인은 사용자 확인 항목으로 남김

**2026-06-21 MVP 투자 의사결정 기능 추가 (미커밋)**
- app.js: 추천 행동 로직 + 5개 신규 블록 + 최종 판단 문장 추가
- meta.json: officialSummary / communitySummary / uncertainty / fomoRisk 필드 전체 7개 캐릭터에 추가
- meta.json: officialSummary.sourceSummary에서 커뮤니티 출처(아카라이브/실전데이터) 분리 (miyabi/astra_yao/caesar/trigger/yanagi 5개 수정)
- style.css: 액션 블록 / 요약 섹션 / 최종 판단 CSS 추가

**2026-06-21 Result UI 통일 완료 (commit 6407a82)**
- evaluationEngine.js: basePerformance → meta.metaScore
- scoreBar / scoreBadge 공통 함수 추가
- 명함/돌파 분할 카드, confidence-note 동적 색상
- verdict-inline 배지 (보유중 Accent / 미보유 점수기반)

**2026-06-21 Character Manager 완료 (commit 58380d2)**
- openCharacterEdit() / openCharacterCreate() 추가
- _charEdits / _charAdds 인메모리 관리
- Preview 다운로드 기능

**2026-06-21 Character Detail Modal 완료 (commit 112edd8)**
- openCharacterDetail() / renderCharacterDetailModal() 추가
- 보유 정보 입력 (명수/전무/메모) → localStorage 반영 + 즉시 재분석

**2026-06-21 nameKo 필드 추가 (commit f1ce2f7)**
- ZZZ characters.json 전체 한글 이름 nameKo 필드 추가
- 드롭다운/카드/로스터에 한글 이름 표시

---

## 주요 시스템 구조

```
데이터 계층:  data/config.json + data/games/{gameId}/*.json
유저 데이터:  data/user/roster.json (기준) + localStorage (캐시)
              data/user/settings.json / history.json (파일만, 미연동)
평가 엔진:    evaluationEngine.js (순수 함수, DOM 접근 없음)
앱 레이어:    app.js (상태관리 / fetch / localStorage / 렌더링 / 카드그리드 / 캐릭터 모달)
UI 셸:        index.html (레이아웃 구조)
스타일:       style.css (다크 테마, CSS 변수 기반)
Node 서버:    server.js (/api/meta-update GPT 연동 / /api/save-roster 파일 저장)
도구:         generator.html + generator.js (characters.json 초안 생성)
              meta-generator.html + meta-generator.js (meta.json 초안 생성)
```

**평가 공식**

```
finalScore = metaScore×0.25 + accountGrowth×0.30 + futureScore×0.25
           + (10-replacementScore)×0.10 + itemAverageScore×0.10

itemAverageScore = characterScore×0.50 + weaponScore×0.35 + breakthroughScore×0.15
```

**추천 행동 판단 규칙**

```
finalScore < 5.5          → 스킵
uncertainty >= 7           → 2주 대기
finalScore >= 8.5 + weapon조건 + replacementScore <= 4  → 명전 추천
finalScore >= 7.0 + weaponScore >= 7 + uncertainty >= 5  → 명함만 + 전무 보류
finalScore >= 7.0 + weapon조건                            → 명전 추천
나머지                                                    → 명함 추천
```

---

## 현재 문제점

- 알려진 버그 없음
- MVP 투자 의사결정 기능 미커밋 상태
- file:// 직접 실행 미지원: HTTP 서버 필요
  → 실행: npx http-server . -p 8080

---

## 주요 경로

```
프로젝트 경로: c:\Users\dbdjv\Desktop\PickupManger\
실행 방법:     npx http-server . -p 8080 → http://localhost:8080
```

---

## 문서 우선순위

```
PROJECT_STATUS.md
      ↓
AI_ANALYSIS_QUALITY.md
      ↓
Gpt_Chat_History.md
```

**1순위 — PROJECT_STATUS.md (이 문서)**

- 현재 구현 상태
- 현재 폴더 구조
- 현재 파일 역할
- 현재 진행 Phase

항상 최신 사실(Fact)의 기준입니다.

**2순위 — AI_ANALYSIS_QUALITY.md**

- 투자 판단 규칙
- 분석 품질 기준
- 메타 생성 기준

프로젝트가 따라야 할 Rule입니다.

**3순위 — Gpt_Chat_History.md**

- 프로젝트 시작부터 현재까지의 GPT 대화
- 투자 판단 사고 과정
- 품질 기준 추출용 참고 문서

직접 구현 기준이 아니라 판단 규칙과 품질 개선을 위한 History입니다.

---

## 프로젝트 전용 규칙

- 기술 스택: HTML / CSS / JavaScript (기본)
- GPT API 연동 시 Node.js 서버 허용 (브라우저에서 API KEY 직접 호출 금지)
- 평가 엔진 7개 지표 절대 제거/통합 금지
  (ownPerformance, accountGrowth, futureMetaValue, replaceability,
   characterValue, breakthroughValue, weaponValue)
- meta.json 자동 수정 금지 (preview 방식으로만 업데이트)
- officialSummary = 공식 홈/공지/PV/방송/스킬 설명만
- communitySummary = 아카라이브/디시/Reddit/NGA/실전 후기
- Game8 / Prydwen / 티어표 점수 직접 반영 금지
- 랭킹/위키/Character Manager 신규 구현 금지

---

## 다음 작업 우선순위

1. ZZZ meta.json 데이터 구축 (현재 7개 / 55개 중)
2. MVP 투자 의사결정 기능 커밋
3. HSR / WuWa / Endfield 메타 데이터 충실화
4. GPT API 연동 고도화 (/api/meta-update 품질 개선)

---

## meta.json 현황

| 게임 | 등록 수 | 전체 수 | 신규 필드 |
|---|---|---|---|
| ZZZ | 7개 | 55개 | officialSummary / communitySummary / uncertainty / fomoRisk 완비 |
| HSR | 2개 | 2개 | 신규 필드 미등록 |
| WuWa | 2개 | 2개 | 신규 필드 미등록 |
| Endfield | 2개 | 2개 | 신규 필드 미등록 |

ZZZ 등록 캐릭터: velina / remiel / miyabi / astra_yao / caesar / trigger / yanagi

---

## PM 작업 규칙

1. 새 기능보다 투자 판단 품질 개선을 우선한다.

2. 기능 추가 전 기존 문서 3종(PROJECT_STATUS.md / AI_ANALYSIS_QUALITY.md / Gpt_Chat_History.md)을 먼저 확인한다.

3. Gpt_Chat_History.md는 품질 기준 추출용으로만 사용한다.

4. AI_ANALYSIS_QUALITY.md의 규칙을 투자 판단의 기준으로 사용한다.

5. PROJECT_STATUS.md를 항상 최신 구현 상태로 유지한다.

---

**버전: MVP v2.0 | 상태: ZZZ 투자 의사결정 MVP 완료 / GPT API 연동 예정**
