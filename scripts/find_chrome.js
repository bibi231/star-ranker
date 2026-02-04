import fs from 'fs';
import path from 'path';
import { os } from 'os';

const localAppData = process.env.LOCALAPPDATA;
const playwrightPath = path.join(localAppData, 'ms-playwright');

function findChrome(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findChrome(fullPath);
            if (found) return found;
        } else if (file === 'chrome.exe') {
            return fullPath;
        }
    }
    return null;
}

const chromePath = findChrome(playwrightPath);
if (chromePath) {
    console.log(`FOUND_CHROME: ${chromePath}`);
} else {
    console.log('CHROME_NOT_FOUND');
}
