# 혼식당 — Decisions & Blockers Log (WP-00)

- 기준 명세: `HONSIKDANG_MASTER_PLAN.md` v0.1 (2026-10-15, status: Proposed)
- 작성일: 2026-10-15
- 작성 단계: WP-00 Discovery
- 상태 표기: **CONFIRMED**(사용자 확정) / **ASSUMED**(가정, 되돌리기 쉬운 최소안) / **OPEN**(사용자 결정 필요) / **UNVERIFIED**(공식 근거 미확보)

---

## 1. 저장소 감사 결과 (2026-10-15)

| 항목 | 결과 |
|---|---|
| 기존 코드/마이그레이션/테스트 | 없음. 빈 작업 폴더에서 시작 (그린필드) |
| git 저장소 | 아님 |
| 로컬 툴체인 | `node`, `npm`, `pnpm`, `git`, `docker`, `supabase`, `deno`, `gh` 모두 **미설치** (PATH 및 기본 설치 경로 확인). `winget`, `wsl`은 존재 |
| 작업 위치 | 앱이 만든 임시 세션 폴더. 세션 삭제 시 함께 삭제됨 → WP-01 전 영구 폴더로 이동 필요 |

**결론:** 덮어쓸 기존 작업 없음. WP-01(스캐폴딩)은 툴체인 설치와 영구 프로젝트 폴더 확보 없이는 실행 불가.

---

## 2. 확정 사항 (CONFIRMED)

| ID | 내용 | 근거 |
|---|---|---|
| C-01 | `HONSIKDANG_MASTER_PLAN.md`를 프로젝트 기준 명세로 사용 | 사용자 지시 (2026-10-15) |
| C-02 | WP-00부터 순차 진행, 단계별 테스트·검증 후 다음 단계 | 사용자 지시 |
| C-03 | 구현 전 작업 계획 제시, 가정/확정 구분 | 사용자 지시 |
| C-04 | 목표 스택: Next.js + TypeScript + Tailwind, Supabase(Auth/Postgres/PostGIS/pgvector/Storage/Edge Functions), Naver Maps 렌더링 | 명세 §6 + C-01 (명세 자체는 "Proposed"이나 사용자가 기준으로 지정) |
| C-05 | 프로덕션 마이그레이션·배포·외부 서비스 생성·지출은 사용자 승인 필요 | 명세 §0, §11 |
| C-06 | **Web/PWA 우선** (D-02 확정, A-01 승격) | 사용자 지시 (2026-10-15) |
| C-07 | 툴체인 설치 승인: Node 24 LTS, Git, Docker Desktop (winget) (D-10 해소) | 사용자 지시 (2026-10-15) |
| C-08 | 프로젝트 위치: `C:\Users\ASUS\honsikdang`, GitHub `Yoy0z-maps/honsikdang`(공개) (D-09 해소) | 사용자 선택 (2026-10-15) |
| C-09 | **Q1** 장소와 리뷰 모두 승인 후 공개 (D-04 해소, A-08 승격) | 사용자 확정 (2026-10-15) |
| C-10 | **Q2** 사용자당 식당당 리뷰 1개, 재방문은 기존 리뷰 수정 | 사용자 확정 (2026-10-15) |
| C-11 | **Q3** 작성자 삭제는 즉시 완전 삭제, 관리자 조치는 `removed` 상태 + 감사 기록 | 사용자 확정 (2026-10-15) |
| C-12 | **Q4** 프로필은 본인만 조회. 리뷰 작성자 이름 공개 방식은 WP-04에서 결정 (D-05 일부) | 사용자 확정 (2026-10-15) |
| C-13 | **Q5** 초기 카테고리 9개, 태그 6개를 기준 데이터로 마이그레이션에 포함 | 사용자 확정 (2026-10-15) |
| C-14 | **Q6** `price_paid` = 그날 1인 실지출(원) (D-08 해소, A-09 승격) | 사용자 확정 (2026-10-15) |
| C-15 | **Q7** 기본 지도 중심은 임시로 서울시청 (37.5663, 126.9779). 출시 상권 확정 시 `lib/domain/filters.ts`의 `DEFAULT_CENTER` 변경 (D-01은 여전히 미정) | 사용자 확정 (2026-10-15) |
| C-16 | **Q8** Naver Maps 키는 사용자가 발급. Dynamic Map만 선택, Web 서비스 URL `http://localhost` | 사용자 확정·발급 (2026-10-15) |
| C-17 | **Q9** 예산 필터 시 가격 정보 없는 식당은 제외하고 제외 수를 표시 | 사용자 확정 (2026-10-15) |
| C-18 | **Q10** 태그 필터: 각 태그가 승인된 리뷰 1개 이상에 있으면 포함, 여러 태그는 AND | 사용자 확정 (2026-10-15) |
| C-19 | **Q11** 길찾기 버튼은 Naver 지도 링크 형식 공식 확인 후 추가 (이번 WP 제외) | 사용자 확정 (2026-10-15) |
| C-20 | **Q12** Playwright(Chromium) 로컬·CI 설치 | 사용자 확정 (2026-10-15) |
| C-21 | **Q13** 로그인은 이메일 매직링크만 (소셜은 후속). 운영 SMTP는 배포 시 결정 | 사용자 확정 (2026-10-15) |
| C-22 | **Q14** 리뷰 작성자 미표시 (D-05 해소, K-09 종료) | 사용자 확정 (2026-10-15) |
| C-23 | **Q15** 운영자가 `removed` 처리한 리뷰가 있으면 같은 식당 재작성 불가 (K-07 종료) | 사용자 확정 (2026-10-15) |
| C-24 | **Q16** 24시간 제출 한도: 리뷰 10, 장소 제안 5, 신고 20 (DB 강제) | 사용자 확정 (2026-10-15) |
| C-25 | **Q17** 중복: 정규화 이름 동일+50m 이내 차단, 유사도 ≥0.4+100m 또는 20m 이내 경고·관리자 표시 (04b) | 사용자 확정 (2026-10-15) |
| C-26 | **Q18** 관리자 지정: 로컬 스크립트 / 운영은 사용자가 SQL 편집기에서. 앱 내 지정 기능 없음 (04c) | 사용자 확정 (2026-10-15) |
| C-27 | **Q19** 관리 화면은 같은 앱 `/admin` (04c) | 사용자 확정 (2026-10-15) |
| C-28 | **명세 v0.2** 채택: §5A 모바일 중심 UX(지도 우선 홈)가 P0이자 출시 차단 조건 | 사용자 공유 (2026-10-15) |
| C-29 | **Q20** 순서: PR #3 병합 → WP-03b → 04b → 04c | 사용자 확정 (2026-10-15) |
| C-30 | **Q21** 지도 조회 기본은 화면 영역(bounds), 반경은 선택 필터 (W3-01 대체) | 사용자 확정 (2026-10-15) |
| C-31 | **Q22** MVP 사진 업로드 없음 유지 (A-07). §5A의 "선택·압축"은 도입 시 조건으로 해석 | 사용자 확정 (2026-10-15) |
| C-32 | **Q23** 상세 저장(즐겨찾기)·길찾기 버튼은 04c 직후 추가 | 사용자 확정 (2026-10-15) |
| C-33 | **Q24** 위치 지정은 지도 가운데 고정 핀 | 사용자 확정 (2026-10-15) |
| C-34 | **Q25** 주소는 직접 입력·필수(2–200자), 역지오코딩 미사용(D-07) | 사용자 확정 (2026-10-15) |
| C-35 | **Q26** 제안 직후 "이 식당 리뷰도 남기기" 제공(강제 아님) | 사용자 확정 (2026-10-15) |
| C-36 | **Q27** 다른 사용자의 검수 중 제안과 겹치면 존재만 알림(이름·ID 비공개) | 사용자 확정 (2026-10-15) |
| C-37 | **Q28** 반려·보관·비공개는 사유 필수, 승인·복원은 선택 | 사용자 확정 (2026-10-15) |
| C-38 | **Q29** 신고 해결 시 대상 조치(리뷰 비공개 / 식당 보관 / 없음)를 함께 처리 | 사용자 확정 (2026-10-15) |
| C-39 | **Q30** 로컬·CI 전용 관리자 시드 (운영 시드 없음) | 사용자 확정 (2026-10-15) |
| C-40 | **Q31** 관리자가 아니면 `/admin`은 404 | 사용자 확정 (2026-10-15) |
| C-41 | **Q32** 반려·비공개·보관 사유는 작성자 본인에게만 표시 | 사용자 확정 (2026-10-15) |
| C-42 | **Q33** 길찾기 기본은 도보(`nmap://route/walk`), 목적지 좌표·이름·appname만 전달, 사용자 위치는 보내지 않음 | 사용자 확정 (2026-10-15) |
| C-43 | **Q34** 데스크톱·앱으로 열 수 없는 경우 안내 문구와 주소 복사, 웹 길찾기 URL은 추측해 만들지 않음 | 사용자 확정 (2026-10-15) |
| C-44 | **Q35** 저장 버튼은 상세에만, 지도 미리보기 카드에는 길찾기 + 상세 보기 | 사용자 확정 (2026-10-15) |
| C-45 | **Q36** `/me/saved`와 "내 활동" 탭(리뷰·제안·저장), 지도 계정 버튼 이름을 "내 활동"으로 | 사용자 확정 (2026-10-15) |
| C-46 | **Q37** 저장·길찾기 성공 이벤트 기록은 지금 하지 않음 (WP-07에서 결정) | 사용자 확정 (2026-10-15) |
| C-47 | **Q38** AI 제공자 Anthropic, 해석 모델 Claude Haiku 5.5, 월 한도 **₩5,000** (처음 제안 ₩30,000에서 사용자가 변경) | 사용자 확정 (2026-10-15) |
| C-48 | **Q39** WP-05를 05a(해석·대체·평가) / 05b(임베딩·하이브리드 순위) / 05c(근거 설명)로 나눔 | 사용자 확정 (2026-10-15) |
| C-49 | **Q40** 지역 이름은 지오코딩하지 않음: 현재 지도 영역으로 찾고 "지도를 옮겨 주세요" 안내 | 사용자 확정 (2026-10-15) |
| C-50 | **Q41** AI 검색은 로그인 사용자만, 하루 30회. 비로그인은 일반 검색 | 사용자 확정 (2026-10-15) |
| C-51 | **Q42** 검색어 원문은 저장하지 않고 모델·토큰·지연·결과만 기록 | 사용자 확정 (2026-10-15) |
| C-52 | **Q43** 05a 관문: 하드 필터 일치 ≥ 90%, 프롬프트 주입 사례 100% 무해, 잘못된 출력에도 오류 화면 0, p95 < 5초 | 사용자 확정 (2026-10-15) |
| C-53 | **Q44** 임베딩은 Voyage AI `voyage-4`, 1024차원 (`VOYAGE_API_KEY`, MongoDB Atlas) | 사용자 확정 (2026-10-16) |
| C-54 | **Q45** 임베딩 대상: 이름·종류·승인 태그·최근 승인 리뷰 최대 20개(각 300자). 대기·비공개 리뷰와 작성자 정보 제외 | 사용자 확정 (2026-10-16) |
| C-55 | **Q46** 트리거로 쌓는 DB 대기열 + 비밀값 보호 경로·`npm run embed:sync`. 운영 스케줄은 WP-07 | 사용자 확정 (2026-10-16) |
| C-56 | **Q47** 관련도순은 AI 검색에서만, 하드 필터를 통과한 결과 안에서 순서만 바꿈. 일반 검색은 거리순 | 사용자 확정 (2026-10-16) |
| C-57 | **Q48** 합성 평가 코퍼스와 검색 평가(recall@10, NDCG@10을 거리순과 비교) | 사용자 확정 (2026-10-16) |
| C-58 | **Q49** WP-05b를 PR #8 위에 이어서 진행 | 사용자 확정 (2026-10-16) |
| C-59 | AI 검색 해석 제공자를 Anthropic에서 **OpenAI `gpt-6-luna`**로 변경 (C-47의 제공자 부분 대체, 월 한도 ₩5,000 유지). Anthropic은 `AI_PROVIDER=anthropic`으로 선택 가능하게 남김. 임베딩은 Voyage 유지(C-53) | 사용자 확정 (2026-10-16) |
| C-60 | **Q50** 근거는 승인 리뷰 원문 인용(추출식), LLM 생성 없음 | 사용자 확정 (2026-10-16) |
| C-61 | **Q51** 리뷰 단위 임베딩 추가(같은 작업 경로) | 사용자 확정 (2026-10-16) |
| C-62 | **Q52** 카드마다 인용 1개(80자)·방문일, 근거가 없으면 "아직 없어요" | 사용자 확정 (2026-10-16) |
| C-63 | **Q53** 관련도순 목록 카드와 지도 미리보기에 표시, 인용을 누르면 상세의 해당 리뷰로 | 사용자 확정 (2026-10-16) |
| C-64 | **Q54** 부정·배제 표현은 `unsupported`로(관련도순에 쓰지 않음), 금액·거리 상한은 필터로 | 사용자 확정 (2026-10-16) |
| C-65 | **Q55** 05c 관문: 인용 원문 일치 100%, 강한 일치 상위 3곳의 근거 적중 80% 이상, 비공개·대기 리뷰 인용 0 | 사용자 확정 (2026-10-16) |
| C-66 | **Q56** "오늘 뭐 먹지?" 칩 → 하단 시트 추천 모드, 지도 마커에 1·2·3 번호, 별도 피드 없음 | 사용자 확정 (2026-10-19) |
| C-67 | **Q57** 입력은 칩만: 지역은 현재 지도 화면, 예산·먹고 싶은 종류·뺄 종류·기분(조용히/빨리/혼자 편하게 → 태그) | 사용자 확정 (2026-10-19) |
| C-68 | **Q58** 가격 정보가 없는 곳은 후보에 남기고 "가격 정보 없음" 표시, 3곳 중 최대 1곳 | 사용자 확정 (2026-10-19) |
| C-69 | **Q59** 점수: 혼밥 편안함 40%(3.5점 쪽 보정), 거리 25%, 최근 방문 15%, 기분 일치 20%, 화면에 공개 | 사용자 확정 (2026-10-19) |
| C-70 | **Q60** 가능하면 서로 다른 종류, "다른 추천 보기"·"패스"는 본 곳 제외, 리뷰 없는 곳은 "새로 발견"으로 최대 1곳 | 사용자 확정 (2026-10-19) |
| C-71 | **Q61** 추천·패스를 서버에 기록하지 않음(화면 메모리만), 로그인 없이 사용 가능 | 사용자 확정 (2026-10-19) |
| C-72 | **Q62** 관문: 자격 조건 위반 0, 데이터 없음·3곳 미만 설명, 다양성, 같은 입력 같은 결과를 단위 테스트로 + e2e | 사용자 확정 (2026-10-19) |
| C-73 | 계정 삭제 시 리뷰·제안 장소는 **익명화**해 유지, 이메일·프로필·저장·이용 기록은 삭제 | 사용자 확정 (2026-10-19) |
| C-74 | 보관 기간: AI 이용 기록 90일, 제출 횟수 기록 30일 후 자동 삭제 (개인정보처리방침과 일치) | 사용자 위임 (2026-10-19) |
| C-75 | 개인정보처리방침·이용약관은 Claude가 작성, 운영자 표기 "운영자", 연락처 work.johnhan@gmail.com. 법률 검토는 사용자 몫 | 사용자 확정 (2026-10-19) |
| C-76 | AI 검색은 **꺼진 채 출시**(`NEXT_PUBLIC_AI_SEARCH_ENABLED`), 켤 때 OpenAI 키·방침 갱신 | 사용자 확정 (2026-10-19) |
| C-77 | 매일 1회 Vercel Cron 작업(임베딩 대기열 + 보관 기간 정리, 무료 DB 일시 정지 방지) | 사용자 위임 (2026-10-19) |
| C-78 | 모니터링은 Vercel·Supabase 기본 로그와 내부 사용 기록만, 외부 분석 도구·이벤트 수집 없음 | 사용자 확정 (2026-10-19) |
| C-79 | 배포: 모두 무료 플랜, Vercel 기본 주소, 로그인 메일은 Gmail SMTP(앱 비밀번호), 관리자 work.johnhan@gmail.com, 계정·비밀값은 사용자·마이그레이션과 점검은 Claude | 사용자 확정 (2026-10-19) |
| C-80 | 출시 지역 **전국**, 초기 데이터는 지인 베타 기여 + 직접 방문 등록. 네이버 장소 데이터는 약관 확인 전까지 지도 표시만 | 사용자 확정 (2026-10-19) |

