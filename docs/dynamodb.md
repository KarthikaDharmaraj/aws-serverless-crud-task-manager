# DynamoDB — Phase 2

Tasks are stored in a single DynamoDB table.

## Overview

| Setting | Value |
|---|---|
| Table name | `Tasks` |
| Region | `eu-central-1` (Frankfurt) |
| Partition key | `id` (String) |
| Sort key | None |
| Capacity mode | Provisioned |
| Read / write capacity | 1 RCU / 1 WCU |
| Auto scaling | Off |

## Item structure

Every item is created by the Lambda function, which generates the `id` and timestamps. Clients can only set the editable fields.

| Attribute | Type | Set by | Notes |
|---|---|---|---|
| `id` | String | Lambda | UUID v4, partition key |
| `title` | String | Client | Required, max 200 characters |
| `description` | String | Client | Optional, max 2000 characters, defaults to `""` |
| `priority` | String | Client | `low`, `medium` or `high`, defaults to `medium` |
| `dueDate` | String | Client | `YYYY-MM-DD` or `""` |
| `completed` | Boolean | Client | Defaults to `false` |
| `createdAt` | String | Lambda | ISO 8601 UTC timestamp |
| `updatedAt` | String | Lambda | Refreshed on every update |

Example item:

```json
{
  "id": "7224c07b-fe16-480d-ba7c-2441f6d65ff5",
  "title": "Finish Phase 4",
  "description": "Write and test the Lambda",
  "priority": "low",
  "dueDate": "2026-10-25",
  "completed": true,
  "createdAt": "2026-10-20T12:09:45+00:00",
  "updatedAt": "2026-10-20T12:39:23+00:00"
}
```

## Access patterns

| Operation | DynamoDB action | Notes |
|---|---|---|
| List all tasks | `Scan` | Follows pagination; sorted newest-first in Lambda |
| Get one task | `GetItem` | Lookup by `id` |
| Create | `PutItem` | Condition `attribute_not_exists(id)` |
| Update | `UpdateItem` | Condition `attribute_exists(id)`, so no accidental inserts |
| Delete | `DeleteItem` | Condition `attribute_exists(id)`, returns 404 if missing |

## Testing

Before the Lambda existed, items were created manually in the console (Explore table items → Create item), in both form view and JSON view, and then deleted.

## Troubleshooting notes

| Symptom | Cause | Fix |
|---|---|---|
| `Expected '{'` in the JSON editor | The editor was in typed **DynamoDB JSON** mode, which expects values like `{"S": "..."}` | Switched off DynamoDB JSON to use plain JSON, or used the typed format |
| `Partition key attribute id must be non-empty` | A leftover template with an empty `id` was still in the editor | Cleared the editor completely before pasting the item |
| On-demand mode not covered by the free tier | The always-free DynamoDB allowance applies to provisioned capacity | Switched the table to provisioned 1 RCU / 1 WCU |

## Design decisions

- **Provisioned 1/1 instead of on-demand.** It stays inside the always-free allowance, which is the right choice for a low-traffic demo. Auto scaling is off so capacity can't grow into paid territory.
- **Scan for listing.** It's fine for a handful of items. At real scale, listing would use a Global Secondary Index (for example on a user or status attribute) and `Query`, since `Scan` reads the whole table.
- **Single-attribute key.** A UUID partition key spreads writes evenly. A multi-user version would add a user ID as partition key and the task ID as sort key.
