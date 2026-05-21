const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function main() {
  const extensionCtx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'dist', 'extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
    minify: !isWatch,
    logLevel: 'info',
  });

  const webviewCtx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'webview', 'editor.js')],
    bundle: true,
    outfile: path.join(__dirname, 'dist', 'editor.js'),
    format: 'iife',
    platform: 'browser',
    sourcemap: true,
    minify: !isWatch,
    logLevel: 'info',
  });

  if (isWatch) {
    console.log('Watching for changes...');
    await extensionCtx.watch();
    await webviewCtx.watch();
  } else {
    console.log('Building extension and webview...');
    await extensionCtx.rebuild();
    await webviewCtx.rebuild();
    console.log('Build finished successfully.');
    await extensionCtx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
