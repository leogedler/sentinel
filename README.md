# Sentinel — Marketing Report Bot

A smart marketing report app powered by Claude AI and Slack. Generates specialized reports of Facebook Ads campaigns based on user prompts.

## Architecture

```
sentinel/
├── sentinel-api/       Backend (Express API + Slack Bot + MCP + Cron)
├── sentinel-frontend/  Web app (Vue 3 + TypeScript + Vite)
├── docker-compose.yml       Local development stack
└── docker-compose.prod.yml  Production reference config
```

## Quick Start — Local Development

### Prerequisites
- Docker & Docker Compose
- A MongoDB Atlas cluster (or use the local mongo service)
- Slack app credentials
- Anthropic API key
- Windsor.ai API key (optional for initial setup)

### 1. Configure environment

```bash
cp sentinel-api/.env.example sentinel-api/.env
# Edit sentinel-api/.env with your credentials
```

### 2. Start all services

```bash
docker-compose up --build
```

Services:
| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost | Vue.js web app |
| API | http://localhost | REST API |
| MongoDB | localhost:27017 | Local database |

### 3. Seed default skills (first run)

```bash
docker-compose exec api npm run seed
```

### 4. Open the app

Navigate to http://localhost, register an account, and follow the setup flow.

---

## User Setup Flow

1. **Register** at http://localhost/register
2. **Add Windsor.ai key** in Settings → Windsor.ai Integration
3. **Connect Slack** in Settings → Slack Integration
4. **Create a client** in Clients → New Client (use your Slack channel ID)
5. **Add campaigns** with Facebook campaign IDs
6. **Set schedules** for automated report delivery

---

## Slack Bot Commands

Once connected, use these commands in your client's Slack channel:

```
/sentinel report [campaign_name]         — Generate a report
/sentinel compare [campaign1] [campaign2] — Compare campaigns
/sentinel schedule daily 09:00           — Set daily reports at 9 AM
/sentinel skills                          — List available skills
/sentinel help                            — Show all commands
```

Natural language also works: *"How did Campaign X perform last week?"*

---

## Production Deployment (GCP Cloud Run)

Each service is deployed as a separate Cloud Run service.

### Build & push images

```bash
PROJECT=your-gcp-project
TAG=v1.0.0

# API
docker build -t gcr.io/$PROJECT/sentinel-api:$TAG \
  -f sentinel-api/docker/Dockerfile.api sentinel-api/

# Slack Bot
docker build -t gcr.io/$PROJECT/sentinel-slack:$TAG \
  -f sentinel-api/docker/Dockerfile.slack sentinel-api/

# Frontend (set your API URL)
docker build -t gcr.io/$PROJECT/sentinel-frontend:$TAG \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api \
  -f sentinel-frontend/docker/Dockerfile.frontend sentinel-frontend/

docker push gcr.io/$PROJECT/sentinel-api:$TAG
docker push gcr.io/$PROJECT/sentinel-slack:$TAG
docker push gcr.io/$PROJECT/sentinel-frontend:$TAG
```

### Deploy to Cloud Run

```bash
# API
gcloud run deploy sentinel-api \
  --image gcr.io/$PROJECT/sentinel-api:$TAG \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="JWT_SECRET=jwt-secret:latest,ENCRYPTION_KEY=encryption-key:latest,..."

# Slack Bot (always-on, minimum 1 instance)
gcloud run deploy sentinel-slack \
  --image gcr.io/$PROJECT/sentinel-slack:$TAG \
  --region us-central1 \
  --min-instances 1 \
  --no-allow-unauthenticated \
  --set-secrets="..."

# Frontend
gcloud run deploy sentinel-frontend \
  --image gcr.io/$PROJECT/sentinel-frontend:$TAG \
  --region us-central1 \
  --allow-unauthenticated
```

Secrets are managed via **GCP Secret Manager** and mounted as environment variables.

---

## Tech Stack

| Component | Technology |
|---|---|
| Backend API | Node.js + TypeScript + Express |
| AI / MCP | Anthropic Claude (`claude-sonnet-4-6`) |
| Slack Bot | Bolt.js (Socket Mode) |
| Frontend | Vue 3 + TypeScript + Vite |
| Database | MongoDB Atlas (Mongoose) |
| Scheduler | Agenda.js |
| Hosting (dev) | Docker Compose |
| Hosting (prod) | GCP Cloud Run |
| Auth | JWT |
| Facebook Data | Windsor.ai |
