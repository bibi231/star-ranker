import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureDemo() {
    const screenshotDir = path.join(__dirname, 'demo_screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    console.log('Launching browser with explicit path...');
    const browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Users\\bgadz\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe'
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to http://localhost:5173/markets...');
        // Increased timeout and wait for network idle
        await page.goto('http://localhost:5173/markets', { waitUntil: 'networkidle', timeout: 30000 });

        console.log('Capturing markets_overview.png...');
        await page.screenshot({ path: path.join(screenshotDir, 'markets_overview.png'), fullPage: true });

        // Click on a filter
        const moversBtn = page.getByRole('button', { name: /Movers/i });
        if (await moversBtn.isVisible()) {
            console.log('Clicking Movers filter...');
            await moversBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: path.join(screenshotDir, 'movers_filter.png') });
        }

        // Test auth guard
        console.log('Testing auth guard for /settings...');
        await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotDir, 'auth_guard_verify.png') });

        console.log('Demo capture complete.');
    } catch (err) {
        console.error('Capture failed:', err);
    } finally {
        await browser.close();
    }
}

captureDemo();