---

## 3. 가정 (ASSUMED) — 최소·가역 선택

| ID | 가정 | 영향 WP | 되돌리기 |
|---|---|---|---|
| A-01 | **Web/PWA 우선** (네이티브 앱 아님) | WP-01 | 명세 스택이 Next.js이므로 자연스러운 기본값 |
| A-02 | 런치 지역은 **서울 1개 상권**으로 시작, 스키마는 지역 비종속 | WP-03 | 지역은 데이터/설정값일 뿐 스키마 변경 없음 |
| A-03 | Node.js **LTS(24.x)**, 패키지 매니저 **npm**(Node 기본 포함, 추가 도구 최소화) | WP-01 | lockfile 교체로 전환 가능 |
| A-04 | Next.js는 스캐폴딩 시점의 최신 안정판(App Router)을 정확한 버전으로 고정하고 여기에 기록 | WP-01 | — |
| A-05 | 좌표: `geography(Point,4326)`, 입력 순서 (lng, lat), 거리 단위 **미터** | WP-02 | — |
| A-06 | 인증: Supabase Auth **이메일 매직링크**로 시작, 카카오/네이버 OAuth는 후속 | WP-02/04 | Provider 추가는 비파괴적 |
| A-07 | MVP는 **이미지 업로드 없음**, 프로필은 **비공개**(표시 이름만 노출) | WP-02/04 | Storage 버킷은 나중에 추가 |
| A-08 | 모더레이션: 신규 장소와 리뷰 **모두 승인 후 공개** (가장 엄격한 기본값) | WP-04 | 정책 완화는 RLS/상태 기본값 변경으로 가능 |
| A-09 | 가격: 리뷰의 `price_paid` = **1인 실지출(KRW)**, 식당 가격대는 리뷰로부터 파생 | WP-02 | 메뉴 가격 필드는 추가만 하면 됨 |
| A-10 | Naver는 **지도 렌더링(Web Dynamic Map)만** 사용. 장소 좌표는 사용자가 지도에서 찍은 핀(사용자 저작 데이터)으로 저장. Naver 지역검색·지오코딩 결과는 약관 확인 전까지 **DB에 저장하지 않음** | WP-03/04 | 약관 확인 후 `external_reference` 활성화 |
| A-11 | AI 제공자는 인터페이스 뒤로 격리 (`lib/ai/types.ts`의 `QueryParser`). 제공자는 C-47로 확정 | WP-05 | — |
| A-12 | 관리자 권한은 비노출 `private.user_roles` + `private.is_admin()` (WP-02에서 구현, §11) | WP-02 | — |
| A-13 | 스테이징 호스팅은 WP-01에서 결정하지 않음. CI는 로컬 검증 위주로 먼저 구성 | WP-01 | — |

---

## 4. 미결정 사항 (OPEN) — 사용자 결정 필요

| ID | 질문 (명세 §16) | 현재 기본값 | 막히는 단계 |
|---|---|---|---|
| D-01 | ~~초기 지역?~~ → **전국**으로 해소 (C-80) | A-02 | — |
| D-02 | ~~Web/PWA 우선 vs 네이티브 우선?~~ → Web/PWA 우선으로 해소 (사용자 확정, WP-01) | A-01 | — |
| D-03 | ~~초기 데이터 확보?~~ → 지인 베타 기여 + 직접 방문 등록 (C-80) | — | — |
| D-04 | ~~장소·리뷰 즉시 공개 vs 사전 승인?~~ | **해소 (C-09)** | — |
| D-05 | ~~인증 제공자, 리뷰 작성자 공개~~ **해소 (C-21, C-22)**. 이미지 업로드는 A-07(없음) 유지 | — | — |
| D-06 | ~~AI 제공자와 월 지출 상한?~~ → C-47로 해소 | A-11 | WP-05 |
| D-07 | Naver 장소 데이터(지역 검색·지오코딩) 저장 허용 범위? (상품은 Dynamic Map만 사용으로 확정, C-16) | A-10 | WP-04 장소 제안 |
| D-08 | ~~가격 표현~~ | **해소 (C-14)** | — |
| D-09 | ~~영구 프로젝트 폴더, GitHub 원격~~ | **해소 (C-08)** | — |
| D-10 | ~~로컬 툴체인 설치 승인~~ | **해소 (C-07)** | — |
| D-11 | ~~예산~~ → 모두 무료 플랜 (C-79). NCP 사용량 한도는 사용자가 콘솔에서 설정 | — | — |

---

## 5. 외부 API 근거 (Evidence)

| 항목 | 상태 | 확인 내용 | 출처 |
|---|---|---|---|
| NCP Maps 상품 구성 | VERIFIED | Dynamic Map, Static Map, Geocoding, Reverse Geocoding, Directions 5/15 | https://api.ncloud-docs.com/docs/en/application-maps-overview |
| NCP Maps 인증·쿼터 | VERIFIED | API Gateway 기반 인증 필요, 쿼터 초과·미선택 API는 429 | 위와 동일 |
| NCP Maps 무료 사용량 | PARTIAL | Web Dynamic Map/Static/Geocoding/Reverse Geocoding 무료 사용량은 **대표 계정에만** 제공, 그 외 계정은 호출 과금 (2023-01부터) | https://guide.ncloud-docs.com/docs/en/maps-overview (검색 결과 요약 경유, 원문 직접 재확인 필요) |
| NCP Maps 이용 규칙 | VERIFIED | 기능 명칭은 공식 명칭 사용, 공식 호출 경로 우회 시 이용 제한 가능, 사용량 기반 과금 | https://guide.ncloud-docs.com/docs/en/maps-spec |
| NCP Maps 데이터 저장·캐싱 | **UNVERIFIED** | 개요/스펙 페이지에 저장 관련 문구 없음. 콘솔의 "AI·NAVER API 이용약관"에 데이터 저장·이용 조항이 있다고만 안내됨 | 사용자가 NCP 콘솔에서 약관 원문 확인 필요 |
| NCP Maps 단가 | **UNVERIFIED** | 2026년 단가표 미확보 | https://www.ncloud.com/product/applicationService/maps |
| Naver 개발자센터 지역 검색 API | **UNVERIFIED** | developers.naver.com 접근이 이 환경에서 차단됨. 제3자 자료만 확보(엔드포인트 `/v1/search/local.json`, 일 25,000회) — 근거로 사용하지 않음 | 사용자가 약관·가이드 원문 확인 필요 |
| Supabase 로컬 개발 | VERIFIED | Docker API 호환 컨테이너 런타임 필수, CLI는 npm dev dependency로 설치 가능, `supabase init` → `supabase start` | https://supabase.com/docs/guides/local-development |
| pgvector 활성화 | VERIFIED | `create extension vector with schema extensions;` | https://supabase.com/docs/guides/ai/vector-columns |
| PostGIS 활성화 스키마 | **UNVERIFIED** | Supabase 공식 문서에서 WP-02 시점에 재확인 | — |

**원칙:** UNVERIFIED 항목에 의존하는 기능은 인터페이스 뒤로 격리하고, 약관 확인 전까지 외부 장소 데이터를 저장하지 않는다 (A-10).

---

## 6. 블로커

| ID | 블로커 | 해소 조건 |
|---|---|---|
| B-01 | 로컬 툴체인 전무 | D-10 승인 후 설치 및 버전 기록 |
| B-02 | 임시 작업 폴더 | D-09: 영구 폴더로 세션 이동, `git init` |
| B-03 | Naver 데이터 저장 권한 미확인 | D-07: 약관 원문 확인 (WP-03 전까지) |
| B-04 | NCP 계정·Client ID 없음 | **해소 (2026-10-15).** 사용자가 Dynamic Map 애플리케이션 등록, `http://localhost:3000`에서 지도 인증 성공 확인 |

