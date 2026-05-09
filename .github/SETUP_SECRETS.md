# GitHub Secrets & Variables Setup Guide

This guide explains how to configure environment variables for the GitHub Actions workflows.

## 📋 Required Configuration

### For `iqama-engine` Repository

#### **Secrets** (Sensitive Data - Encrypted)

Navigate to: **Repository Settings → Secrets and variables → Actions → Secrets**

| Secret Name     | Description                        | Example                               |
| --------------- | ---------------------------------- | ------------------------------------- |
| `DATABASE_URL`  | MySQL connection string for Prisma | `mysql://user:pass@host:3306/iqama`   |
| `ADMIN_API_KEY` | API key for admin endpoints        | Generate with: `openssl rand -hex 32` |

#### **Variables** (Non-Sensitive Configuration)

Navigate to: **Repository Settings → Secrets and variables → Actions → Variables**

| Variable Name      | Description                            | Example                       |
| ------------------ | -------------------------------------- | ----------------------------- |
| `MASJID_LATITUDE`  | Latitude of the masjid                 | `49.2652047`                  |
| `MASJID_LONGITUDE` | Longitude of the masjid                | `-122.7878735`                |
| `MASJID_TIMEZONE`  | IANA timezone string                   | `America/Vancouver`           |
| `CORS_ORIGIN`      | Allowed CORS origins (comma-separated) | `https://prayers.example.com` |

---

### For `iqama-ui` Repository

#### **Variables** (Non-Sensitive Configuration)

Navigate to: **Repository Settings → Secrets and variables → Actions → Variables**

| Variable Name       | Description     | Example                           |
| ------------------- | --------------- | --------------------------------- |
| `VITE_API_BASE_URL` | Backend API URL | `https://api.prayers.example.com` |

---

## 🚀 How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** (for secrets) or **Variables** tab → **New repository variable** (for variables)
5. Enter the **Name** and **Value**
6. Click **Add secret** or **Add variable**

## 🔒 Security Best Practices

- ✅ **Never commit** `.env` files to the repository
- ✅ Use **Secrets** for sensitive data (passwords, API keys, tokens)
- ✅ Use **Variables** for non-sensitive configuration (URLs, feature flags)
- ✅ Secrets are **encrypted** and **never visible** in logs
- ✅ Variables are **visible** in workflow logs

## 🧪 Testing

After adding secrets/variables:

1. Push a commit to `main` or `develop` branch
2. Go to **Actions** tab in your repository
3. Watch the workflow run with your environment variables

## 📝 Notes

- **Secrets** are masked in logs (shown as `***`)
- **Variables** are visible in logs
- Changes to secrets/variables take effect immediately
- No need to restart workflows or re-run actions

## 🔄 Updating Values

To update a secret or variable:

1. Go to the same location where you added it
2. Click on the name
3. Click **Update secret** or **Update variable**
4. Enter the new value and save

---

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Variables Documentation](https://docs.github.com/en/actions/learn-github-actions/variables)
