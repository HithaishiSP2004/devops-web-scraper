const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// 1. Read and validate target URL from SCRAPE_URL environment variable
const targetUrl = process.env.SCRAPE_URL;

if (!targetUrl || targetUrl.trim() === '') {
  console.error('Error: SCRAPE_URL environment variable is required and cannot be empty.');
  console.error('Usage: SCRAPE_URL="https://example.com" node scraper.js');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(targetUrl.trim());
} catch (error) {
  console.error(`Error: Invalid URL provided: "${targetUrl}"`);
  process.exit(1);
}

// 2. Enforce allowed protocols (http and https only)
if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
  console.error(`Error: Unsupported protocol "${parsedUrl.protocol}". Only "http:" and "https:" are allowed.`);
  process.exit(1);
}

async function scrape() {
  console.log(`Starting scrape for URL: ${parsedUrl.href}`);

  // 3. Configure Puppeteer launch options with container-friendly flags
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };

  // Use custom Chromium path if provided (e.g., /usr/bin/chromium in Docker)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log(`Using Chromium executable: ${launchOptions.executablePath}`);
  }

  let browser;

  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // 4. Navigate to the webpage with a 30s timeout, waiting for DOM content
    console.log('Navigating to page...');
    await page.goto(parsedUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 5. Extract required fields from the page DOM
    console.log('Extracting page data...');
    const extractedData = await page.evaluate(() => {
      const h1Element = document.querySelector('h1');
      const metaDescriptionElement = document.querySelector('meta[name="description" i]');

      return {
        title: document.title ? document.title.trim() : null,
        firstHeading: h1Element && h1Element.innerText ? h1Element.innerText.trim() : null,
        metaDescription: metaDescriptionElement && metaDescriptionElement.getAttribute('content')
          ? metaDescriptionElement.getAttribute('content').trim()
          : null,
      };
    });

    // 6. Build the final consistent JSON structure
    const result = {
      url: parsedUrl.href,
      title: extractedData.title,
      firstHeading: extractedData.firstHeading,
      metaDescription: extractedData.metaDescription,
      scrapedAt: new Date().toISOString(),
    };

    // 7. Save scraped data to scraped_data.json
    const outputPath = path.join(__dirname, 'scraped_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Scraping successful. Data saved to: ${outputPath}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error during scraping: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // 8. Always close the browser to free system resources
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

scrape();
