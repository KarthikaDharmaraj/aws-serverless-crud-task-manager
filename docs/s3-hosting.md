# S3 Static Website Hosting — Phase 7

The frontend (`index.html`, `styles.css`, `app.js`) is served directly from Amazon S3 as a static website. This phase was completed early, before the backend, so the hosted page could be used to test CORS in Phase 5.

## Overview

| Setting | Value |
|---|---|
| Bucket name | `karthika-task-manager-2026` |
| Region | `eu-central-1` (Frankfurt) |
| Static website hosting | Enabled |
| Index document | `index.html` |
| Website endpoint | `http://karthika-task-manager-2026.s3-website.eu-central-1.amazonaws.com` |

## Configuration steps

1. **Created the bucket** in `eu-central-1`, the same region as every other resource in the project.
2. **Turned off Block Public Access** for this bucket only. Public reads are needed for a website, and the bucket holds nothing but frontend files.
3. **Enabled static website hosting** under Properties → Static website hosting, with `index.html` as the index document.
4. **Added a read-only bucket policy** (below).
5. **Uploaded the frontend files** to the bucket root.
6. **Tested the website endpoint** in the browser.

## Bucket policy

Allows anyone to read objects, and nothing else. There is no public listing, uploading or deleting.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::karthika-task-manager-2026/*"
    }
  ]
}
```

## How it connects to the backend

The website endpoint is the **origin** that the browser sends with every API request. It is configured in two places, which must match it exactly (`http://`, no trailing slash):

- API Gateway CORS: `Access-Control-Allow-Origin` (see `api-gateway.md`)
- Lambda environment variable `ALLOWED_ORIGIN` (see `lambda.md`)

## Design decisions

- **S3 website endpoint over CloudFront.** It's simpler and stays within the free tier for a portfolio project. The trade-off is that the website endpoint is HTTP only. A production setup would put CloudFront in front of a private bucket (Origin Access Control) to get HTTPS, caching and a custom domain.
- **Public access is limited to `s3:GetObject`.** Even though the bucket is public, the policy grants only read access to objects.