---

## 7. WP-00 Gate 판정

> Gate: provider permissions, launch region and data rights recorded.

- 제공자 권한: **기록됨, 단 부분 미검증** (§5)
- 런치 지역: **가정으로 기록** (A-02), 사용자 확정 대기 (D-01)
- 데이터 권리: **미검증으로 기록**, 안전한 기본값 채택 (A-10)

**판정: 조건부 통과.** WP-01(스캐폴딩)은 외부 API 권리에 의존하지 않으므로 B-01, B-02 해소 시 진행 가능. B-03, B-04는 WP-03 진입 전 필수.

---

## 8. WP-01 Foundation 기록

### 8.1 설치·고정 버전 (2026-10-15 실측)

| 도구 | 버전 | 비고 |
|---|---|---|
| Node.js | 24.20.0 | winget `OpenJS.NodeJS.LTS`, `.node-version` = 24, `engines: >=24 <25` |
| npm | 11.19.0 | |
| Git | 2.55.0.windows.5 | winget `Git.Git`. **user.name/email 미설정** → 아직 커밋 없음 |
| Docker Desktop | 4.95.0 (CLI 29.8.2) | winget `Docker.DockerDesktop`. **WSL 미설치로 엔진 미기동** |
| Next.js | 16.4.1 (React 19.3.0) | `create-next-app@16.4.1`, App Router, Turbopack, `src/` 없음 |
| Supabase CLI | 2.121.0 | npm devDependency, Postgres major 17 |
| Vitest | 5.0.4 | jsdom, `resolve.tsconfigPaths` 내장 옵션 사용 |
| zod | 4.6.7 | 환경변수 검증 |
| Prettier | 3.9.10 | 기본 설정 |

### 8.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W1-01 | PostGIS·pgvector를 `extensions` 스키마에 설치 | Supabase 공식 PostGIS 가이드: `public` 설치 시 `spatial_ref_sys`가 Data API로 노출. 함수는 `search_path = ''` + 완전 수식 이름 사용 |
| W1-02 | 공개 환경변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만. `sb_secret_` 접두 키는 스키마에서 거부, 오류 메시지에 값 미포함 | 명세 §11 비밀 노출 방지 |
| W1-03 | 서버 비밀 모듈은 실제 사용처(WP-04 특권 워크플로)가 생길 때 `server-only`로 추가 | 추측성 코드 회피 (명세 규칙 9) |
| W1-04 | PWA는 `app/manifest.ts`만. Service Worker·오프라인은 보류 | 최소 범위. 아이콘은 favicon만 → 런치 전 PNG 아이콘 필요 |
| W1-05 | Geist(Latin 전용) 폰트 제거, 시스템 한글 폰트 스택 사용 | 한글 미지원 폰트 + 빌드 시 외부 폰트 다운로드 제거 |
| W1-06 | CI: app(format/typecheck/lint/test/build), database(`db start` → `db reset` → `db lint --fail-on warning`), secrets(gitleaks) | 명세 §11 CI 항목 |

### 8.3 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run format:check` | 통과 |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | 통과 |
| `npm run lint` | 통과 (경고 0) |
| `npm run test` | 통과 — 2 files, 6 tests |
| `npm run build` | 통과 — `/`, `/_not-found`, `/manifest.webmanifest` 정적 |
| `npm run db:start` | 통과 (재부팅 후) — Postgres 17.11.0.004 이미지, 마이그레이션 적용 |
| `npm run db:reset` | 통과 — 빈 DB에서 마이그레이션 재적용. `seed.sql` 없음 안내만 출력 (의도됨) |
| 확장 설치 위치 (psql) | `postgis 3.3.7` → `extensions`, `vector 0.8.2` → `extensions`, `public.spatial_ref_sys` 없음 |
| `npm run db:lint` (`--schema public`) | 통과 — 오류 0 |
| GitHub Actions | **통과** — run 38658736150 (커밋 2ca29e6): app / database(db start·reset·lint) / secrets(gitleaks, 개인 계정이라 라이선스 불필요) 3개 job 모두 success |

`supabase db lint`를 스키마 지정 없이 실행하면 `extensions` 스키마의 PostGIS 내장 함수(`st_findextent`, `addauth` 등)에서 plpgsql_check 오류가 보고되어 실패한다. 서드파티 코드의 오탐이므로 lint 범위를 우리 스키마(`public`, 이후 추가 스키마)로 한정한다 (W1-07).

### 8.4 알려진 이슈

| ID | 내용 | 조치 |
|---|---|---|
| K-01 | `npm audit`: devDependency(eslint-config-next → fast-glob → micromatch → braces) high 5건. 프로덕션 의존성(`--omit=dev`)은 0건 | `audit fix --force`는 eslint-config-next를 14.x로 다운그레이드하므로 미적용. 상위 패치 대기 |
| K-02 | npm allowScripts: `unrs-resolver` postinstall 미승인 경고 | lint 정상 동작 확인. 필요 시 `npm install-scripts approve unrs-resolver` |
| K-03 | Next 16.4 빌드 로그상 Cache Components·Partial Prefetching 기본 활성 | 데이터 페칭 도입 시(WP-03) 캐싱 동작 문서 확인 |
| K-04 | Next 텔레메트리 기본 활성 | CI에서는 비활성. 로컬은 사용자 선택 (`npx next telemetry disable`) |

### 8.5 WP-01 Gate 판정

> Gate: local run, typecheck, test, migration reset pass.

- typecheck / test / lint / build: **통과**
- local run: 로컬 Supabase 스택 기동 **통과**. `next dev`는 브라우저 수동 확인 미실시 (프로덕션 빌드는 통과)
- migration reset: **통과**

**판정: 통과 (2026-10-15).** 로컬과 CI 모두 확인.

---

## 9. 추가 블로커

| ID | 블로커 | 해소 조건 |
|---|---|---|
| B-05 | WSL2 미설치 → Docker 엔진 미기동 → Supabase 로컬 불가 | **해소.** `wsl --install --no-distribution`(관리자 권한, 비관리자 실행은 안내 문구만 출력하고 exit 1) → WSL 3.0.3.0 / 커널 6.18.54.1-1 → 재부팅 → Docker 29.8.2 엔진 기동 확인 |
| B-06 | git 사용자 정보 미설정 → 커밋 불가 | **해소.** 사용자 GitHub 계정 `Yoy0z-maps` 지정. 저장소 로컬 설정: `user.name=Yoy0z-maps`, `user.email=165480026+Yoy0z-maps@users.noreply.github.com` (개인 이메일 공개 방지용 GitHub noreply, ID는 공개 API로 조회) |
| B-07 | GitHub 원격 저장소 없음 | **해소.** 사용자가 `Yoy0z-maps/honsikdang`(공개) 생성 → `main` push 완료 |

B-01, B-02 해소.

### 9.1 추가 결정

| ID | 결정 | 이유 |
|---|---|---|
| W1-07 | `db:lint`는 `--schema public`으로 한정 | PostGIS 내장 함수 오탐 (§8.3) |
| W1-08 | `.gitattributes`로 LF 고정 (`* text=auto eol=lf`) | Git for Windows `autocrlf`로 CRLF 체크아웃 시 Prettier(LF) 검사 실패 방지 |
| W1-09 | 첫 커밋은 `main`에 직접 | 빈 저장소의 초기 커밋. 이후 작업은 WP별 브랜치 + PR |

---

## 11. WP-02 Database/Security 기록

### 11.1 마이그레이션

| 파일 | 내용 |
|---|---|
| `20261015005829_security_baseline.sql` | `public`의 기본 자동 권한 회수(테이블·시퀀스·함수), `PUBLIC` 함수 실행권 전역 회수(postgres 생성분), `private` 스키마, `user_roles`, `is_admin()`, `set_updated_at()` |
| `20261015005832_profiles_restaurants.sql` | profiles(+가입 트리거), restaurant_categories(+9개), restaurants |
| `20261015005836_reviews_tags.sql` | restaurant_reviews(+검증·상태 보호 트리거), tags(+6개), review_tags(+재검토 트리거) |
| `20261015005839_favorites_reports_moderation.sql` | favorites, restaurant_reports(+대상 검증 트리거), moderation_actions |

각 파일 머리에 로컬용 rollback SQL 주석. 프로덕션 미적용.

### 11.2 권한 표 (구현·테스트 완료)

| 테이블 | anon | owner | other | admin |
|---|---|---|---|---|
| profiles | ✗ (42501) | 본인 조회, `display_name`만 수정 | ✗ | 전체 조회 |
| restaurant_categories | 조회 | 조회 | 조회 | 조회·추가·수정·삭제 |
| restaurants | approved 조회 | approved + 본인 제안 조회, 제안(pending·user_submitted·본인 귀속 강제) | approved 조회 | 전체 조회·수정·삭제 |
| restaurant_reviews | approved 조회 | approved + 본인 조회, 작성(pending), 수정(→pending), 완전 삭제 | approved 조회 | 전체 조회, 상태 변경. **완전 삭제 불가** |
| tags | 조회 | 조회 | 조회 | 조회·추가·수정·삭제 |
| review_tags | 보이는 리뷰의 태그 조회 | 본인 리뷰 태그 추가·삭제(→pending) | 보이는 리뷰의 태그 조회 | 보이는 리뷰의 태그 조회 |
| favorites | ✗ (42501) | 본인 조회·추가·삭제 | ✗ | ✗ |
| restaurant_reports | ✗ (42501) | 보이는 대상 신고(open), 본인 신고 조회 | ✗ | 전체 조회, 상태 변경 |
| moderation_actions | ✗ (42501) | ✗ | ✗ | 조회·추가(본인 귀속). 수정·삭제 권한 없음 |

`postgres`·`service_role`(서버 측)은 트리거 제한을 받지 않음 (W2-03).

### 11.3 결정

| ID | 결정 | 이유 |
|---|---|---|
| W2-01 | 권한은 테이블별 `revoke all` 후 필요한 것만 `grant`, 쓰기는 컬럼 단위 | 로컬은 여전히 자동 부여 기본값을 가짐(확인함), 호스티드는 2026-10-30부터 자동 부여 없음 → 양쪽 동일 동작 |
| W2-02 | 상태값은 클라이언트가 바꾸지 못함: insert 시 RLS `with check`, update 시 트리거(`guard_review_update`) | 컬럼 grant만으로는 관리자/일반 구분 불가 |
| W2-03 | 상태 보호·재검토 트리거는 `current_user`가 `anon`/`authenticated`일 때만 적용 | 첫 구현이 `postgres`의 상태 변경까지 막는 것을 테스트가 발견. 서버 측 검수 흐름(WP-04)에 필요 |
| W2-04 | 관리자도 리뷰 완전 삭제 불가 (계획 표의 "전체"에서 축소) | 감사 증거 보존. 관리자는 `removed` 상태 사용 (Q3) |
| W2-05 | 관리자도 favorites 조회 불가 | 개인 정보, 운영상 필요 없음 |
| W2-06 | 신고 대상 존재 확인은 신고자 권한(RLS)으로 수행 | 보이지 않는 대상의 존재 여부 노출 방지 (23503으로 동일 응답) |
| W2-07 | 사용자가 거절된 리뷰를 수정하거나 상태를 `pending`으로 되돌려 재제출할 수 있음 | 의도된 동작. 남용 시 WP-04 요청 제한으로 대응 |
| W2-08 | 리뷰 본문 컬럼명은 `body` (명세의 `text`) | SQL 타입명과 혼동 방지 |
| W2-09 | 타입 생성: `npm run db:types` (생성 + Prettier). CI에서 생성 후 `git diff --exit-code`로 불일치 검사 | 명세 규칙 7 |

