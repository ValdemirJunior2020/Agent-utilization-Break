# Uploaded Sample Report Analysis

The project includes parser support for both formats found in your uploaded files.

## Processed summary reports

Files included:

- `WNS_Break_Time_Report.xlsx`
- `Telus_Break_Time_Report.xlsx`
- `Concentrix_Break_Time_Report.xlsx`
- `Buwelo_Break_Time_Report.xlsx`
- `TEP_Break_Time_Report.xlsx`

Detected sheet pattern:

- `1 Day Report <Center>`
- `7 Days Report <Center>`

Detected columns:

| Column | Header | Parser behavior |
| --- | --- | --- |
| A | Agent HP ID / Name | Extracts `hp########` when present. If no HP ID exists, stores the value as the agent name and uses the same value as the record identifier. |
| B | Grand Total Break (Minutes) | Primary break-minutes source. |
| C | Break Time (Hours:Minutes) | Backup break-time source if total minutes are missing. |
| D | Exception Name / Reason | Saved as exception reason. |

Important observation: the TEP processed sample uses agent names instead of HP IDs. The parser supports this, but HP IDs should be added later if available for stronger repeated-agent tracking.

## Original Tableau hourly reports

Original zip included:

- `Buwelo Service.xlsx`
- `Concentrix Service.xlsx`
- `Telus Utilization.xlsx`
- `TEP Service.xlsx`
- `WNS Service (1).xlsx`

Detected pattern:

- Sheet: `Sheet 1`
- Cell D1 contains `summary_date`
- Row 2 contains hourly labels
- Column A contains the report date near row 3, for example `June 22, 2026`
- Column B contains HP ID or agent name
- Column C contains the metric name `Break`
- Columns D onward contain break minutes by hour

Parser behavior:

1. Finds rows where Column C equals or contains `Break`.
2. Reads the agent identifier from Column B.
3. Sums all numeric hourly values from Column D onward.
4. Stores the selected upload report date on every record.
5. Stores hourly values in `hourlyBreaks` for future drill-down views.

## Date Handling

The Upload page requires the user to select a report date. This date is saved to every imported record. If a Tableau hourly report contains a date, the parser can detect it, but the selected upload date remains the primary date so leadership reports stay consistent.

## Buwelo Split

The app treats Buwelo Colombia and Buwelo Ghana as separate operational centers. If a file name only says `Buwelo`, the Super Admin must choose Colombia or Ghana during upload.
