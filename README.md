# Agent Utilization and Break Time Compliance

Modern responsive React + Firebase web app for managing HotelPlanner call center break-time compliance.

The app helps you upload Tableau Excel reports, automatically detect agents above 60 minutes, organize data by call center, manage records with CRUD operations, track audit history, restore deleted records, export reports, and display app usage metrics.

## Call centers supported

- WNS
- Teleperformance
- Buwelo Colombia
- Buwelo Ghana
- Concentrix
- Telus

Buwelo Colombia and Buwelo Ghana are separate operational centers.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Zustand
- Firebase Authentication
- Firestore Database
- Firebase Storage
- Firebase Analytics-ready setup
- Recharts
- SheetJS `xlsx` parser/exporter

## Main features included

- Firebase login
- Super Admin, Call Center Admin, and Viewer roles
- Role-based menus and protected routes
- Excel upload and parser preview
- Summary report parser
- Original Tableau hourly report parser
- Manual record creation
- Record search/filter by date, center, status, HP ID, or name
- Edit records
- Soft delete records
- Super Admin restore page
- Audit log for login, upload, create, update, delete, restore, user creation, role change, and threshold changes
- App visit tracking through Firestore
- App visit totals on dashboard
- Call center ranking
- Daily trend chart
- Yearly improvement tracker by month
- Annual issue rate, critical rate, best month, and first-to-latest improvement
- 7-day compatible summary views
- Repeated issue agents
- Bulk record selection, bulk update, and bulk soft delete
- Export to Excel and CSV
- Yearly improvement Excel export
- Auto-generated leadership email summary
- Settings page for warning/critical thresholds
- Security rules for Firestore and Storage

## Excel parser behavior

The parser supports your two real formats.

### Processed summary reports

Columns detected:

- `Agent HP ID / Name`
- `Grand Total Break (Minutes)`
- `Break Time (Hours:Minutes)`
- `Exception Name / Reason`

### Original Tableau hourly reports

Detected pattern:

- `summary_date` near the top
- Agent in Column B
- Metric name `Break` in Column C
- Hourly break values from Column D onward

The Upload page requires a report date. That date is stored on every imported record and displayed throughout the app.

## Local setup

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Firebase setup

1. Open Firebase Console.
2. Select project `medium-3254d`.
3. Enable Authentication.
4. Enable Email/Password sign-in.
5. Enable Firestore Database.
6. Enable Firebase Storage.
7. Copy `firestore.rules` into Firestore Rules.
8. Copy `storage.rules` into Storage Rules.
9. Deploy rules from CLI if preferred:

```bash
firebase deploy --only firestore:rules,storage
```

## First Super Admin user

Because Firestore security rules depend on a user profile document, create the first Super Admin manually.

### Step 1: Create Auth user

Firebase Console → Authentication → Users → Add user.

Example:

```txt
Email: your-email@hotelplanner.com
Password: choose a secure password
```

Copy the generated Firebase Auth UID.

### Step 2: Create Firestore user profile

Firestore → `users` collection → document ID must equal the Auth UID.

Add this document:

```json
{
  "uid": "PASTE_AUTH_UID_HERE",
  "name": "Junior",
  "email": "your-email@hotelplanner.com",
  "role": "superAdmin",
  "callCenterId": null,
  "callCenterName": null,
  "active": true,
  "loginCount": 0
}
```

### Step 3: Add base settings

Create document:

```txt
settings / thresholds
```

Fields:

```json
{
  "goodMaxMinutes": 60,
  "warningMinMinutes": 60.01,
  "criticalMinMinutes": 90
}
```

### Step 4: Add call centers

You can run the seed script after the Super Admin exists:

```bash
SEED_ADMIN_EMAIL="your-email@hotelplanner.com" SEED_ADMIN_PASSWORD="your-password" npm run seed
```

Or manually create documents in `callCenters` using these IDs:

```txt
wns
teleperformance
buwelo-colombia
buwelo-ghana
concentrix
telus
```


## Yearly improvement tracking

The dashboard and Reports page now include a year selector. The app calculates improvement across the selected year using the percentage of active records above 60 minutes.

