/**
 * PWA用アイコンPNGを外部依存なしで生成するスクリプト。
 * ブランドカラー(テラコッタ地+生成りの皿+淡黄の料理)のシンプルな図案。
 * ChatGPT Imagesで正式なアイコンができたら同じパスに上書きすればよい。
 *
 * 実行: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TERRACOTTA = [0xe0, 0x7a, 0x5f];
const CREAM = [0xfa, 0xf6, 0xf0];
const YELLOW = [0xf2, 0xcc, 0x8f];
const GREEN = [0x81, 0xb2, 0x9a];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c;
    });
  }
  let crc = -1;
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** pixelFn(x, y) => [r, g, b] */
function createPng(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y);
      const p = row + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** テラコッタ地に、生成りの皿+料理を思わせる淡黄の円+グリーンの点 */
function iconPixel(size) {
  const cx = size / 2;
  const cy = size / 2;
  const plateR = size * 0.36;
  const foodR = size * 0.22;
  const dotR = size * 0.05;
  const dotCx = cx + size * 0.1;
  const dotCy = cy - size * 0.1;
  return (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    if (Math.hypot(x - dotCx, y - dotCy) < dotR) return GREEN;
    if (d < foodR) return YELLOW;
    if (d < plateR) return CREAM;
    return TERRACOTTA;
  };
}

const targets = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/icon.png", 128],
  ["src/app/apple-icon.png", 180],
];

for (const [path, size] of targets) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, createPng(size, iconPixel(size)));
  console.log(`generated ${path} (${size}x${size})`);
}
