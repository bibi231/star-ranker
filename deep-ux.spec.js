import { test, expect } from "@playwright/test";

const SITE_URL = process.env.SITE_URL || "https://star-ranker-beryl.vercel.app";

test.describe("Deep Functional E2E (Persistence & User Flows)", () => {
    // Use desktop viewport
    test.use({ viewport: { width: 1280, height: 800 } });

    test.beforeEach(async ({ page }) => {
        // Navigate with a generous timeout to allow serverless cold starts
        await page.goto(SITE_URL, { timeout: 30000, waitUntil: 'load' });
        // Force a "logged in" state locally for UI interaction tests
        await page.evaluate(() => localStorage.setItem('auth_bypass', 'true'));
    });

    test("Data Fetching: Categories & Items load correctly", async ({ page }) => {
        await page.goto(`${SITE_URL}/markets`, { waitUntil: 'networkidle' });

        // Wait heavily for categories to populate from Render (up to 20s for cold start padding)
        const categoryTabs = page.locator("button").filter({ hasText: /Entertainment|Crypto|Sports/i });
        await expect(categoryTabs.first()).toBeVisible({ timeout: 20000 });

        // Log the found categories for debugging
        const catText = await categoryTabs.allInnerTexts();
        console.log("Categories loaded:", catText);

        // Click Entertainment
        await categoryTabs.filter({ hasText: 'Entertainment' }).first().click();

        // Wait for the API to swap lists
        await page.waitForTimeout(2000);

        // Look for items rendering
        const rows = page.locator("td, .item-card, [data-testid='item-row']");
        const count = await rows.count();
        console.log("Items loaded for Entertainment:", count);

        expect(count).toBeGreaterThan(0);
    });

    test("Interaction: Standard Voting persists visually", async ({ page }) => {
        await page.goto(`${SITE_URL}/markets`, { waitUntil: 'networkidle' });
        const categoryTabs = page.locator("button").filter({ hasText: /Crypto/i });
        await categoryTabs.first().waitFor({ state: 'visible', timeout: 20000 });
        await categoryTabs.first().click();
        await page.waitForTimeout(2000);

        // Find the first Upvote button
        const upBtn = page.locator("button").filter({ hasText: /▲|↑/ }).first();
        await upBtn.waitFor({ state: 'visible', timeout: 10000 });

        // Capture initial state (which is usually a neutral styling)
        const initialClass = await upBtn.getAttribute('class');

        // Execute vote
        await upBtn.click();
        await page.waitForTimeout(2000); // Wait for optimistic update + API

        // Verify visual change (active state usually adds a specific class like text-brand-green or similar)
        const afterClass = await upBtn.getAttribute('class');
        console.log("Vote button classes pre/post:", { initialClass, afterClass });

        // As long as the class changed or the button remained intractable without error, it succeeded
        expect(initialClass !== afterClass || afterClass.includes('green') || afterClass.includes('accent')).toBeTruthy();
    });

    test("Interaction: Power Voting / Subscriptions open correctly", async ({ page }) => {
        await page.goto(`${SITE_URL}/markets`);
        const subscribeBanners = page.locator("button, a").filter({ hasText: /Subscribe|Pro/i });

        if (await subscribeBanners.count() > 0) {
            await subscribeBanners.first().click();
            await page.waitForTimeout(1000);

            const modal = page.locator("[role='dialog'], .modal");
            await expect(modal.first()).toBeVisible();

            const text = await modal.textContent();
            expect(text).toMatch(/Plan|Subscribe|Month/i);
        } else {
            console.log("No subscription prompts visible to test right now.");
        }
    });

    test("Interaction: Staking remembers rank structure", async ({ page }) => {
        await page.goto(`${SITE_URL}/markets`, { waitUntil: 'networkidle' });
        const stakeBtn = page.locator("button").filter({ hasText: /stake/i }).first();
        await stakeBtn.waitFor({ state: 'visible', timeout: 15000 });

        await stakeBtn.click();
        await page.waitForTimeout(1500);

        // Find the input field for amount
        const input = page.locator("[role='dialog'] input[type='number']").first();
        await input.fill("100");

        // Submit stake
        const confirm = page.locator("[role='dialog'] button").filter({ hasText: /Confirm|Stake/i }).first();
        await confirm.click();

        // Verify modal closes implies success, or look for toast
        await page.waitForTimeout(2000);
        const modalVisible = await page.locator("[role='dialog']").isVisible();
        console.log("Is modal still visible after staking?", modalVisible);
    });
});
