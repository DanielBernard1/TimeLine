// Generates icon-192.png and icon-512.png with no dependencies (zlib only).
// A dark rounded tile with a horizontal axis + a couple of event ticks/dots.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function png(width, height, draw) {
  const px = Buffer.alloc(width * height * 4); // RGBA
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    // simple alpha blend over existing
    const ia = a / 255, inv = 1 - ia;
    px[i]   = Math.round(r * ia + px[i]   * inv);
    px[i+1] = Math.round(g * ia + px[i+1] * inv);
    px[i+2] = Math.round(b * ia + px[i+2] * inv);
    px[i+3] = Math.max(px[i+3], a);
  };
  draw({ set, width, height });

  // build raw image data with filter byte 0 per row
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    px.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);

  const crcTable = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = buf => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon({ set, width: W }) {
  const S = W;
  const r = Math.round(S * 0.18); // corner radius
  const inside = (x, y) => {
    // rounded-rect mask
    const nx = Math.min(x, S - 1 - x), ny = Math.min(y, S - 1 - y);
    if (nx >= r || ny >= r) return true;
    const dx = r - nx, dy = r - ny;
    return dx * dx + dy * dy <= r * r;
  };
  // background tile
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (inside(x, y)) set(x, y, 0x1b, 0x21, 0x2b, 255);
  }
  // axis line
  const axisY = Math.round(S * 0.52), th = Math.max(2, Math.round(S * 0.018));
  const x0 = Math.round(S * 0.16), x1 = Math.round(S * 0.84);
  for (let y = axisY - th; y <= axisY + th; y++) for (let x = x0; x <= x1; x++) if (inside(x,y)) set(x, y, 0xcd, 0xd6, 0xe5, 255);
  // month ticks
  const tickH = Math.round(S * 0.07);
  for (const fx of [0.16, 0.38, 0.6, 0.84]) {
    const x = Math.round(S * fx);
    for (let y = axisY - tickH; y <= axisY + tickH; y++) for (let dx = -th; dx <= th; dx++) if (inside(x+dx,y)) set(x+dx, y, 0x8390a3, 0, 0, 0); // placeholder, recolor below
  }
  // (recolor ticks properly: grey)
  for (const fx of [0.16, 0.38, 0.6, 0.84]) {
    const x = Math.round(S * fx);
    for (let y = axisY - tickH; y <= axisY + tickH; y++) for (let dx = -th; dx <= th; dx++) if (inside(x+dx,y)) set(x+dx, y, 0x6b, 0x74, 0x83, 255);
  }
  // event dots + drop lines (orange, blue, green)
  const dots = [
    { fx: 0.30, fy: 0.28, c: [0xe8,0x74,0x3b] },
    { fx: 0.54, fy: 0.74, c: [0x4f,0x8c,0xff] },
    { fx: 0.72, fy: 0.30, c: [0x2e,0xcc,0x71] },
  ];
  for (const d of dots) {
    const cx = Math.round(S * d.fx), cy = Math.round(S * d.fy);
    // connector to axis
    const stepY = cy < axisY ? 1 : -1;
    for (let y = Math.min(cy, axisY); y <= Math.max(cy, axisY); y++)
      for (let dx = -1; dx <= 1; dx++) if (inside(cx+dx,y)) set(cx+dx, y, d.c[0], d.c[1], d.c[2], 180);
    // dot
    const rad = Math.round(S * 0.055);
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++)
      if (x*x + y*y <= rad*rad && inside(cx+x, cy+y)) set(cx+x, cy+y, d.c[0], d.c[1], d.c[2], 255);
  }
}

for (const size of [192, 512]) {
  const buf = png(size, size, drawIcon);
  writeFileSync(new URL(`./icon-${size}.png`, import.meta.url), buf);
  console.log(`wrote icon-${size}.png (${buf.length} bytes)`);
}
