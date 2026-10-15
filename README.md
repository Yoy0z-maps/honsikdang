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

## 스크립트

| 명령               | 내용                                      |
| ------------------ | ----------------------------------------- |
| `npm run check`    | 포맷 검사 + 타입체크 + 린트 + 단위 테스트 |
| `npm run build`    | 프로덕션 빌드                             |
| `npm run db:reset` | 로컬 DB를 마이그레이션 기준으로 재생성    |
| `npm run format`   | Prettier 적용                             |

마이그레이션은 `supabase/migrations/`에 있으며, 프로덕션 적용은 승인 없이 하지 않습니다.