### 11.4 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:reset` | 통과 — 마이그레이션 5개 적용 |
| `npm run db:lint` | 통과 — 오류 0 |
| `npm run db:test` | 통과 — 5 files, **83 tests** |
| 변이 검사 | 정책 2개를 일부러 `using (true)`로 완화 → 3개 테스트 실패 확인 → reset으로 복구 |
| `npm run db:types` | 통과, 2회 생성 해시 동일 |
| `npm run check` | 통과 — 6 tests |
| `npm run build` | 통과 |

### 11.5 알려진 한계 (WP-04 이후)

| ID | 내용 | 해당 WP |
|---|---|---|
| K-05 | ~~상태 변경과 기록이 원자적이지 않음~~ | **해소 (04c)**: `moderate` / `resolve_report` |
| K-06 | ~~장소 중복 탐지, 제출 요청 제한 없음~~ | **해소**: 리뷰(04a), 장소(04b), 신고(04c) |
| K-07 | ~~`removed` 리뷰가 재작성을 막음~~ | **의도된 동작으로 확정 (C-23)** |
| K-08 | ~~생성 타입에서 `location`(geography)이 `unknown`~~ | **해소 (WP-03)**: 앱은 `search_restaurants`/`restaurant_detail`이 돌려주는 `lat`/`lng`만 사용 |
| K-09 | 리뷰 작성자 이름 표시 불가 (프로필 비공개, Q4) | WP-04 |
| K-10 | `restaurant_aggregates`, `restaurant_embeddings` 미구현 | WP-04 / WP-05 |

### 11.6 WP-02 Gate 판정

> Gate: unauthorized read/write matrix verified.

**판정: 통과 (로컬).** §11.2의 모든 칸이 pgTAP 테스트로 확인됨. CI 실행은 PR에서 확인.

---

## 12. WP-03 Map/Discovery 기록

### 12.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261015021325_discovery_search.sql`: `pg_trgm`, 이름·주소 trigram 인덱스, `search_restaurants`(SECURITY INVOKER), `restaurant_detail`(jsonb, 작성자 미노출) |
| 시드 | `supabase/seed.sql`: 로컬 전용 합성 데이터. 이름 `[예시]`, 주소 `예시로`, 사용자 `@example.invalid` |
| 도메인 | `lib/domain/filters.ts`(URL↔필터, zod, 필드별 기본값 대체), `geo.ts`, `format.ts` |
| 데이터 | `lib/restaurants/search.ts`, `detail.ts`: RPC 응답을 zod로 재검증 |
| UI | `/` 지도+목록(모바일: 지도 40vh 위 / 목록 아래, 데스크톱: 좌우), `/restaurants/[id]` 상세, not-found, error(`retry`) |
| 지도 | `features/map/NaverMap.tsx`: `oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=`, `navermap_authFailure` 처리, 키 없음/인증 실패 시 목록만으로 동작 |

### 12.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W3-01 | ~~검색 영역은 중심+반경만~~ **C-30으로 대체 (WP-03b)** | — |
| W3-02 | 집계(평균 편안함, 가격·대기 중앙값)는 검색 시 승인된 리뷰에서 계산 | 소규모 데이터에서 단순. `restaurant_aggregates`는 측정 후 도입 (K-10) |
| W3-03 | 생성 RPC 타입이 집계 컬럼의 null을 표시하지 않음 → 응답을 zod로 nullable 검증 | 경계에서 타입 신뢰 금지 |
| W3-04 | 마커 아이콘은 사용자 텍스트 없는 DOM 요소로 생성 | 식당 이름(사용자 제보)의 지도 HTML 주입 방지 |
| W3-05 | 상세 페이지는 캐시하지 않음 (`use cache` 미사용, Suspense 스트리밍) | 검수 결과 즉시 반영 |
| W3-06 | 카탈로그(카테고리·태그)는 브라우저에서 조회 | 빌드 시 DB 의존 제거 (CI app job은 DB 없이 빌드) |
| W3-07 | 사용자 위치는 검색 중심으로만 사용, 저장·전송 로그 없음 | 명세 §5 위치 최소 보유 |
| W3-08 | 환경변수 이름 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` (사용자 `.env`와 NCP 표기에 맞춤) | — |
| W3-09 | e2e는 Naver 키를 비운 프로덕션 빌드로 실행 (외부 API 미호출) | CI 결정성. 실제 지도는 수동 확인 |

### 12.3 검증 결과 (로컬, 2026-10-15)

| 항목 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 6 files, **113 tests** (검색 30건 추가) |
| 공간 인덱스 | `EXPLAIN`: 반경 조건이 `restaurants_location_idx`(GiST) Index Scan 사용 |
| `npm run check` | 통과 — 4 files, 27 tests |
| `npm run e2e` (Pixel 7, Chromium) | 통과 — **7 tests** (목록·지도 대체, 가로 넘침 없음, 카테고리 필터+URL+새로고침, 예산 제외 안내, 빈 결과+필터 초기화, 상세+날짜, not-found) |
| `npm run build` | 통과 (e2e에서 실행) |
| 실제 Naver 지도 (dev, 사용자 키, 375px) | 스크립트 로드·인증 성공(`© NAVER Corp.` 표시), 마커 6개 = 목록 6곳, 마커 클릭 → 목록 선택·마커 강조, 카테고리 필터 시 마커 2개로 동기화 |
| 오류 처리 | 공개 키 누락 시 페이지 전체가 깨지던 버그 발견·수정 → 목록/필터 오류 안내로 표시 |

### 12.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-11 | 없는 식당 URL이 HTTP 200 + `noindex`로 응답 (스트리밍 후 `notFound()`는 상태 코드를 바꾸지 못함, Next 문서 명시) | SEO 영향 작음. 필요 시 상세 데이터를 Suspense 밖에서 조회 |
| K-12 | 지도 드래그 후 "이 지역에서 검색" 버튼은 자동 테스트 없음 (자동화 환경에서 지도 이동 불가) | 수동 확인 필요 |
| K-13 | Naver Marker/Event/`getCenter` 타입은 직접 작성 (공식 Getting Started에 없음). 실제 키로 동작은 확인 | 공식 API 레퍼런스로 재확인 |
| K-14 | 1~2글자 검색어는 trigram 인덱스를 쓰지 못함 (순차 스캔) | 데이터 증가 시 측정 |
| K-15 | 길찾기 링크 없음 (C-19) — 명세의 주 성공 이벤트 미계측 | 링크 형식 확인 후 추가 |
| K-16 | Vercel 미리보기 URL마다 NCP 서비스 URL 등록 필요, 와일드카드 지원 미확인 | 배포 준비 시 확인 |
| K-17 | 사용자 `.env`에 `NAVER_MAP_CLIENT_SECRET` 존재 (앱에서 미사용, git 미추적) | 삭제 권장 |

### 12.5 WP-03 Gate 판정

> Gate: mobile e2e and map API behavior validated.

**판정: 통과 (로컬).** 모바일 e2e 7건 통과, 실제 Naver 지도 로드·인증·마커 동기화·선택을 사용자 키로 확인. 지도 이동 후 재검색(K-12)은 수동 확인 대상. CI는 PR에서 확인.

---

## 13. WP-04a 인증·리뷰 기여 기록

### 13.1 구현

| 영역 | 내용 |
|---|---|
| 인증 | `@supabase/ssr` 0.12.7. 브라우저 `createBrowserClient`, 서버 요청별 `createServerClient`, `proxy.ts`에서 `getClaims()`로 세션 갱신(+ no-store 캐시 헤더). 권한 판단은 서버 `getClaims()` + RLS |
| 로그인 | `/login`(이메일) → 매직링크 → `/auth/confirm`(`verifyOtp`, `token_hash`) → `next`. `next`는 같은 출처 경로만 (`lib/auth/redirect.ts`) |
| 메일 템플릿 | `supabase/templates/magic_link.html` (magic_link·confirmation 공용). **호스티드 프로젝트 대시보드에도 같은 템플릿 설정 필요** |
| DB | `20261015031242_review_contribution.sql`: `private.submission_log` + `enforce_submission_limit`(HS429, advisory lock), 리뷰 한도 트리거, `submit_review`/`update_my_review`(INVOKER, 리뷰+태그 원자적), `my_reviews`(DEFINER, auth.uid() 한정) |
| UI | `/restaurants/[id]/review`, `/me/reviews`, `/me/reviews/[id]/edit`, 상세 "리뷰 쓰기", 계정 메뉴(표시 전용) |

### 13.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W4a-01 | 운영자가 `removed` 처리한 리뷰는 작성자가 수정·삭제 불가 (가드 트리거 + 삭제 정책) | 수정 시 재검수로 우회, 삭제 시 1인 1리뷰 슬롯 해제로 C-23 우회 가능했음 (설계 중 발견). 계정 삭제 시에는 cascade로 삭제됨 |
| W4a-02 | 제출 한도는 삭제되지 않는 로그로 집계 | 삭제 후 재작성으로 한도 초기화 방지 |
| W4a-03 | JWT가 없는 요청(postgres, service_role)은 한도 미적용 | 서버 측 작업용 |
| W4a-04 | 수정 횟수는 제한하지 않음 | 수정은 재검수로 이어져 공개 효과 없음. 남용 시 재검토 |
| W4a-05 | 사용자 세션 클라이언트 생성 전 `await connection()` | auth-js가 토큰 만료 확인에 `Date.now()` 사용 → Cache Components 사전 렌더링 오류 발생(수동 확인 중 발견) |
| W4a-06 | 서버 액션 오류는 코드별 한국어 메시지로 변환, 원문 미노출 | 정보 노출 방지 |
| W4a-07 | 로컬 auth 리다이렉트 허용: `localhost:3000`, `127.0.0.1:3000`, `localhost:3100`(e2e)의 `/auth/confirm**`; `site_url = http://localhost:3000` | Naver 서비스 URL(`http://localhost`)과 출처 일치 |

### 13.3 검증 결과 (로컬, 2026-10-15)

| 항목 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 7 files, **135 tests** (기여 22건 추가). 픽스처가 모든 auth 사용자를 트랜잭션 안에서 비워 로컬 잔여 데이터와 무관 |
| `npm run check` | 통과 — 6 files, 50 tests (리뷰 입력 검증, redirect 안전성 추가) |
| `npm run e2e` | 통과 — **12 tests** (기존 7 + 로그인 리다이렉트, 외부 next 무시, 잘못된 링크 안내, 로그인→작성→중복 시 수정 이동→수정→삭제→로그아웃, 서버 검증 시 입력 유지) |
| 수동 (dev, 실제 Mailpit 메일) | 로그인 링크 형식(`/auth/confirm?next=...&token_hash=...&type=email`) 확인, 로그인 후 원래 페이지 복귀, 리뷰 저장 확인 |
| `db:lint`, 타입 생성, `build`(e2e) | 통과 |

### 13.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-18 | 매직링크는 요청한 브라우저가 아니어도 동작(token_hash)하지만, 메일 앱 내장 브라우저에서 열면 그 브라우저에 로그인됨 | 일반적 동작. 안내 문구 검토 |
| K-19 | 운영 메일 발송(SMTP)과 대시보드 템플릿 미설정 | 배포(WP-07) 전 필수 |
| K-20 | 인앱 브라우저 창이 화면에 그려지지 않으면 스트리밍 Suspense 내용이 표시되지 않음(rAF 의존) — 확인 도구의 한계, 실제 사용자 영향 없음 | 검증은 Playwright로 수행 |

### 13.5 WP-04a 판정

**통과 (로컬).** 소유권(본인만 수정·삭제, removed 동결)과 인증 흐름을 pgTAP·e2e로 확인. 검수 흐름은 04c 관문.

---

## 14. WP-03b 지도 우선 모바일 홈 기록

### 14.1 구현

