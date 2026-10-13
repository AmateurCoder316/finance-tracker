# Ledger — Finance Tracker

Ledger is an offline-first **Electron + React + TypeScript** desktop financial workspace. The repository's \`SKILL.md\` informs the UI: clear hierarchy, responsive surfaces, restrained transitions and reduced-motion support.

> **Status: v0.1, functional foundation.** The original feature wishlist covers hundreds of capabilities. This release intentionally implements a usable core, not a fully certified banking, investing, invoicing or tax system.

## Run locally

Requires Node.js 22+, npm, and a desktop environment.

\`\`\`bash
npm install
npm run dev
\`\`\`

Compile and check:

\`\`\`bash
npm test
npm run build
\`\`\`

Package on your corresponding OS:

\`\`\`bash
npm run dist:linux   # AppImage and .deb, on Linux
npm run dist:win     # NSIS .exe, on Windows
npm run dist:mac     # .dmg, on macOS
\`\`\`

Packaging across platforms needs the relevant build tools and code signing for public distribution. The build command uses Electron Vite; no cloud server or API keys are required.

## Included in v0.1

| Workspace | Implemented |
| --- | --- |
| Overview | Net worth, available cash, monthly income/expenses, savings rate, cash flow, spending breakdown, budgets, goals, bills, portfolio value, snapshots, optional widgets |
| Accounts | Bank/cash/savings/investment/credit/loan/crypto account types, opening balances, ledger-derived balances, grouping, archive, manual reconciliation, transfers, currencies with manual exchange rates |
| Transactions | Income, expenses, transfers, statuses, categories, tagging, notes, dates, methods, edits, deletion, search/filter/sort, split expenses, CSV import preview with duplicate matching, CSV export |
| Budgets | Weekly, monthly and yearly category/overall budgets, usage and overspending indicators |
| Goals | Targets, deadlines, priorities, manual earmarked contributions, history, progress and archiving |
| Investments | Buy/sell trade journal, holdings, average weighted cost, realized/unrealized gains, fees, manual market-price updates, account cash impact, portfolio allocation |
| Bills | Subscription schedules, upcoming/overdue bills, mark-paid expense creation, recurring due date advancement |
| Debts | Principal, APR, amortization estimates, repayment entry splitting principal and interest |
| Business | Internal invoice records, outstanding/paid status, deposit recording, CSV export |
| Insights | Income/expense reports, source/category analysis, CSV and print-to-PDF export, tax-tagged records with illustrative flat-rate calculation, scenario-based forecast |
| Desktop | Local persistence, atomic JSON writes, native open/save dialogs, basic tray menu, keyboard shortcuts, native notifications where supported |
| Settings | Light/dark/system theme, accent, privacy masking, editable categories, base currency and manual FX rates, configurable dashboard panels, JSON export/restore, demo workspace, reset |

## Important financial and privacy limitations

- **Data is stored unencrypted** in \`app.getPath('userData')/finance.json\`, owned by the logged-in OS user. Backup JSON and exported CSV are also plaintext. Do not store account credentials or secret recovery phrases in Ledger. Use full-disk encryption, OS account protection, and securely stored backups.
- No bank connection, OAuth, account sync, live stock/crypto prices, news feed or streaming FX feed is implemented. Prices and FX rates are **manual**; values are not live.
- Pending transactions do not affect posted balances. Transfers do not count as income/expense. Trading buys/sells change cash plus investment holdings; principal repayments change cash and liabilities separately.
- Budgets, reported income and totals use your **base currency**. Set rates for any non-base account currencies. Accounts without rates are excluded from aggregate totals, not converted at a fictional rate.
- Savings goals are **earmarks**, not additional assets or withdrawals. Track the money itself in an account.
- Standalone debt records subtract from net worth. Do not also enter that same liability as a negative-balance loan/credit account, or you will count it twice.
- PDF report output is a print of the current Reports screen. Invoices are not compliant tax invoices.
- The tax calculator is a simple flat-rate illustration, **not a Finland-specific or legally valid tax calculation**. Verify rates, deductions and declarations independently.
- The forecast is a hypothetical model using recent net cash flow, not a reliable investment prediction.
- No password, PIN, biometric unlock, database encryption, automatic updater, bank-import OFX, Excel importer, scheduled cloud backups, shared profiles, or AI advice in v0.1.

## Interface shortcuts

- \`Ctrl/Cmd + K\`: focus transaction search
- \`Ctrl/Cmd + N\`: new transaction
- \`Escape\`: dismiss dialogs
- Tray menu: open Ledger, quick transaction, or quit (on supported desktop environments)

## Try it out

Ledger starts with no real accounts. Select **Explore demo data** to try the UI with fictional transactions and balances, then reset in **Settings → Data & backups** before using your own data.

## Development notes

The application has no backend service. Data types and financial calculations are in \`src/renderer/src/types.ts\` and \`finance.ts\`; the renderer's store lives in \`store.tsx\`. Electron's main process owns local files and OS dialogs, exposed via a narrow preload IPC bridge. \`SKILL.md\` remains the design source of truth.

### Next engineering milestones

1. Formal schema migration/validation, accounting reconciliation tests, audit trail, undo and scheduled backups.
2. Encrypted local data with authenticated unlock and carefully reviewed key management.
3. Live market data via opt-in API provider (secure API key handling), historical pricing and investments reconciliation.
4. Optional regulated open-banking integration and OFX/QFX/Excel import preview and mapping.
5. Country-specific taxation, receipt attachments, compliant invoicing, subscriptions automation, complex budgeting.
6. Integration tests, accessibility testing, real-world QA and supported platform packaging.

Build functionality first and keep integrations labeled clearly; **no demo data should ever be presented as real financial data**.
