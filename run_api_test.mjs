import { execSync } from 'child_process';

try {
    const out = execSync('node api-test.mjs', {
        env: { ...process.env, API_URL: 'http://localhost:3001' },
        encoding: 'utf8'
    });
    console.log(out);
} catch (e) {
    console.log("Error output from process:");
    console.log(e.stdout || e.message);
}
