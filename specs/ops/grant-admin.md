# 운영자(관리자) 지정

결정 Q18·C-26: 앱 안에는 관리자 지정 기능이 없습니다. 관리자 목록은 Data API에 노출되지 않는 `private.user_roles`에만 있습니다.

## 로컬

```bash
npm run db:grant-admin -- someone@example.com
npm run db:grant-admin -- someone@example.com --revoke
```

- 로컬 Docker 컨테이너(`supabase_db_<project_id>`)에서만 동작합니다.
- 대상 사용자가 한 번 로그인해서 `auth.users`에 행이 있어야 합니다.
- 로컬 시드에는 `seed-user-3@example.invalid`가 관리자로 들어 있습니다(Q30). 운영 DB에는 시드를 넣지 않습니다.

## 운영 (호스티드 Supabase)

운영 DB 변경이므로 **프로젝트 소유자가 직접** 실행합니다.

1. 지정할 사람이 앱에 한 번 로그인합니다.
2. Supabase 대시보드 → SQL Editor에서 실행합니다.

```sql
insert into private.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = lower('someone@example.com')
on conflict (user_id) do nothing
returning user_id;
```

3. 결과가 0행이면 이메일을 확인하거나, 그 사람이 먼저 로그인했는지 확인합니다.
4. 해제할 때는 다음을 실행합니다.

```sql
delete from private.user_roles r using auth.users u
 where r.user_id = u.id and lower(u.email) = lower('someone@example.com');
```

## 확인

관리자로 로그인해 `/admin`이 열리면 됩니다. 관리자가 아니면 `/admin`은 404입니다(Q31).

모든 검수 동작은 `public.moderation_actions`에 기록되고, 수정하거나 삭제할 수 없습니다.
