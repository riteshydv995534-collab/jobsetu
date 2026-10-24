# JANSETU (जनसेतु)
## Government Scheme Verification, Eligibility Intelligence & Fund Allocation Support Platform

> **Tagline:** *"One Family. One Verified Benefit History. Explainable Eligibility Intelligence."*

---

## 1. PROJECT OVERVIEW

**JanSetu** is an enterprise-grade digital public infrastructure (DPI) and intelligence platform built to serve as an authoritative verification bridge between:
1. **Existing Government Application-Submission Gateways** (State and Central portals).
2. **Authorised Government Departments & Scheme Officers**.
3. **Approved Statutory Data Providers** (UIDAI, NFSA, Land Records / RoR, DigiLocker, PFMS).
4. **Scheme Eligibility & De-duplication Engines**.
5. **Authorised Fund-Approval and Disbursement Systems** (DBT Bharat, PFMS, State Treasuries).

### ⚠️ Critical Architecture Note
* **JanSetu is NOT a public citizen application portal.** Citizens continue submitting applications through designated official portals.
* **JanSetu operates exclusively as an internal government verification and decision-support intelligence platform.**
* Applications enter JanSetu only via authenticated external API exchanges, authorized batch imports, or synthetic demonstration data streams.
* JanSetu evaluates relevant demographic and socio-economic data, verifies household rosters, determines deterministic rule compliance, flags duplicates, calculates criteria completion percentages, and compiles a **Consolidated Application Assessment Report** for authorised officers.
* Final fund sanction and disbursement decisions remain strictly under the lawful authority of the competent government treasury. JanSetu never marks funds as disbursed without recorded evidence of completed bank transfers.

---

## 2. SYSTEM ARCHITECTURE

```
[ EXISTING APPLICATION PORTALS / DATA EXCHANGES ]
                       │
                       ▼
           [ MODULAR INTEGRATION LAYER ]
          (Demo Mode / Sandbox / Production)
                       │
                       ▼
          [ DATA VALIDATION & INGESTION ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ INDIVIDUAL VERIFICATION ]  [ HOUSEHOLD & PROPERTY ROSTERS ]
(UIDAI Demo Demographics)   (NFSA RCMS & Cadastral RoR)
         │                           │
         └─────────────┬─────────────┘
                       ▼
         [ ELIGIBILITY ASSESSMENT ENGINE ]
      (Deterministic Configurable Scheme Rules)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ CRITERIA COMPLETION % ]    [ DUPLICATE DETECTION SERVICE ]
 (Verified / Applicable)     (Overlaps & Prior Benefits)
         │                           │
         └─────────────┬─────────────┘
                       ▼
     [ HOUSEHOLD ALLOCATION ANALYSIS ENGINE ]
  (Fair Priority Scoring & Tie-Break Human Review)
                       │
                       ▼
   [ CONSOLIDATED ASSESSMENT REPORT (A - G) ]
                       │
                       ▼
           [ AUTHORISED HUMAN REVIEW ]
         (Verification & Scheme Officers)
                       │
                       ▼
       [ DEPARTMENTAL APPROVAL WORKFLOW ]
                       │
                       ▼
         [ CONFIRMED DBT DISBURSEMENT ]
        (PFMS / Treasury Voucher Ledger)
```

---

## 3. PREREQUISITES

* **Node.js**: v20.x or higher (LTS recommended)
* **npm**: v10.x or higher
* **MongoDB**: Optional (JanSetu includes an automatic embedded in-memory MongoDB server that boots automatically if no external MongoDB instance is specified).

---

## 4. INSTALLATION & SETUP

### Clone and Enter Directory
```bash
cd "C:\Users\Ritesh Yadav\.gemini\antigravity\scratch\jansetu"
```

### Install Backend Dependencies
```bash
cd server
npm install
```

### Install Frontend Dependencies
```bash
cd ../client
npm install
```

---

## 5. ENVIRONMENT CONFIGURATION

### Server Configuration (`server/.env`)
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
NODE_ENV=development

# MongoDB Connection:
# If MONGODB_URI is left blank, JanSetu automatically boots an in-memory MongoMemoryServer.
MONGODB_URI=

# Cryptographic Secrets:
JWT_SECRET=jansetu-hackathon-techtrix-super-secure-key-2026
JWT_EXPIRE=24h

# Operational Data Mode:
DATA_MODE=DEMO
ENABLE_AUDIT_LOGGING=true
```

### Client Configuration (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 6. MONGODB SETUP

JanSetu supports two database modes:
1. **Zero-Configuration In-Memory MongoDB (Default):**
   When `MONGODB_URI` is left unset in `server/.env`, JanSetu automatically spawns an internal, high-performance in-memory MongoDB instance. This enables immediate local testing and evaluation during hackathons without requiring a local `mongod` daemon.
2. **Persistent MongoDB (Local or Atlas):**
   To persist data to an external MongoDB service, supply the connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/jansetu
   # or Atlas:
   # MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/jansetu?retryWrites=true&w=majority
   ```

