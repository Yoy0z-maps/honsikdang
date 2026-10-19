# 운영 배포 절차 (WP-07)

무료 플랜(Supabase Free, Vercel Hobby, NCP 대표 계정 무료 이용량, Voyage 무료 토큰)으로 첫 배포를 하는 순서입니다. 👤는 사용자(계정·비밀값이 필요한 일), 🤖는 Claude가 하는 일입니다. 비밀값은 채팅에 붙여 넣지 말고 각 대시보드에 직접 입력하세요.

## 0. 준비

- 🤖 WP-06(#12)와 WP-07 PR이 `main`에 병합되어 있어야 합니다.
- 👤 Gmail 전용 계정 하나(예: 혼식당 발신용), 2단계 인증 켜기 → [앱 비밀번호](https://myaccount.google.com/apppasswords) 발급(16자리). 이 값은 4단계에서 Supabase에만 입력합니다.

## 1. 👤 Supabase 프로젝트 만들기

1. <https://supabase.com> 가입(GitHub 로그인 가능) → **New project**
2. 이름 `honsikdang`, **Region: Northeast Asia (Seoul)** (개인정보처리방침에 서울 리전으로 적었습니다), Plan: Free
3. Database password는 비밀번호 관리자에 저장(이후 `link` 때 한 번 입력)
4. 만든 뒤 **Project ref**(주소 `https://<ref>.supabase.co`의 `<ref>`)를 Claude에게 알려 주세요. ref는 비밀값이 아닙니다.

## 2. 🤖 마이그레이션 적용 (사용자 승인 C1)

1. 👤 터미널에서 한 번: `npx supabase login` (브라우저 로그인)
2. 🤖 `npx supabase link --project-ref <ref>` (DB 비밀번호는 👤가 입력)
3. 🤖 `npx supabase db push --dry-run`으로 적용할 마이그레이션 목록을 보여 드린 뒤 `npx supabase db push`
   - `seed.sql`(예시 데이터)은 운영에 넣지 않습니다. `db push`는 시드를 실행하지 않습니다.
4. 🤖 `npx supabase db lint --linked --schema public`로 확인

## 3. 👤 Vercel 배포

1. <https://vercel.com> 가입(GitHub 로그인) → **Add New → Project** → `Yoy0z-maps/honsikdang` Import
2. **Environment Variables** (Production):

| 이름 | 값을 찾는 곳 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | 같은 곳 → Secret keys | `sb_secret_…` · **절대 `NEXT_PUBLIC_` 붙이지 않기** |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | NCP 콘솔 → Maps → Application | 로컬 `.env`와 같은 값 |
| `VOYAGE_API_KEY` | MongoDB Atlas → AI Model APIs | 로컬 `.env`와 같은 값 |
| `CRON_SECRET` | 직접 만든 임의 문자열 32자 이상 | Vercel Cron이 매일 작업을 부를 때 사용 |
| `AI_MONTHLY_BUDGET_USD` | `3` | AI 검색을 켤 때를 대비 |
| `NEXT_PUBLIC_AI_SEARCH_ENABLED` | 넣지 않음(=꺼짐, C-76) | 켤 때 `true` + `OPENAI_API_KEY` 추가 후 재배포 |

3. **Deploy** → 주소 확인(예: `https://honsikdang.vercel.app`). 이 주소를 Claude에게 알려 주세요.

> Hobby 플랜은 비상업적 개인 용도 기준입니다. 수익화 계획이 생기면 Pro로 옮겨야 합니다(Vercel 약관 확인).

## 4. 👤 Supabase 인증 설정 (대시보드)

1. Authentication → **URL Configuration**
   - Site URL: `https://<vercel 주소>`
   - Redirect URLs: `https://<vercel 주소>/auth/confirm**`
2. Authentication → **Emails → Templates**: "Magic Link"와 "Confirm signup" 둘 다 본문을 [`supabase/templates/magic_link.html`](../../supabase/templates/magic_link.html) 내용으로 바꾸기 (링크 형식이 `/auth/confirm?…token_hash=…`여야 로그인이 됩니다)
3. Authentication → **Emails → SMTP Settings** → Enable custom SMTP
   - Sender email: 발신용 Gmail 주소, Sender name: `혼식당`
   - Host `smtp.gmail.com`, Port `587`, Username: Gmail 주소, Password: 0단계의 **앱 비밀번호**
4. Authentication → **Rate Limits**: 이메일 발송 시간당 한도를 베타 규모에 맞게(예: 30) 확인

## 5. 👤 네이버 지도

- NCP 콘솔 → Maps → Application → **Web 서비스 URL**에 `https://<vercel 주소>` 추가(경로·포트 없이)
- 대표 계정인지 확인하고, **이용량 한도·알림** 설정

## 6. 운영자 계정 (C4)

1. 👤 운영 사이트에서 `work.johnhan@gmail.com`으로 한 번 로그인
2. 👤 Supabase → SQL Editor에서 실행 ([grant-admin.md](grant-admin.md)와 같은 내용):

```sql
insert into private.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'work.johnhan@gmail.com'
on conflict do nothing;
```

3. 🤖 `/admin` 접근 확인

## 7. 🤖 운영 점검 (스모크 테스트)

- 지도 표시, 검색, 상세, 길찾기 링크
- 로그인 메일 수신(Gmail 발신) → 로그인
- 장소 제안 → `/admin`에서 승인 → 지도에 표시 → 리뷰 작성 → 승인
- "오늘 뭐 먹지?" 추천
- 매일 작업 수동 실행 1회: `GET /api/jobs/daily` (`Authorization: Bearer $CRON_SECRET`) → `purged`, `embeddings` 결과 확인
- 계정 삭제 → 리뷰 익명 유지 확인(테스트 계정으로)
- 개인정보처리방침·이용약관 페이지

## 8. 백업과 복구 리허설

- 무료 플랜은 백업을 내려받거나 시점 복구를 할 수 없다고 보고 직접 백업합니다.
- 🤖 배포 직후와 이후 매주: `npx supabase db dump --linked --data-only -f backups/<날짜>-data.sql` 그리고 스키마는 마이그레이션으로 재현
- 🤖 리허설: 로컬에서 `npx supabase db reset`(마이그레이션만) 뒤 덤프를 복원해 지도·상세·로그인 후 데이터가 보이는지 확인
- `backups/`는 git에 올리지 않습니다(`.gitignore`). 이메일이 들어 있으니 안전한 곳에 보관하세요.

## 9. 모니터링 (C-78)

| 무엇을 | 어디서 |
|---|---|
| 서버 오류·느린 요청 | Vercel → Project → Logs |
| 매일 작업 결과 | Vercel → Logs에서 `daily job` 검색, Cron Jobs 탭 |
| DB 용량(무료 500MB)·요청량 | Supabase → Reports / Usage |
| 지도 이용량 | NCP 콘솔 → 이용량·한도 알림 |
| 임베딩 토큰 | MongoDB Atlas → AI Model APIs → Usage |
| AI 검색(켰을 때) 비용·오류율 | DB `private.ai_usage` (90일 보관), OpenAI 대시보드 |

외부 분석 도구와 이벤트 수집은 쓰지 않습니다(C-78).

## 10. 무료 플랜 주의

- Supabase Free는 7일간 요청이 없으면 일시 정지됩니다. 매일 작업(Vercel Cron)이 DB를 호출해 이를 막습니다. 정지되면 대시보드에서 Restore.
- Vercel Hobby Cron은 하루 1회라 새 리뷰는 다음 날 관련도순·근거에 반영됩니다.
