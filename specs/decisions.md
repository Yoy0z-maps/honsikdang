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
| A-11 | AI 제공자는 인터페이스 뒤로 격리, WP-05 전까지 선택 보류 | WP-05 | — |
| A-12 | 관리자 권한은 비노출 `private.user_roles` + `private.is_admin()` (WP-02에서 구현, §11) | WP-02 | — |
| A-13 | 스테이징 호스팅은 WP-01에서 결정하지 않음. CI는 로컬 검증 위주로 먼저 구성 | WP-01 | — |

---

## 4. 미결정 사항 (OPEN) — 사용자 결정 필요

| ID | 질문 (명세 §16) | 현재 기본값 | 막히는 단계 |
|---|---|---|---|
| D-01 | 초기 지역: 서울 한 상권 / 여러 상권 / 전국? 구체적인 상권명? | A-02 | WP-03 (시드·지도 초기 중심) |
| D-02 | Web/PWA 우선 vs 네이티브 우선? | A-01 | WP-01 (이번에 확인 권장) |
| D-03 | 초기 50–100곳의 실제 데이터 확보 방법? | 미정 | WP-04 이후 런치 |
| D-04 | ~~장소·리뷰 즉시 공개 vs 사전 승인?~~ | **해소 (C-09)** | — |
| D-05 | ~~인증 제공자, 리뷰 작성자 공개~~ **해소 (C-21, C-22)**. 이미지 업로드는 A-07(없음) 유지 | — | — |
| D-06 | AI 제공자와 월 지출 상한? | A-11 | WP-05 |
| D-07 | Naver 장소 데이터(지역 검색·지오코딩) 저장 허용 범위? (상품은 Dynamic Map만 사용으로 확정, C-16) | A-10 | WP-04 장소 제안 |
| D-08 | ~~가격 표현~~ | **해소 (C-14)** | — |
| D-09 | ~~영구 프로젝트 폴더, GitHub 원격~~ | **해소 (C-08)** | — |
| D-10 | ~~로컬 툴체인 설치 승인~~ | **해소 (C-07)** | — |
| D-11 | 예산: Supabase 플랜, NCP 사용량 과금 한도 | 미정 | 스테이징/런치 |

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
| K-05 | 상태 변경과 `moderation_actions` 기록이 원자적이지 않음 (별도 insert) | WP-04: 검수 RPC로 묶기 |
| K-06 | 장소 중복 탐지, 제출 요청 제한 없음 | 리뷰 한도는 04a에서 해소. 장소·신고는 04b/04c |
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

**조건부 통과.** 자동화 가능한 §5A 수락 기준 전부 통과(360/390). 실기기·실지도 항목(K-21)은 사용자 확인 대기.

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
