"""
TaskManagerFunction - CRUD backend for the AWS Serverless Task Manager.

Routes (API Gateway proxy integration, wired up in Phase 5):
    GET    /tasks          -> list all tasks           (dynamodb:Scan)
    GET    /tasks/{id}     -> get one task             (dynamodb:GetItem)
    POST   /tasks          -> create a task            (dynamodb:PutItem)
    PUT    /tasks/{id}     -> update a task            (dynamodb:UpdateItem)
    DELETE /tasks/{id}     -> delete a task            (dynamodb:DeleteItem)

Accepts both REST API (payload v1) and HTTP API (payload v2) event shapes,
so the choice of API type in Phase 5 doesn't require code changes.

Environment variables:
    TABLE_NAME      DynamoDB table name (default: Tasks)
    ALLOWED_ORIGIN  CORS origin; set to the S3 website endpoint in Phase 5 (default: *)
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "Tasks")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

# Created once per container and reused across warm invocations
table = boto3.resource("dynamodb").Table(TABLE_NAME)

# Fields a client may set. Anything else in the request body is ignored.
EDITABLE_FIELDS = {"title", "description", "priority", "dueDate", "completed"}
VALID_PRIORITIES = {"low", "medium", "high"}
MAX_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 2000


# ---------- helpers ----------

class DecimalEncoder(json.JSONEncoder):
    """DynamoDB returns numbers as Decimal, which json can't serialise."""
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def response(status_code, body=None):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body, cls=DecimalEncoder) if body is not None else "",
    }


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_body(event):
    raw = event.get("body")
    if not raw:
        return {}
    if event.get("isBase64Encoded"):
        import base64
        raw = base64.b64decode(raw).decode("utf-8")
    data = json.loads(raw)  # ValueError on bad JSON, caught in handler
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")
    return data


def validate(data, require_title):
    """Return (clean_fields, error_message)."""
    clean = {k: v for k, v in data.items() if k in EDITABLE_FIELDS}

    if require_title or "title" in clean:
        title = clean.get("title")
        if not isinstance(title, str) or not title.strip():
            return None, "title is required and must be a non-empty string"
        if len(title) > MAX_TITLE_LENGTH:
            return None, f"title must be at most {MAX_TITLE_LENGTH} characters"
        clean["title"] = title.strip()

    if "description" in clean:
        if not isinstance(clean["description"], str):
            return None, "description must be a string"
        if len(clean["description"]) > MAX_DESCRIPTION_LENGTH:
            return None, f"description must be at most {MAX_DESCRIPTION_LENGTH} characters"

    if "priority" in clean and clean["priority"] not in VALID_PRIORITIES:
        return None, f"priority must be one of {sorted(VALID_PRIORITIES)}"

    if "completed" in clean and not isinstance(clean["completed"], bool):
        return None, "completed must be true or false"

    if "dueDate" in clean and clean["dueDate"] not in (None, ""):
        try:
            datetime.strptime(clean["dueDate"], "%Y-%m-%d")
        except (TypeError, ValueError):
            return None, "dueDate must be in YYYY-MM-DD format"

    return clean, None


def get_route(event):
    """Normalise REST API (v1) and HTTP API (v2) events to (method, task_id)."""
    method = event.get("httpMethod") or (
        event.get("requestContext", {}).get("http", {}).get("method")
    )
    path_params = event.get("pathParameters") or {}
    return (method or "").upper(), path_params.get("id")


# ---------- CRUD operations ----------

def list_tasks():
    items = []
    kwargs = {}
    while True:  # follow pagination in case the table grows past 1 MB
        result = table.scan(**kwargs)
        items.extend(result.get("Items", []))
        if "LastEvaluatedKey" not in result:
            break
        kwargs["ExclusiveStartKey"] = result["LastEvaluatedKey"]
    items.sort(key=lambda t: t.get("createdAt", ""), reverse=True)
    return response(200, items)


def get_task(task_id):
    item = table.get_item(Key={"id": task_id}).get("Item")
    if not item:
        return response(404, {"message": f"Task {task_id} not found"})
    return response(200, item)


def create_task(data):
    clean, error = validate(data, require_title=True)
    if error:
        return response(400, {"message": error})

    timestamp = now_iso()
    item = {
        "id": str(uuid.uuid4()),
        "title": clean["title"],
        "description": clean.get("description", ""),
        "priority": clean.get("priority", "medium"),
        "dueDate": clean.get("dueDate") or "",
        "completed": clean.get("completed", False),
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    table.put_item(Item=item, ConditionExpression="attribute_not_exists(id)")
    return response(201, item)


def update_task(task_id, data):
    clean, error = validate(data, require_title=False)
    if error:
        return response(400, {"message": error})
    if not clean:
        return response(400, {"message": f"Nothing to update. Editable fields: {sorted(EDITABLE_FIELDS)}"})

    clean["updatedAt"] = now_iso()
    # Placeholders (#n, :v) avoid clashes with DynamoDB reserved words
    names, values, parts = {}, {}, []
    for i, (field, value) in enumerate(clean.items()):
        names[f"#f{i}"] = field
        values[f":v{i}"] = value
        parts.append(f"#f{i} = :v{i}")

    try:
        result = table.update_item(
            Key={"id": task_id},
            UpdateExpression="SET " + ", ".join(parts),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ConditionExpression="attribute_exists(id)",  # no silent upserts
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(404, {"message": f"Task {task_id} not found"})
        raise
    return response(200, result["Attributes"])


def delete_task(task_id):
    try:
        table.delete_item(
            Key={"id": task_id},
            ConditionExpression="attribute_exists(id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(404, {"message": f"Task {task_id} not found"})
        raise
    return response(204)


# ---------- entry point ----------

def lambda_handler(event, context):
    method, task_id = get_route(event)
    logger.info("Request: %s id=%s", method, task_id)

    try:
        if method == "OPTIONS":
            return response(204)  # CORS preflight
        if method == "GET":
            return get_task(task_id) if task_id else list_tasks()
        if method == "POST" and not task_id:
            return create_task(parse_body(event))
        if method == "PUT" and task_id:
            return update_task(task_id, parse_body(event))
        if method == "DELETE" and task_id:
            return delete_task(task_id)
        return response(405, {"message": f"Method {method} not allowed on this path"})

    except ValueError as e:  # bad JSON or non-object body
        return response(400, {"message": f"Invalid request body: {e}"})
    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return response(500, {"message": "Database error"})
    except Exception:
        logger.exception("Unhandled error")
        return response(500, {"message": "Internal server error"})
