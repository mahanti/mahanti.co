const VERT = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG_PENCIL = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_hatch_density;
uniform float u_paper_tone;
uniform float u_ink_strength;
in vec2 v_uv;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 px = 1.0 / u_resolution;
  // Sobel
  float tl = luminance(texture(u_texture, v_uv + vec2(-px.x, px.y)).rgb);
  float t  = luminance(texture(u_texture, v_uv + vec2(0.0, px.y)).rgb);
  float tr = luminance(texture(u_texture, v_uv + vec2(px.x, px.y)).rgb);
  float l  = luminance(texture(u_texture, v_uv + vec2(-px.x, 0.0)).rgb);
  float r  = luminance(texture(u_texture, v_uv + vec2(px.x, 0.0)).rgb);
  float bl = luminance(texture(u_texture, v_uv + vec2(-px.x, -px.y)).rgb);
  float b  = luminance(texture(u_texture, v_uv + vec2(0.0, -px.y)).rgb);
  float br = luminance(texture(u_texture, v_uv + vec2(px.x, -px.y)).rgb);
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);

  float lum = luminance(texture(u_texture, v_uv).rgb);

  // Cross-hatching
  vec2 coord = v_uv * u_resolution;
  float angle1 = 0.7854; // 45 deg
  float angle2 = -0.7854; // -45 deg
  float s1 = sin(angle1), c1 = cos(angle1);
  float s2 = sin(angle2), c2 = cos(angle2);
  float line1 = mod(coord.x * c1 + coord.y * s1, u_hatch_density) < (u_hatch_density * 0.25) ? 1.0 : 0.0;
  float line2 = mod(coord.x * c2 + coord.y * s2, u_hatch_density * 0.667) < (u_hatch_density * 0.2) ? 1.0 : 0.0;

  float hatch = 0.0;
  if (lum < 0.3) hatch = max(line1, line2);
  else if (lum < 0.55) hatch = line1 * 0.7;

  vec3 paper = vec3(u_paper_tone, u_paper_tone - 0.03, u_paper_tone - 0.08);
  float ink = clamp(edge * 2.5 + hatch * 0.6, 0.0, 1.0);
  vec3 pencil = paper * (1.0 - ink * u_ink_strength);

  vec4 orig = texture(u_texture, v_uv);
  fragColor = vec4(mix(orig.rgb, pencil, u_intensity), orig.a);
}
`

const FRAG_NEON = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_bloom_spread;
uniform float u_glow_strength;
uniform float u_color_boost;
in vec2 v_uv;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec4 orig = texture(u_texture, v_uv);
  vec3 dark = orig.rgb * 0.4;
  vec2 px = 1.0 / u_resolution;

  // Star bloom samples
  vec3 bloom = vec3(0.0);
  float total = 0.0;
  for (int i = 1; i <= 13; i++) {
    float fi = float(i);
    float off = fi * u_bloom_spread;
    vec2 dirs[4];
    dirs[0] = vec2(off, 0.0);
    dirs[1] = vec2(0.0, off);
    dirs[2] = vec2(off * 0.707, off * 0.707);
    dirs[3] = vec2(-off * 0.707, off * 0.707);
    float w = 1.0 / fi;
    for (int d = 0; d < 4; d++) {
      vec3 s1 = texture(u_texture, v_uv + dirs[d] * px).rgb;
      vec3 s2 = texture(u_texture, v_uv - dirs[d] * px).rgb;
      float l1 = luminance(s1), l2 = luminance(s2);
      bloom += s1 * step(0.3, l1) * w;
      bloom += s2 * step(0.3, l2) * w;
      total += w * 2.0;
    }
  }
  bloom /= total;

  // Saturation boost on glow
  float bl = luminance(bloom);
  bloom = mix(vec3(bl), bloom, u_color_boost);

  vec3 result = dark + bloom * u_glow_strength;
  fragColor = vec4(mix(orig.rgb, result, u_intensity), orig.a);
}
`

