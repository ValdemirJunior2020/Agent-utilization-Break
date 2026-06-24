# Project Structure

```txt
agent-utilization-break-compliance/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── records/
│   │   └── ui/
│   ├── constants/
│   ├── data/
│   ├── pages/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── docs/
├── scripts/
├── sample-reports/
│   ├── original/
│   └── processed/
├── firestore.rules
├── storage.rules
├── firebase.json
├── package.json
├── README.md
└── vite.config.ts
```

## Key files

- `src/utils/excelParser.ts` — flexible parser for processed reports and original Tableau hourly reports.
- `src/services/uploadService.ts` — uploads Excel to Firebase Storage, creates upload batch, saves parsed records, writes audit log.
- `src/services/recordsService.ts` — CRUD, soft delete, restore, manual record creation.
- `src/services/dashboardService.ts` — dashboard counts, trends, recent uploads, recent audit history.
- `src/services/usersService.ts` — Super Admin user creation and user management.
- `src/store/authStore.ts` — Firebase auth state, Firestore profile loading, login tracking.
- `firestore.rules` — role-based Firestore security.
- `storage.rules` — role-based Excel upload security.
```
