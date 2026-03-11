const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`[BROWSER ERROR]: ${msg.text()}`);
            console.error(`[BROWSER ATGS]: ${msg.args().map(a => a.toString())}`);
        } else {
            console.log(`[BROWSER LOG]: ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        console.error(`[PAGE FATAL]: ${error.message}`);
        console.error(error.stack);
    });

    console.log("-> Fetching Vercel production...");
    await page.goto("https://star-ranker-beryl.vercel.app/", { waitUntil: 'load' });

    // Wait slightly for React to attempt hydration
    await new Promise(r => setTimeout(r, 3000));

    console.log("-> Checking DOM...");
    const content = await page.content();
    console.log("Root element HTML length: ", content.indexOf('id="root"'));

    await browser.close();
})();
