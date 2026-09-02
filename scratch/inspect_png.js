const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function inspectPng(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  const chunks = [];
  let width, height, bitDepth, colorType, compressionMethod, filterMethod, interlaceMethod;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    chunks.push({ type, len });
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      compressionMethod = data[10];
      filterMethod = data[11];
      interlaceMethod = data[12];
    }
    pos += 12 + len;
  }
  return {
    filePath,
    width,
    height,
    bitDepth,
    colorType, // 0: Grayscale, 2: RGB, 3: Indexed, 4: Grayscale+Alpha, 6: RGBA
    interlaceMethod,
    chunks: chunks.map(c => c.type).join(', ')
  };
}

const dir = 'public/imatges/productes';
const files = fs.readdirSync(dir).filter(f => f.startsWith('marc'));
files.forEach(f => {
  const info = inspectPng(path.join(dir, f));
  console.log(f, JSON.stringify(info));
});
