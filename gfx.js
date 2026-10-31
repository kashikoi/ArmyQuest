// gfx.js — Strict-palette pixel drawing helpers (classic script, window.AQ.gfx).
// Everything here draws on whole pixels with no anti-aliasing so the scene stays
// inside the 16-color EGA palette. Shading is done the Sierra way: dithering.

(function () {
  const AQ = (window.AQ = window.AQ || {});

  // 16-color EGA palette (shared by the engine, sprites, and rooms).
  const EGA = {
    black:       '#000000', blue:        '#0000AA', green:       '#00AA00',
    cyan:        '#00AAAA', red:         '#AA0000', magenta:     '#AA00AA',
    brown:       '#AA5500', lightgray:   '#AAAAAA', darkgray:    '#555555',
    brightblue:  '#5555FF', brightgreen: '#55FF55', brightcyan:  '#55FFFF',
    brightred:   '#FF5555', brightmagenta:'#FF55FF', yellow:     '#FFFF55',
    white:       '#FFFFFF',
  };

  // Dither masks (4x4 tiles, '#' = second color, '.' = base color).
  const MASKS = {
    checker:   ['#.#.', '.#.#', '#.#.', '.#.#'],  // 50%
    sparse:    ['#...', '..#.', '#...', '..#.'],  // 25%
    rare:      ['#...', '....', '..#.', '....'],  // 12.5%
    hstripe:   ['####', '....', '####', '....'],
    wallpaper: ['........', '..#.....', '........', '........', '........', '......#.', '........', '........'],
  };

  const patCache = new Map();

  // Returns a repeating pattern of colors a/b. Pass a = null for a transparent base.
  function dither(ctx, a, b, kind = 'checker') {
    const key = `${a}|${b}|${kind}`;
    let pat = patCache.get(key);
    if (pat) return pat;
    const mask = MASKS[kind];
    const size = mask.length;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (a) { g.fillStyle = a; g.fillRect(0, 0, size, size); }
    g.fillStyle = b;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (mask[y][x] === '#') g.fillRect(x, y, 1, 1);
    }
    pat = ctx.createPattern(c, 'repeat');
    patCache.set(key, pat);
    return pat;
  }

  function rect(ctx, x, y, w, h, style) {
    ctx.fillStyle = style;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // Rectangle with a 1px outline.
  function box(ctx, x, y, w, h, fill, outline) {
    rect(ctx, x, y, w, h, outline);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  }

  // Scanline polygon fill (even-odd) - crisp edges, no anti-aliasing.
  function poly(ctx, pts, style) {
    ctx.fillStyle = style;
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) {
          xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
      }
    }
  }

  // Bresenham line, 1px.
  function line(ctx, x0, y0, x1, y1, color) {
    ctx.fillStyle = color;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Draws a string-art bitmap. map: char -> color (missing/'.' = transparent).
  function bitmap(ctx, rows, x, y, map, mirror = false) {
    const w = rows[0].length;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const col = map[row[c]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + (mirror ? w - 1 - c : c), y + r, 1, 1);
      }
    }
  }

  // Tiny 3x5 pixel font (only the glyphs the scenery needs).
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    ' ': ['..', '..', '..', '..', '..'],
  };

  function textWidth(str) {
    let w = 0;
    for (const ch of str) w += (FONT[ch] || FONT[' '])[0].length + 1;
    return Math.max(0, w - 1);
  }

  function pixelText(ctx, str, x, y, color) {
    let cx = x;
    for (const ch of str) {
      const g = FONT[ch] || FONT[' '];
      bitmap(ctx, g, cx, y, { '#': color });
      cx += g[0].length + 1;
    }
  }

  AQ.EGA = EGA;
  AQ.gfx = { dither, rect, box, poly, line, bitmap, pixelText, textWidth };
})();
