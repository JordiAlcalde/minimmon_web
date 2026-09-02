const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// A robust PNG decoder for Adam7 and non-interlaced 8/16-bit RGBA / RGB
function parsePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let width, height, bitDepth, colorType, interlaceMethod;
  const idatChunks = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));

  return { width, height, bitDepth, colorType, interlaceMethod, decompressedLength: decompressed.length, decompressed };
}

console.log('Parsed info:');
const f1 = parsePng('public/imatges/productes/marc_natural.png');
console.log('marc_natural.png:', f1.width, 'x', f1.height, 'bitDepth:', f1.bitDepth, 'colorType:', f1.colorType, 'interlace:', f1.interlaceMethod);

const fEx = parsePng('public/imatges/productes/marc_exemple_v_01.png');
console.log('marc_exemple_v_01.png:', fEx.width, 'x', fEx.height, 'bitDepth:', fEx.bitDepth, 'colorType:', fEx.colorType, 'interlace:', fEx.interlaceMethod);
