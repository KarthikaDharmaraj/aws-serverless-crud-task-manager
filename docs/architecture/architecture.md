# AWS Serverless CRUD Task Manager

## Project Overview

A learning project to build a serverless task management application using AWS managed services and Python.

The application is designed to support creating, viewing, updating, and deleting tasks.


## Architecture

![AWS Serverless CRUD Task Manager Architecture](docs/architecture/architecture.png)

### AWS Services

- **Amazon S3:** Hosts the static frontend.
- **Amazon API Gateway:** Exposes HTTP endpoints for CRUD operations.
- **AWS Lambda:** Processes requests using Python.
- **Amazon DynamoDB:** Stores task records.
- **AWS IAM:** Controls Lambda permissions.
- **Amazon CloudWatch:** Collects application logs.

## Project Status

**Current phase:** Architecture documentation.

The architecture represents the planned design. Implementation, testing, and deployment will be completed in subsequent phases.

## Security and Cost Awareness

The project will follow least-privilege IAM principles, validate incoming requests, and monitor AWS usage. The initial learning version is not intended for production use.
