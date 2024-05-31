import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import fs from 'fs-extra';

function collectFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      collectFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath.replace(path.resolve(__dirname, 'src/renderer/cards'), 'assets/cards'));
    }
  });

  return fileList;
}

export default defineConfig({
  envPrefix: 'VITE_',
  root: './src/web/',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'src/renderer/cards'),
          dest: path.resolve(__dirname, 'out_web/assets/')
        },
        {
          src: path.resolve(__dirname, 'build/favicon.ico'),
          dest: path.resolve(__dirname, 'out_web')
        },
        {
          src: path.resolve(__dirname, 'build/icon.png'),
          dest: path.resolve(__dirname, 'out_web/assets/')
        },
        {
          src: path.resolve(__dirname, 'build/manifest.json'),
          dest: path.resolve(__dirname, 'out_web')
        },
        ]
    }),
    svelte(),
    {
      name: 'generate-asset-list',
      generateBundle(options, bundle) {
        const CODE_CACHE_NAME = `code-cache-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;
        
        const assets = Object.keys(bundle).filter(name => {
          const asset = bundle[name];
          return asset.type === 'asset' || asset.isEntry;
        });

        fs.ensureDirSync(path.resolve(__dirname, 'out_web/assets/cards'));

        const assetFiles = [...new Set([...assets, 'assets/icon.png'])];
        fs.writeFileSync(path.resolve(__dirname, 'out_web/assets', 'index.json'), JSON.stringify(assetFiles), 'utf-8');

        const swTemplate = fs.readFileSync(path.resolve(__dirname, 'src/web/src/service-worker.js'), 'utf-8');
        const swUpdated = swTemplate.replace(/const CODE_CACHE_NAME = '.*';/, `const CODE_CACHE_NAME = '${CODE_CACHE_NAME}';`);
        fs.writeFileSync(path.resolve(__dirname, 'out_web/service-worker.js'), swUpdated, 'utf-8');

        const additionalFiles = collectFilesRecursively(path.resolve(__dirname, './src/renderer/cards/'));
        const cardFiles = [...new Set(additionalFiles)];
        fs.writeFileSync(path.resolve(__dirname, 'out_web/assets/cards', 'index.json'), JSON.stringify(cardFiles), 'utf-8');

        console.log(`Asset list generated`);
      }
    }
  ],
  build: {
    outDir: '../../out_web',
    minify: true
  },
});
