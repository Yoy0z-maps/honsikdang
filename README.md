# 혼식당 (Honsikdang)

혼자 먹기 편한 식당을 함께 찾는 지도. 기준 명세는 `HONSIKDANG_MASTER_PLAN.md`, 결정 기록은 `specs/decisions.md`.

## 요구 사항

- Node.js 24 LTS (`.node-version`)
- Docker 호환 컨테이너 런타임 (Supabase 로컬 개발용, Windows는 WSL2 필요)

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값은 `npm run db:start` 출력에서 확인
npm run db:start             # 로컬 Supabase (Docker 필요)
npm run dev
```

Windows PowerShell에서 `npm`이 실행 정책으로 막히면 `npm.cmd run dev`를 쓰세요.

로컬 로그인 메일은 실제로 발송되지 않고 Mailpit(http://127.0.0.1:54324)에 쌓입니다. 로그인 링크는 http://localhost:3000 에서 엽니다.

## 스크립트

| 명령                                | 내용                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| `npm run check`                     | 포맷 검사 + 타입체크 + 린트 + 단위 테스트                      |
| `npm run build`                     | 프로덕션 빌드                                                  |
| `npm run db:reset`                  | 로컬 DB를 마이그레이션 기준으로 재생성                         |
| `npm run e2e`                       | Playwright 모바일 e2e (로컬 Supabase 필요)                     |
| `npm run db:test`                   | pgTAP 권한 테스트 (`supabase/tests`)                           |
| `npm run db:types`                  | DB 스키마에서 TypeScript 타입 생성                             |
| `npm run db:grant-admin -- <email>` | 로컬 DB에 관리자 지정 (`specs/ops/grant-admin.md`)             |
| `npm run format`                    | Prettier 적용                                                  |
| `npm run eval:parse`                | AI 검색 해석 실측 평가 (`ANTHROPIC_API_KEY` 필요, 소액 과금)   |
| `npm run embed:sync`                | 임베딩 대기열 처리 (실행 중인 앱 필요, `EMBEDDING_JOB_SECRET`) |
| `npm run eval:retrieval`            | 관련도순 검색 평가 (로컬 DB 전용, `VOYAGE_API_KEY` 필요)       |

마이그레이션은 `supabase/migrations/`에 있으며, 프로덕션 적용은 승인 없이 하지 않습니다.
