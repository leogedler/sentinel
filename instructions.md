# Sentinel APP Context

## Sentinel — The Marketing Report Bot with Customizable MCP Service

Sentinel is a smart marketing report app powered by Claude as the AI model and Slack as the user interface to generate specialized reports of Facebook Ads campaigns based on user prompts. It uses internal, extensible Skills to improve the effectiveness, conversion rate, and reach of campaigns.

---

## Who Are Sentinel's Users?

Sentinel users are marketers managing one or more clients, each with multiple Facebook Ads campaigns they need to track, analyze, and (in the future) act on directly from Sentinel.

**Key concepts:**
- Each Slack channel represents a **single client**.
- Each client can have **one or more Facebook Ads campaigns** linked to it.
- Users interact with Sentinel through Slack to get reports, ask questions about campaign performance, and configure analysis schedules.
- In v1, users can only **read** campaign data (KPIs, conversion rates, spend, etc.). In future versions, they will be able to **take actions** on campaigns (pause, adjust budgets, etc.) directly through Slack.

---

## User Flows

### Flow 1: Registration & Setup (Web Frontend)
1. User registers via the web frontend (email + password).
2. User logs in and is redirected to the settings dashboard.
3. User connects their Facebook Ads account by entering their Windsor.ai API key.
4. User creates one or more **Clients** (each maps to a Slack channel).
5. For each client, user adds one or more **Campaigns** by providing the Facebook campaign IDs.
6. User connects their Slack workspace (OAuth flow initiated from the frontend, handled by the API).

### Flow 2: Daily Usage (Slack)
1. User sends a message or command in a client's Slack channel.
2. The Slack bot receives the message and routes it through the MCP module.
3. Claude processes the request using available MCP tools and Skills.
4. Claude responds in the Slack channel with the requested report, analysis, or answer.

### Flow 3: Scheduled Reports (Cron Jobs)
1. User configures a reporting schedule per client/campaign (e.g., daily at 9 AM, weekly on Mondays).
2. The Cron module triggers at the defined interval.
3. It fetches the latest data from Windsor.ai for the campaign(s).
4. It runs the configured Skill (e.g., "Daily Performance Summary") through Claude via MCP.
5. The result is posted to the appropriate Slack channel.

---

## Sentinel Internal Modules

### Backend (Monorepo)

#### API Module
REST endpoints for authentication, Slack OAuth, CRUD operations for clients/campaigns/skills, and settings management. All endpoints require JWT authentication except `/auth/register` and `/auth/login`.

#### MCP Module
The core intelligence layer. Powered by Anthropic's MCP SDK, it exposes tools that Claude uses to query the database, fetch Facebook Ads data, and execute Skills. This is NOT a standalone server — it runs as an in-process MCP server using `stdio` transport for local development and can be adapted for SSE/HTTP in production if needed.

#### Slack Bot Module
Built with Bolt.js. Serves as the primary user interface. Handles incoming messages, slash commands, and interactive components. Routes user requests to the MCP module and delivers Claude's responses back to Slack.

#### Shared Modules:
- **DB Module**: MongoDB connection, Mongoose models, and data access helpers.
- **Facebook Module**: Windsor.ai API client for fetching campaign data (read-only).
- **Skills Module**: Manages system and user-created Skills (prompt templates + parameters).
- **Cron Job Module**: Agenda.js-powered scheduler for recurring data fetches and reports.

### Web Frontend
Vue.js + TypeScript SPA for user registration, authentication, and settings management. Not used for daily reporting — that's all in Slack.

---

## Module Contracts

### API Module — Endpoints

