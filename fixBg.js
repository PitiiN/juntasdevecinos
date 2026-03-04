const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content.replace(/backgroundColor:\s*['"]#F8FAFC['"]/g, "backgroundColor: 'transparent'");
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log('Fixed background in:', fullPath);
            }
        }
    }
}
processDir(path.join(__dirname, 'src', 'screens'));
console.log('Done.');
