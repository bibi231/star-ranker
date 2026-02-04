const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureDemo() {
    const screenshotDir = path.join(__dirname, 'demo_screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to http://localhost:5173/markets...');
        await page.goto('http://localhost:5173/markets', { waitUntil: 'networkidle' });

        // Take a screenshot of the virtualized table
        console.log('Capturing markets_overview.png...');
        await page.screenshot({ path: path.join(screenshotDir, 'markets_overview.png') });

        // Click on a filter if possible
        const moversBtn = await page.getByText('Movers', { exact: true });
        if (await moversBtn.isVisible()) {
            console.log('Clicking Movers filter...');
            await moversBtn.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(screenshotDir, 'movers_filter.png') });
        }

        // Test auth guard
        console.log('Testing auth guard for /settings...');
        await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000); // Wait for potential redirect or guard
        await page.screenshot({ path: path.join(screenshotDir, 'auth_guard_verify.png') });

        console.log('Demo capture complete.');
    } catch (err) {
        console.error('Capture failed:', err);
    } finally {
        await browser.close();
    }
}

captureDemo();
