import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let caughtConsoleErrors = false;
    page.on('console', msg => {
        if (msg.type() === 'error') {
            caughtConsoleErrors = true;
            console.error(`[BROWSER ERROR]: ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        caughtConsoleErrors = true;
        console.error(`[PAGE FATAL]: ${error.message}`);
    });

    console.log("-> Fetching Vercel production...");
    await page.goto("https://star-ranker-beryl.vercel.app/", { waitUntil: 'load' });

    // Check hydration state
    await new Promise(r => setTimeout(r, 2500));

    const rootHasContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.length > 50 : false;
    });

    console.log(`\nRESULT: Root populated? ${rootHasContent}`);
    if (!rootHasContent && !caughtConsoleErrors) {
        console.log("ISSUE: App rendered silent blank container with NO javascript console errors. A hook or layout component is likely returning `null` or silently failing without crashing React.");
    }

    await browser.close();
})();
