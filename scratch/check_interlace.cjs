const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Decode non-interlaced or Adam7 16-bit RGBA
// But wait, are these Adam7 or non-interlaced?
function checkInterlace(filePath) {
  const buf = fs.readFileSync(filePath);
  return buf[28]; // interlace method byte at offset 28 in PNG
}

const dir = 'public/imatges/productes';
['marc_finestra_onada.png', 'marc_finestra_núvol.png', 'marc_finestra_batec.png'].forEach(f => {
  console.log(f, 'interlace method:', checkInterlace(path.join(dir, f)));
});