```
Auth:
  POST   /api/auth/register          — Register new user { email, password, name }
  POST   /api/auth/login              — Login { email, password } → { token, user }
  GET    /api/auth/me                 — Get current user profile

Slack:
  GET    /api/slack/install           — Initiate Slack OAuth flow
  GET    /api/slack/oauth/callback    — Slack OAuth callback

Clients:
  GET    /api/clients                 — List all clients for current user
  POST   /api/clients                 — Create client { name, slackChannelId }
  GET    /api/clients/:id             — Get client details
  PUT    /api/clients/:id             — Update client
  DELETE /api/clients/:id             — Delete client

Campaigns:
  GET    /api/clients/:clientId/campaigns         — List campaigns for a client
  POST   /api/clients/:clientId/campaigns         — Add campaign { name, facebookCampaignId }
  GET    /api/clients/:clientId/campaigns/:id     — Get campaign details
  PUT    /api/clients/:clientId/campaigns/:id     — Update campaign
  DELETE /api/clients/:clientId/campaigns/:id     — Delete campaign

Skills:
  GET    /api/skills                  — List all skills (system + user-created)
  POST   /api/skills                  — Create custom skill { name, promptTemplate, parameters }
  PUT    /api/skills/:id              — Update skill
  DELETE /api/skills/:id              — Delete user-created skill (cannot delete system skills)

Settings:
  GET    /api/settings                — Get user settings
  PUT    /api/settings                — Update settings { windsorApiKey, defaultSkillId, timezone }

Schedules:
  GET    /api/clients/:clientId/schedules         — List schedules for a client
  POST   /api/clients/:clientId/schedules         — Create schedule { campaignId, skillId, cronExpression, isActive }
  PUT    /api/clients/:clientId/schedules/:id     — Update schedule
  DELETE /api/clients/:clientId/schedules/:id     — Delete schedule
```

### MCP Module — Tools

These are the tools Claude will have access to through the MCP protocol:

```
get_campaigns
  Description: Retrieve all campaigns for a given client
  Input: { clientId: string }
  Output: { campaigns: Campaign[] }

get_campaign_kpis
  Description: Fetch current KPIs for a campaign from Windsor.ai
  Input: { campaignId: string, dateRange?: { start: string, end: string } }
  Output: { spend, impressions, clicks, ctr, cpc, conversions, conversionRate, roas, reach, frequency }

compare_campaigns
  Description: Compare KPIs across multiple campaigns
  Input: { campaignIds: string[], dateRange?: { start: string, end: string } }
  Output: { comparisons: CampaignComparison[] }

get_historical_data
  Description: Get historical performance data for trend analysis
  Input: { campaignId: string, metric: string, period: "daily" | "weekly" | "monthly", dateRange: { start: string, end: string } }
  Output: { dataPoints: { date: string, value: number }[] }

run_skill
  Description: Execute a Skill (prompt template) with campaign data as context
  Input: { skillId: string, campaignId: string, additionalContext?: string }
  Output: { analysis: string }

list_skills
  Description: List all available Skills
  Input: {}
  Output: { skills: Skill[] }

get_client_context
  Description: Get full context for a client (campaigns, recent reports, settings)
  Input: { slackChannelId: string }
  Output: { client: Client, campaigns: Campaign[], recentReports: Report[] }
```

### MCP Module — Resources

```
campaign://{campaignId}/latest     — Latest KPI snapshot
campaign://{campaignId}/history    — Historical data (last 30 days)
client://{clientId}/overview       — Client overview with all campaigns
```

### Slack Bot Module — Interactions

**Slash Commands:**
```
/sentinel report [campaign_name]          — Generate a report for a specific campaign using the default Skill
/sentinel compare [campaign1] [campaign2] — Compare two campaigns side by side
/sentinel schedule [daily|weekly] [time]  — Set up a recurring report schedule
/sentinel skills                          — List available Skills
/sentinel help                            — Show available commands
```

**Conversational (natural language via Claude):**
Users can also just type natural language messages in the channel, e.g.:
- "How did Campaign X perform last week?"
- "What's the trend for CTR over the past month?"
- "Which campaign has the best ROAS?"
- "Give me a summary of all active campaigns"

The bot will route these through Claude with the client's context loaded via MCP tools.

**Interactive Components:**
- Report messages include action buttons: "Refresh", "Change Date Range", "Share"
- Schedule configuration uses Slack Block Kit modals

