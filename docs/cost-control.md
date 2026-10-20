# Cost Control

The project was built to run at no cost on the AWS free tier. This page records the choices made to keep it that way and the plan for removing everything at the end.

## Safeguards

| Area | Choice | Why |
|---|---|---|
| Billing | Zero-spend budget alert in AWS Budgets | Sends an email as soon as any charge appears |
| DynamoDB | Provisioned 1 RCU / 1 WCU, auto scaling off | Stays inside the always-free allowance; on-demand mode isn't covered by it |
| Lambda | 128 MB memory, 3-second timeout | The smallest settings that work, so each request uses minimal compute |
| API Gateway | HTTP API with throttling (10 req/s, burst 20) | Cheaper than REST API, and throttling caps the damage if the public URL is abused |
| S3 | A few small static files | Storage and requests are negligible |
| Region | Everything in `eu-central-1` | No cross-region data transfer |

## Cleanup plan

There is no live demo. After the project is documented, every resource is deleted and only the code, screenshots and documents are kept in the repository.

Deletion order (front to back, so nothing is left calling a deleted resource):

1. **API Gateway:** delete `TaskManagerAPI`.
2. **Lambda:** delete `TaskManagerFunction`.
3. **CloudWatch Logs:** delete the log group `/aws/lambda/TaskManagerFunction`. Lambda doesn't remove it automatically.
4. **DynamoDB:** delete the `Tasks` table.
5. **S3:** empty the bucket `karthika-task-manager-2026`, then delete it.
6. **IAM:** delete the role `TaskManagerLambdaRole` and its inline policy.
7. **Budgets:** keep the zero-spend alert, since it protects the account for future work.

After cleanup, check the Billing dashboard and Cost Explorer over the following days to confirm there are no charges.
