# Conductometric Titration Analyzer -- Frontend

A Next.js web application that provides an interactive interface for conductometric titration analysis. Users input experimental data (titrant volumes and conductivities), send it to the Django backend for processing, and view computed results including the equivalence point, regression statistics, and a visualization chart.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Environment Variables](#environment-variables)
7. [Component Reference](#component-reference)
8. [Utility Modules](#utility-modules)
9. [Deployment](#deployment)

---

## Overview

This frontend communicates with the Django backend API to perform conductometric titration analysis. It provides:

- A data entry table for volume and conductivity measurements
- Configuration options for acid type, initial volume, and dilution correction
- Interactive chart visualization with regression lines, equivalence point marker, and angle indicator overlay
- CSV import/export for input data and results
- Chart export as PNG image (includes angle overlay)

---

## Features

- **Data Input Table**: Editable table with add/remove row support. Numeric-only input validation blocks letters and special characters. Minimum 3 data points required.
- **CSV Upload**: Parse and load data from CSV files with automatic header detection.
- **CSV Download**: Export current input data or analysis results as CSV files using the native Save As dialog.
- **Chart PNG Export**: Capture the rendered chart (including angle overlay) as a high-resolution PNG image using html2canvas.
- **Input Validation**: Client-side validation for required fields, numeric values, and minimum data point count. Errors are displayed inline next to the relevant field.
- **Responsive Design**: Dark-themed interface with glassmorphism effects, optimized for desktop and tablet viewports.

---

## Project Structure

```
src/
  app/
    page.js                         -- Main page component (state, handlers, layout)
    layout.js                       -- Root layout (HTML head, fonts, metadata)
    globals.css                     -- Global styles, design system, all component styles
    api/
      download-input/route.js       -- Next.js API route: proxies CSV download to Django
      download-results/route.js     -- Next.js API route: proxies results CSV download to Django
  components/
    DataTable.js                    -- Editable data table with CSV upload/download buttons
    ConfigPanel.js                  -- Acid type, initial volume, dilution toggle
    ResultsPanel.js                 -- Displays equivalence point and regression stats
    TitrationChart.js               -- Recharts scatter+line chart with angle visualization overlay
  lib/
    api.js                          -- Backend API client (calculate endpoint)
    csvExport.js                    -- CSV parsing, CSV/PNG export utilities
.env.local                          -- Environment variables (not committed)
.env.example                        -- Example environment variables for reference
```

---

## Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)
- The Django backend must be running (see backend README)

---

## Local Development Setup

1. Install dependencies:

```bash
cd chemistry-frontend
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` if the backend runs on a different host or port (default is `http://localhost:8000`).

3. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

4. Ensure the Django backend is running on port 8000 (or the port specified in `.env.local`).

---

## Environment Variables

| Variable              | Used By          | Description                              | Default                    |
|----------------------|------------------|------------------------------------------|----------------------------|
| NEXT_PUBLIC_API_URL  | Client (browser) | Backend API base URL for direct API calls | http://localhost:8000      |
| BACKEND_URL          | Server (API routes) | Backend URL used by Next.js API route proxies | http://localhost:8000   |

These are defined in `.env.local` (not committed to Git). See `.env.example` for reference.

When deploying, set these to the URL of your Django backend server. For example:

```
BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Component Reference

### page.js (Main Page)

The root component that manages all application state:
- `rows` -- Array of data point objects (`{volume, conductivity}`)
- `acidType` -- "strong" or "weak"
- `v0` -- Initial volume
- `applyDilution` -- Dilution correction toggle
- `result` -- API response from calculation
- `error` -- Error messages
- `fieldErrors` -- Per-field validation errors

Handlers: `handleCalculate`, `handleUploadCSV`, `handleDownloadCSV`, `handleExportResults`, `handleExportChart`, input change and row management.

### DataTable.js

Editable table for entering experimental data.

| Prop          | Type       | Description                          |
|---------------|-----------|--------------------------------------|
| rows          | object[]  | Array of `{volume, conductivity}`    |
| onChange      | function  | Called with `(index, field, value)`  |
| onAddRow      | function  | Adds a new empty row                 |
| onRemoveRow   | function  | Removes row at index                 |
| onUploadCSV   | function  | Called with raw CSV text              |
| onDownloadCSV | function  | Triggers CSV download                |
| errors        | object    | Field-level error messages           |

Input fields use `type="text"` with `inputMode="decimal"` and `onKeyDown` filtering to block non-numeric characters (letters, special characters). Paste content is sanitized.

### ConfigPanel.js

Configuration controls for the analysis.

| Prop           | Type       | Description                      |
|---------------|-----------|----------------------------------|
| acidType       | string    | "strong" or "weak"               |
| onAcidTypeChange | function | Called with new acid type       |
| v0             | string    | Initial volume value             |
| onV0Change     | function  | Called with new v0 value         |
| applyDilution  | boolean   | Dilution correction enabled      |
| onDilutionChange | function | Called with new boolean value   |
| errors         | object    | Field-level error messages       |

### ResultsPanel.js

Displays the analysis results after a successful calculation.

| Prop   | Type   | Description                              |
|--------|--------|------------------------------------------|
| result | object | The full result object from the API      |

Shows equivalence point (volume and conductivity), angle between regression lines, and per-region statistics (slope, intercept, R-squared).

### TitrationChart.js

Interactive chart built with Recharts.

| Prop   | Type   | Description                              |
|--------|--------|------------------------------------------|
| result | object | The full result object from the API      |

Renders:
- Scatter plot of corrected data points
- Two regression lines (Region A and Region B)
- Equivalence point marker (custom `EqDiamond` shape with `data-eq-marker` attribute)
- **Angle visualization overlay** (`AngleOverlay` component):
  - Green dashed arms extending along each regression line direction
  - Green SVG arc between the arms
  - Angle label in a dark pill (e.g. "85.5°")
- Custom tooltip showing volume and conductivity
- Legend identifying each series

The angle overlay uses **DOM-based coordinate extraction** to work with Recharts v3, which does not expose internal scale functions. It reads axis tick text positions from the rendered SVG to build linear scale mappings, and uses the largest SVG's `viewBox` for alignment.

The chart container has `id="titration-chart"` for the PNG export utility.

---

## Utility Modules

### api.js

| Function               | Description                                          |
|------------------------|------------------------------------------------------|
| `calculateTitration()` | POST to `/api/calculate/` with the full payload      |

Uses `NEXT_PUBLIC_API_URL` environment variable for the backend base URL.

### csvExport.js

| Function               | Description                                           |
|------------------------|-------------------------------------------------------|
| `parseCSV(text)`       | Parses CSV text into row objects. Auto-detects headers.|
| `downloadInputCSV(rows)` | Exports current input data as CSV via Save As dialog |
| `downloadResultsCSV(result, acidType)` | Exports analysis results as CSV    |
| `downloadChartPNG(chartContainerId)` | Captures chart as PNG via html2canvas |

CSV downloads use the File System Access API (`showSaveFilePicker`) to open the native Save As dialog. Falls back to blob URL anchor download for browsers that do not support the File System Access API.

Chart PNG export uses `html2canvas` (loaded dynamically to avoid SSR hydration errors) to capture the rendered chart DOM as a high-resolution image.

---

## Deployment

### Option 1: Vercel (Recommended for Next.js)

1. Push the frontend code to a Git repository (GitHub, GitLab, or Bitbucket).

2. Import the project on [Vercel](https://vercel.com).

3. Set environment variables in the Vercel dashboard:
   - `BACKEND_URL` = URL of your deployed Django backend
   - `NEXT_PUBLIC_API_URL` = URL of your deployed Django backend

4. Deploy. Vercel handles build and hosting automatically.

### Option 2: Self-Hosted (Node.js)

1. Build the production bundle:

```bash
npm run build
```

2. Start the production server:

```bash
npm run start -- -p 3000
```

3. Use a reverse proxy (Nginx, Caddy) to serve the application and handle TLS.

### Option 3: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BACKEND_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build \
  --build-arg BACKEND_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t titration-frontend .
docker run -p 3000:3000 titration-frontend
```

### Nginx Reverse Proxy Example

To serve both backend and frontend behind a single domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

When frontend and backend share the same domain, set both environment variables to an empty string or the same base URL:

```
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=
```

Setting `NEXT_PUBLIC_API_URL` to empty makes client-side API calls relative to the current origin.
