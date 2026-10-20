# Lambda — Phase 4

A single Python Lambda function handles every API route. The code is in `backend/lambda_function.py`.

## Overview

| Setting | Value |
|---|---|
| Function name | `TaskManagerFunction` |
| Region | `eu-central-1` (Frankfurt) |
| Runtime | Python 3.13 |
| Handler | `lambda_function.lambda_handler` |
| Execution role | `TaskManagerLambdaRole` (see `iam/README.md`) |
| Memory | 128 MB |
| Timeout | 3 seconds |
| Trigger | API Gateway HTTP API (see `api-gateway.md`) |

## Environment variables

| Key | Value | Purpose |
|---|---|---|
| `TABLE_NAME` | `Tasks` | DynamoDB table to use |
| `ALLOWED_ORIGIN` | `http://karthika-task-manager-2026.s3-website.eu-central-1.amazonaws.com` | CORS origin in the function's responses |

Both have defaults in the code (`Tasks` and `*`), so the function still runs if one is missing.

## Routing

The handler reads the HTTP method and the optional `id` path parameter:

| Method | `id` present? | Operation | Success | Errors |
|---|---|---|---|---|
| GET | No | List all tasks | 200 | 500 |
| GET | Yes | Get one task | 200 | 404, 500 |
| POST | No | Create a task | 201 | 400, 500 |
| PUT | Yes | Update a task | 200 | 400, 404, 500 |
| DELETE | Yes | Delete a task | 204 | 404, 500 |
| OPTIONS | Either | CORS preflight | 204 | |
| Anything else | | | | 405 |

It accepts both API Gateway payload formats: REST API (v1, `httpMethod`) and HTTP API (v2, `requestContext.http.method`).

## Validation

- Only `title`, `description`, `priority`, `dueDate` and `completed` can be set by the client. Any other field in the body is ignored, so a client can't overwrite `id`, `createdAt` or `updatedAt`.
- `title` is required on create, non-empty and at most 200 characters.
- `description` is at most 2000 characters.
- `priority` must be `low`, `medium` or `high`.
- `completed` must be a boolean.
- `dueDate` must be `YYYY-MM-DD` or empty.
- Invalid JSON, or a body that isn't a JSON object, returns 400.

## Testing

All operations were tested from the Lambda console with test events (see `test-events.md`):

| Test | Expected | Result |
|---|---|---|
| createTask | 201 + new item | Pass |
| listTasks | 200 + array | Pass |
| getTask | 200 + item | Pass |
| updateTask | 200, `completed: true`, new `updatedAt` | Pass |
| deleteTask | 204, item gone from table | Pass |
| createTask with no title | 400 | Pass |
| createTask with bad JSON | 400 | Pass |
| getTask with unknown id | 404 | Pass |
| updateTask with unknown id | 404 | Pass |

Note: the console shows **"Executing function: succeeded"** for 400 and 404 responses too, because the function handled the error and returned normally. The real outcome is the `statusCode` in the response details.

## Design decisions

- **Conditional writes.** Update and delete use `attribute_exists(id)`, so an unknown ID returns 404 instead of silently creating a new item. Create uses `attribute_not_exists(id)` as a safeguard against ID collisions.
- **Reserved-word safety.** Update expressions use placeholders (`#f0`, `:v0`), so field names that clash with DynamoDB reserved words still work.
- **DynamoDB client outside the handler.** It's created once per container and reused across warm invocations.
- **Errors are caught and logged.** DynamoDB errors return a generic 500 to the client, with details in CloudWatch Logs only, so internal details aren't leaked.
- **One function for all routes.** It keeps the deployment and IAM simple at this scale. A larger system might use one function per operation, each with a narrower role.
