const fs = require('fs');
const path = require('path');

const entry = process.env.REACT_APP_ENTRY;
if (!entry) {
    console.error('REACT_APP_ENTRY environment variable not set');
    process.exit(1);
}

const srcDir = path.join(__dirname, '..', 'src');
const indexFile = path.join(srcDir, `index-${entry}.js`);
const indexTarget = path.join(srcDir, 'index.js');

// Check if we're being called before or after build
const buildDir = path.join(__dirname, '..', 'build');
const targetDir = path.join(__dirname, '..', `build-${entry}`);

if (fs.existsSync(buildDir)) {
    // After build: move build directory
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.renameSync(buildDir, targetDir);
    console.log(`Moved build to build-${entry}`);
} else {
    // Before build: copy index file
    if (fs.existsSync(indexFile)) {
        fs.copyFileSync(indexFile, indexTarget);
        console.log(`Copied index-${entry}.js to index.js`);
    } else {
        console.error(`Index file not found: ${indexFile}`);
        process.exit(1);
    }
}
