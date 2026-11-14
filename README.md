# Dockerized Web Scraper

## About the Project

This project is a DevOps assignment that demonstrates a multi-stage Docker build combining Node.js and Python.

It uses Node.js with Puppeteer and headless Chromium to scrape webpage information from a user-provided URL during the container image build. The scraped data is saved as a JSON file. A Python Flask web server then runs inside the final container to serve that scraped JSON data over an HTTP GET endpoint.

## Technologies Used

- Node.js (v18-slim)
- Puppeteer
- Chromium
- Python (3.10-slim)
- Flask
- Docker

## Project Structure

```text
devops-web-scraper/
├── Dockerfile           # Multi-stage Docker build recipe
├── .dockerignore        # Excludes local files from Docker context
├── .gitignore          # Excludes local dependencies and generated files from Git
├── package.json         # Node.js dependencies and scripts
├── package-lock.json    # Pinned dependency lockfile
├── scrape.js            # Node.js Puppeteer scraping script
├── requirements.txt     # Python dependencies (Flask)
├── server.py            # Python Flask HTTP server
└── README.md            # Project documentation
```

## How It Works

The project uses a two-stage Docker build to keep the final container image clean and small:

1. **Builder Stage (`builder`):**
   - Starts from `node:18-slim`.
   - Installs system Chromium and Puppeteer.
   - Accepts the website URL through the build argument `SCRAPE_URL`.
   - Runs `scrape.js` during image creation to extract the page title, first heading (`<h1>`), meta description, and timestamp.
   - Saves the scraped output to `/app/scraped_data.json`.

2. **Runtime Stage (`runner`):**
   - Starts from `python:3.10-slim`.
   - Installs Flask from `requirements.txt`.
   - Copies `server.py` and copies only `scraped_data.json` from the builder stage.
   - Starts the Flask application on port 5000.

Node.js, npm, Chromium and Puppeteer are not included in the final runtime image.

## Prerequisites

- Docker Engine (or Docker Desktop) installed and running.
- `curl` or a web browser to test the API.

## How to Build

The image requires the `SCRAPE_URL` build argument. Scraping happens during image creation:

```bash
sudo docker build --build-arg SCRAPE_URL="https://quotes.toscrape.com/" -t devops-web-scraper .
```

*Note: If `SCRAPE_URL` is omitted, the build will exit with an error.*

## How to Run

Run the container in detached mode and map port 5000 to your host:

```bash
sudo docker run -d --name scraper-test -p 5000:5000 devops-web-scraper
```

## How to Access the Scraped Data

Open `http://localhost:5000/` in your browser or run:

```bash
curl http://localhost:5000/
```

Example JSON response:

```json
{
  "url": "https://quotes.toscrape.com/",
  "title": "Quotes to Scrape",
  "firstHeading": "Quotes to Scrape",
  "metaDescription": null,
  "scrapedAt": "<generated timestamp>"
}
```

## Using a Different URL

Because scraping takes place at build time, provide a different `SCRAPE_URL` argument when building a new image:

```bash
sudo docker build --build-arg SCRAPE_URL="https://www.python.org/" -t devops-web-scraper-python .
```

Then run the new container:

```bash
sudo docker run -d --name scraper-python -p 5001:5000 devops-web-scraper-python
curl http://localhost:5001/
```

## Stopping the Container

To stop and remove the test container:

```bash
sudo docker stop scraper-test
sudo docker rm scraper-test
```
