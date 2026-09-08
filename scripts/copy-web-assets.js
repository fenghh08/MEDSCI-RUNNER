// Regenerates www/ (Capacitor's webDir) from the root game source files.
// Root files stay the single source of truth; www/ is disposable output,
// so this always wipes and rebuilds it rather than merging into it.
//
// developer-tool.html is deliberately never copied -- it's a maintainer-only
// content tool with Firebase write access and has no place in the shipped app.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const wwwDir = path.join(root, 'www');

fs.rmSync(wwwDir, { recursive: true, force: true });
fs.mkdirSync(wwwDir, { recursive: true });

fs.copyFileSync(path.join(root, 'medsci-runner.html'), path.join(wwwDir, 'index.html'));
fs.copyFileSync(path.join(root, 'game-data.js'), path.join(wwwDir, 'game-data.js'));
fs.cpSync(path.join(root, 'icons'), path.join(wwwDir, 'icons'), { recursive: true });
fs.cpSync(path.join(root, 'images'), path.join(wwwDir, 'images'), { recursive: true });

console.log('www/ rebuilt from medsci-runner.html, game-data.js, icons/, images/ (developer-tool.html excluded)');
