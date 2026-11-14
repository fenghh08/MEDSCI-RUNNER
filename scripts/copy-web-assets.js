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
fs.copyFileSync(path.join(root, 'feedback.html'), path.join(wwwDir, 'feedback.html'));
fs.copyFileSync(path.join(root, 'feedback-questions.js'), path.join(wwwDir, 'feedback-questions.js'));
fs.cpSync(path.join(root, 'icons'), path.join(wwwDir, 'icons'), { recursive: true });
fs.cpSync(path.join(root, 'images'), path.join(wwwDir, 'images'), { recursive: true });
// The metabolism atlas: one self-contained HTML file, no network, so it works
// in the app exactly as it does in a browser. Generated -- see scripts/sync-atlas.sh.
fs.cpSync(path.join(root, 'atlas'), path.join(wwwDir, 'atlas'), { recursive: true });
// The 3D battle view and the library it needs. Without these the app still works; battles just stay 2D.
fs.copyFileSync(path.join(root, 'battle3d.js'), path.join(wwwDir, 'battle3d.js'));
fs.cpSync(path.join(root, 'vendor'), path.join(wwwDir, 'vendor'), { recursive: true });

console.log('www/ rebuilt from medsci-runner.html, game-data.js, feedback.html, icons/, images/, atlas/ (developer-tool.html excluded)');
