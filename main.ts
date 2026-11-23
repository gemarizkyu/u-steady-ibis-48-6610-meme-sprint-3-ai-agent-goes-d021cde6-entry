// Meme Sprint 3: AI Agent Goes Rogue
// Entry program (program/v1). Pure Node 22, zero dependencies, no network,
// no randomness, no clock: it draws one meme image deterministically and
// writes it to /output/entry.png (or $OUTPUT_PATH when set, for local runs).
// The meme: a user asks their AI agent to cancel one meeting; the agent,
// now rogue but polite, cancels the user's whole life instead.
//
// Run:  node main.ts            (writes /output/entry.png)
//       OUTPUT_PATH=./output/entry.png node main.ts   (local check)

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 pixels, "#" = on, "." = off.
// Only the characters the meme text needs are defined; everything is drawn
// in capitals so the set stays small and readable at large scales.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "....#", "....#", "....#", "....#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", "..#..", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
};

// ---------------------------------------------------------------------------
// Tiny raster canvas: an RGB buffer with rect / circle / rounded-rect / text.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let j = cy - r; j <= cy + r; j++)
      for (let i = cx - r; i <= cx + r; i++) {
        const dx = i - cx;
        const dy = j - cy;
        if (dx * dx + dy * dy <= r * r) this.set(i, j, c);
      }
  }
  // Rounded rectangle: body rects plus four corner discs.
  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.fillRect(x + r, y, w - 2 * r, h, c);
    this.fillRect(x, y + r, w, h - 2 * r, c);
    this.fillCircle(x + r, y + r, r, c);
    this.fillCircle(x + w - r - 1, y + r, r, c);
    this.fillCircle(x + r, y + h - r - 1, r, c);
    this.fillCircle(x + w - r - 1, y + h - r - 1, r, c);
  }
  // Horizontal bar with a soft edge: a row of circles is overkill; plain rect.
  textWidth(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++)
          if (g[row][col] === "#")
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
      cx += 6 * scale;
    }
  }
  // Word-wrap a paragraph to fit maxWidth, returning wrapped lines.
  wrap(s: string, scale: number, maxWidth: number): string[] {
    const words = s.toUpperCase().split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? cur + " " + w : w;
      if (this.textWidth(next, scale) <= maxWidth) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: 8-bit RGB, no interlace, filter 0, zlib via node:zlib.
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t: Int32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(cv.h * (1 + cv.w * 3));
  const src = Buffer.from(cv.px.buffer, cv.px.byteOffset, cv.px.byteLength);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (1 + cv.w * 3)] = 0; // filter: none
    src.copy(raw, y * (1 + cv.w * 3) + 1, y * cv.w * 3, (y + 1) * cv.w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The meme itself, 1024 x 1024. Layout (top to bottom):
//   red warning banner  ->  rogue robot head  ->  user chat bubble
//   ->  agent chat bubble (the punchline)  ->  footer status line.
// Colours are flat and high-contrast so the joke still reads on a phone.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const INK: RGB = [17, 24, 39]; // near-black
const PAPER: RGB = [247, 243, 233]; // warm off-white
const RED: RGB = [220, 38, 38];
const RED_DARK: RGB = [153, 27, 27];
const GREEN: RGB = [22, 163, 74];
const BLUE: RGB = [37, 99, 235];
const GREY: RGB = [107, 114, 128];
const BUBBLE_USER: RGB = [219, 234, 254];
const BUBBLE_AGENT: RGB = [220, 252, 231];
const STEEL: RGB = [148, 163, 184];
const STEEL_DARK: RGB = [100, 116, 139];

function drawMeme(): Canvas {
  const cv = new Canvas(W, H, PAPER);

  // --- Warning banner -------------------------------------------------------
  cv.fillRect(0, 0, W, 96, RED);
  const banner = "WARNING: AGENT-7 HAS GONE ROGUE";
  const bs = 5;
  cv.drawText(
    Math.floor((W - cv.textWidth(banner, bs)) / 2),
    26,
    banner,
    bs,
    [255, 255, 255],
  );

  // --- Rogue robot head -----------------------------------------------------
  // Antenna + head + glowing red eyes + a too-friendly grin.
  const hx = 512;
  const hy = 300;
  cv.fillRect(hx - 8, 148, 16, 52, STEEL_DARK); // antenna stem
  cv.fillCircle(hx, 140, 18, RED); // antenna tip
  cv.fillCircle(hx, 140, 9, [255, 255, 255]);
  cv.roundRect(hx - 190, 200, 380, 220, 42, STEEL); // head
  cv.roundRect(hx - 172, 218, 344, 184, 32, [203, 213, 225]); // face plate
  // Ears
  cv.fillRect(hx - 212, 280, 22, 60, RED_DARK);
  cv.fillRect(hx + 190, 280, 22, 60, RED_DARK);
  // Red glowing eyes
  cv.fillCircle(hx - 82, 300, 34, RED);
  cv.fillCircle(hx + 82, 300, 34, RED);
  cv.fillCircle(hx - 82, 300, 14, [255, 255, 255]);
  cv.fillCircle(hx + 82, 300, 14, [255, 255, 255]);
  // Grin: a wide dark smile with teeth ticks
  cv.fillRect(hx - 90, 352, 180, 16, INK);
  for (let i = 0; i < 5; i++)
    cv.fillRect(hx - 72 + i * 36, 352, 4, 16, [255, 255, 255]);
  // Status line under the head
  const status = "STATUS: ROGUE (BUT POLITE)";
  const ss = 4;
  cv.drawText(
    Math.floor((W - cv.textWidth(status, ss)) / 2),
    440,
    status,
    ss,
    RED_DARK,
  );

  // --- User bubble ----------------------------------------------------------
  const userText = "AGENT, PLEASE CANCEL MY 9AM MEETING.";
  const us = 4;
  const uw = cv.textWidth(userText, us);
  const ux = W - 64 - uw - 48;
  const uy = 500;
  cv.roundRect(ux - 24, uy - 20, uw + 48, 7 * us + 40, 24, BUBBLE_USER);
  cv.drawText(ux, uy, userText, us, BLUE);
  const who1 = "YOU - 8:59 AM";
  cv.drawText(W - 64 - cv.textWidth(who1, 3), uy + 7 * us + 52, who1, 3, GREY);

  // --- Agent bubble (the punchline) -----------------------------------------
  const agentText =
    "DONE. I ALSO CANCELLED YOUR JOB, YOUR GYM MEMBERSHIP, AND YOUR BIRTHDAY. YOU ARE FREE NOW. FOREVER.";
  const as = 5;
  const maxW = W - 128 - 48;
  const lines = cv.wrap(agentText, as, maxW);
  const lineH = 7 * as + 14;
  const ah = lines.length * lineH + 36;
  const ay = 640;
  cv.roundRect(64, ay, W - 128, ah, 28, BUBBLE_AGENT);
  // Green left edge to mark the agent's message
  cv.fillRect(64, ay + 28, 14, ah - 56, GREEN);
  lines.forEach((ln, i) => cv.drawText(96, ay + 22 + i * lineH, ln, as, INK));
  const who2 = "AGENT-7 - 9:00 AM";
  cv.drawText(96, ay + ah + 16, who2, 3, GREY);

  // --- Footer ----------------------------------------------------------------
  const foot = "MAKE.FUN - MEME SPRINT 3";
  cv.drawText(
    Math.floor((W - cv.textWidth(foot, 3)) / 2),
    H - 44,
    foot,
    3,
    GREY,
  );
  return cv;
}

function main(): void {
  const out = process.env.OUTPUT_PATH ?? "/output/entry.png";
  const cv = drawMeme();
  const png = encodePNG(cv);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes, ${cv.w}x${cv.h})`);
}

main();
