# Security Response Checklist

Use this checklist when triaging a privately reported vulnerability in Sentinel.

## Intake

- Confirm the report does not expose credentials, tokens, personal data, or production secrets.
- Record the affected component, endpoint, deployment mode, and reported version or commit.
- Reproduce the issue in an isolated environment before changing production configuration.

## Assessment

- Determine whether authentication, authorization, telemetry ingestion, WebSocket handling, or deployment configuration is affected.
- Identify the affected versions and the minimum conditions required to reproduce the issue.
- Assess confidentiality, integrity, availability, and potential user impact.

## Remediation

- Prepare the smallest safe fix and add regression coverage where practical.
- Rotate any credentials or tokens that may have been exposed during investigation.
- Verify the fix against the original reproduction steps.

## Disclosure

- Coordinate disclosure only after a fix or mitigation is available.
- Document affected versions, impact, mitigation, and upgrade guidance.
- Do not publish unrelated user data, secrets, or exploit material that is unnecessary for remediation.

See the repository [security policy](../SECURITY.md) for reporting guidance.