Displayed yearly metrics include:

- Annual issue rate
- Annual critical rate
- Average break minutes
- Best month
- Worst month
- First month to latest month improvement
- Month-by-month improvement versus the previous month
- Month-by-month improvement versus the first month with data

A positive improvement value means the issue rate went down. Example: if January was 40% above 60 minutes and February was 25%, the improvement is `+15.0 pts better`.

The Reports page can export a Yearly Improvement workbook with two sheets: `Year Summary` and `Monthly Improvement`.

## Bulk record changes

The All Records page now supports multi-select rows. Call Center Admins can bulk change records in their own center, while Super Admin can bulk change records across all centers.

Bulk actions included:

- Bulk status change: Good, Warning, or Critical
- Bulk exception reason update
- Bulk notes update
- Bulk report date update
- Bulk call center reassignment for Super Admin
- Bulk soft delete

Every bulk update and bulk delete writes an audit log entry with the affected record IDs, changed fields, actor, role, date/time, and selected count.

## Firestore collections

```txt
users
callCenters
uploads
breakRecords
auditLogs
settings
appVisits
```

## Break record structure

```txt
id
callCenterId
callCenterName
agentHpId
agentName
reportDate
reportLabel
sheetName
reportType
breakMinutes
status
notes
exceptionReason
sourceFileName
uploadedBy
uploadedByName
uploadedAt
updatedBy
updatedByName
updatedAt
deleted
deletedBy
deletedByName
deletedAt
hourlyBreaks
```

## Roles

### Super Admin

- View all call centers
- Upload for any call center
- Edit all records
- Soft delete all records
- Restore deleted records
- Create users
- Assign roles and centers
- View all audit logs
- View app visits and user activity
- Change thresholds

### Call Center Admin

- View only assigned call center
- Upload only assigned call center files
- Edit own center records
- View own center audit history

### Viewer

- View only assigned call center
- Cannot upload, edit, delete, or restore

## Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Netlify

Build command:

```bash
npm run build
```

Publish directory:

```txt
dist
```

Add the environment variables from `.env.example` in Netlify if you do not want the Firebase config hard-coded fallback.

## Notes for production

- Firebase may ask you to create composite indexes for dashboard queries. Click the Firebase console link in the error message and create the suggested index.
- The frontend intentionally performs soft deletes only. Firestore rules block permanent deletes.
- Creating users from the app uses a secondary Firebase app instance so the Super Admin does not get logged out.
- The TEP sample uses names instead of HP IDs. The parser stores them, but HP IDs should be added when available for stronger repeated-agent detection.
- For Buwelo files without Ghana/Colombia in the file name, choose the correct center during upload.

## Included sample files

See `sample-reports/processed` and `sample-reports/original`.

See also:

- `docs/SAMPLE_REPORT_ANALYSIS.md`
- `docs/AI_OPERATIONS_IDEAS.md`

## v3 upload fixes

### Report date ranges

Every upload now uses an explicit report period:

- 1-day report: same start and end date
- 3-day report: start date to end date
- 7-day report: example `06/16/2026 - 06/23/2026`
- 30-day report: start date to end date

The app saves these fields on every uploaded record:

- `reportStartDate`
- `reportEndDate`
- `reportDate` (the report end date used for sorting/trends)
- `reportDays`

The records table, exports, edit modal, manual entry modal, and bulk change modal now display/update the full report period.

### Firebase Storage/CORS local upload fix

The app now parses the Excel file in the browser and saves the processed records directly to Firestore. The raw workbook is not uploaded to Firebase Storage by default. This removes the local-development CORS/bucket error such as:

```txt
CORS Preflight Did Not Succeed
https://firebasestorage.googleapis.com/...
```

Firestore still stores the file name, logical file path, uploaded user, uploaded date, parser mode, report start/end date, and audit log.

### Firestore indexes

Indexes are included in `firestore.indexes.json`. To deploy them:

```bash
firebase deploy --only firestore:indexes
```

The most common required index is:

```txt
breakRecords: deleted ASC, reportDate DESC
```
#   A g e n t - u t i l i z a t i o n - B r e a k  
 