---

## 7. SYNTHETIC DEMONSTRATION DATA SEEDING

JanSetu includes a deterministic, idempotent seed utility that generates 100+ fictional individuals, 25+ households, 32 properties, and 12 illustrative government schemes across 3 tiers (Individual, Household, Property).

To seed or reset the database:
```bash
cd server
npm run seed
```

### Documented Household `H-1005` Demonstration Persona
The seed script generates a dedicated demonstration household (`H-1005`) to showcase complex cross-scheme relationships:
* **Vikram Singh** (`DEMO-AADHAAR-100021`): Father / Head. Disbursed education grant on record. Active competing claim for Household Housing Assistance (`HAG-2026`).
* **Meena Singh** (`DEMO-AADHAAR-100022`): Mother. Disbursed healthcare grant.
* **Arjun Singh** (`DEMO-AADHAAR-100003`): Son. Active Individual Education Scholarship application (`IEA-2026`). Competing claim for Household Housing Assistance (`HAG-2026`).
* **Neha Singh** (`DEMO-AADHAAR-100024`): Daughter. Pending verification.
* **Household Benefits for H-1005:**
  * Confirmed previous disbursement for Household Sanitation Scheme (`HSS-2026`).
  * Two competing applications for Household Housing Assistance (`HAG-2026`) that restricts benefits to 1 per household.
  * Unrelated scheme Household Electricity Subsidy (`HES-2026`) with zero prior benefits.

When an officer inspects **Arjun Singh**, the system presents his separate individual entitlement history while correctly linking to Household `H-1005`'s sanitation history. Inspecting **Vikram Singh** shows the same household history, while his individual benefit history remains distinct.

---

## 8. DEVELOPMENT COMMANDS

### Running Backend API Server
```bash
cd server
npm run dev
# Server boots at http://localhost:5000
```

### Running Frontend Application
```bash
cd client
npm run dev
# Frontend boots at http://localhost:5173
```

---

## 9. TEST COMMANDS

JanSetu comes equipped with an automated security, role-isolation, and business-logic test suite:
```bash
cd server
npm test
```

### Test Coverage Highlights:
* **Unauthenticated Access:** Confirms protected routes return 401.
* **Role-Based Privilege Escalation:** Confirms unapproved accounts or self-promotions are rejected with 403.
* **Scheme Isolation:** Confirms Education Officers cannot access Housing Scheme records by modifying query parameters or URLs.
* **Criteria Completion Calculation:** Confirms criteria completion % is strictly separated from eligibility determination.
* **Duplicate Detection:** Confirms previous unrelated benefits do not trigger false duplicates.
* **Household Priority Rules:** Confirms fair household allocation engine identifies ties and routes them for human supervisor review.

---

## 10. DEMONSTRATION OFFICER CREDENTIALS

For hackathon evaluation, the following pre-configured officer accounts are available:

| Role | Officer Name | Email / Officer Identifier | Password | Assigned Scope / Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Administrator** | Vikram Singhania | `admin@jansetu.gov.demo` | `Password@123` | Full Master Access, All 12 Schemes, Audit History, Integration Config |
| **Department Administrator** | Dr. Kavita Nair | `dept.admin@jansetu.gov.demo` | `Password@123` | Departmental Oversight, Multi-Scheme Policies, Administrative Actions |
| **Scheme Supervisor** | Rameshwar Sen | `supervisor@jansetu.gov.demo` | `Password@123` | Supervisory Review, Tie-Break Allocation Overrides, Appeals |
| **Scheme Officer (Education)** | Sunita Sharma | `officer.education@jansetu.gov.demo` | `Password@123` | Strictly Assigned to Education Assistance (`SCH-001`, `SCH-002`) |
| **Scheme Officer (Housing)** | Rajesh Mukherjee | `officer.housing@jansetu.gov.demo` | `Password@123` | Strictly Assigned to Housing & Electricity (`SCH-005`, `SCH-008`) |
| **Verification Officer** | Anjali Deshmukh | `officer.verification@jansetu.gov.demo` | `Password@123` | Field Inquiries & Statutory Document Verification |

---

## 11. HOW TO ASSIGN OFFICER PERMISSIONS

JanSetu enforces resource-level and scheme-level permissions at the database and middleware layers:
1. Open **Account & Permissions** (`/settings`) while logged in as `SUPER_ADMIN` or `DEPARTMENT_ADMIN`.
2. Select an officer account.
3. Update their assigned schemes in `assignedSchemes` array or modify their `role`.
4. Role changes are versioned and immutably written to `AuditLog`.

---

## 12. RUNNING IN DEMO MODE VS. SANDBOX VS. PRODUCTION

### A. DEMO MODE (Default)
Operates with synthetic demonstration data and fictional identifiers (`DEMO-ID-XXXXXX`). External API verification calls are routed through internal mock providers (`MockProvider`). Requires zero external credentials.

