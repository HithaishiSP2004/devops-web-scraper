# ==============================================================================
# Stage 1: Builder (Node.js + Puppeteer + Chromium)
# Scrapes the target URL during image build time
# ==============================================================================
FROM node:18-slim AS builder

WORKDIR /app

# Install system Chromium and required dependencies via apt
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the system-installed Chromium binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy dependency lockfiles and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy scraper source code
COPY scrape.js ./

# Mandatory build argument for the URL to scrape (no default provided)
ARG SCRAPE_URL
ENV SCRAPE_URL=${SCRAPE_URL}

# Execute scraper during build to generate /app/scraped_data.json
RUN node scrape.js

# ==============================================================================
# Stage 2: Runtime (Python + Flask)
# Minimal production image containing only Python, Flask, server code, and JSON
# ==============================================================================
FROM python:3.10-slim AS runner

WORKDIR /app

# Copy Python requirements and install dependencies without caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Flask server code
COPY server.py ./

# Copy ONLY the scraped JSON artifact from the builder stage
COPY --from=builder /app/scraped_data.json /app/scraped_data.json

# Expose Flask default port
EXPOSE 5000

# Start the web server
CMD ["python", "server.py"]
