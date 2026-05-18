# Acton AML/CTF Workbench

Employee-facing local prototype based on `/Users/stillwater/Downloads/AML_Technical_Specification.docx`.

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Render Web Service

Use these settings:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

Health check:

```text
/api/health
```

## Current Prototype Scope

- Role-Based Access Control simulation:
  - Operator
  - AML Officer
  - Administrator
  - Manager
  - Auditor
- Physical person onboarding with validation.
- Legal entity onboarding with UBO / ownership-chain fields.
- Shared KYC block for product, premium, business sector, income source, and PEP/RCA status.
- Risk scoring matrix with SDD/CDD/EDD result.
- Initial and batch screening against sample FMS/UN/EU/OFAC/HMT/PEP watchlist data.
- Alert dashboard sorted by match percentage.
- Two-panel alert review: internal client data vs. watchlist record.
- AML decisions with mandatory comment:
  - Confirmed match
  - False positive
  - Escalation
- White List entries for false positives.
- STR draft workspace.
- Ongoing monitoring sample anomalies.
- Append-only audit log simulation.
- Admin configuration for threshold and review cycles.
- Reporting view and acceptance checklist.

## Prototype Limits

This is still front-end only. Production implementation needs backend persistence, authentication/2FA, encrypted storage, real audit immutability, real sanctions/PEP providers, registry APIs, file storage, notification gateways, OpenAPI documentation, penetration testing, and regulator-specific STR XML/PDF templates.
