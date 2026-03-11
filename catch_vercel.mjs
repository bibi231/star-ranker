import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let hasFirebaseError = false;

    page.on('console', msg => {
        const text = msg.text();
        console.log(`[CONSOLE] ${msg.type()}: ${text}`);
        if (text.includes('Firebase') && text.includes('Error')) {
            hasFirebaseError = true;
        }
    });

    page.on('pageerror', err => {
        console.log(`[PAGE ERROR]: ${err.message}`);
        if (err.message.includes('Firebase') && err.message.includes('Error')) {
            hasFirebaseError = true;
        }
    });

    console.log('Navigating to Live Prod');
    await page.goto('https://star-ranker.vercel.app/', { waitUntil: 'networkidle' });

    // Wait for hydration
    await page.waitForTimeout(3000);

    const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML);
    if (!rootContent) {
        console.log('❌ Root element is entirely empty! Still blank screen.');
    } else {
        console.log('✅ Root element has content (length: ' + rootContent.length + '). Application rendered.');
    }

    if (hasFirebaseError) {
        console.log('❌ Firebase API Key errors were still detected in the console logs.');
    } else {
        console.log('✅ No Firebase initialization errors detected.');
    }

    await browser.close();
})();
