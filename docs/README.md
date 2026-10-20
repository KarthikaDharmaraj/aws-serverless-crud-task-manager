# IAM — Phase 3

The Lambda function runs under a dedicated execution role with least-privilege permissions.

## Role

| Setting | Value |
|---|---|
| Role name | `TaskManagerLambdaRole` |
| Trusted entity | AWS service: `lambda.amazonaws.com` |
| Used by | `TaskManagerFunction` |
| Policy type | Inline (attached only to this role) |

The full policy is in this folder as JSON, with the AWS account ID masked.

## What the policy allows

**DynamoDB, on the `Tasks` table only:**

| Action | Used for |
|---|---|
| `dynamodb:Scan` | List tasks |
| `dynamodb:GetItem` | Get one task |
| `dynamodb:PutItem` | Create a task |
| `dynamodb:UpdateItem` | Update a task |
| `dynamodb:DeleteItem` | Delete a task |

**CloudWatch Logs, for `TaskManagerFunction` only:** creating its log group and log streams, and writing log events (log group `/aws/lambda/TaskManagerFunction`).

Nothing else is allowed. The function cannot touch other tables, other log groups, S3 or any other service.

## API Gateway permission

API Gateway's right to *invoke* the function is not part of this role. It is a resource-based policy on the Lambda itself, added automatically when the integration was created (Lambda → Configuration → Permissions → Resource-based policy statements).

## Design decisions

- **Inline policy instead of an AWS managed policy.** Managed policies such as `AmazonDynamoDBFullAccess` grant every action on every table. The inline policy grants only the five actions the code uses, on one table.
- **Resources are scoped by ARN,** not `*`, for both DynamoDB and CloudWatch Logs.
- **Account ID is masked** in the committed JSON, so the repo can be public.
- **Function name is fixed.** The logs permission names `TaskManagerFunction`, so the function has to use exactly that name.