| 영역 | 내용 |
|---|---|
| 명세 | `HONSIKDANG_MASTER_PLAN.md` v0.2 반영 |
| DB | `20261015043247_search_bounds.sql`: `search_restaurants`에 영역 모드(min/max lat/lng, 최대 0.2°×0.25°) 추가, 반경 모드와 정확히 하나만. `&&`(GiST) + 위경도 직접 비교로 경계 정확 |
| 도메인 | `filters.ts`(확대 수준 `z`, 반경 null=영역), `geo.ts` `viewportBounds`(Web Mercator 256px 타일로 화면 영역 계산, 한도 초과 시 축소+안내), `camera.ts`(초기 카메라 선택, 마지막 지역 localStorage) |
| UI | `features/discovery/`: `DiscoveryView`(전체 화면 지도), `MapTopBar`(검색·칩·계정), `BottomSheet`(직접 구현, 3단 스냅, 비모달), `RestaurantPreview`, `FilterPanel`, `Chip`(44px) |
| 지도 | `NaverMap`: 확대 수준 추종, `idle`에서 중심·확대 보고, `panTo` 포커스, 마커 터치 영역 44px |
| 레이아웃 | `viewportFit: cover`, `interactiveWidget: resizes-content`, safe-area CSS 변수, reduced-motion |
| 테스트 | Playwright 360×800 / 390×844, 스크린샷 스펙(`SCREENSHOTS=1`) |
| 보고 | `specs/mobile-ux/WP-03b.md` + 스크린샷 8장 |

### 14.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W3b-01 | 검색 영역은 SDK `getBounds()`가 아니라 중심·확대 수준·지도 영역 크기로 계산 | 지도 로딩·키 유무와 무관하게 같은 결과, e2e로 검증 가능. 오차는 화면 가장자리 수준 |
| W3b-02 | 지도 이동 시 자동 재조회 없음, "이 지역에서 다시 검색" 버튼만 | §5A가 허용하는 방식 중 요청 수 최소 |
| W3b-03 | URL에는 중심·확대 수준만 저장 (영역은 화면 크기에 따라 계산) | 공유 링크가 기기마다 자연스럽게 동작 |
| W3b-04 | 하단 시트 직접 구현 (라이브러리 없음) | 비모달 시트에 모달 라이브러리의 포커스 가두기·스크롤 잠금이 방해 |
| W3b-05 | 포인터 캡처는 6px 이상 끌기 시작한 뒤에만 | 처음 구현에서 즉시 캡처로 손잡이 탭이 동작하지 않는 버그를 e2e가 발견 |
| W3b-06 | 모바일 지도 영역은 접힌 시트 위에서 끝남 | NAVER 로고·축척이 접힌 시트에 가려지지 않도록. 로고 노출 의무는 약관 미확인(K-23) |
| W3b-07 | 마커 미리보기는 시트 위에 떠 있는 카드, 마커 선택 시 시트를 접음 | 지도가 계속 주된 화면 |
| W3b-08 | 거리 표기는 "내 위치에서"(현재 위치 사용 시) / "지도 중심에서" | §5A "approximate distance (when permitted)" |
| W3b-09 | 지도 위 계정 메뉴는 단일 버튼(로그인 / 내 리뷰), 로그아웃은 `/me/reviews` | 상단 공간 확보 |

### 14.3 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 8 files, **146 tests** (영역 11건 추가) |
| 공간 인덱스 | 영역 조건 `&&`가 `restaurants_location_idx` Index Scan |
| `npm run check` | 통과 — 9 files, **70 tests** |
| `npm run e2e` | 통과 — **32 tests** (360 / 390 각 16), 스크린샷 스펙 2건은 기본 skip |
| `db:lint`, 타입 생성, build | 통과 |

### 14.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-21 | 실기기(iOS Safari, Android Chrome)·실지도 상호작용(마커 탭, 드래그 중 지도 고정, 재검색 버튼, 키보드, 노치) 미검증 | 사용자 확인 (`specs/mobile-ux/WP-03b.md` §3) |
| K-22 | 마커 클러스터링 없음, 결과 페이지(20, 더 보기로 최대 50+)만 마커 표시 | 데이터 증가 시 |
| K-23 | NAVER 로고가 시트를 펼치면 가려짐. 로고 상시 노출 의무 여부 미확인 | 약관 확인 |
| K-24 | 360px에서 칩 줄 가로 스크롤 단서 약함 (UX-01) | 다음 UI 작업에서 페이드 마스크 검토 |
| K-12 | (갱신) 재검색 버튼 자동 테스트 없음 → K-21에 포함 | — |

### 14.5 WP-03b Gate 판정

**통과 (2026-10-15).** 자동화 가능한 §5A 수락 기준 전부 통과(360/390). 실지도·실사용 항목은 사용자가 직접 확인("잘 동작"). 기기·브라우저 미기재 → iOS Safari / Android Chrome 개별 확인은 WP-07 출시 점검으로 이관(K-21 축소).

---

## 15. WP-04b 장소 제안·중복 탐지 기록

### 15.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261015051150_place_suggestion.sql`: `private.normalize_name`(NFKC·소문자·글자/숫자만) + `restaurants.name_normalized` 저장 생성 컬럼(trigram 인덱스), `private.place_duplicates`(차단·경고 판정), `public.suggest_restaurant`(SECURITY DEFINER, jsonb 결과), `restaurant_duplicate_candidates`(관리자만 조회), 장소 하루 5건 한도 트리거 |
| 권한 변경 | API 역할의 `restaurants` 직접 INSERT 회수, 제안 정책 삭제 → 제안은 `suggest_restaurant`로만 |
| 앱 | `/suggest`(가운데 핀 + 이름·주소·종류, 차단/경고/생성), `/me/places`, 지도 "＋" 버튼, 빈 결과의 "장소 제안" 링크, 내 리뷰↔내 제안 이동 |
| 지도 | `NaverMap`에 `onStatusChange`, `label`, `fallbackHint` 추가 (재사용 시 맥락별 문구) |

### 15.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W4b-01 | 직접 INSERT 회수 | WP-02 정책은 직접 제안을 허용해 중복 검사·한도 우회가 가능했음(설계 중 발견). 관리자 직접 등록도 API로는 불가 → 04c에서 필요 시 관리자 RPC |
| W4b-02 | `suggest_restaurant`는 SECURITY DEFINER | 다른 사용자의 검수 중 제안(RLS로 숨김)까지 중복 판단. 대신 uid 필수, 상태·출처·작성자 고정, 결과에서 타인 미승인 행의 이름·ID 제거 |
| W4b-03 | 사전 확인용 공개 RPC(`find_similar_restaurants`) 제거 | 제출 1회로 차단·경고·후보가 모두 반환되어 화면에서 쓸 곳 없음 (계획 대비 축소) |
| W4b-04 | 차단·미확인 시도는 한도에 포함하지 않음 | 생성 시점(INSERT 트리거)에만 기록 |
| W4b-05 | 같은 이름 51–100m는 차단이 아닌 경고 (Q17 문자 그대로) | 체인점·인접 지점 가능성 |
| W4b-06 | 키가 없거나 지도 인증 실패 시 보던 지도 중심을 위치로 사용하고 안내 | 위치 권한·지도 없이도 제안 가능 |
| W4b-07 | 로그인 리다이렉트 시 제안 위치는 기본 좌표여도 항상 명시 | e2e에서 기본 중심 생략 규칙으로 좌표가 빠지는 것 발견 |

### 15.3 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 9 files, **173 tests** (제안 27건 추가, 기존 03번은 직접 INSERT 거부로 갱신) |
| 변이 검사 | 차단 거리 50→100m로 바꾸면 "70m 같은 이름은 경고" 테스트 실패 확인 → reset |
| `npm run check` | 통과 — 10 files, **77 tests** |
| `npm run e2e` | 통과 — **38 tests** (360/390), 스크린샷 스펙 skip |
| 스크린샷 | WP-04b 8장, 검토 결과 수정 2건 (`specs/mobile-ux/WP-04b.md` §2) |
| `db:lint`, 타입 생성, build(e2e) | 통과 |

### 15.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-25 | 실지도에서 핀 위치 정확도 미검증 (e2e는 키 없이 실행) | 사용자 확인 |
| K-26 | 한국어 2–3글자 이름의 trigram 유사도는 거칠어(예: "국밥집" vs "국수집") 경고 누락·과다 가능 | 04c 검수 데이터로 임계값 재검토 |
| K-27 | `[:alnum:]` 정규화는 DB 로캘(UTF-8)에 의존 | 호스티드 로캘 확인 (WP-07) |
| K-28 | 관리자가 앱에서 장소를 직접 등록할 방법 없음 | 04c 범위 판단 |

### 15.5 WP-04b 판정

**조건부 통과.** 중복 차단·경고, 한도, 비공개 유지, 권한을 pgTAP·e2e로 확인. 실지도 핀(K-25) 사용자 확인 대기.

---

## 16. WP-04c 신고·검수 기록

### 16.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261015054029_moderation.sql`: 신고 하루 20건 트리거, `am_i_admin`, `moderate`·`resolve_report`(SECURITY DEFINER, 허용 전이만, `HS409` 충돌), `admin_pending_places`·`admin_open_reports`(관리자 확인), `my_reviews`·`my_places`에 운영자 사유, `private.latest_moderation_reason` |
| 권한 변경 | API 역할의 `status` 직접 수정(식당·리뷰·신고)과 `moderation_actions` 직접 추가 회수 → 상태 변경과 감사 기록은 두 함수로만. 태그 변경 시 재검수 트리거는 DEFINER로, `removed` 리뷰의 태그 변경도 차단 |
| 앱 | 상세의 식당·리뷰 신고 양식(`ReportButton`), `/admin`(대기 장소·중복 후보, 대기 리뷰, 열린 신고, 검수 기록), 내 리뷰·내 제안에 운영자 사유 |
| 운영 | `npm run db:grant-admin -- <email> [--revoke]`(로컬 Docker DB 전용), `specs/ops/grant-admin.md`(운영 SQL 절차) |
| 시드 | 로컬 관리자 2명(`seed-user-3`, `seed-admin-2`), 시드 사용자를 Auth가 로그인할 수 있는 형태로 수정 |

### 16.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W4c-01 | `moderate`·`resolve_report`를 계획(INVOKER)과 달리 DEFINER로, 직접 상태 변경·기록 추가 권한 회수 | INVOKER로 두면 관리자가 REST로 기록 없이 상태를 바꾸거나 가짜 기록을 쓸 수 있었음(설계 중 발견) |
| W4c-02 | 허용 전이 표 외의 동작과 예상과 다른 현재 상태는 `HS409` | 운영자 2명 동시 처리 시 덮어쓰기 방지 |
| W4c-03 | 관리자 화면은 제목까지 관리자 확인 뒤에 렌더링 | 처음에는 제목이 먼저 보여 Q31 위반이었음(e2e 작성 중 발견) |
| W4c-04 | 시드 사용자에 기본 `instance_id`, 이메일 provider 메타데이터, 빈 토큰 컬럼 | 없으면 Auth가 시드 계정 로그인 시 500(사용자를 못 찾거나 NULL 토큰 스캔 실패). 이전 WP에서는 시드 계정으로 로그인한 적이 없어 드러나지 않았음 |
| W4c-05 | e2e 프로젝트별로 다른 관리자 계정 | 같은 주소로 동시에 매직링크를 요청하면 서로의 링크를 무효화할 수 있음 |
| W4c-06 | 관리자 지정 스크립트는 로컬 컨테이너만, 이메일은 psql 변수로 전달 | 운영 DB 변경은 사용자 직접(C-05), SQL 주입 방지 |

### 16.3 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 10 files, **215 tests** (검수 39건 추가, 03·04·05번은 "직접 상태 변경 거부"로 갱신) |
| `npm run check` | 통과 — 77 tests |
| `npm run e2e` | 통과 — **42 tests** (360/390). 장소 제안→승인→공개→신고→비공개→작성자 사유 흐름 포함. 로컬 DB를 초기화하지 않고 다시 돌려도 통과 |
| 관리자 지정 스크립트 | 지정·중복 지정·해제·없는 사용자·잘못된 입력 확인 |
| 스크린샷 | WP-04c 6장, 검토 결과 수정 1건 |
| `db:lint`, 타입 생성, build(e2e) | 통과 |

