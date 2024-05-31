import sharp from 'sharp';
import { glob } from 'glob';
import { promises as fs } from 'fs';

async function optimizeAndResizeImages(inputPattern) {
  const files = glob.sync(inputPattern);

  await Promise.all(files.map(async (file) => {
    const image = sharp(file);
    const metadata = await image.metadata();

    if (metadata.format === 'jpeg') {
      await image
        .resize({ height: 700 })
        .jpeg({ quality: 75 })
        .toBuffer()
        .then(buffer => fs.writeFile(file, buffer));
    }

    console.log(`${file} has been processed.`);
  }));

  console.log(`${files.length} images optimized`);
}

optimizeAndResizeImages('./out_web/assets/cards/**/*.{jpg,jpeg}');