# Deployment and CI/CD Guide

This guide explains how the CI/CD pipeline works and how to manage deployments for the ReflexTraining project.

## 1. GitHub CI/CD Pipeline

The project uses GitHub Actions for continuous deployment. The workflow is triggered on every push to the `main` branch.

### Workflow Steps:
1. **Checkout**: Pulls the latest code from GitHub.
2. **Setup**: Prepares the SSH environment.
3. **Deploy**:
   - SSHes into your server using the PEM file.
   - Navigates to the project directory.
   - Pulls the latest changes: `git pull origin main`.
   - Rebuilds and restarts the application: `docker compose up --build -d`.

## 2. Required GitHub Secrets

To make the workflow work, you must add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

| Secret Name | Description |
| :--- | :--- |
| `SSH_PRIVATE_KEY` | The entire content of your `.pem` file. |
| `SSH_HOST` | Your server's public IP address or domain (`training.pyuscraft.space`). |
| `SSH_USERNAME` | The SSH username (usually `ubuntu` or `root`). |

## 3. Initial Server Setup for Git

On your server, you need to clone the repository once to the expected path:

```bash
cd ~/projects
git clone https://github.com/YOUR_USERNAME/ReflexTraining.git
cd ReflexTraining
```

> [!NOTE]
> Ensure the directory path matches the one defined in `.github/workflows/deploy.yml` (default is `~/projects/ReflexTraining`).

## 4. Manual Deployment

If you need to deploy manually, run these commands on the server:

```bash
cd ~/projects/ReflexTraining
git pull origin main
docker compose up --build -d
```

## 5. Troubleshooting

- **Check Docker logs**: `docker compose logs -f`
- **Restart Nginx**: `sudo systemctl restart nginx`
- **Check SSH connectivity**: Ensure the server's security group allows SSH (port 22) from GitHub's IP ranges or all (not recommended).