### 16.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-28 | (유지) 관리자가 앱에서 장소를 직접 등록할 방법 없음 | 필요 시 별도 작업 |
| K-29 | 신고자에게 처리 결과 알림 없음 | 알림 기능 도입 시 |
| K-30 | 관리자 목록은 탭마다 최대 100건, 페이지 나누기 없음 | 대기량 증가 시 |
| K-31 | 상세 화면 "← 목록으로" 링크가 44px 미만 | WP-04d에서 해소 (§17) |

### 16.5 WP-04 전체 관문 판정

> Gate: ownership and moderation flows tested.

**통과 (로컬).** 소유권(04a), 장소 제안·중복(04b), 신고·검수·감사 기록(04c)을 pgTAP 215건과 e2e 42건으로 확인했다. 명세의 "일반 사용자 제출 전 신고·관리자 검수 필수" 조건을 충족한다.

## 17. WP-04d 저장·길찾기 기록

### 17.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261015070000_saved_places.sql`: 저장은 공개(approved) 식당만(본인 대기 제안도 불가), `my_saved()`(SECURITY DEFINER, 본인 것만, 나중에 보관된 식당은 이름·상태만 남기고 주소·좌표 숨김) |
| 길찾기 | `lib/domain/directions.ts`: Android는 `intent://route/walk?…;package=com.nhn.android.nmap`(앱 없으면 Play 스토어), iOS는 `nmap://route/walk?…` + 1.5초 뒤 화면이 그대로면 App Store, 그 외는 안내·주소 복사(`DirectionsButton`). 한국 좌표 범위 밖이나 위경도가 뒤바뀐 좌표는 링크를 만들지 않음 |
| 앱 | 상세 상단에 길찾기·저장(로그인 안 했으면 로그인 후 상세로 복귀), 지도 미리보기에 길찾기 + 상세 보기, `/me/saved`, "내 활동" 탭(`ActivityNav`), 계정 버튼 "내 활동" |
| K-31 | 상세 "← 목록으로" 링크를 44px 터치 영역으로 |

### 17.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W4d-01 | 저장 상태는 서버 액션이 돌려준 값을 그대로 사용, 이미 저장된 경우(23505)는 성공으로 처리 | 다른 탭에서 먼저 저장해도 목표 상태는 같음 |
| W4d-02 | 저장 버튼은 상세 본문과 별도로 스트리밍(Suspense) | 상세는 공개 클라이언트로 읽고, 저장 여부만 로그인 세션이 필요 |
| W4d-03 | 플랫폼은 브라우저에서 `useSyncExternalStore`로 판별, 서버는 안내형 버튼을 먼저 렌더링 | 서버에서 UA로 분기하면 캐시·하이드레이션 불일치 위험 |
| W4d-04 | 좌표는 소수 7자리, 이름은 `encodeURIComponent`(공백 `%20`) | 앱이 `+`를 공백으로 해석하는지 문서에 없음 |
| W4d-05 | 안내 패널은 항상 버튼 줄 아래(`order-last`) | 스크린샷 검토에서 패널이 길찾기와 저장 사이에 끼어 저장 버튼이 밀려남 |

### 17.3 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 11 files, **223 tests** (저장 8건 추가) |
| `npm run check` | 통과 — 88 tests (길찾기 링크 11건 추가). 위도·경도를 바꾸는 변이를 넣으면 2건 실패하는 것 확인 |
| `npm run e2e` | 통과 — **52 tests** (360/390, 저장·길찾기 10건 추가). 새 테스트는 `--repeat-each=3`으로 30회 연속 통과 |
| 스크린샷 | WP-04d 10장, 검토 결과 수정 1건(W4d-05) |

### 17.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-32 | 실제 휴대폰에서 네이버 지도 앱 열기·앱 미설치 시 스토어 이동은 확인하지 않음 (Playwright는 링크 값만 검사) | WP-07 실기기 점검 |
| K-33 | iOS App Store 대체 이동은 시간 기반이라, 앱 열기 확인 창이 오래 떠 있으면 스토어로 넘어갈 수 있음 | 실기기에서 확인 후 시간 조정 |
| K-34 | 저장 목록은 최대 200개, 페이지 나누기 없음 | 사용량 증가 시 |

## 18. WP-05a AI 검색 해석 기록

### 18.1 외부 API 근거 (2026-10-15 확인)

| 항목 | 상태 | 근거 |
|---|---|---|
| 모델 ID `claude-haiku-5-5`, 프롬프트 10만 토큰 이하 기준 입력 $0.10 / 출력 $0.50 (백만 토큰당) | VERIFIED | https://platform.claude.com/docs/en/about-claude/models/overview , https://platform.claude.com/docs/en/about-claude/pricing |
| 구조화 출력: `output_config.format` = `{type: "json_schema", schema}`, 베타 헤더 불필요. 숫자 범위·길이 제약은 지원 안 함(앱에서 검증), `additionalProperties: false` 필수, enum 대소문자가 바뀔 수 있음 | VERIFIED | https://platform.claude.com/docs/en/build-with-claude/structured-outputs |
| Haiku 5.5는 기본으로 생각(thinking)이 켜져 있고 `thinking: {type: "disabled"}`를 기본 effort에서 허용. 기본값이 아닌 temperature/top_p는 400 | VERIFIED | https://platform.claude.com/docs/en/build-with-claude/thinking |
| 실제 키로 호출한 결과 | **UNVERIFIED** | 키 발급 전. `npm run eval:parse`로 측정 예정 |

### 18.2 구현

| 영역 | 내용 |
|---|---|
| 도메인 | `lib/domain/ai-query.ts`: 출력 JSON 스키마, 검증·정리(허용 slug만, 대소문자 무시, 가격 1,000원~100만원, 반경은 필터 단계로 올림, 문자열 정리·길이 제한), 필터로 변환(지도 위치 유지, 조건은 모두 교체) |
| 제공자 | `lib/ai/`: `QueryParser` 인터페이스, `AnthropicQueryParser`(fetch, 서버 전용, 생각 끔, max_tokens 400), 테스트 전용 `FixtureQueryParser`(로컬 Supabase일 때만 허용), `interpretQuery`(4초 시간 제한, 절대 예외를 던지지 않음) |
| 프롬프트 | `parse-v1`: 검색어는 `<query>` 안의 데이터로만 취급, 꺾쇠 제거로 태그 탈출 방지, 막연한 표현은 조건으로 바꾸지 않고 `unsupported`로 |
| DB | `20261015090000_ai_search_usage.sql`: `private.ai_usage`(검색어 열 없음), `claim_ai_search`(로그인·하루 30회·월 예산, `HS402`), `finish_ai_search`(본인 대기 행만, 토큰 상한, 비용은 DB에서 계산) |
| 앱 | 검색창의 "AI" 전환 버튼, 서버 액션 `aiSearch`, 해석 결과 안내 카드(적용한 조건·찾지 않은 지역·반영 못 한 조건), 실패 시 입력한 말로 일반 검색 |
| 평가 | `specs/evals/search-parse.cases.json` 48건(주입 6건), `lib/ai/eval-score.ts`, `npm run eval:parse`(키가 있을 때만 실제 호출, 결과는 `specs/evals/results/`) |

### 18.3 결정

| ID | 결정 | 이유 |
|---|---|---|
| W5a-01 | 실행 위치는 Supabase Edge Function이 아니라 Next.js 서버 액션 | 배포 대상 하나, 인터페이스 뒤라 나중에 옮기기 쉬움 (명세 §6과 다름, 되돌릴 수 있음) |
| W5a-02 | SDK 대신 fetch로 Messages API 호출 | 의존성 없이 요청 형태를 그대로 문서와 대조 가능. 시간 제한은 AbortSignal |
| W5a-03 | 비용은 앱이 아니라 DB 함수가 토큰으로 계산, 토큰 수는 상한으로 자름 | 사용자가 함수를 직접 불러 비용을 부풀려도 하루 몇 센트로 제한됨 |
| W5a-04 | 앱 안 예산 기본값 $3/월 (≈ ₩5,000, 환율 여유), `AI_MONTHLY_BUDGET_USD`로 조정 | 확실한 상한은 Claude Console의 지출 한도. 앱 예산은 그 전에 일반 검색으로 넘기기 위한 장치 |
| W5a-05 | AI 해석 결과는 일반 필터로 적용 | 사용자가 필터에서 바로 고치거나 지울 수 있음. 숨은 조건 없음 |
| W5a-06 | 새 AI 검색은 실패하더라도 이전 조건을 지움 | 스크린샷 검토에서 이전 AI 조건이 남아 일반 검색 결과가 0곳이 됨 |
| W5a-07 | 안내 카드는 하단 시트 위 (미리보기 카드 자리) | 스크린샷 검토에서 상단 위치가 장소 제안(＋) 버튼을 가림 |
| W5a-08 | e2e는 규칙 기반 테스트 대역(fixture) 사용 | 키·비용 없이 성공·실패·시간 초과·잘못된 출력 흐름 검증. 실제 품질은 `eval:parse`로만 판단 |

### 18.4 검증 결과 (로컬, 2026-10-15)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 12 files, **238 tests** (AI 사용량 15건 추가). e2e를 돌린 뒤 DB를 초기화하지 않고 돌려도 통과(테스트 준비 단계에서 신고·감사 기록도 비움, 기존 취약점 수정) |
| `npm run check` | 통과 — **108 tests** (해석 검증·시간 제한·프롬프트·채점 20건 추가) |
| `npm run e2e` | 통과 — **62 tests** (360/390, AI 검색 10건 추가: 로그인 요구, 조건 적용, 실패·잘못된 출력·4초 시간 초과 대체) |
| 사용 기록 | e2e 뒤 DB에 결과별 행이 쌓이고 시간 초과는 약 4,004ms로 기록됨, 검색어 원문 없음 |
| `npm run eval:parse` | **실행 안 함** — 키 없음(건너뜀 확인). 관문 측정은 키 발급 후 |
| 스크린샷 | WP-05a 6장, 검토 결과 수정 2건(W5a-06, W5a-07) |

### 18.5 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-35 | 실제 모델 품질(일치율, 주입, 지연)은 아직 측정하지 않음 → **WP-05a 관문 미통과** | 키를 `.env.local`에 넣고 `npm run eval:parse` |
| K-36 | 시간 초과로 끊긴 요청도 Anthropic 쪽에서는 과금될 수 있으나 기록상 비용은 0 | Console 사용량과 비교해 차이가 크면 보정 |
| K-37 | 평가 48건은 직접 만든 합성 질의라 실제 사용자 표현을 대표하지 못함 | 출시 후 동의 기반 수집 여부를 WP-07에서 결정 (Q42로 원문은 저장하지 않음) |
| K-38 | 일반 검색 대체 시 문장 전체를 이름 검색어로 써서 결과가 0곳인 경우가 많음 | 05b의 어휘 검색에서 개선 |

## 19. WP-05b 임베딩·관련도순 기록

### 19.1 외부 API 근거 (2026-10-16 확인)

| 항목 | 상태 | 근거 |
|---|---|---|
| Anthropic은 자체 임베딩 모델이 없고 Voyage AI를 안내 | VERIFIED | https://platform.claude.com/docs/en/build-with-claude/embeddings |
| `voyage-4`: 다국어 검색용, 기본 1024차원, `input_type` query/document 구분 권장, 벡터는 길이 1로 정규화 | VERIFIED | 같은 문서 |
| 엔드포인트 `POST https://ai.mongodb.com/v1/embeddings`, Bearer 키(Atlas model API key) | VERIFIED | 같은 문서 |
| 가격 `voyage-4` $0.06/백만 토큰, 무료 2억 토큰(일회성인지 월별인지 문서에 없음) | VERIFIED(가격) / UNVERIFIED(무료 갱신 주기) | https://www.mongodb.com/docs/voyageai/management/billing/ |
| 한국어 품질 | **UNVERIFIED** | `npm run eval:retrieval`로 측정 예정 (K-40) |

### 19.2 구현

