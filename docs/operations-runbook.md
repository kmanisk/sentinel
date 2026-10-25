# Operations Runbook

This runbook gives contributors a compact checklist for diagnosing Sentinel deployments without exposing credentials or production data.

## Service health

1. Confirm the containers are running:

   ```bash
   docker compose ps
   ```

2. Check the API liveness endpoint:

   ```bash
   curl -fsS http://localhost/health
   ```

3. If the dashboard loads but live telemetry does not update, verify the WebSocket route is reachable through the reverse proxy and inspect the server logs for reconnect or authentication errors.

## Database checks

- Confirm PostgreSQL is healthy before debugging application-level failures.
- Verify the application is using the intended database URL without printing credentials into logs.
- Run Prisma schema commands only against the expected environment.

## Incident triage

When reporting an operational issue, include:

- the affected component;
- the deployment method used;
- the exact failing command or endpoint;
- sanitized logs around the failure;
- whether the issue is reproducible after a clean restart.

Do not include passwords, API keys, JWT secrets, webhook URLs, or other credentials in issue reports.

## Recovery

Prefer the smallest recovery action first: restart the affected service, verify dependencies, then redeploy only if the failure persists. For database incidents, create a backup before attempting destructive recovery steps.

## Contributor verification

Before merging changes to deployment or monitoring behavior, verify the documented health-check flow still works and update this runbook if the expected operator steps change.