### Skills Module — Contract

A **Skill** is a named, reusable prompt template that Claude uses to generate specific types of analysis. Skills are the primary way Sentinel customizes Claude's output for marketing use cases.

**Skill Schema:**
```typescript
interface Skill {
  _id: ObjectId;
  name: string;                    // e.g., "Daily Performance Summary"
  description: string;             // Human-readable description
  promptTemplate: string;          // The prompt template with {{variables}}
  parameters: SkillParameter[];    // Configurable parameters
  type: "system" | "custom";       // System skills cannot be deleted
  category: "reporting" | "analysis" | "optimization" | "alerting";
  createdBy: ObjectId | null;      // null for system skills
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SkillParameter {
  name: string;           // e.g., "dateRange"
  type: "string" | "number" | "date" | "enum";
  required: boolean;
  default?: any;
  options?: string[];     // For enum type
  description: string;
}
```

**Default System Skills (ship with the app):**

1. **Daily Performance Summary**
   - Category: reporting
   - Template: Summarizes key KPIs (spend, impressions, clicks, CTR, conversions, ROAS) for the previous day with day-over-day comparison.
   - Parameters: `campaignId` (required), `comparisonPeriod` (enum: "day", "week", default: "day")

2. **Weekly Trend Analysis**
   - Category: analysis
   - Template: Analyzes 7-day trends across all metrics, identifies patterns, flags anomalies (e.g., sudden CTR drops or spend spikes), and provides actionable recommendations.
   - Parameters: `campaignId` (required), `focusMetric` (enum: "spend", "ctr", "conversions", "roas", default: "roas")

3. **Campaign Comparison**
   - Category: analysis
   - Template: Side-by-side comparison of two or more campaigns with strengths/weaknesses analysis and budget allocation recommendations.
   - Parameters: `campaignIds` (required, array), `dateRange` (date range, default: last 7 days)

4. **Budget Efficiency Report**
   - Category: optimization
   - Template: Evaluates spend efficiency, identifies underperforming ad sets, and suggests budget reallocation.
   - Parameters: `campaignId` (required), `targetRoas` (number, optional)

5. **Performance Alert**
   - Category: alerting
   - Template: Checks if any KPIs have crossed defined thresholds and generates an alert with severity level and recommended actions.
   - Parameters: `campaignId` (required), `thresholds` (object with metric: value pairs, optional — defaults provided)

**How users extend Skills:**
Users can create custom Skills through the API or by asking Claude in Slack (e.g., "Create a new Skill that compares weekend vs. weekday performance"). Custom Skills are stored per-user and can be shared across their clients.

### Facebook Module — Windsor.ai Integration

**API Base URL:** `https://connectors.windsor.ai/all`

**Authentication:** API key passed as query parameter `api_key`. Each user stores their own Windsor.ai API key in their settings.

**Key fields to fetch:**
```
- date                  — Date of the data point
- campaign              — Campaign name
- campaign_id           — Facebook campaign ID
- spend                 — Amount spent
- impressions           — Number of impressions
- clicks                — Number of clicks
- ctr                   — Click-through rate
- cpc                   — Cost per click
- conversions           — Number of conversions
- conversion_rate       — Conversion rate
- roas                  — Return on ad spend
- reach                 — Number of unique users reached
- frequency             — Average number of times each user saw the ad
```

**Example API call:**
```
GET https://connectors.windsor.ai/all?api_key={key}&date_preset=last_7d&fields=campaign,spend,impressions,clicks,ctr,cpc,conversions,roas,reach&source=facebook
```

**Rate limiting:** Windsor.ai has rate limits per plan. The Facebook module should implement retry with exponential backoff and cache responses in MongoDB for 15 minutes to avoid redundant calls.

### Cron Job Module — Contract

