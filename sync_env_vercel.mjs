import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.env', 'utf-8');
const lines = envContent.split('\n');

for (const line of lines) {
    if (line.startsWith('VITE_') && line.includes('=')) {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');

        console.log(`Processing ${key}...`);

        try {
            console.log(`Removing existing ${key}...`);
            execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
        } catch (e) {
            // Ignore if it doesn't exist
        }

        try {
            console.log(`Adding ${key}...`);
            // Run vercel env add and feed the value via stdin natively without newline
            execSync(`npx vercel env add ${key} production`, {
                input: value,
                stdio: ['pipe', 'ignore', 'inherit']
            });
            console.log(`Successfully added ${key}`);
        } catch (e) {
            console.error(`Failed to add ${key}`);
        }
    }
}
console.log('Environment variable sync complete. Triggering production build...');
try {
    execSync('npx vercel deploy --prod --yes', { stdio: 'inherit' });
    console.log('Deployment successful!');
} catch (e) {
    console.error('Deployment failed.');
}
