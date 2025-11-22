# IAM Audit & Remediation Notes

This file contains commands, best-practices, and checks to help audit IAM bindings created by the bootstrap script and to tighten permissions over time.

Run these checks regularly (weekly/monthly) and after running the bootstrap script.

1) List project-level IAM bindings (quick overview)

```bash
gcloud projects get-iam-policy $PROJECT_ID --format=json | jq
```

2) Inspect bindings for specific service accounts

Replace `SERVICE_ACCOUNT_EMAIL` with the full email.

```bash
gcloud iam service-accounts get-iam-policy SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID
```

3) Check Artifact Registry repo-level bindings

```bash
gcloud artifacts repositories get-iam-policy $AR_REPO --location=$REGION --project=$PROJECT_ID
```

4) Check Secret Manager bindings for a secret

```bash
gcloud secrets get-iam-policy GEMINI_API_KEY --project=$PROJECT_ID
```

5) Remove unnecessary bindings (example)

If you find `serviceAccount:someone@example.iam.gserviceaccount.com` has an overly-broad role, remove it as follows:

```bash
gcloud projects remove-iam-policy-binding $PROJECT_ID \
  --member='serviceAccount:someone@example.iam.gserviceaccount.com' \
  --role='roles/run.admin'
```

6) Revoke Cloud Build SA permissions if you switch to an alternative deploy flow

```bash
gcloud projects remove-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

7) Audit checklist / recommendations
- Prefer resource-level IAM bindings (artifact repo, secret) instead of project-wide roles.
- Limit `roles/run.admin` to a dedicated deployer SA, not the Cloud Build SA.
- Grant `roles/secretmanager.secretAccessor` only to service accounts that need the secret.
- Grant `roles/iam.serviceAccountUser` only between the Cloud Build SA and the deployer SA (so that Cloud Build can impersonate it), not broadly.
- Enable audit logs for Admin Activity and Data Access for secrets and Cloud Run.
- Periodically rotate service account keys (avoid creating keys; prefer Workload Identity Federation).

8) Useful commands to enable audit logging (Admin Activity is enabled by default for projects):

```bash
# Ensure Audit Logs exist / check log sinks or use Cloud Logging to inspect
gcloud logging read "resource.type=project AND protoPayload.serviceName:run.googleapis.com" --limit=50 --project=$PROJECT_ID
```

9) Remediation process example
- If a deployer SA is compromised, remove it and create a replacement SA, rebind roles for the new SA, and redeploy services with the new SA. Revoke old SA with:

```bash
gcloud iam service-accounts disable old-sa@${PROJECT_ID}.iam.gserviceaccount.com --project=$PROJECT_ID
```

10) Contact & escalation
- Keep a runbook describing who can approve IAM changes and how to reach the security/contact owner if unexpected changes are detected.

11) Workload Identity Federation checks

- List existing workload identity pools:

```bash
gcloud iam workload-identity-pools list --project=$PROJECT_ID
```

- Inspect a provider:

```bash
gcloud iam workload-identity-pools providers describe github-provider --workload-identity-pool=github-pool --project=$PROJECT_ID --location=global
```

- Check which principals have been granted workloadIdentityUser on a service account:

```bash
gcloud iam service-accounts get-iam-policy cloud-run-deployer-sa@${PROJECT_ID}.iam.gserviceaccount.com --project=$PROJECT_ID
```

If you see the workload identity principal (starts with 'principalSet://iam.googleapis.com/...') bound to the deployer SA, verify the IAM condition (if any) restricts actor to your repository and branch.

If you want, I can add a small automation that runs these checks and reports findings to a Slack webhook or creates a GitHub issue if unexpected bindings are found.