const FRAG_PIXELATE = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_max_block;
uniform float u_color_levels;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  float blockSize = mix(1.0, u_max_block, u_intensity * u_intensity);
  vec2 blocks = floor(u_resolution / max(blockSize, 1.0));
  blocks = max(blocks, vec2(1.0));

  // Snap UV to pixel grid center — sample exactly at block center to avoid filtering blur
  vec2 blockCoord = floor(v_uv * blocks);
  vec2 snapped = (blockCoord + 0.5) / blocks;
  vec4 color = texture(u_texture, snapped);

  // Quantize colors at higher intensities for a crisper retro look
  float levels = mix(256.0, u_color_levels, u_intensity);
  color.rgb = floor(color.rgb * levels + 0.5) / levels;

  // Hard pixel grid lines — 1px gap between blocks
  vec2 blockUV = fract(v_uv * blocks);
  float gridThickness = 1.0 / blockSize;
  float grid = step(gridThickness, blockUV.x) * step(gridThickness, blockUV.y);
  color.rgb *= mix(1.0, grid, u_intensity * 0.5);

  vec4 orig = texture(u_texture, v_uv);
  float blend = min(u_intensity * 1.5, 1.0);
  fragColor = vec4(mix(orig.rgb, color.rgb, blend), orig.a);
}
`

const FRAG_CRT = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_barrel;
uniform float u_aberration;
uniform float u_scanline_weight;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  // Barrel distortion
  vec2 centered = v_uv * 2.0 - 1.0;
  float dist2 = dot(centered, centered);
  vec2 distorted = centered * (1.0 + dist2 * u_barrel * u_intensity);
  vec2 uv = distorted * 0.5 + 0.5;

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Chromatic aberration
  float aberr = u_aberration * u_intensity;
  float cr = texture(u_texture, uv + vec2(aberr, 0.0)).r;
  float cg = texture(u_texture, uv).g;
  float cb = texture(u_texture, uv - vec2(aberr, 0.0)).b;
  vec3 color = vec3(cr, cg, cb);

  // Scanlines
  float scanline = 1.0 - u_scanline_weight * u_intensity * pow(sin(uv.y * u_resolution.y * 3.14159 * 0.5), 2.0);
  color *= scanline;

  // Vignette
  float vig = 1.0 - dist2 * 0.5 * u_intensity;
  color *= vig;

  vec4 orig = texture(u_texture, v_uv);
  fragColor = vec4(mix(orig.rgb, color, u_intensity), orig.a);
}
`

