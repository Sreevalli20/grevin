# PivotOS — Adaptive Operations Engine

**When reality changes, operations keep moving.**

PivotOS is a browser-based operations management application designed to help teams understand operational disruptions, identify affected tasks, and build revised plans using dependency-aware scheduling and transparent decision logic.

Built for **Grevix AfterCode 2026**, PivotOS explores how operational software can adapt when requirements, resources, deadlines, and constraints change unexpectedly.

## Overview

Real-world projects rarely follow the original plan. A team member becomes unavailable, a resource runs short, a deadline moves forward, or an urgent task appears.

PivotOS helps users understand these changes by connecting tasks, dependencies, people, resources, schedules, and project metrics in one interactive workspace.

Instead of presenting an unexplained recommendation, the application aims to make changes understandable through before-and-after comparisons, constraint checks, and a traceable decision history.

## Core Capabilities

- **Operations Dashboard:** Monitor task status, deadlines, operational risks, and resource utilization with animated KPI cards, color-coded severity indicators, and real-time metrics.
- **Task Management:** Create and manage tasks with priorities, schedules, assignments, and dependencies. Supports natural language input with AI extraction.
- **Resource Management:** Track team availability, working capacity, and operational resource constraints.
- **Disruption Simulation:** Test scenarios such as staff unavailability, resource shortages, deadline changes, and urgent work with interactive progress tracking and visual feedback.
- **Adaptive Scheduling:** Recalculate task schedules using deterministic rules and dependency-aware planning.
- **Plan Comparison:** Compare the original schedule with a proposed recovery plan and inspect the impact of changes.
- **Decision History:** Record disruptions, proposed changes, and user decisions with rollback capability.
- **Offline Recovery Simulator:** Challenge Card 01 implementation with durable IndexedDB storage, extraction queue, and connectivity simulation.

## User Experience Enhancements

### Interactive Dashboard
- **Animated KPI Cards:** Fade-in animations with staggered delays for visual appeal
- **Color-Coded Metrics:** Each metric has a themed icon (teal for projects, blue for tasks, rose for overdue, purple for staff load)
- **Hover Effects:** Cards lift and glow on hover for better interactivity
- **Quick Actions Bar:** Prominent "Simulate Disruption" and "Add Task" buttons for fast access
- **Visual Status Indicators:** Fire icon for critical overdue tasks, checkmark for healthy state
- **Gradient Background:** Teal-to-blue gradient for quick actions section

### Enhanced Disruption Simulator
- **Progressive Impact Calculation:** Animated progress bar (0% → 100%) during simulation
- **Real-Time Queue System:** Offline mode shows actual queued operations with count
- **Severity-Based Visuals:** Disruption cards display color-coded severity badges (minor, moderate, severe, critical)
- **Type-Specific Icons:** Each disruption type has a unique icon for quick identification
- **"View Impact Analysis" Button:** Quick access to impact analysis after simulation
- **Animated Processing State:** Disabled button with spinner during simulation
- **Interactive Buttons:** Better visual feedback for timeout/429/refresh simulation

### Offline Recovery Features
- **Queue Counter:** Shows number of operations waiting for retry with pulsing indicator
- **Process Queue Button:** Actually processes queued tasks with success feedback
- **State Management:** Tracks offline state and queue items across page refreshes
- **Connectivity Toggle:** Visual switch between online and offline modes

## What Makes PivotOS Different?

PivotOS focuses on **operational recovery rather than disruption alerts alone**.

Its central workflow is:

1. Model a project using tasks, people, resources, deadlines, and dependencies.
2. Introduce a disruption.
3. Identify the affected tasks and downstream dependencies.
4. Calculate a revised plan while respecting available capacity and scheduling constraints.
5. Compare the original and proposed plans.
6. Review the reasoning, inspect the impact, and decide whether to accept the changes.

The scheduling engine performs the actual calculations. AI is used only for natural-language task extraction and optional explanations, never to invent operational facts.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface and reusable components |
| TypeScript | Type safety and maintainable application logic |
| Vite | Development server and production build |
| Tailwind CSS | Responsive interface styling |
| IndexedDB | Durable browser storage for tasks and extraction queue |
| LocalStorage | Application state and settings |
| Groq API | AI-powered task extraction (optional, server-side only) |
| Vercel | Frontend hosting and deployment (optional) |
| GitHub | Source control and project development history |

**Architecture:** Client-side application with local browser persistence. No Python server or separate backend service is required.

