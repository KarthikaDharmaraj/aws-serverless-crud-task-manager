# AWS Serverless CRUD Task Manager

## Project Overview

The AWS Serverless CRUD Task Manager is a hands-on cloud project designed to demonstrate how to build and deploy a simple task management application using AWS serverless services.

The application will allow users to create, view, update, and delete tasks through a web interface. The project is being developed step by step, with a focus on understanding the architecture, security, testing, troubleshooting, and cost management.

**Project status:** In progress

## Objectives

- Build a simple task management web interface using HTML, CSS, and JavaScript.
- Host the frontend using Amazon S3.
- Build backend functionality using AWS Lambda and Python.
- Expose backend operations through Amazon API Gateway.
- Store task records in Amazon DynamoDB.
- Apply least-privilege IAM permissions.
- Use Amazon CloudWatch logs for monitoring and troubleshooting.
- Document implementation steps, testing results, and lessons learned.

## Planned Architecture

The application will use the following architecture:

1. **Amazon S3** — hosts the static frontend.
2. **Amazon API Gateway** — receives HTTP requests from the frontend.
3. **AWS Lambda** — processes task operations using Python.
4. **Amazon DynamoDB** — stores task records.
5. **AWS IAM** — controls access to AWS resources.
6. **Amazon CloudWatch** — provides logs for debugging and troubleshooting.

The frontend will communicate with the backend through API Gateway. Lambda will process each request and interact with DynamoDB as required.

## CRUD Operations

| Operation | Description |
|---|---|
| Create | Add a new task |
| Read | Retrieve and display tasks |
| Update | Edit an existing task |
| Delete | Remove a task |

## Technology Stack

- Amazon S3
- Amazon API Gateway
- AWS Lambda
- Python
- Amazon DynamoDB
- AWS IAM
- Amazon CloudWatch
- HTML, CSS, and JavaScript
- Git and GitHub

## Security and Cost Considerations

- Follow the principle of least privilege for IAM permissions.
- Never commit AWS access keys, passwords, or other secrets to GitHub.
- Validate incoming requests in the backend.
- Review AWS pricing, account-plan limits, credits, and usage before deploying resources.
- Clean up resources that are no longer needed after testing.

AWS charges may apply depending on the account plan, service usage, and applicable pricing offers.

## Project Roadmap

- [x] Create the GitHub repository.
- [x] Document the project objectives and planned architecture.
- [x]  Build the frontend.
- [x] Host the frontend on Amazon S3.
- [ ] Create the DynamoDB table.
- [ ] Implement and test Lambda functions.
- [ ] Configure API Gateway routes and integrations.
- [ ] Connect the frontend to the backend.
- [ ] Test Create, Read, Update, and Delete operations.
- [ ] Document the final architecture and testing results.
- [ ] Clean up unused AWS resources and review billing.

## Learning Outcomes

This project aims to develop practical skills in AWS serverless architecture, Python, API integration, database operations, IAM security, logging, troubleshooting, and cost awareness.

The implementation notes and testing results will be added as each stage is completed.

---

**Author:** Karthika Dharmaraj  
**Location:** Luxembourg  
**Career focus:** Cloud Support / Junior Cloud Engineering
