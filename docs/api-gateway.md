# API Gateway — Phase 5

The API Gateway layer exposes `TaskManagerFunction` as a public HTTPS API that the S3-hosted frontend calls.

## Overview

| Setting | Value |
|---|---|
| API name | `TaskManagerAPI` |
| API type | HTTP API |
| Region | `eu-central-1` (Frankfurt), the same as Lambda, DynamoDB and S3 |
| Integration | AWS Lambda proxy → `TaskManagerFunction` |
| Payload format | 2.0 |
| Stage | `$default`, auto-deploy enabled |
| Invoke URL | `https://<api-id>.execute-api.eu-central-1.amazonaws.com` |

## Routes

All routes use the same Lambda integration. The function reads the HTTP method and the `id` path parameter to decide which operation to run.

| Method | Path | Operation | DynamoDB action | Success code |
|---|---|---|---|---|
| GET | `/tasks` | List all tasks | `Scan` | 200 |
| POST | `/tasks` | Create a task | `PutItem` | 201 |
| GET | `/tasks/{id}` | Get one task | `GetItem` | 200 |
| PUT | `/tasks/{id}` | Update a task | `UpdateItem` | 200 |
| DELETE | `/tasks/{id}` | Delete a task | `DeleteItem` | 204 |

Error responses from the Lambda:
- **400**: invalid JSON, missing title, or invalid field values
- **404**: task ID not found
- **500**: database or internal error

## CORS

Configured on the API, so API Gateway answers browser preflight (`OPTIONS`) requests itself. No OPTIONS route is needed.

| Setting | Value |
|---|---|
| Access-Control-Allow-Origin | `http://<bucket-name>.s3-website.eu-central-1.amazonaws.com` |
| Access-Control-Allow-Methods | `GET, POST, PUT, DELETE, OPTIONS` |
| Access-Control-Allow-Headers | `content-type` |
| Max age | 300 seconds |

The Lambda environment variable `ALLOWED_ORIGIN` is set to the same S3 website endpoint, so the function's own CORS headers match the API configuration.

## Throttling

The API is public and has no authentication, so stage-level throttling caps request volume and protects against runaway cost.

| Setting | Value |
|---|---|
| Rate limit | 10 requests/second |
| Burst limit | 20 requests |

## Permissions

When the Lambda integration was added through the console, API Gateway was automatically granted permission to invoke `TaskManagerFunction`. This is visible under Lambda → Configuration → Permissions → Resource-based policy statements.

The function itself runs as `TaskManagerLambdaRole`, which allows only the five DynamoDB actions above on the `Tasks` table, plus CloudWatch logging (see `docs/iam/`).

## Testing

**1. Browser GET.** Opening `<invoke-url>/tasks` returned the task list as JSON (status 200).

**2. Cross-origin POST from the S3 website.** Run in the browser console on the hosted frontend:

```javascript
const API = "https://<api-id>.execute-api.eu-central-1.amazonaws.com";

fetch(`${API}/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Created via API Gateway", priority: "medium" })
}).then(r => r.json()).then(console.log);
```

Result: a new task was returned with a generated `id`, default values and timestamps, and it appeared in the DynamoDB table. This confirms that the full path (S3 frontend → API Gateway → Lambda → DynamoDB) and the CORS configuration work.

## Troubleshooting notes

| Symptom | Cause | Fix |
|---|---|---|
| `{"message":"Not Found"}` | API Gateway found no matching route. The Invoke URL was opened without `/tasks`. | Use `<invoke-url>/tasks`. Paths are case-sensitive and must not have a trailing slash. |
| Single-task GET wouldn't work | A route was created as `OPTIONS /tasks/{id}` instead of `GET /tasks/{id}` | Edited the route method to GET and checked the integration was still attached |
| `SyntaxError: Unexpected end of input` in the console | Only the URL was pasted, not the full script | Pasted the complete fetch code |

## Design decisions

- **HTTP API over REST API.** It's lower cost, has lower latency, and has built-in CORS configuration. The REST API's extra features (API keys, usage plans, request validation) aren't needed for this project.
- **A single Lambda for all routes.** It keeps the deployment and IAM simple at this scale. A larger system might split it into one function per operation, each with a narrower role.
- **Throttling instead of authentication.** This is acceptable for a short-lived portfolio demo. A production version would add an authorizer (for example Amazon Cognito) and restrict write operations.