## Running Locally

### Prerequisites

- Node.js (a current supported LTS release)
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/Sreevalli20/grevin.git
cd grevin
```

Install dependencies:

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open the local URL printed by Vite in your browser (typically http://localhost:3000).

### Production Build

```bash
npm run build
```

Vite generates the production build in the `dist` directory.

Preview the production build locally:

```bash
npm run preview
```

### Type Checking

```bash
npm run lint
```

This runs TypeScript validation to catch type errors before building.

## Deployment

PivotOS is deployed as a static site to Vercel at https://pivotos.vercel.app.

### Current Deployment Status

- **Live URL:** https://pivotos.vercel.app
- **AI Features:** Currently disabled (serverless API removed for static deployment)
- **Fallback:** Local extraction parser works offline without AI

### Manual Deployment

To deploy your own instance:

1. Push the project source to a public GitHub repository.
2. Sign in to Vercel and import the repository.
3. Select Vite as the framework preset.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Deploy the application.

The application will work fully with local fallback extraction and all core features.

### Environment Configuration

The `.env.example` file shows the required environment variables. For local development with AI, you would need to set up a local server to handle the API proxy. The recommended approach is to deploy to Vercel and use the serverless function there.

**Important:** Never commit `.env` files or real API keys to Git. The `.gitignore` file is configured to protect environment files.

## Data and Privacy

PivotOS stores all data locally on your device:

### IndexedDB (Durable Browser Storage)
- Tasks and extraction queue are stored in IndexedDB for persistence
- Data survives browser refresh and application restart
- Storage is per-browser and per-device
- Clearing browser data will remove locally stored records
- No automatic synchronization between browsers or devices

### LocalStorage (Application State)
- Dashboard settings, UI preferences, and application state
- Used for fast access and small configuration data
- Less durable than IndexedDB
- Survives refresh but may be cleared by browser storage eviction

### Security Considerations
- **API Keys:** Never stored in frontend bundles. AI API key is server-side only (Vercel environment variable).
- **No Password Storage:** Do not store passwords, API secrets, or sensitive credentials in task descriptions.
- **Local Storage Only:** No cloud backup or multi-device synchronization is implemented.
- **Storage Eviction:** Browsers may evict IndexedDB data under storage pressure.
- **No Server-Side Access Control:** Since data is local, ensure physical device security.

### Data Backup and Export
The application provides export functionality to backup your data:
- Export full application state as JSON
- Export recovery reports as CSV or HTML
- Import validated JSON to restore state
- Always keep offline backups of critical project data

## Using the Sample Workspace

PivotOS starts with an empty state. To explore the features:

1. Open the application
2. Click "Load Sample Workspace" in the Settings page
3. This loads a simple example project with sample tasks and team members
4. Explore the dashboard, create tasks, simulate disruptions, and view recovery plans
5. When ready to start your own work, click "Clear All Data" in Settings

The sample workspace is clearly labeled as demonstration data only.

## Challenge Card 01: Offline Recovery Simulator

**Challenge:** Demonstrate how the application handles network failures, timeouts, and rate limits while maintaining data integrity and user progress.

**Solution Implemented:**

PivotOS implements an interactive Offline Recovery Simulator with durable IndexedDB storage, extraction queue management, and connectivity simulation:

1. **Interactive Simulator UI** (`src/pages/DisruptionSimulatorView.tsx`)
   - Visual connectivity toggle (Online/Offline mode)
   - Simulate AI timeout (30s timeout scenario)
   - Simulate HTTP 429 rate limit
   - Process queue recovery button
   - Real-time queue counter display
   - Animated progress bar for disruption impact calculation

2. **IndexedDB Storage Layer** (`src/services/indexedDB.ts`)
   - Durable task persistence with revision tracking
   - Extraction queue with explicit job states (pending, queued, processing, retry_scheduled, needs_review, completed, failed, cancelled)
   - Recovery event logging
   - Survives browser refresh and application restart

3. **Extraction Queue Service** (`src/services/extractionQueue.ts`)
   - Bounded exponential backoff with jitter for retry delays
   - Automatic queue processing on connectivity restoration
   - Manual retry and cancellation controls
   - Duplicate prevention

4. **AI Extraction with Fallback** (`src/services/aiExtraction.ts`)
   - Integration with Groq API for structured field extraction (optional)
   - Serverless function keeps API key secure
   - Local fallback parser for offline operation
   - Extracts title, description, deadline, priority, estimated effort, dependencies, tags, and project association
   - Validation and sanitization of AI responses

5. **Enhanced Dashboard** (`src/pages/DashboardView.tsx`)
   - Animated KPI cards with staggered fade-in
   - Color-coded severity indicators
   - Quick actions bar for fast access
   - Visual status badges (fire icon for critical, checkmark for healthy)
   - Hover effects and smooth transitions

**How It Works:**

1. User enters Simulator page and sees the Challenge Card 01 section
2. Click "Simulate Offline" to enter offline mode - all operations queue locally
3. Click "Simulate Timeout" or "Simulate 429" to queue failed operations
4. Queue counter shows number of pending operations
5. Click "Restore Connectivity" to simulate network restoration
6. Click "Process Queue" to retry queued operations
7. Disruption simulation shows animated progress (0% → 100%)
8. After simulation, "View Impact Analysis" button appears

**Testing the Workflow:**

1. Navigate to the Simulator tab
2. Click "Simulate Offline" - notice the status change
3. Click "Simulate Timeout" - see toast notification and queue counter increment
4. Click "Simulate 429" - see another queued operation
5. Click "Process Queue" - operations are cleared with success message
6. Click "Restore Connectivity" - return to online mode
7. Select a disruption type and click "Simulate & Calculate Impact"
8. Watch the animated progress bar complete
9. Click "View Impact Analysis" to see the results

## Known Limitations

- IndexedDB storage is per-browser and per-device
- No automatic multi-device synchronization
- Browser storage eviction may occur under quota pressure
- AI extraction requires API key configuration and Vercel deployment
- Local fallback is deterministic but less sophisticated than AI
- Queue processing requires the application to be open
- No background processing when the tab is closed
- Vercel serverless function has cold start latency
- Rate limits apply to the Groq API

## Implementation Evidence

### Phase 1 — Ignition (Completed)

**Original objective:** Build a browser-based operational recovery tool with task management, dependency-aware scheduling, disruption simulation, and measurable before-and-after comparisons.

**Initial architecture:** React, TypeScript, Vite, browser-side application logic, local persistence, and Vercel deployment.

**Implementation evidence:**
- ✅ Operations dashboard with animated KPI cards and real-time metrics
- ✅ Task management with dependencies, priorities, and scheduling
- ✅ Resource management (staff and operational resources)
- ✅ Disruption simulation with 6 scenario types
- ✅ Impact analysis showing affected tasks and dependencies
- ✅ Recovery planning with multiple strategy options
- ✅ Plan comparison (before/after views)
- ✅ Decision history with rollback capability
- ✅ Settings with data management (import/export/clear)
- ✅ All features verified in working application

### Phase 2 — The Shift (Completed)

**Challenge Card 1:** Offline Recovery Simulator - Demonstrate how the application handles network failures, timeouts, and rate limits while maintaining data integrity.

**Impact on the product:** Added interactive connectivity simulation, queue management, and visual feedback for offline scenarios.

**Changes implemented:**
- ✅ Interactive Simulator UI with connectivity toggle
- ✅ Simulate Timeout and 429 rate limit buttons
- ✅ Real-time queue counter display
- ✅ Process Queue recovery functionality
- ✅ Animated progress bar for disruption calculation
- ✅ Enhanced disruption cards with severity badges
- ✅ Quick actions bar on dashboard
- ✅ All features verified in working application

**Verification:**
- Tested offline mode simulation
- Verified queue management works correctly
- Confirmed animated progress displays properly
- All changes committed to repository

### Phase 3 — Pressure Test (Pending)

**Challenge Card 2:** To be documented after release.

**Impact on the product:** To be documented.

**Changes implemented:** To be documented.

**Verification:** To be documented.

### Phase 4 — The Final Forge (Pending)

**Tasks:**
- Finalize repository for submission
- Record demonstration video
- Deploy to Vercel
- Prepare project documentation

## Project Links

- **GitHub repository:** https://github.com/YOUR_USERNAME/pivotos-adaptive-operations
- **Live application:** https://pivotos.vercel.app (to be deployed)
- **Demonstration video:** To be added

## About the Project

PivotOS is an individual project developed for Grevix AfterCode 2026.

The project investigates how lightweight, explainable project management software can help users respond to unexpected changes without losing visibility into dependencies, constraints, and trade-offs.

**Project tagline:** When plans change, keep your projects moving.