| 영역 | 내용 |
|---|---|
| DB | `20261016000000_hybrid_search.sql`: `private.restaurant_embeddings`(vector(1024)), `private.embedding_jobs`(대기열, 5분 임대, 최대 5회), 원문 생성 `private.embedding_source`, 식당·리뷰·태그 변경 트리거, 작업 함수 `embedding_jobs_claim/complete/fail`(service_role 전용), `rank_restaurants`(후보 ID만 재정렬, RRF k=60: 벡터 + trigram 단어 유사도) |
| 정합성 | 저장 시 원문 해시가 아직 현재 값일 때만 벡터 저장, 처리 중 다시 들어온 작업은 남김, 공개가 아니게 된 식당은 벡터 삭제, 같은 원문은 다시 임베딩하지 않음 |
| 앱 | `lib/ai/embeddings.ts`(Voyage, 테스트 대역), `lib/embeddings/worker.ts`, `POST /api/jobs/embeddings`(Bearer 비밀값, 상수 시간 비교), 서버 액션 `searchByRelevance`(가까운 50곳 후보 → 재정렬, 질의 벡터 캐시), 목록의 "관련도순" 안내와 "거리순" 버튼 |
| 해석 | 프롬프트 `parse-v2`: 거를 수 없는 선호는 `semantic_query`로(순서에만 사용), 사실 확인이 필요한 조건은 계속 `unsupported`. URL `sem` |
| 평가 | `specs/evals/retrieval.corpus.json`(합성 30곳·질의 18개, 등급 라벨), `lib/ai/retrieval-metrics.ts`, `npm run eval:retrieval`(로컬 DB에 넣고 측정 후 삭제) |

### 19.3 결정

| ID | 결정 | 이유 |
|---|---|---|
| W5b-01 | 재정렬은 `search_restaurants` 결과 ID에만 적용하는 별도 함수 | 하드 필터를 한 곳(기존 검색)에만 두어 의미 검색이 조건을 완화할 수 없게 함 |
| W5b-02 | 후보는 조건을 통과한 가까운 50곳 | 기존 페이지 상한(50)과 같음. 넘으면 안내 문구 표시 (K-39) |
| W5b-03 | 임베딩이 없는 식당(리뷰 없음)도 후보에 남고 순위만 뒤로 | 순서만 바뀌고 결과 수는 같아야 함 (e2e로 확인) |
| W5b-04 | 질의 벡터는 서버 메모리에 200개까지 캐시 | 같은 검색의 페이지 넘김·새로고침마다 다시 임베딩하지 않음 |
| W5b-05 | 비로그인 사용자는 `sem`이 있어도 거리순 + 안내 | AI 검색과 같은 기준(Q41), 임베딩 비용 남용 방지 |
| W5b-06 | 평가 코퍼스는 API가 아니라 로컬 컨테이너의 postgres로 넣고 지움 | service_role에 private 스키마 권한을 넓히지 않기 위함 (처음 시도에서 트리거 권한 오류로 발견) |
| W5b-07 | `rank_restaurants`는 로그인 사용자와 service_role(평가)만 | 익명 호출로 임베딩 데이터를 조회하지 못하게 함 |

### 19.4 검증 결과 (로컬, 2026-10-16)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 13 files, **264 tests** (임베딩·대기열·재정렬 26건 추가) |
| `npm run check` | 통과 — **122 tests** |
| `npm run e2e` | 통과 — **70 tests** (360/390, 관련도순 8건 추가: 작업 경로 인증, 비로그인 거리순, 재정렬과 결과 수 유지, 거리순 복귀, AI 선호 전달) |
| `EVAL_EMBEDDER=fixture npm run eval:retrieval` | 실행 확인(평가 도구 점검용, 품질 측정 아님): recall@10 0.79 / 거리순 0.24, 삽입 데이터 정리 확인 |
| `npm run eval:retrieval` (Voyage) | **실행 안 함** — 키 없음 |
| 스크린샷 | WP-05b 4장, 문제 없음 |

### 19.5 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-39 | 조건을 통과한 식당이 50곳을 넘으면 가까운 50곳 안에서만 관련도순 | 데이터가 늘면 후보 수·인덱스(HNSW) 재검토 |
| K-40 | 실제 임베딩 품질 미측정 → **WP-05b 관문 미통과** | `VOYAGE_API_KEY` 설정 후 `npm run eval:retrieval` |
| K-41 | 임베딩 토큰 비용은 작업 결과로만 보고, 월 예산 기록(`ai_usage`)에는 없음 | 무료 한도 소진 전 WP-07에서 비용 기록 통합 |
| K-42 | 운영에서 대기열을 주기적으로 처리하는 스케줄 없음 | WP-07 (Vercel Cron 등) |
| K-43 | 평가 코퍼스는 합성이라 실제 리뷰 분포와 다름 | 실제 데이터 확보 후(D-03) 라벨 추가 |

## 20. 제공자 변경(OpenAI)과 실측 평가 기록

### 20.1 외부 API 근거 (2026-10-16 확인)

| 항목 | 상태 | 근거 |
|---|---|---|
| `gpt-6-luna`: 입력 $0.10 / 출력 $0.50 (백만 토큰당), Responses·Chat Completions 지원, Structured Outputs 지원, reasoning effort `none`~`max`(기본 `medium`) | VERIFIED | https://developers.openai.com/api/docs/models/gpt-6-luna |
| Structured Outputs: `text.format` = `{type: "json_schema", name, strict: true, schema}`, 모든 필드 required, `additionalProperties: false`, `anyOf` 지원(루트 제외), 거절은 `refusal` 콘텐츠, `status: "incomplete"`는 잘린 출력 | VERIFIED | https://developers.openai.com/api/docs/guides/structured-outputs |
| 429는 `rate_limit_exceeded`와 `insufficient_quota` 둘 다에 쓰임 → 오류 코드만 기록(메시지 원문은 기록 안 함) | VERIFIED(실측) | 실제 응답 |

### 20.2 변경

| 영역 | 내용 |
|---|---|
| 해석기 | `lib/ai/openai.ts`(Responses API, `reasoning.effort: "none"`, `store: false`, max_output_tokens 400), 기본 제공자 `openai` |
| DB | `20261016020000_openai_pricing.sql`: 사용 기록 비용에 `gpt-6-luna` 단가 추가(없으면 의도적으로 비싸게 계산되어 월 예산이 빨리 소진됨) |
| 환경 변수 | `OPENAI_API_KEY`(사용자 `.env`의 `OPEN_AI_API_KEY` 이름만 변경, 값은 그대로), 평가 스크립트는 `.env`와 `.env.local`을 모두 읽음 |
| 평가 | 실패 이유(상태·오류 코드)를 결과에 남김, 임베딩 429·5xx 재시도(`RetryingEmbedder`, 작업·평가 전용), 질의 임베딩을 한 번에 요청 |
| 브랜치 | PR #9가 `main`이 아닌 05a 브랜치로 병합되어, 05b 코드는 이 PR로 `main`에 들어감 |

### 20.3 실측 결과

| 평가 | 결과 |
|---|---|
| `npm run eval:retrieval` (voyage-4) | **통과 — WP-05b 관문 통과.** recall@10 0.88(기준 0.8), NDCG@10 0.88 vs 거리순 0.15(+0.73, 기준 +0.1). 벡터만 0.93/0.88, 어휘만 0.76/0.82. 임베딩 1,919 토큰 |
| `npm run eval:parse` (gpt-6-luna) | **측정 불가 — WP-05a 관문 보류.** 48건 중 30건(재실행 시 45건)이 `429 rate_limit_exceeded`. 응답을 받은 18건은 모두 통과(주입 1건 포함), p95 2.9초. 비용 약 $0.002 |

### 20.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-35 | (갱신) OpenAI 계정 사용량 제한으로 실측 불가 | 사용자: OpenAI 결제 수단 등록·사용 등급 확인 후 `npm run eval:parse` 재실행 |
| K-40 | ~~실제 임베딩 품질 미측정~~ **해소 (20.3)** | — |
| K-44 | 부정 표현을 이해하지 못함: "기다리지 않는 곳" 1위가 "웨이팅이 길다"는 식당 | 05c에서 근거 문장을 보여 줘 사용자가 판단하게 하고, 부정 표현은 해석기에서 `unsupported` 처리 검토 |
| K-45 | 합친 순위(RRF)의 recall(0.88)이 벡터만(0.93)보다 낮음 | 데이터가 늘면 가중치 조정 재평가 |
| K-46 | 운영 중 OpenAI 429가 잦으면 AI 검색이 계속 일반 검색으로 대체됨(화면은 정상) | 사용량 기록의 `error` 비율을 WP-07 모니터링에 포함 |

## 21. WP-05c 근거 설명 기록

### 21.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261016030000_review_evidence.sql`: `private.review_embeddings`, `review_embedding_backlog`(데이터에서 대기 목록 계산 + 보일 수 없게 된 벡터 삭제), `review_embeddings_store`(원문 해시가 현재 값일 때만 저장), `restaurant_evidence`(식당별 가장 가까운 승인 리뷰, 유사도 기준 이상만, 읽을 때 다시 승인 상태 확인) |
| 작업 | 식당 작업 뒤 리뷰 대기 목록도 처리(`reviews` 보고) |
| 앱 | 관련도순 결과에 근거 포함, `EvidenceQuote`(인용 링크 44px·방문일·"그대로 가져왔어요"), 미리보기 카드에도 표시, 상세에서 해당 리뷰로 스크롤·강조(`HighlightHashTarget`) |
| 해석 | 프롬프트 `parse-v3`: 부정·배제 표현은 `unsupported`, 상한 표현은 필터. 평가 사례 4건(`neg-01~04`)과 `noSemantic` 채점 추가 |
| 평가 | 코퍼스 v2에 리뷰 단위 근거 라벨, `lib/ai/evidence-metrics.ts`(적중률·엉뚱한 근거 비율·기준값 보정), `eval:retrieval`이 근거까지 측정 |

### 21.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W5c-01 | 리뷰 벡터 대기 목록은 트리거 없이 데이터에서 계산 | 기존 리뷰도 자동으로 채워지고, 수정·비공개도 같은 규칙으로 처리됨 |
| W5c-02 | 인용은 앞부분만 자르고(… 표시) 중간 편집 없음 | 원문 일치를 자동 검사할 수 있음(`isVerbatimExcerpt`) |
| W5c-03 | voyage-4 근거 기준값 0.5 | 0.20~0.80 범위에서 목표(80%)를 지키는 가장 높은 값으로 실측 보정 |
| W5c-04 | 상세 강조는 CSS `:target` 대신 클라이언트에서 처리 | 스크린샷 검토에서 클라이언트 이동 후 강조가 안 되고 리뷰가 화면 끝에 걸림 |
| W5c-05 | `EVAL_EMBEDDER=fixture`가 키보다 우선 | `.env`에 키가 있으면 의도치 않게 실측(과금)이 돌던 문제 |

### 21.3 검증 결과 (2026-10-16)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 14 files, **281 tests** (근거 15건 추가: 권한, 대기 목록 범위, 오래된 원문 거부, 대기·비공개 리뷰 미인용, 정리) |
| `npm run check` | 통과 — **133 tests** |
| `npm run e2e` | 통과 — **72 tests** (근거 인용·링크·강조, "아직 없어요") |
| `npm run eval:retrieval` (voyage-4, 실측) | **통과 — WP-05c 관문 통과.** 원문 일치 100%, 강한 일치 상위 3곳 근거 적중 83%(기준 80%), 관련 없는 결과에 근거 표시 8.7%. 리뷰 벡터 60개, 2,785 토큰. recall@10 0.88 유지 |
| `npm run eval:parse` | 미실행 — OpenAI 사용량 제한(K-35) |
| 스크린샷 | WP-05c 4장, 검토 결과 수정 1건(W5c-04) |

### 21.4 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-44 | (갱신) 해석기에서 부정 표현을 걸러내도록 바꿨으나 실측 확인은 OpenAI 제한 해제 후 | `npm run eval:parse`의 `neg-*` 사례 |
| K-47 | 관련 없는 결과의 약 9%에 근거가 표시됨(유사하지만 맞지 않는 리뷰) | 실제 데이터가 쌓이면 기준값 재보정 |
| K-48 | 리뷰가 길면 앞 80자만 보여 주어 맞는 문장이 뒤에 있을 수 있음 | 필요 시 문장 단위 근거로 확장 |

