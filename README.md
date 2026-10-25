# SurveyPulse - Secure Web-Based Survey & Analytics Platform

A complete, production-grade, full-stack survey creation, feedback collection, and analytics platform built with **Node.js, Express, SQLite, React 19, and Chart.js**.

---

## 🚀 Key Highlights & Architecture

- **Backend & Database:** Node.js + Express with persistent relational **SQLite** database (`data/survey.db`), parameterized SQL queries, database migrations, index optimization, and transactional guarantees.
- **Authentication & Security:**
  - Salted password hashing via **bcrypt**.
  - Secure session-based authentication with `HttpOnly` and `SameSite=lax` cookies.
  - Session identifier regeneration upon login to eliminate session fixation.
  - Server-side Role-Based Access Control (**Admin** vs **User** vs **Public Respondents**).
  - Insecure Direct Object Reference (IDOR) prevention checking survey ownership on every mutation and private analytics query.
  - Spreadsheet Formula Injection mitigation on CSV exports (escaping `=`, `+`, `-`, `@`).
  - IP-based rate limiting on sensitive login and survey submission routes.
- **Dynamic Survey Builder:**
  - 6 Supported Question Types:
    1. Single Choice (Radio)
    2. Multiple Choice (Checkboxes)
    3. Open-Ended Text (length-bounded with char counter)
    4. Yes / No binary toggle
    5. Rating (1–5 scale with descriptive labels)
    6. Dropdown Selection
  - Reordering questions (Up/Down).
  - Real-time preview modal.
  - Save as Draft or Instant Publish.
  - Shareable public link with one-click copy.
- **Analytics & Chart.js Visualizations:**
  - Submission timeline line chart.
  - Single-choice and dropdown response bar charts.
  - Rating scale averages and 5-star distribution progress bars.
  - Yes / No breakdown doughnut chart.
  - Searchable open-ended text response feeds.
  - Question-based filters.
  - Formula-safe CSV report export.
- **Administrative Governance:**
  - Platform overview: total registered users, surveys, published campaigns, and total responses.
  - User management: search, filter, activate/deactivate accounts, promote to admin, demote, and inspect user-created surveys.
  - System-wide survey moderation: publish, unpublish, archive, or delete with cascade cleanup.
  - Immutable Audit Log: logs all administrative actions with actor, target, timestamp, and context details.
  - CLI Administrator setup script (`scripts/create-admin.ts`).

---

## 👥 Default Pre-Seeded Accounts (Instant Testing)

The database is automatically pre-seeded with persistent demo accounts:

| Role | Email | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@surveypulse.io` | `Admin123!` | Full user management, survey moderation, audit logs, analytics |
| **Researcher (User)** | `alex.rivera@example.com` | `User123!` | Survey builder, own response analytics, CSV export, profile |
| **Product Mgr (User)** | `elena.gomez@example.com` | `User123!` | Survey builder, responses collection |

*Pre-seeded Public Survey:* Available immediately for testing at `/s/feedback-2026-campus`.

---

## 🛠️ Installation & Local Setup

### 1. Prerequisites
- Node.js (v18.0.0 or later)
- npm or bun

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Create an Administrator (CLI)
You can create a new administrator securely from the command line:
```bash
npx tsx scripts/create-admin.ts
```
Follow the interactive prompts to specify full name, email, and password.

### 5. Start the Application
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

### 6. Run the Automated Test Suite
```bash
npx tsx tests/test-backend.ts
```
Verifies password hashing, duplicate email handling, session lifecycle, transactional survey persistence, CSV formula injection defense, and cascading database cleanup.

---

## 📁 Project Structure

```
├── data/
│   └── survey.db              # Persistent SQLite database file
├── scripts/
│   └── create-admin.ts        # Interactive CLI administrator setup script
├── server/
│   ├── audit.ts               # Audit logging service
│   ├── auth.ts                # bcrypt hashing & session management
│   ├── db.ts                  # SQLite schema, queries & transactions
│   ├── middleware.ts          # Auth, role check, rate limiting, CSV sanitizer
│   └── routes/
│       ├── admin.routes.ts    # Admin overview, user governance, audit trail
│       ├── auth.routes.ts     # Register, login, session, password reset
│       ├── response.routes.ts # Public submission, analytics, CSV export
│       └── survey.routes.ts   # Survey CRUD, public fetch, publishing
├── src/
│   ├── components/
│   │   ├── Modal.tsx          # Accessible confirmation dialogs
│   │   ├── Navbar.tsx         # Header navigation & role badges
│   │   └── Sidebar.tsx        # Dashboard sidebar navigation
│   ├── context/
│   │   └── AuthContext.tsx    # Global auth & session state
│   ├── pages/
│   │   ├── AccessDeniedPage.tsx
│   │   ├── AdminAuditLogsPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminSurveysPage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MySurveysPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── PublicSurveyPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── SurveyBuilderPage.tsx
│   │   ├── SurveyResultsPage.tsx
│   │   └── UserDashboard.tsx
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   ├── App.tsx                # Client routing & authentication guard
│   └── index.css              # Tailwind CSS styling
├── tests/
│   └── test-backend.ts        # Comprehensive test suite
├── package.json
├── server.ts                  # Express + Vite server entry point
└── README.md
```

---

## 🔒 Security Compliance

1. **Password Storage:** Salted bcrypt hashing. No plaintext passwords in memory or database.
2. **Session Security:** 256-bit cryptographic token stored in `HttpOnly`, `SameSite=lax` cookies. Session regenerated on login to defeat fixation.
3. **Database Integrity:** Parameterized SQL queries eliminate SQL injection. Foreign keys and transactions safeguard data integrity.
4. **Authorization:** Role checks (`requireAdmin`, `requireAuth`) and ownership checks prevent IDOR attacks.
5. **CSV Security:** Exported CSV cells starting with `=, +, -, @` are prepended with `'` to neutralize formula injection attacks in Excel / Google Sheets.
6. **Spam Prevention:** Public survey submissions are throttled and hashed by IP and session.
