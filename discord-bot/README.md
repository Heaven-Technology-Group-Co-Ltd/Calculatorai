# Discord bot deployment

## Deployment status and HMAC v2 lockstep cutover

The external Discord bot is reported offline pending dedicated VPS provisioning; Discord has been excluded from the public status page since Phase 3A. The live process state has not been independently verified in this change.

The `/api/admin/control` HMAC v2 canonical string is `JSON.stringify([timestamp, callerId, callerTag, rawBody])`. Deploy the web application and bot from the same commit at or after WEB-ARCH-5B. To upgrade or reactivate:

1. Stop any running bot process.
2. Deploy the web application.
3. Deploy the matching bot build from the same commit.
4. Verify a signed `/admin` status probe.

The old and new signature formats are incompatible; an independently deployed peer will fail authentication. Build the standalone bot with `pnpm --dir discord-bot build` and start `discord-bot/dist/index.js`.