### B. SANDBOX MODE
To connect to an approved staging API (e.g., API Setu Sandbox or Staging RCMS):
1. Navigate to **Data Integrations** (`/api-integrations`).
2. Select the target integration (e.g., `UIDAI Identity Verification Provider`).
3. Switch **Environment Mode** from `DEMO` to `SANDBOX`.
4. Provide the test endpoint URL and sandbox API key.
5. Click **Execute Connection Ping Test**.

### C. AUTHORISED PRODUCTION MODE
Requires certified `*.gov.in` endpoints, bilateral data-sharing agreements, and production credentials stored in secure environment variables. JanSetu strictly prohibits marking unverified mock endpoints as production.

---

## 13. CONSOLIDATED APPLICATION ASSESSMENT REPORT (SECTIONS A - G)

Every imported application features a consolidated, printable assessment report accessible via the **Imported Applications** register (`/applications`):
* **Section A — Application Overview:** Internal Application ID, Source System Reference, Scheme Name, Department, Timestamps, Processing Status.
* **Section B — Data Verification:** Individual Demographics, Household Membership Status (*"HOUSEHOLD MEMBERSHIP REQUIRES VERIFICATION"* when unverified), Cadastral Property Linkage, Provenance References.
* **Section C — Eligibility Analysis:** Deterministic outcome (`ELIGIBLE`, `INELIGIBLE`, `VERIFICATION_PENDING`), Criteria Completion % (`6 of 8 checks completed — 75%`), Criterion-by-criterion explanation table, Scheme rule version (`RULE_SET_v2.4_2026`).
* **Section D — Duplicate and Benefit History:** Distinguishes confirmed disbursements from submitted applications or sanctioned approvals. Details overlapping household claims without punitive labeling.
* **Section E — Allocation Assessment:** For schemes with restricted quotas (1 per household), compares competing claims, applies transparent priority scoring, and escalates ties for human officer review.
* **Section F — Final Administrative Workflow:** Verification Completed &rarr; Assessment Completed &rarr; Officer Review &rarr; Recommendation Recorded &rarr; Final Decision Recorded &rarr; Disbursement Status Confirmed.
* **Section G — Audit and Provenance:** Assessment ID, Scheme Rule Version, Data Source References, Reviewing Officer Name & Badge, Immutable Audit History.

---

## 14. SECURITY & PRIVACY CONTROLS

* **Zero Citizen Self-Enrolment:** Direct citizen account creation is blocked on the backend.
* **Strict Scheme Isolation:** Officers assigned to Education cannot view or alter Housing records, even by directly manipulating API endpoints or URL IDs.
* **Data Minimisation Mode:** Reports and exports support one-click masking of personal identifiers.
* **NoSQL Injection & Mass Assignment Defense:** All input parameters pass through Mongoose type schemas and validation sanitizers.
* **Comprehensive Audit Trail:** All consequential decisions, status changes, manual overrides, and data exports are logged with timestamp, acting officer badge, and rationale notes.

---

## 15. DEPLOYMENT INSTRUCTIONS

### Docker Deployment
```dockerfile
# Backend container
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Static Frontend Build
```bash
cd client
npm run build
# Deploy 'dist' folder to Nginx, AWS S3, or Cloudflare Pages
```

---

## 16. KNOWN LIMITATIONS & FUTURE EXTENSIONS

1. **Synthetic Demonstration Data:** All individual names, Aadhaar references, PAN numbers, and ration cards are synthetic fiction created exclusively for hackathon evaluation.
2. **Decoupled Disbursement:** In accordance with statutory governance, JanSetu does not directly hold central treasury accounts; it integrates with PFMS/DBT via secure API vouchers.
3. **Multi-Jurisdiction Expansion:** Future iterations will support automated sub-district (Tehsil / Ward) geospatial geofencing using GIS cadastral boundaries.

---

## 17. REPOSITORY STRUCTURE

```
jansetu/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/         # Assessment Reports, Modals, LiveBackground
│   │   ├── context/            # AuthContext (Role-based authentication)
│   │   ├── layouts/            # DashboardLayout (Persistent Officer Navigation)
│   │   ├── pages/              # 13 Authorised Officer Modules
│   │   └── services/           # Axios API Client
│   └── package.json
├── server/                     # Express.js REST API
│   ├── config/                 # Database configuration (MongoMemoryServer fallback)
│   ├── controllers/            # REST API Controllers (RBAC & Scheme enforcement)
│   ├── middleware/             # authMiddleware, uploadMiddleware, errorHandler
│   ├── models/                 # Mongoose schemas (User, Application, Scheme, etc.)
│   ├── routes/                 # Express API routes
│   ├── services/               # Eligibility Engine, Duplicate Detection, Allocations
│   ├── tests/                  # Jest & Supertest automated test suites
│   ├── utils/                  # Deterministic synthetic data generator (seed.js)
│   └── server.js               # Server entrypoint
└── README.md                   # System documentation
```

*Built with pride for the Government Technology & Civic Innovation Hackathon.*