## 22. WP-06 오늘의 추천 기록

### 22.1 구현

| 영역 | 내용 |
|---|---|
| 도메인 | `lib/domain/recommend.ts`: 자격 조건(예산은 가격을 아는 곳만, 종류 포함·제외), 점수(공개 가중치, 혼밥 편안함 보정 평균, 거리, 최근 방문 반감기 60일, 기분 태그 일치), 선택(서로 다른 종류 우선, 리뷰 없는 곳·가격 없는 곳 각 1곳 이하, 본 곳 제외), 이유 문장(저장된 값만), 3곳 미만 설명 |
| 후보 | `lib/recommendations/candidates.ts`: 기존 공개 검색으로 현재 지도 안 가까운 50곳, 기분 태그는 태그별 검색으로 확인만 하고 거르지 않음. DB 변경 없음 |
| 앱 | 상단 "오늘 뭐 먹지?" 칩, `RecommendPanel`(기분·예산 칩, 음식 종류는 접힘, 실행 뒤 조건 한 줄 요약 + "조건 바꾸기"), 번호 카드·이유·"새로 발견"/"가격 정보 없음" 표시, 지도·패스·다른 추천 보기, "추천 기준" 설명, 지도 마커 번호(`textContent`) |

### 22.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W6-01 | 추천은 브라우저에서 계산(순수 함수) | 결정적이고 비용·서버 기록이 없음(Q61), 기존 공개 검색 재사용 |
| W6-02 | "오늘" 기준 날짜는 사용자 기기의 날짜 | 최근 방문 점수만 영향, 하루 안에서는 같은 결과 |
| W6-03 | 음식 종류 칩은 접어 두고, 실행 뒤 조건은 한 줄로 접음 | 스크린샷 검토: 추천 버튼이 시트 아래로 밀리고 결과가 화면 밖에 나옴 |
| W6-04 | 예산 칩 표시는 "7천 원" 형식, 접근성 이름은 "7,000원 이하" | 360px에서 칩이 두 줄이 되어 버튼이 화면 밖으로 밀림 |
| W6-05 | "패스"는 해당 곳만 빼고 다시 계산 | 남은 추천은 점수 순서가 같으면 그대로 유지됨 |

### 22.3 검증 결과 (2026-10-19)

| 명령 | 결과 |
|---|---|
| `npm run check` | 통과 — **150 tests** (추천 13건 + 표시 4건: 무작위 200개 후보 묶음에서도 예산·제외 위반 0, 리뷰·가격 없음, 빈 결과 설명, 다양성, 본 곳 제외, 동점 순서 고정). 예산 규칙을 깨뜨리면 3건 실패하는 것 확인 |
| `npm run db:test` | 통과 — 281 tests (DB 변경 없음) |
| `npm run e2e` | 통과 — **78 tests** (추천 6건, 3회 반복 18/18 통과) |
| 스크린샷 | WP-06 6장, 검토 결과 수정 2건(W6-03, W6-04) |
| 로컬 환경 | Docker Desktop이 3일 가동 뒤 이메일 템플릿 제공 실패(인증 `otp_expired`)와 컨테이너 생성 실패 → Docker 재시작으로 해결, 코드 문제 아님 |

### 22.4 WP-06 관문 판정

> Gate: candidate eligibility and missing-data cases tested.

**통과.** 자격 조건(예산·종류)은 무작위 후보 묶음까지 포함한 단위 테스트와 e2e로, 데이터가 없는 경우(리뷰 없음·가격 없음·후보 3곳 미만·0곳)는 설명 문구까지 테스트로 확인했다.

### 22.5 알려진 한계

| ID | 내용 | 조치 |
|---|---|---|
| K-49 | 후보는 지도 중심에서 가까운 50곳까지(넘으면 안내) | 데이터가 늘면 후보 수 재검토 |
| K-50 | 기분은 3가지 태그로만 표현, 자연어 기분은 AI 검색으로 | 사용량을 보고 확장 |
| K-51 | 가중치는 합성 시드로만 확인, 실제 만족도 근거 없음 | 실데이터 후 피드백 수집 여부와 함께 재검토(Phase 4, 동의 기반) |

## 23. WP-07 출시 준비 기록

### 23.1 구현

| 영역 | 내용 |
|---|---|
| DB | `20261019000000_account_deletion_retention.sql`: 리뷰 작성자 외래 키를 `set null`(익명화), `delete_my_account()`(본인만), `purge_expired_data()`(service_role) |
| 앱 | `/me/account`(설명 + "삭제" 입력 확인), `/account-deleted`, `/privacy`, `/terms`(휴대폰은 표 대신 카드), 로그인 화면 동의 안내, 내 활동의 계정·정책 링크 |
| 출시 스위치 | `NEXT_PUBLIC_AI_SEARCH_ENABLED`가 `true`일 때만 AI 버튼 표시, 서버 액션도 같은 확인 |
| 작업 | `GET /api/jobs/daily`(Vercel Cron, `CRON_SECRET`), `vercel.json` 매일 03:00 KST, 공통 Bearer 확인(`lib/jobs/auth.ts`) |
| 운영 문서 | `specs/ops/deploy.md`(배포 절차·환경 변수·인증 설정·관리자·점검·백업·모니터링), `specs/ops/device-check.md`(실기기 점검표) |

### 23.2 결정

| ID | 결정 | 이유 |
|---|---|---|
| W7-01 | 계정 삭제는 DB 함수(definer)에서 `auth.users` 행 삭제 | 비밀 키 없이 본인만 삭제 가능, 연결 데이터는 외래 키 규칙으로 일관 처리 |
| W7-02 | 운영 인증 설정(URL·SMTP·메일 템플릿)은 대시보드에서 | `supabase config push`는 로컬 `site_url`(localhost)까지 밀어 넣을 수 있음 |
| W7-03 | 정책 문서의 표는 휴대폰에서 카드로 | 스크린샷 검토: 가로 스크롤 표가 보유 기간·국가 열을 가림 |
| W7-04 | e2e 기본 대기 10초, 계정 삭제 20초 | 두 화면 크기 병렬 실행 시 서버 이동이 5초를 넘는 경우가 반복됨(단독 실행은 통과) |
| W7-05 | 백업은 주 1회 수동 덤프(`backups/`, git 제외) | 무료 플랜의 백업 다운로드·시점 복구에 기대지 않음 |

### 23.3 검증 결과 (로컬, 2026-10-19)

| 명령 | 결과 |
|---|---|
| `npm run db:test` | 통과 — 15 files, **295 tests** (계정 삭제·익명화·보관 기간 14건) |
| `npm run check` | 통과 — 133 tests |
| `npm run e2e` | 통과 — **80 tests** 두 번 연속 (계정 삭제, 정책 페이지, 로그인 동의, 매일 작업 인증) |
| 스크린샷 | WP-07 8장, 검토 결과 수정 1건(W7-03) |
| 운영 배포 | **아직 안 함** — 사용자 계정 생성 후 `specs/ops/deploy.md` 순서로 진행 |

### 23.4 남은 일 (사용자)

| ID | 내용 |
|---|---|
| K-52 | 개인정보처리방침·이용약관 법률 검토(특히 국외 이전 고지, 위치정보 이용 관련 신고 필요 여부) |
| K-53 | B3: NCP Maps 약관의 데이터 보관 조항 확인 → 역지오코딩 도입 여부 |
| K-54 | Gmail 발신 계정·앱 비밀번호, Supabase·Vercel 가입, NCP 서비스 URL 추가와 이용량 한도 |
| K-55 | 실기기 점검(`specs/ops/device-check.md`) |

---

## 변경 이력

| 날짜 | 변경 | 작성 |
|---|---|---|
| 2026-10-15 | WP-00 최초 작성: 저장소 감사, 가정/확정/미결정 분리, 외부 API 근거, 블로커 | Claude (WP-00) |
| 2026-10-15 | WP-01: 툴체인 설치, Next.js/Supabase/Vitest/CI 스캐폴딩, 검증 결과, B-05/B-06 추가 | Claude (WP-01) |
| 2026-10-15 | B-05: WSL 3.0.3.0 설치 완료, 재부팅 대기 | Claude (WP-01) |
| 2026-10-15 | WP-01 Gate 통과: db:start/reset/lint 검증, B-05/B-06 해소, B-07 추가, W1-07~09 | Claude (WP-01) |
| 2026-10-15 | WP-01 CI 통과 기록, B-07 해소 | Claude (WP-01) |
| 2026-10-15 | WP-02: Q1–Q6 확정(C-09~C-14), 스키마·RLS·pgTAP 83건, W2-01~09, K-05~10 | Claude (WP-02) |
| 2026-10-15 | WP-03: Q7–Q12 확정(C-15~C-20), 검색·상세 RPC, 지도·목록·상세 UI, pgTAP 113건, e2e 7건, B-04·K-08 해소, W3-01~09, K-11~17 | Claude (WP-03) |
| 2026-10-15 | WP-04a: Q13–Q19 확정(C-21~C-27), 매직링크 인증, 리뷰 작성·수정·삭제, 제출 한도, removed 동결, pgTAP 135건, e2e 12건, W4a-01~07, K-18~20 | Claude (WP-04a) |
| 2026-10-15 | 명세 v0.2 채택(C-28), Q20–Q23(C-29~C-32). WP-03b 지도 우선 홈, 영역 검색, pgTAP 146건, e2e 32건(360/390), 모바일 UX 보고서, W3b-01~09, K-21~24 | Claude (WP-03b) |
| 2026-10-15 | WP-04b: Q24–Q27(C-33~C-36), 장소 제안·중복 탐지, 직접 INSERT 회수, pgTAP 173건, e2e 38건, W4b-01~07, K-25~28 | Claude (WP-04b) |
| 2026-10-15 | WP-04c: Q28–Q32(C-37~C-41), 신고·검수·감사 기록, 직접 상태 변경 회수, 관리자 지정 스크립트, pgTAP 215건, e2e 42건, W4c-01~06, K-05·K-06 해소, K-29~31. WP-04 관문 통과 | Claude (WP-04c) |
| 2026-10-15 | WP-04d: Q33–Q37(C-42~C-46), 저장·길찾기·내 활동 탭, 저장은 공개 식당만, pgTAP 223건, e2e 52건, W4d-01~05, K-31 해소, K-32~34 | Claude (WP-04d) |
| 2026-10-15 | WP-05a: Q38–Q43(C-47~C-52, 월 한도 ₩5,000), D-06 해소, 자연어 해석·대체·사용량 기록·평가 세트, pgTAP 238건, Vitest 108건, e2e 62건, W5a-01~08, K-35~38. 실측 평가는 키 발급 후 | Claude (WP-05a) |
| 2026-10-16 | WP-05b: Q44–Q49(C-53~C-58), 임베딩 대기열·관련도순 재정렬·검색 평가 도구, pgTAP 264건, Vitest 122건, e2e 70건, W5b-01~07, K-39~43. 실측 평가는 키 발급 후 | Claude (WP-05b) |
| 2026-10-16 | 해석 제공자 OpenAI로 변경(C-59), 실측 평가: 05b 관문 통과, 05a는 OpenAI 사용량 제한으로 보류, D-02 해소 표기, K-44~46 | Claude |
| 2026-10-16 | WP-05c: Q50–Q55(C-60~C-65), 리뷰 단위 근거 인용·부정 표현 처리, 실측으로 05c 관문 통과, pgTAP 281건, Vitest 133건, e2e 72건, W5c-01~05, K-47~48 | Claude (WP-05c) |
| 2026-10-19 | WP-06: Q56–Q62(C-66~C-72), 결정적 추천·다양성·데이터 없음 처리, 단위 150건, e2e 78건, W6-01~05, K-49~51, WP-06 관문 통과 | Claude (WP-06) |
| 2026-10-19 | WP-07(코드): C-73~C-80, D-01·D-03·D-11 해소, 계정 삭제·익명화, 보관 기간, 정책 문서, AI 출시 스위치, 매일 작업, 배포 절차서, pgTAP 295건, e2e 80건, W7-01~05, K-52~55 | Claude (WP-07) |
