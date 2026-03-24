const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = getAllFiles(srcDir);

for (const file of files) {
    if (file.includes('dbClient.ts') || file.includes('supabase.ts')) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Remove const DB_URL = 'http://localhost:3011';
    if (content.includes("const DB_URL = 'http://localhost:3011';")) {
        content = content.replace(/const DB_URL = 'http:\/\/localhost:3011';\n?/, '');
        // Inject import { dbClient } from '@/lib/dbClient'; if not exists
        if (!content.includes("import { dbClient }")) {
            // Put it after the last import
            const importRegex = /^import .+?;?$/gm;
            let lastImportMatch = null;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                lastImportMatch = match;
            }
            if (lastImportMatch) {
                const index = lastImportMatch.index + lastImportMatch[0].length;
                content = content.slice(0, index) + "\nimport { dbClient } from '@/lib/dbClient';" + content.slice(index);
            } else {
                content = "import { dbClient } from '@/lib/dbClient';\n" + content;
            }
        }
        changed = true;
    }

    // 2. Replace simple fetch calls
    // fetch(`${DB_URL}/clients`)
    // res = await fetch(`http://localhost:3011/clients`);
    const regexGet = /await fetch\(`?(?:http:\/\/localhost:3011|\$\{DB_URL\})(.*?)(?:`|'|")\)/g;
    content = content.replace(regexGet, (match, p1) => {
        changed = true;
        return `await dbClient.get(\`${p1}\`)`;
    });

    // We also need to remove .then(res => res.json()) because dbClient already returns parsed JSON data
    // Usually it's dbClient.get(...).then(res => res.json()) -> dbClient.get(...)
    // or const res = await dbClient.get(...); const data = await res.json();
    // 
    // This is hard to regex perfectly. Let's do some common patterns:
    if (changed) {
        content = content.replace(/\.then\([a-zA-Z]+\s*=>\s*[a-zA-Z]+\.json\(\)\)\s*\.then\(/g, '.then(');
        content = content.replace(/const ([a-zA-Z0-9_]+) = await ([a-zA-Z0-9_]+)\.json\(\);/g, (m, p1, p2) => {
            return `const ${p1} = ${p2}; // Was .json()`;
        });
    }

    // 3. Replace fetch POST/PATCH/DELETE
    // This requires parsing the options object. It's too complex for regex.
    // Actually, maybe I can just manually fix the few places that do POST/PATCH using VSCode or multi_replace.
    
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Processed:', file);
    }
}
