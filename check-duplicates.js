
import fs from 'fs';
import path from 'path';

function findDuplicates(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                findDuplicates(fullPath);
            }
        } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            const declarations = {};
            lines.forEach((line, i) => {
                // Look for const x =, let x =, var x =, function x()
                const match = line.match(/^\s*(const|let|var|function)\s+([a-zA-Z0-9_$]+)/);
                if (match) {
                    const name = match[2];
                    if (declarations[name] !== undefined) {
                        console.log(`DUPLICATE: "${name}" in ${fullPath} (lines ${declarations[name] + 1} and ${i + 1})`);
                    }
                    declarations[name] = i;
                }
            });
        }
    }
}

findDuplicates('./src');
findDuplicates('./server');
