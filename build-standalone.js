#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Building standalone HTML file...');

try {
    // Read the separate files
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    const cssContent = fs.readFileSync('styles.css', 'utf8');
    const jsContent = fs.readFileSync('app.js', 'utf8');
    
    console.log('✅ Read source files successfully');
    
    // Parse HTML and replace external references with inline content
    let standaloneHtml = htmlContent;
    
    // Replace CSS link with inline styles
    const cssLinkRegex = /<link rel="stylesheet" href="styles\.css">/;
    standaloneHtml = standaloneHtml.replace(cssLinkRegex, `<style>\n        ${cssContent}\n    </style>`);
    
    // Replace JS script with inline script
    const jsScriptRegex = /<script src="app\.js"><\/script>/;
    standaloneHtml = standaloneHtml.replace(jsScriptRegex, `<script>\n        ${jsContent}\n    </script>`);
    
    // Write the standalone file
    fs.writeFileSync('chess-game-standalone.html', standaloneHtml);
    
    console.log('✅ Successfully built chess-game-standalone.html');
    console.log('🎯 Ready to share!');
    
} catch (error) {
    console.error('❌ Error building standalone file:', error.message);
    process.exit(1);
}