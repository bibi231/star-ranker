import { execSync } from 'child_process';
import fs from 'fs';

try {
    const out = execSync('npx playwright test ux-test.spec.js --reporter=list', {
        env: { ...process.env, SITE_URL: 'http://localhost:5173' },
        encoding: 'utf8'
    });
    fs.writeFileSync('ux_clean.txt', out, 'utf8');
} catch (e) {
    fs.writeFileSync('ux_clean.txt', (e.stdout || e.message) + '\n\n' + (e.stderr || ''), 'utf8');
}
console.log('Playwright run finished');
