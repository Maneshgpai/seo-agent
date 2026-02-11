# SEO Agent — Setup Guide

This guide shows how to run SEO Agent on your own computer or deploy it to a cloud provider. Steps are written so you can follow them even if you are new to the tools used.

---

# Part 1: Run on Your Computer (Localhost)

Use this to try the app on your machine without using any cloud account.

## What You Need

- A computer with **Windows**, **macOS**, or **Linux**
- **Node.js 22 or newer** — [Download](https://nodejs.org/) (pick the “LTS” version)
- A **terminal** (Command Prompt on Windows, Terminal on Mac, or any terminal on Linux)

## Step 1: Get the Code

**Option A — If you have Git installed**

1. Open a terminal.
2. Go to the folder where you want the project (e.g. `Documents`):
   ```bash
   cd Documents
   ```
3. Clone the repository (replace with the real repo URL if different):
   ```bash
   git clone https://github.com/your-org/seo-agent.git
   cd seo-agent
   ```

**Option B — If you don’t use Git**

1. Open the project’s GitHub page.
2. Click the green **Code** button → **Download ZIP**.
3. Unzip the file and open a terminal in the unzipped `seo-agent` folder.

## Step 2: Install Dependencies

In the same terminal, inside the `seo-agent` folder, run:

```bash
npm install
```

Wait until it finishes (it may take 1–2 minutes).

## Step 3: Create Your Config File

1. Copy the example environment file:
   - **Windows (Command Prompt):** `copy .env.example .env`
   - **Mac/Linux:** `cp .env.example .env`
2. Open `.env` in a text editor. You can leave everything as-is for a first run.  
   To add **Google PageSpeed** or **Chrome UX Report (CrUX)** later, add:
   ```bash
   GOOGLE_PAGESPEED_API_KEY=your_key_here
   CRUX_API_KEY=your_crux_key_here
   ```
   (See README for PageSpeed and CrUX setup. CrUX is free, 150 queries/min.)

## Step 4: Start the App

Run:

```bash
npm run dev:server
```

When you see “Server running on port 8080”, open your browser and go to:

**http://localhost:8080**

You should see the SEO Agent page. Enter your email and a website URL, then click **Start Analysis**.

## Stopping the App

In the terminal where the server is running, press **Ctrl + C**.

---

# Part 2: Deploy to Google Cloud (GCP)

You get a public URL (e.g. `https://seo-agent-xxxxx.run.app`) so anyone can use the app.

## What You Need

- A **Google account**
- **Google Cloud account** — [Create one](https://console.cloud.google.com/) (free tier is enough to start)
- **Billing enabled** on the project (required for Cloud Run; you can set a budget to avoid surprises)

## Step 1: Install Google Cloud CLI (One-Time)

1. Go to: [Install the gcloud CLI](https://cloud.google.com/sdk/docs/install).
2. Install the version for your operating system and follow the installer.
3. Open a **new** terminal and run:
   ```bash
   gcloud init
   ```
4. Sign in with your Google account and pick (or create) a project. Remember the **Project ID**.

## Step 2: Turn On Required APIs

In the terminal:

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

Use the same project you chose in Step 1.

## Step 3: Build and Deploy from Your Project Folder

1. Open a terminal and go to your `seo-agent` folder:
   ```bash
   cd path/to/seo-agent
   ```
2. Set your project (replace `YOUR_PROJECT_ID` with your real Project ID):
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Deploy (this builds the app and deploys it to Cloud Run):
   ```bash
   gcloud run deploy seo-agent --source . --region us-central1 --allow-unauthenticated --memory 2Gi --cpu 2
   ```
4. When asked “Do you want to continue?”, type **Y** and press Enter.

After a few minutes you’ll see a **Service URL**. That is your live app (e.g. `https://seo-agent-xxxxx-uc.a.run.app`).

## Step 4 (Optional): Add PageSpeed API Key in the Cloud

1. In [Google Cloud Console](https://console.cloud.google.com/) go to **Cloud Run** → select **seo-agent** → **Edit & deploy new revision**.
2. Open the **Variables & Secrets** tab.
3. Add a variable:
   - Name: `GOOGLE_PAGESPEED_API_KEY`
   - Value: your PageSpeed API key
4. Deploy the new revision.

Your app will then use PageSpeed for Core Web Vitals and Lighthouse scores.

## Step 4b (Optional): Add CrUX API Key in the Cloud

To include real-user Core Web Vitals (Chrome UX Report), enable **Chrome UX Report API** in the same GCP project, then in Cloud Run → **Edit & deploy new revision** → **Variables & Secrets** add:

- Name: `CRUX_API_KEY`
- Value: your API key (can be the same key with CrUX API enabled, or a separate key)

---

# Part 3: Deploy to Microsoft Azure

You get a public URL (e.g. `https://seo-agent.azurecontainerapps.io`) so anyone can use the app.

## What You Need

- A **Microsoft account**
- **Azure account** — [Create one](https://azure.microsoft.com/free/)

## Step 1: Install Azure CLI (One-Time)

1. Go to: [Install the Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).
2. Install the version for your OS and follow the steps.
3. Open a new terminal and run:
   ```bash
   az login
   ```
   Sign in in the browser window that opens.

## Step 2: Create a Resource Group and Container Registry

In the terminal (replace `YourResourceGroup` and `YourRegistryName` with names you choose; registry name must be unique in Azure):

```bash
az group create --name YourResourceGroup --location eastus
az acr create --resource-group YourResourceGroup --name YourRegistryName --sku Basic
```

## Step 3: Build and Push the Docker Image

1. Log in to the registry:
   ```bash
   az acr login --name YourRegistryName
   ```
2. Go to your project folder:
   ```bash
   cd path/to/seo-agent
   ```
3. Build and push (replace `YourRegistryName` with your registry name):
   ```bash
   az acr build --registry YourRegistryName --image seo-agent:latest .
   ```

## Step 4: Create the Container App

1. Create an environment and app (replace placeholders; use the same resource group and registry):
   ```bash
   az containerapp env create --name seo-agent-env --resource-group YourResourceGroup --location eastus
   az containerapp create --name seo-agent --resource-group YourResourceGroup --environment seo-agent-env --image YourRegistryName.azurecr.io/seo-agent:latest --target-port 8080 --ingress external --registry-server YourRegistryName.azurecr.io --cpu 2 --memory 4Gi
   ```
2. When asked for registry username/password, use the values from:
   ```bash
   az acr credential show --name YourRegistryName
   ```

## Step 5: Get Your URL

Run:

```bash
az containerapp show --name seo-agent --resource-group YourResourceGroup --query properties.configuration.ingress.fqdn -o tsv
```

Open `https://<that-address>` in your browser to use the app.

## Optional: Add PageSpeed and CrUX Keys in Azure

1. In [Azure Portal](https://portal.azure.com) go to **Container Apps** → **seo-agent** → **Containers** → **Edit and deploy**.
2. Under **Environment variables** add:
   - `GOOGLE_PAGESPEED_API_KEY` = your PageSpeed API key
   - `CRUX_API_KEY` = your Chrome UX Report API key (optional; enables real-user CWV)
3. Save and redeploy.

---

# Part 4: Deploy to Amazon Web Services (AWS)

You get a public URL so anyone can use the app. We use **AWS App Runner** (simplest for a container).

## What You Need

- An **AWS account** — [Create one](https://aws.amazon.com/)
- **AWS CLI** — [Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

## Step 1: Install Docker (One-Time)

App Runner needs a container image. To build it on your machine you need Docker:

- **Windows/Mac:** [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux:** Install Docker from your distribution’s package manager.

## Step 2: Configure AWS CLI

In a terminal:

```bash
aws configure
```

Enter your **Access Key ID** and **Secret Access Key** (from AWS Console → your user → Security credentials → Access keys). Choose a default region (e.g. `us-east-1`).

## Step 3: Create an ECR Repository and Push the Image

1. Create a repository (replace `YOUR_AWS_ACCOUNT_ID` with your 12-digit account ID):
   ```bash
   aws ecr create-repository --repository-name seo-agent
   ```
2. Log in to ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   ```
3. From your `seo-agent` folder, build and tag:
   ```bash
   docker build -t seo-agent .
   docker tag seo-agent:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/seo-agent:latest
   docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/seo-agent:latest
   ```

## Step 4: Create the App Runner Service (Using Console)

1. In [AWS Console](https://console.aws.amazon.com/) go to **App Runner** → **Create service**.
2. **Source:** Choose **Container registry** → **Amazon ECR** → select the **seo-agent** repository and **latest** image.
3. **Deployment:** Automatic.
4. **Service name:** `seo-agent`.
5. **CPU:** 2 vCPU. **Memory:** 4 GB.
6. **Port:** 8080.
7. Leave other options as default and create the service.

When the service status is **Running**, open the **Default domain** URL in your browser.

## Step 5 (Optional): Add PageSpeed and CrUX Keys in AWS

1. In App Runner, open your **seo-agent** service.
2. Go to the **Configuration** tab → **Edit**.
3. Under **Environment variables** add:
   - `GOOGLE_PAGESPEED_API_KEY` = your PageSpeed API key
   - `CRUX_API_KEY` = your Chrome UX Report API key (optional)
4. Save and redeploy.

---

# Troubleshooting

## “npm: command not found”

Install Node.js from [nodejs.org](https://nodejs.org/) (LTS) and restart the terminal.

## “Port 8080 is already in use”

Either close the other program using port 8080, or set a different port:

```bash
PORT=3000 npm run dev:server
```

Then open http://localhost:3000.

## Puppeteer/Chrome errors on Linux

Install common dependencies:

```bash
sudo apt-get update
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libgtk-3-0
```

## PageSpeed or CrUX API returns “403” or “referer blocked”

In Google Cloud Console → **APIs & Services** → **Credentials** → your API key, set **Application restrictions** to **None** (or **IP addresses** for production). Do **not** use “HTTP referrers” for this key, because the server calls the API and has no referrer. For CrUX, ensure **Chrome UX Report API** is enabled for the project.

## Analysis is very slow or times out

- Increase timeout in `.env`: `REQUEST_TIMEOUT=60000`
- For site-wide analysis, use a smaller `--max-pages` (e.g. 20).

---

# Summary

| Where        | Command / Action |
|-------------|-------------------|
| **Localhost** | `npm run dev:server` → http://localhost:8080 |
| **GCP**       | `gcloud run deploy seo-agent --source . ...` |
| **Azure**     | Build image with `az acr build`, then create Container App |
| **AWS**       | Build image, push to ECR, create App Runner service |

For more options (CLI flags, depth, format), see the main [README.md](./README.md).