const FRAG_HALFTONE = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_dot_scale;
uniform float u_paper_brightness;
in vec2 v_uv;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec2 rotateUV(vec2 p, float angle) {
  float s = sin(angle), c = cos(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float halftoneLayer(vec2 coord, float angle, float size, float value) {
  vec2 rotated = rotateUV(coord, angle);
  vec2 cell = floor(rotated / size) * size + size * 0.5;
  float dist = length(rotated - cell);
  float radius = size * 0.5 * sqrt(1.0 - value);
  return smoothstep(radius - 0.5, radius + 0.5, dist);
}

void main() {
  vec4 orig = texture(u_texture, v_uv);
  vec3 rgb = orig.rgb;
  vec2 coord = v_uv * u_resolution;

  float dotSize = mix(3.0, 12.0, u_intensity) * u_dot_scale;

  // CMYK angles
  float c_val = 1.0 - rgb.r;
  float m_val = 1.0 - rgb.g;
  float y_val = 1.0 - rgb.b;
  float k_val = 1.0 - luminance(rgb);

  float c_dot = halftoneLayer(coord, 0.2618, dotSize, c_val);  // 15 deg
  float m_dot = halftoneLayer(coord, 1.3090, dotSize, m_val);  // 75 deg
  float y_dot = halftoneLayer(coord, 0.0, dotSize, y_val);     // 0 deg
  float k_dot = halftoneLayer(coord, 0.7854, dotSize, k_val);  // 45 deg

  vec3 bg = vec3(u_paper_brightness);
  vec3 halftone = bg;
  halftone *= mix(vec3(0.0, 1.0, 1.0), vec3(1.0), c_dot);
  halftone *= mix(vec3(1.0, 0.0, 1.0), vec3(1.0), m_dot);
  halftone *= mix(vec3(1.0, 1.0, 0.0), vec3(1.0), y_dot);
  halftone *= mix(vec3(0.0), vec3(1.0), k_dot);

  fragColor = vec4(mix(orig.rgb, halftone, u_intensity), orig.a);
}
`

const FRAG_ASCII = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_cell_scale;
uniform float u_glow;
in vec2 v_uv;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Encode 8x12 bitmap glyphs for the ASCII ramp: " .:-=+*#%@"
// Each glyph is stored as 3 floats (96 bits = 8x12 pixels).
// Bit layout: each float holds 32 bits = rows of 8px, bottom-up.
// float0 = rows 0-3, float1 = rows 4-7, float2 = rows 8-11

// Returns 1.0 if pixel (x,y) is "on" in glyph index idx (0-9)
float glyphPixel(int idx, int x, int y) {
  // Hard-coded compact bitmaps for 10 chars in the ramp
  // ' ' . : - = + * # % @
  if (idx == 0) return 0.0; // space

  // '.'
  if (idx == 1) {
    if (y >= 1 && y <= 2 && x >= 3 && x <= 4) return 1.0;
    return 0.0;
  }
  // ':'
  if (idx == 2) {
    if ((y == 3 || y == 4) && x >= 3 && x <= 4) return 1.0;
    if ((y == 7 || y == 8) && x >= 3 && x <= 4) return 1.0;
    return 0.0;
  }
  // '-'
  if (idx == 3) {
    if (y == 5 && x >= 2 && x <= 5) return 1.0;
    return 0.0;
  }
  // '='
  if (idx == 4) {
    if ((y == 4 || y == 6) && x >= 2 && x <= 5) return 1.0;
    return 0.0;
  }
  // '+'
  if (idx == 5) {
    if (y == 5 && x >= 2 && x <= 5) return 1.0;
    if (x == 3 && y >= 3 && y <= 7) return 1.0;
    if (x == 4 && y >= 3 && y <= 7) return 1.0;
    return 0.0;
  }
  // '*'
  if (idx == 6) {
    if (y == 6 && x >= 1 && x <= 6) return 1.0;
    if ((y == 5 || y == 7) && x >= 2 && x <= 5) return 1.0;
    if ((y == 4 || y == 8) && (x == 2 || x == 5)) return 1.0;
    if (x == 3 || x == 4) { if (y >= 4 && y <= 8) return 1.0; }
    return 0.0;
  }
  // '#'
  if (idx == 7) {
    if ((x == 2 || x == 5) && y >= 2 && y <= 9) return 1.0;
    if ((y == 4 || y == 7) && x >= 1 && x <= 6) return 1.0;
    return 0.0;
  }
  // '%'
  if (idx == 8) {
    // top-left dot
    if ((y == 8 || y == 9) && (x == 1 || x == 2)) return 1.0;
    // bottom-right dot
    if ((y == 2 || y == 3) && (x == 5 || x == 6)) return 1.0;
    // diagonal
    if (y == 7 && x == 3) return 1.0;
    if (y == 6 && x == 3) return 1.0;
    if (y == 5 && (x == 3 || x == 4)) return 1.0;
    if (y == 4 && x == 4) return 1.0;
    if (y == 3 && x == 5) return 1.0;
    if (y == 8 && x == 2) return 1.0;
    if (y == 2 && x == 5) return 1.0;
    return 0.0;
  }
  // '@'
  if (idx == 9) {
    if (y == 2 && x >= 2 && x <= 5) return 1.0;
    if (y == 3 && (x == 1 || x == 6)) return 1.0;
    if ((y == 9 || y == 10) && x >= 2 && x <= 5) return 1.0;
    if ((y == 8) && (x == 1 || x == 6)) return 1.0;
    if (y >= 4 && y <= 7 && x == 1) return 1.0;
    if (y >= 3 && y <= 8 && x == 6) return 1.0;
    if (y >= 5 && y <= 7 && x == 5) return 1.0;
    if (y == 5 && x >= 3 && x <= 5) return 1.0;
    if (y >= 5 && y <= 7 && x == 3) return 1.0;
    if (y == 7 && x >= 3 && x <= 5) return 1.0;
    return 0.0;
  }
  return 0.0;
}

void main() {
  vec4 orig = texture(u_texture, v_uv);

  // Cell size scales with intensity: 6px at low, 16px at high
  float cellW = floor(mix(6.0, 16.0, u_intensity) * u_cell_scale);
  float cellH = cellW * 1.5; // taller cells for char aspect ratio

  // Which cell are we in?
  vec2 pixel = v_uv * u_resolution;
  vec2 cell = floor(pixel / vec2(cellW, cellH));
  vec2 cellUV = (cell + 0.5) * vec2(cellW, cellH) / u_resolution;

  // Average luminance of the cell (sample center)
  vec3 cellColor = texture(u_texture, cellUV).rgb;
  float lum = luminance(cellColor);

  // Map luminance to glyph index (0=dark/space, 9=bright/@)
  int idx = int(clamp(lum * 10.0, 0.0, 9.0));

  // Position within the cell, mapped to 8x12 glyph grid
  vec2 inCell = pixel - cell * vec2(cellW, cellH);
  int gx = int(inCell.x * 8.0 / cellW);
  int gy = int(inCell.y * 12.0 / cellH);

  float on = glyphPixel(idx, gx, gy);

  // Terminal style: green on black, or use original color tinted
  vec3 charColor = cellColor * 1.2 + u_glow;
  vec3 bgColor = vec3(0.02);
  vec3 ascii = mix(bgColor, charColor, on);

  fragColor = vec4(mix(orig.rgb, ascii, u_intensity), orig.a);
}
`

const FRAG_MATRIX = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;
uniform float u_rain_speed;
uniform float u_trail_scale;
uniform float u_scan_weight;
in vec2 v_uv;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

// 5x7 katakana-inspired bitmap glyphs (16 glyphs, index 0-15)
float matrixGlyph(int idx, int x, int y) {
  if (idx == 0) { // ア
    if (y == 6 && x >= 1 && x <= 3) return 1.0;
    if (y == 5 && x == 3) return 1.0;
    if (y == 4 && x >= 0 && x <= 4) return 1.0;
    if ((y == 3 || y == 2) && x == 2) return 1.0;
    if (y == 1 && x == 1) return 1.0;
    return 0.0;
  }
  if (idx == 1) { // カ
    if (y == 6 && x == 2) return 1.0;
    if (y >= 2 && y <= 5 && x == 3) return 1.0;
    if (y == 5 && x >= 0 && x <= 4) return 1.0;
    if ((y == 4 || y == 3) && x == 1) return 1.0;
    if (y == 1 && (x == 0 || x == 4)) return 1.0;
    return 0.0;
  }
  if (idx == 2) { // タ
    if (y == 6 && x >= 1 && x <= 3) return 1.0;
    if (y == 5 && (x == 0 || x == 4)) return 1.0;
    if (y == 4 && x >= 0 && x <= 4) return 1.0;
    if (y == 3 && x == 2) return 1.0;
    if (y == 2 && (x == 1 || x == 3)) return 1.0;
    if (y == 1 && x == 2) return 1.0;
    return 0.0;
  }
  if (idx == 3) { // ナ
    if ((y == 6 || y == 5) && x == 2) return 1.0;
    if (y == 4 && x >= 0 && x <= 4) return 1.0;
    if (y == 3 && x == 2) return 1.0;
    if (y == 2 && x == 3) return 1.0;
    if (y == 1 && x == 4) return 1.0;
    return 0.0;
  }
  if (idx == 4) { // ハ
    if ((y == 1 || y == 2) && (x == 0 || x == 4)) return 1.0;
    if ((y == 3 || y == 4) && (x == 1 || x == 3)) return 1.0;
    if (y == 5 && x == 2) return 1.0;
    return 0.0;
  }
  if (idx == 5) { // コ
    if ((y == 6 || y == 1) && x >= 0 && x <= 4) return 1.0;
    if (y >= 2 && y <= 5 && x == 4) return 1.0;
    return 0.0;
  }
  if (idx == 6) { // ニ
    if (y == 5 && x >= 0 && x <= 4) return 1.0;
    if (y == 2 && x >= 1 && x <= 3) return 1.0;
    return 0.0;
  }
  if (idx == 7) { // ミ
    if (y == 6 && x >= 1 && x <= 4) return 1.0;
    if (y == 4 && x >= 0 && x <= 3) return 1.0;
    if (y == 2 && x >= 1 && x <= 4) return 1.0;
    return 0.0;
  }
  if (idx == 8) { // ヨ
    if ((y == 1 || y == 4 || y == 6) && x >= 0 && x <= 3) return 1.0;
    if (y >= 1 && y <= 6 && x == 4) return 1.0;
    return 0.0;
  }
  if (idx == 9) { // リ
    if (y >= 2 && y <= 6 && x == 1) return 1.0;
    if (y >= 3 && y <= 6 && x == 3) return 1.0;
    if (y == 2 && x == 3) return 1.0;
    if (y == 1 && x == 4) return 1.0;
    return 0.0;
  }
  if (idx == 10) { // ワ
    if (y == 6 && x >= 0 && x <= 4) return 1.0;
    if (y >= 2 && y <= 5 && (x == 0 || x == 4)) return 1.0;
    if (y == 1 && x == 2) return 1.0;
    return 0.0;
  }
  if (idx == 11) { // シ
    if (y == 5 && x == 1) return 1.0;
    if (y == 4 && x == 1) return 1.0;
    if (y == 2 && x == 0) return 1.0;
    if (y == 5 && x == 3) return 1.0;
    if (y == 3 && x == 4) return 1.0;
    if (y == 1 && x == 4) return 1.0;
    return 0.0;
  }
  if (idx == 12) { // 0
    if ((y == 1 || y == 6) && x >= 1 && x <= 3) return 1.0;
    if (y >= 2 && y <= 5 && (x == 0 || x == 4)) return 1.0;
    return 0.0;
  }
  if (idx == 13) { // 1
    if (y == 1 && x >= 1 && x <= 3) return 1.0;
    if (y >= 2 && y <= 6 && x == 2) return 1.0;
    if (y == 5 && x == 1) return 1.0;
    return 0.0;
  }
  if (idx == 14) { // 7
    if (y == 6 && x >= 0 && x <= 4) return 1.0;
    if (y == 5 && x == 4) return 1.0;
    if (y == 4 && x == 3) return 1.0;
    if (y == 3 && x == 2) return 1.0;
    if (y <= 2 && x == 2) return 1.0;
    return 0.0;
  }
  if (idx == 15) { // ウ
    if (y == 6 && x >= 1 && x <= 3) return 1.0;
    if (y == 5 && (x == 0 || x == 4)) return 1.0;
    if (y == 4 && x >= 0 && x <= 4) return 1.0;
    if (y == 3 && x == 2) return 1.0;
    if (y == 2 && x == 2) return 1.0;
    return 0.0;
  }
  return 0.0;
}

void main() {
  vec4 orig = texture(u_texture, v_uv);

  // ── Cell grid (same as ASCII shader) ──
  float cellW = floor(mix(6.0, 14.0, u_intensity));
  float cellH = cellW * 1.4;
  vec2 pixel = v_uv * u_resolution;
  vec2 cell = floor(pixel / vec2(cellW, cellH));
  float numRows = ceil(u_resolution.y / cellH);

  // Sample source image for this cell
  vec2 cellUV = (cell + 0.5) * vec2(cellW, cellH) / u_resolution;
  vec3 cellColor = texture(u_texture, cellUV).rgb;
  float lum = luminance(cellColor);

  // ── Rain cascade ──
  float colSeed = hash(cell.x * 13.37);
  float speed = (2.0 + colSeed * 3.5) * u_rain_speed;
  float trailLen = mix(10.0, 30.0, hash(cell.x * 7.13)) * u_trail_scale;

  float rawHead = u_time * speed + colSeed * numRows;
  float cycle = numRows + trailLen;
  float stream0 = mod(rawHead, cycle);
  float stream1 = mod(rawHead + cycle * 0.45 + hash(cell.x * 3.71) * numRows, cycle);

  // Row 0 = top of screen
  float row = numRows - 1.0 - cell.y;

  float dist0 = stream0 - row;
  float dist1 = stream1 - row;

  // Best (closest to head) stream affecting this cell
  float dist = 999.0;
  if (dist0 > 0.0 && dist0 < trailLen) dist = min(dist, dist0);
  if (dist1 > 0.0 && dist1 < trailLen) dist = min(dist, dist1);

  // Rain brightness: 1.0 at head, fades down
  float rain = 0.0;
  if (dist < trailLen) {
    float fade = 1.0 - dist / trailLen;
    rain = fade * fade;
  }
  bool isHead = dist < 1.5;

  // ── Glyph selection ──
  // Base glyph from source luminance (like ASCII shader: brighter = denser glyph)
  float glyphSeed = hash2(vec2(cell.x, cell.y));
  int baseIdx = int(clamp(lum * 16.0, 0.0, 15.0));

  // Near the rain head: rapidly cycling random glyph
  // In the trail: slowly shifting glyph (still katakana, adds life)
  // Outside rain: stable glyph based on source image luminance
  int glyphIdx;
  if (isHead) {
    glyphIdx = int(mod(floor(u_time * 12.0 + glyphSeed * 100.0), 16.0));
  } else if (rain > 0.05) {
    glyphIdx = int(mod(floor(u_time * 1.5 + glyphSeed * 50.0 + cell.y * 3.0), 16.0));
  } else {
    glyphIdx = baseIdx;
  }

  // ── Render glyph ──
  vec2 inCell = pixel - cell * vec2(cellW, cellH);
  int gx = int(inCell.x * 5.0 / cellW);
  int gy = int(inCell.y * 7.0 / cellH);
  float on = matrixGlyph(glyphIdx, gx, gy);

  // ── Coloring ──
  // Base ASCII layer: image rendered as green characters on black
  float baseBright = lum * 0.6 + 0.05;
  vec3 baseColor = vec3(0.0, baseBright * 0.9, 0.0);

  // Rain layer: bright head, green trail
  vec3 headColor = vec3(0.75, 1.0, 0.85);
  vec3 trailColor = vec3(0.0, 0.55 + rain * 0.45, 0.1);

  // Combine: rain overwrites base brightness where active
  float totalBright = max(baseBright, rain);
  vec3 charColor;
  if (isHead) {
    charColor = headColor;
  } else if (rain > 0.05) {
    charColor = mix(baseColor, trailColor, rain);
  } else {
    charColor = baseColor;
  }

  vec3 bgColor = vec3(0.0, 0.015, 0.0);
  vec3 result = mix(bgColor, charColor, on * totalBright);

  // Subtle scanline for extra texture
  float scanline = 1.0 - u_scan_weight * pow(sin(pixel.y * 3.14159 * 0.5), 2.0);
  result *= scanline;

  fragColor = vec4(mix(orig.rgb, result, u_intensity), orig.a);
}
`

const SHADERS = {
  pencil: FRAG_PENCIL,
  neon: FRAG_NEON,
  pixelate: FRAG_PIXELATE,
  crt: FRAG_CRT,
  halftone: FRAG_HALFTONE,
  ascii: FRAG_ASCII,
  matrix: FRAG_MATRIX,
}

// Standard uniforms that every shader has (not exposed as custom params)
const STANDARD_UNIFORMS = new Set(['u_texture', 'u_resolution', 'u_intensity', 'u_time'])

// Metadata for each built-in shader's custom uniforms
export const SHADER_META = {
  pencil: {
    u_hatch_density: { label: 'hatch density', min: 2, max: 14, step: 0.5, default: 6 },
    u_paper_tone:    { label: 'paper tone',    min: 0.5, max: 1, step: 0.01, default: 0.95 },
    u_ink_strength:  { label: 'ink strength',   min: 0.1, max: 1.5, step: 0.01, default: 0.85 },
  },
  neon: {
    u_bloom_spread:  { label: 'bloom spread',   min: 0.5, max: 6, step: 0.1, default: 2.5 },
    u_glow_strength: { label: 'glow strength',  min: 0.5, max: 5, step: 0.1, default: 2 },
    u_color_boost:   { label: 'color boost',    min: 0.5, max: 3, step: 0.1, default: 1.5 },
  },
  pixelate: {
    u_max_block:     { label: 'block size',     min: 4, max: 128, step: 1, default: 64 },
    u_color_levels:  { label: 'color levels',   min: 2, max: 256, step: 1, default: 16 },
  },
  crt: {
    u_barrel:           { label: 'distortion',    min: 0, max: 0.5, step: 0.01, default: 0.15 },
    u_aberration:       { label: 'aberration',     min: 0, max: 0.015, step: 0.001, default: 0.003 },
    u_scanline_weight:  { label: 'scanlines',      min: 0, max: 1, step: 0.01, default: 0.3 },
  },
  halftone: {
    u_dot_scale:        { label: 'dot scale',      min: 0.3, max: 3, step: 0.05, default: 1 },
    u_paper_brightness: { label: 'paper',           min: 0.5, max: 1, step: 0.01, default: 0.95 },
  },
  ascii: {
    u_cell_scale: { label: 'cell scale', min: 0.4, max: 3, step: 0.05, default: 1 },
    u_glow:       { label: 'glow',       min: 0, max: 0.5, step: 0.01, default: 0.1 },
  },
  matrix: {
    u_rain_speed:  { label: 'rain speed',  min: 0.2, max: 4, step: 0.1, default: 1 },
    u_trail_scale: { label: 'trail length', min: 0.3, max: 3, step: 0.1, default: 1 },
    u_scan_weight: { label: 'scanlines',    min: 0, max: 0.3, step: 0.01, default: 0.08 },
  },
}

// Extract custom uniform names from GLSL source (excluding standard ones)
function extractCustomUniforms(fragSrc) {
  const uniforms = []
  const re = /uniform\s+float\s+(u_\w+)\s*;/g
  let m
  while ((m = re.exec(fragSrc)) !== null) {
    if (!STANDARD_UNIFORMS.has(m[1])) uniforms.push(m[1])
  }
  return uniforms
}

export class ShaderPostProcessor {
  constructor(glCanvas) {
    this.canvas = glCanvas
    this.gl = glCanvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })
    if (!this.gl) throw new Error('WebGL2 not supported')

    this.programs = {}
    this.currentEffects = []
    this.intensities = {}
    this.customParams = {}
    this.startTime = performance.now()
    this.dpr = window.devicePixelRatio || 1

    this._initQuad()
    this._initTexture()
    this._initFBOs()
    this._compileAll()

    if (glCanvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this._resize())
      this._resizeObserver.observe(glCanvas.parentElement)
      this._resize()
    } else {
      // Offscreen canvas — use its existing width/height directly
      this._resizeObserver = null
      this.gl.viewport(0, 0, glCanvas.width, glCanvas.height)
      const gl = this.gl
      for (const fbo of this.fbos) {
        gl.bindTexture(gl.TEXTURE_2D, fbo.tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, glCanvas.width, glCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      }
      gl.bindTexture(gl.TEXTURE_2D, null)
    }
  }

  _initQuad() {
    const gl = this.gl
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    this.quadBuf = buf
  }

  _initTexture() {
    const gl = this.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  _createFBO() {
    const gl = this.gl
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { fb, tex }
  }

  _initFBOs() {
    this.fbos = [this._createFBO(), this._createFBO()]
  }

  _compile(fragSrc) {
    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, VERT)
    gl.compileShader(vs)

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragSrc)
    gl.compileShader(fs)

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'a_position')
    gl.linkProgram(prog)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog)
      console.error('Shader link error:', err)
      console.error('VS:', gl.getShaderInfoLog(vs))
      console.error('FS:', gl.getShaderInfoLog(fs))
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteProgram(prog)
      return null
    }

    gl.deleteShader(vs)
    gl.deleteShader(fs)

    // Detect custom uniforms
    const customUniforms = extractCustomUniforms(fragSrc)
    const customLocs = {}
    for (const name of customUniforms) {
      customLocs[name] = gl.getUniformLocation(prog, name)
    }

    return {
      program: prog,
      u_texture: gl.getUniformLocation(prog, 'u_texture'),
      u_resolution: gl.getUniformLocation(prog, 'u_resolution'),
      u_intensity: gl.getUniformLocation(prog, 'u_intensity'),
      u_time: gl.getUniformLocation(prog, 'u_time'),
      customLocs,
    }
  }

  _compileAll() {
    for (const [name, src] of Object.entries(SHADERS)) {
      this.programs[name] = this._compile(src)
    }
  }

  // Compile and register a custom shader at runtime
  addShader(name, fragSrc) {
    // Remove existing if present
    if (this.programs[name]) {
      this.gl.deleteProgram(this.programs[name].program)
    }
    const compiled = this._compile(fragSrc)
    if (compiled) {
      this.programs[name] = compiled
      return true
    }
    return false
  }

  removeShader(name) {
    if (this.programs[name] && !SHADERS[name]) {
      this.gl.deleteProgram(this.programs[name].program)
      delete this.programs[name]
    }
  }

  _resize() {
    const parent = this.canvas.parentElement
    const w = parent.clientWidth
    const h = parent.clientHeight
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

    const gl = this.gl
    for (const fbo of this.fbos) {
      gl.bindTexture(gl.TEXTURE_2D, fbo.tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  setEffects(effects, intensities, customParams) {
    this.currentEffects = effects.filter(n => this.programs[n])
    this.intensities = intensities || {}
    this.customParams = customParams || {}
    if (this.canvas.style) {
      this.canvas.style.display = this.currentEffects.length > 0 ? 'block' : 'none'
    }
  }

  _setCustomUniforms(gl, info, shaderName) {
    const params = this.customParams[shaderName] || {}
    const meta = SHADER_META[shaderName] || {}
    for (const [uName, loc] of Object.entries(info.customLocs)) {
      if (loc === null) continue
      const val = params[uName] ?? meta[uName]?.default ?? 0
      gl.uniform1f(loc, val)
    }
  }

  render(sourceCanvas) {
    if (this.currentEffects.length === 0) return

    const gl = this.gl
    const time = (performance.now() - this.startTime) / 1000

    // Upload source canvas to input texture
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas)

    gl.bindVertexArray(this.vao)

    const effects = this.currentEffects
    if (effects.length === 0) { gl.bindVertexArray(null); return }

    // Single effect: render directly to screen (no FBO needed)
    if (effects.length === 1) {
      const name = effects[0]
      const info = this.programs[name]
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.useProgram(info.program)
      gl.uniform1i(info.u_texture, 0)
      gl.uniform2f(info.u_resolution, this.canvas.width, this.canvas.height)
      gl.uniform1f(info.u_intensity, this.intensities[name] ?? 0.5)
      gl.uniform1f(info.u_time, time)
      this._setCustomUniforms(gl, info, name)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindVertexArray(null)
      return
    }

    // Multi-effect: ping-pong through FBOs
    let readTex = this.texture
    for (let i = 0; i < effects.length; i++) {
      const name = effects[i]
      const info = this.programs[name]
      const isLast = i === effects.length - 1

      if (isLast) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i % 2].fb)
      }

      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, readTex)
      gl.useProgram(info.program)
      gl.uniform1i(info.u_texture, 0)
      gl.uniform2f(info.u_resolution, this.canvas.width, this.canvas.height)
      gl.uniform1f(info.u_intensity, this.intensities[name] ?? 0.5)
      gl.uniform1f(info.u_time, time)
      this._setCustomUniforms(gl, info, name)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      if (!isLast) {
        readTex = this.fbos[i % 2].tex
      }
    }

    gl.bindVertexArray(null)
  }

  destroy() {
    this._resizeObserver?.disconnect()
    const gl = this.gl
    for (const info of Object.values(this.programs)) {
      gl.deleteProgram(info.program)
    }
    gl.deleteTexture(this.texture)
    for (const fbo of this.fbos) {
      gl.deleteTexture(fbo.tex)
      gl.deleteFramebuffer(fbo.fb)
    }
    gl.deleteBuffer(this.quadBuf)
    gl.deleteVertexArray(this.vao)
  }
}
