const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
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

  if (isWatch) {
    console.log('Watching for changes...');
    await ctx.watch();
  } else {
    console.log('Building extension...');
    await ctx.rebuild();
    console.log('Build finished successfully.');
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
