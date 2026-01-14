/*
  Script: extract-logo-color.js
  - Reads src/assets/logo.webp
  - Uses sharp to resize image to 1x1 to get average color
  - Writes the hex into src/theme/colors.js by replacing logoPrimary and primary tokens

  Usage (run locally):
    npm install --save-dev sharp
    npm run extract:logo-color
*/

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const projectRoot = path.resolve('.');
const logoPath = path.join(projectRoot, 'src', 'assets', 'logo.webp');
const colorsFile = path.join(projectRoot, 'src', 'theme', 'colors.js');

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

async function extractAverageColor() {
  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found at', logoPath);
    process.exit(1);
  }

  try {
    // Resize to 1x1 and get raw pixel data (RGB)
    const { data, info } = await sharp(logoPath).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
    const [r, g, b] = data;
    const hex = rgbToHex(r, g, b);
    console.log('Extracted color:', hex);

    if (!fs.existsSync(colorsFile)) {
      console.error('Colors file not found at', colorsFile);
      process.exit(1);
    }

    let content = fs.readFileSync(colorsFile, 'utf8');

    // Replace logoPrimary and primary values (simple regex)
    content = content.replace(/logoPrimary:\s*'#[0-9a-fA-F]{6}'/, `logoPrimary: '${hex}'`);
    content = content.replace(/primary:\s*'#[0-9a-fA-F]{6}'/, `primary: '${hex}'`);

    fs.writeFileSync(colorsFile, content, 'utf8');
    console.log('Updated', colorsFile, 'with logo color', hex);
  } catch (err) {
    console.error('Error extracting color:', err);
    process.exit(1);
  }
}

extractAverageColor();
