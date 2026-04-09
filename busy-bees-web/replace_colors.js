const fs = require('fs');
const path = require('path');

const dirSets = ['src/app/forms', 'src/components/forms', 'src/app/clients'];

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            filelist = walkSync(filePath, filelist);
        } else if (file.endsWith('.css') || file.endsWith('.tsx') || file.endsWith('.ts')) {
            filelist.push(filePath);
        }
    });
    return filelist;
};

let files = [];
dirSets.forEach(d => {
    if (fs.existsSync(d)) files = files.concat(walkSync(d));
});

let modifiedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Global standard replacements for amber colors -> teal thematic colors
    content = content.replace(/#fffde7/g, '#f0fdfa');
    content = content.replace(/#fff8e1/g, '#f8fafc');
    content = content.replace(/#ffe082/g, '#99f6e4');
    content = content.replace(/#d97706/g, '#0d9488');
    content = content.replace(/#92400e/g, '#0f766e');
    content = content.replace(/#fffbeb/g, '#f0fdfa');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Modified:', file);
        modifiedFiles++;
    }
});

console.log(`Replaced colors in ${modifiedFiles} files.`);
