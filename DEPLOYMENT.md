# Production deployment setup

Both Almax repositories deploy independently after a successful push to `main`:

- `ahmedreezy/almaxapi` tests the Laravel API against PostgreSQL, deploys it, runs migrations, refreshes caches, restarts queue workers, and checks `/api/health`.
- `ahmedreezy/almax` runs the Node tests, builds Vue, publishes the generated assets into the Laravel `public` directory, and checks the public website.

Deployments use the GitHub `production` environment and SSH into the cPanel account. Only one deployment per repository runs at a time.

## 1. Prepare SSH access

Generate a dedicated key pair on a trusted administrator computer:

```bash
ssh-keygen -t ed25519 -C "almax-github-actions" -f ./almax_github_actions
```

Add the contents of `almax_github_actions.pub` to the cPanel user's `~/.ssh/authorized_keys`. Keep the private `almax_github_actions` file secret.

Obtain the server host key and verify its fingerprint against the value shown by the hosting provider before trusting it:

```bash
ssh-keyscan -p 22 your-server-hostname
```

The cPanel user must be able to run `git fetch origin main` non-interactively in both server checkouts. For private repositories, configure a read-only GitHub deploy key for each server checkout.

## 2. Prepare the server checkouts

The workflow expects separate Git checkouts for the frontend and API. Confirm the real paths over SSH:

```bash
cd /path/to/almax && pwd
git fetch origin main

cd /path/to/almaxapi && pwd
git fetch origin main
test -f .env
```

The Laravel `.env` must already contain the production database, OpenAI, mail/payment, application URL, and application-key settings. It is never copied from GitHub.

Confirm the required server commands are available to the cPanel SSH user:

```bash
node --version
npm --version
php --version
composer --version
git --version
```

## 3. Configure GitHub environments

In **each repository**, open **Settings → Environments → New environment** and create an environment named `production`.

Add these environment secrets to both repositories:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | cPanel SSH hostname |
| `DEPLOY_PORT` | SSH port, usually `22` |
| `DEPLOY_USER` | cPanel SSH username |
| `DEPLOY_SSH_KEY` | Entire private key, including BEGIN/END lines |
| `DEPLOY_KNOWN_HOSTS` | Verified `ssh-keyscan` output |

Add these environment variables to `ahmedreezy/almaxapi`:

| Variable | Example |
| --- | --- |
| `API_DEPLOY_PATH` | `/home/almaxpredictions.com/almaxapi` |
| `PRODUCTION_URL` | `https://www.almaxpredictions.com` |
| `API_HEALTH_URL` | `https://www.almaxpredictions.com/api/health` |

Add these environment variables to `ahmedreezy/almax`:

| Variable | Example |
| --- | --- |
| `FRONTEND_DEPLOY_PATH` | The absolute server path to the frontend checkout |
| `API_DEPLOY_PATH` | `/home/almaxpredictions.com/almaxapi` |
| `PRODUCTION_URL` | `https://www.almaxpredictions.com` |

Optionally configure required reviewers on the `production` environment. Doing so adds a manual approval step and therefore makes deployment guarded rather than fully automatic.

## 4. Configure the support queue

The in-platform support bot dispatches jobs to the `support` queue. Keep a persistent worker running through Supervisor or the cPanel process manager:

```bash
php artisan queue:work database --queue=support --sleep=1 --tries=1 --timeout=60 --max-time=3600
```

Run this as a persistent Supervisor, systemd, or cPanel Process Manager process.
A once-per-minute cron worker is only a fallback and can add nearly one minute
of queue delay to every chat response.

The API deployment script runs `php artisan queue:restart`, which tells an existing worker to restart cleanly after deployment.

## 5. Remove legacy GitHub webhooks

Remove any old push webhooks targeting `/webhook/github` from both GitHub repositories. Keeping them enabled would run the legacy deployment code alongside GitHub Actions and could cause concurrent deployments.

## 6. Activate and test

Configure the environments before merging the workflow commits into `main`. Once merged:

1. Open the repository's **Actions** tab.
2. Select **Deploy Production**.
3. Use **Run workflow** once to test the connection.
4. Confirm the validation and deployment jobs are green.
5. Confirm the API health endpoint and public site load.
6. Future successful merges into `main` deploy automatically.

A dirty server checkout or a non-fast-forward branch causes deployment to stop rather than overwrite server-side changes.
