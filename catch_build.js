import { exec } from 'child_process';
import fs from 'fs';

exec('npx vite build', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
    let output = "STDOUT:\n" + stdout + "\n\nSTDERR:\n" + stderr;
    if (error) {
        output += "\n\nEXEC ERROR:\n" + error.message;
    }
    fs.writeFileSync('build_debug_utf8.log', output, 'utf8');
    console.log("Build logged to build_debug_utf8.log");
});
