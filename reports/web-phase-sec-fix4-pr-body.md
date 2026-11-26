## Security hardening (draft)

Implements Rev4 authentication and recovery throttling, explicit trusted proxy headers, administrator guards, write-ahead audit, maintenance enforcement, password byte limits, status privacy and a forward security migration. Historical migrations 001–009 are unchanged.

Local verification: type-check, lint (0 errors, 7 warnings), 167 tests, Discord bot type-check, production build and G11 passed.

**Review before merge:** migration 010 has not been executed against PostgreSQL; the administrator count and update are separate and can race; write-ahead audit and multi-step mutations are not transactional. The run-2 RLS lead and actual proxy configuration require independent validation. See `reports/web-phase-sec-fix4-luna-report.md` for evidence and operator steps. Draft only, pending independent sign-off.