Uses [Agenda.js](https://github.com/agenda/agenda) backed by MongoDB for persistence.

**Job Types:**
```
fetch_campaign_data
  — Fetches latest data from Windsor.ai and stores it in the DB
  — Runs per campaign based on the schedule defined by the user

run_scheduled_report
  — Executes a Skill against stored campaign data
  — Posts the result to the appropriate Slack channel
  — Runs per schedule (links a campaign + skill + cron expression)

cleanup_old_data
  — Removes historical data older than 90 days (configurable)
  — Runs daily at midnight UTC
```

---

## Data Models (MongoDB Schemas)

```typescript
// User
{
  _id: ObjectId,
  email: string,                // unique
  passwordHash: string,
  name: string,
  windsorApiKey?: string,       // encrypted at rest
  slackWorkspaceId?: string,
  slackUserId?: string,
  slackAccessToken?: string,    // encrypted at rest
  timezone: string,             // default: "UTC"
  createdAt: Date,
  updatedAt: Date
}

// Client
{
  _id: ObjectId,
  userId: ObjectId,             // ref: User
  name: string,                 // e.g., "Acme Corp"
  slackChannelId: string,       // Slack channel ID mapped to this client
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}

// Campaign
{
  _id: ObjectId,
  clientId: ObjectId,           // ref: Client
  name: string,                 // e.g., "Summer Sale 2025"
  facebookCampaignId: string,   // ID in Facebook Ads
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}

// CampaignSnapshot (historical data from Windsor.ai)
{
  _id: ObjectId,
  campaignId: ObjectId,         // ref: Campaign
  date: Date,
  spend: number,
  impressions: number,
  clicks: number,
  ctr: number,
  cpc: number,
  conversions: number,
  conversionRate: number,
  roas: number,
  reach: number,
  frequency: number,
  fetchedAt: Date               // when this data was pulled from Windsor.ai
}

// Skill (see Skills Module section for full interface)

// Schedule
{
  _id: ObjectId,
  clientId: ObjectId,           // ref: Client
  campaignId: ObjectId,         // ref: Campaign
  skillId: ObjectId,            // ref: Skill
  cronExpression: string,       // e.g., "0 9 * * *" (daily at 9 AM)
  timezone: string,             // user's timezone
  isActive: boolean,
  lastRunAt?: Date,
  createdAt: Date,
  updatedAt: Date
}

// Report (generated report log)
{
  _id: ObjectId,
  clientId: ObjectId,
  campaignId: ObjectId,
  skillId: ObjectId,
  content: string,              // The generated report text
  slackMessageTs?: string,      // Slack message timestamp for threading
  triggeredBy: "user" | "schedule",
  createdAt: Date
}

// ChannelContext (conversation memory per Slack channel)
{
  _id: ObjectId,
  slackChannelId: string,
  clientId: ObjectId,
  conversationHistory: {        // Rolling window, last 20 messages
    role: "user" | "assistant",
    content: string,
    timestamp: Date
  }[],
  updatedAt: Date
}
```

---

## Auth & Multi-Tenancy

- **Authentication**: JWT tokens issued on login, included as `Authorization: Bearer <token>` header.
- **Token expiry**: 24 hours. No refresh token in v1 (user re-logs in).
- **Multi-tenancy**: All data is scoped to the authenticated user via `userId` on the Client model. Users can only see/modify their own clients, campaigns, skills, and schedules.
- **Slack workspace**: One user per Slack workspace in v1. The Slack bot identifies the user by matching `slackWorkspaceId` on the User model.
- **Encrypted fields**: `windsorApiKey` and `slackAccessToken` are encrypted at rest using AES-256 with a key from environment variables.

---

## Environment Variables

All secrets are injected via Docker environment variables. In production, these are managed through GCP Secret Manager.

```env
# Server
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/sentinel

# JWT
JWT_SECRET=<random-256-bit-string>
JWT_EXPIRY=24h

# Encryption
ENCRYPTION_KEY=<random-256-bit-key-for-aes-256>

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=<signing-secret>
SLACK_APP_TOKEN=xapp-...               # For Socket Mode in development
SLACK_CLIENT_ID=<client-id>            # For OAuth
SLACK_CLIENT_SECRET=<client-secret>    # For OAuth

# Windsor.ai (default/fallback — users provide their own)
WINDSOR_DEFAULT_API_KEY=<optional-default-key>

# Frontend
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Project Structure

### Backend (Monorepo)

```
sentinel-backend/
├── src/
│   ├── modules/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── clients.routes.ts
│   │   │   │   ├── campaigns.routes.ts
│   │   │   │   ├── skills.routes.ts
│   │   │   │   ├── settings.routes.ts
│   │   │   │   └── schedules.routes.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── error.middleware.ts
│   │   │   ├── controllers/
│   │   │   └── index.ts                  # Express app setup
│   │   ├── mcp/
│   │   │   ├── tools/
│   │   │   │   ├── campaigns.tool.ts
│   │   │   │   ├── kpis.tool.ts
│   │   │   │   ├── skills.tool.ts
│   │   │   │   └── context.tool.ts
│   │   │   ├── resources/
│   │   │   │   └── campaign.resource.ts
│   │   │   └── server.ts                 # MCP server setup
│   │   ├── slack-bot/
│   │   │   ├── commands/
│   │   │   │   ├── report.command.ts
│   │   │   │   ├── compare.command.ts
│   │   │   │   ├── schedule.command.ts
│   │   │   │   └── help.command.ts
│   │   │   ├── handlers/
│   │   │   │   ├── message.handler.ts    # Natural language messages
│   │   │   │   └── action.handler.ts     # Interactive component callbacks
│   │   │   └── app.ts                    # Bolt.js app setup
│   │   └── shared/
│   │       ├── db/
│   │       │   ├── connection.ts
│   │       │   ├── models/
│   │       │   │   ├── user.model.ts
│   │       │   │   ├── client.model.ts
│   │       │   │   ├── campaign.model.ts
│   │       │   │   ├── campaign-snapshot.model.ts
│   │       │   │   ├── skill.model.ts
│   │       │   │   ├── schedule.model.ts
│   │       │   │   ├── report.model.ts
│   │       │   │   └── channel-context.model.ts
│   │       │   └── seed/
│   │       │       └── default-skills.seed.ts
│   │       ├── facebook/
│   │       │   ├── windsor.client.ts     # Windsor.ai API client
│   │       │   └── types.ts
│   │       ├── skills/
│   │       │   ├── skill.engine.ts       # Template rendering + execution
│   │       │   └── default-skills.ts     # System skill definitions
│   │       ├── cron/
│   │       │   ├── agenda.ts             # Agenda.js setup
│   │       │   └── jobs/
│   │       │       ├── fetch-campaign-data.job.ts
│   │       │       ├── run-scheduled-report.job.ts
│   │       │       └── cleanup-old-data.job.ts
│   │       └── utils/
│   │           ├── encryption.ts
│   │           └── logger.ts
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.mcp
│   └── Dockerfile.slack
├── package.json
├── tsconfig.json
└── .env.example
```

### Frontend

```
sentinel-frontend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── views/
│   │   │   │   ├── RegisterView.vue
│   │   │   │   └── LoginView.vue
│   │   │   ├── composables/
│   │   │   │   └── useAuth.ts
│   │   │   └── types.ts
│   │   ├── settings/
│   │   │   ├── views/
│   │   │   │   └── SettingsView.vue
│   │   │   └── components/
│   │   │       └── FacebookSettings.vue
│   │   └── clients/
│   │       ├── views/
│   │       │   ├── ClientsListView.vue
│   │       │   └── ClientDetailView.vue
│   │       └── components/
│   │           ├── ClientForm.vue
│   │           ├── CampaignsList.vue
│   │           └── CampaignForm.vue
│   ├── shared/
│   │   ├── components/
│   │   │   ├── AppLayout.vue
│   │   │   ├── AppNav.vue
│   │   │   └── AppNotification.vue
│   │   ├── composables/
│   │   │   └── useApi.ts
│   │   └── router/
│   │       └── index.ts
│   ├── App.vue
│   └── main.ts
├── docker/
│   └── Dockerfile.frontend
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

### Root Level

```
sentinel/
├── sentinel-backend/
├── sentinel-frontend/
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## Docker Compose

The `docker-compose.yml` should define these services:

```
services:
  api          — Backend API server (port 3000)
  slack-bot    — Slack bot process (Socket Mode, no port needed)
  mcp          — MCP server (runs alongside the Slack bot, stdio transport)
  frontend     — Vue.js dev server (port 8080)
```

**Notes:**
- In development, the MCP server may run as part of the Slack bot process (same container) since it uses stdio transport. Separate Dockerfiles are provided for flexibility in production.
- MongoDB is hosted on MongoDB Atlas (no local container needed), but a local MongoDB container can be added as an option for fully offline development.
- For production (GCP Cloud Run), each service gets its own Cloud Run service. The MCP transport may need to switch to HTTP/SSE since Cloud Run doesn't support stdio between services.

---

## Frontend Styling

Use a clean, modern UI style appropriate for a marketing analytics tool. For v1:
- Use a component library like Vuetify or PrimeVue for quick scaffolding.
- Color scheme: Dark sidebar navigation, light content area, accent color in blue/teal range (marketing-tool feel).
- Dashboard-style layout for the clients/campaigns views.
- Responsive but desktop-first (marketers primarily use desktop).

---

## What to Build in v1 (Scope)

**Must have:**
- User registration and login (web frontend)
- Client and campaign CRUD (web frontend)
- Windsor.ai API key storage (encrypted) in settings
- Slack bot that responds to slash commands and natural language
- MCP tools: `get_campaigns`, `get_campaign_kpis`, `run_skill`, `list_skills`, `get_client_context`
- 5 default system Skills (see Skills Module section)
- Scheduled report delivery via Agenda.js
- Docker Compose for local development

**Nice to have (v1.1+):**
- Custom Skill creation from Slack
- Campaign comparison tool
- Historical trend charts in Slack (using Slack Block Kit charts or generated images)
- Slack OAuth flow from frontend
- GCP Cloud Run deployment configs

**Out of scope for v1:**
- Taking actions on Facebook campaigns (pause, adjust budget)
- Multi-user per workspace
- Team/organization concept
- Real-time campaign monitoring (webhook-based)

---

## Tech Stack Summary

| Component        | Technology                                                    |
|------------------|---------------------------------------------------------------|
| Backend          | Node.js + TypeScript + Express                                |
| MCP Server       | Node.js (Anthropic's MCP SDK, `@modelcontextprotocol/sdk`)   |
| Slack Bot        | Bolt.js (`@slack/bolt`)                                       |
| Web Frontend     | Vue.js 3 + TypeScript + Vite                                  |
| Database         | MongoDB Atlas (Mongoose ODM)                                  |
| Hosting (dev)    | Docker / Docker Compose                                       |
| Hosting (prod)   | GCP Cloud Run                                                 |
| Auth             | JWT (`jsonwebtoken`)                                          |
| Cron             | Agenda.js                                                     |
| Facebook API     | Windsor.ai (https://windsor.ai/api-documentation/)            |
| Secrets (prod)   | GCP Secret Manager (injected as env vars via Cloud Run)       |

---

## Deployment

### Local Development
```bash
docker-compose up --build
```
This starts all services. The frontend is available at `http://localhost:8080` and the API at `http://localhost:3000`.

### Production (GCP Cloud Run)
Each service is deployed as a separate Cloud Run service:
- `sentinel-api` — Backend API
- `sentinel-slack` — Slack bot (always-on, min 1 instance)
- `sentinel-frontend` — Static frontend served via nginx

Secrets are managed in GCP Secret Manager and mounted as environment variables in Cloud Run service configs. The `docker-compose.prod.yml` file can be used as a reference for the production container configurations.