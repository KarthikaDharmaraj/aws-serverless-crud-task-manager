# Lambda console test events — TaskManagerFunction

Create each one under **Test → Create new event**, paste the JSON, save with the name shown.
Replace `REPLACE_WITH_ID` with the `id` returned by **createTask**.

## 1. createTask — expect 201
```json
{
  "httpMethod": "POST",
  "path": "/tasks",
  "pathParameters": null,
  "body": "{\"title\": \"Finish Phase 4\", \"description\": \"Write and test the Lambda\", \"priority\": \"high\", \"dueDate\": \"2026-10-25\"}"
}
```

## 2. listTasks — expect 200 and an array
```json
{
  "httpMethod": "GET",
  "path": "/tasks",
  "pathParameters": null
}
```

## 3. getTask — expect 200
```json
{
  "httpMethod": "GET",
  "path": "/tasks/REPLACE_WITH_ID",
  "pathParameters": { "id": "REPLACE_WITH_ID" }
}
```

## 4. updateTask — expect 200, completed: true, new updatedAt
```json
{
  "httpMethod": "PUT",
  "path": "/tasks/REPLACE_WITH_ID",
  "pathParameters": { "id": "REPLACE_WITH_ID" },
  "body": "{\"completed\": true, \"priority\": \"low\"}"
}
```

## 5. deleteTask — expect 204, then rerun getTask → 404
```json
{
  "httpMethod": "DELETE",
  "path": "/tasks/REPLACE_WITH_ID",
  "pathParameters": { "id": "REPLACE_WITH_ID" }
}
```

## Negative tests (good screenshots for the README)

### createTask-noTitle — expect 400
```json
{
  "httpMethod": "POST",
  "path": "/tasks",
  "pathParameters": null,
  "body": "{\"description\": \"no title here\"}"
}
```

### createTask-badJson — expect 400
```json
{
  "httpMethod": "POST",
  "path": "/tasks",
  "pathParameters": null,
  "body": "{not valid json"
}
```

### getTask-missing — expect 404
```json
{
  "httpMethod": "GET",
  "path": "/tasks/does-not-exist",
  "pathParameters": { "id": "does-not-exist" }
}
```

### updateTask-missing — expect 404 (proves no silent upsert)
```json
{
  "httpMethod": "PUT",
  "path": "/tasks/does-not-exist",
  "pathParameters": { "id": "does-not-exist" },
  "body": "{\"completed\": true}"
}
```
