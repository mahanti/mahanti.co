// The SVG is the front face and hit target. WebGL draws only the shallow
// bevel and side walls behind it, from the same outlines and pose.
function createLetterDepth(canvas, svg, paths, getMaterial) {
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, depth: true, powerPreference: 'low-power'
  });
  if (!gl) return null;

  const vertexSource = `
    attribute vec2 point;
    attribute vec2 normal;
    attribute vec2 profile;
    uniform mat3 face;
    uniform vec2 depthAxis;
    uniform vec4 bounds;
    uniform vec3 shape;
    uniform vec4 lighting;
    uniform vec2 lightRotation;
    uniform float amount;
    uniform vec4 viewport;
    varying float light;
    varying float faceLight;
    void main() {
      // A half ellipse joins the front face tangentially and rolls under the back.
      float halfDepth = shape.x * 0.5;
      float arc = profile.x;
      float radius = mix(shape.y, shape.z, profile.y);
      float z = halfDepth * (cos(arc) - 1.0);
      float shoulder = radius * sin(arc) - 0.25;
      vec2 surface = point + amount * (normal * shoulder + depthAxis * z);
      vec2 pos = (face * vec3(surface, 1.0)).xy;
      gl_Position = vec4(pos * viewport.xy + viewport.zw, -z * 0.05, 1.0);
      vec2 slope = normalize(vec2(halfDepth * sin(arc), radius * cos(arc)));
      // Continue the SVG face gradient onto the shoulder at the tangent seam.
      vec2 uv = (point - bounds.xy) / bounds.zw;
      float c = lightRotation.x, s = lightRotation.y;
      uv = mat2(c, -s, s, c) * (uv - 0.5) + 0.5;
      if (depthAxis.x < 0.0) uv.x = 1.0 - uv.x;
      float t = clamp(dot(uv, vec2(1.0, 0.6)) / 1.36, 0.0, 1.0);
      faceLight = amount * (lighting.x * max(0.0, 1.0 - t / 0.48)
                  - lighting.y * max(0.0, (t - 0.48) / 0.52)) * max(slope.y, 0.0);
      float sideLight = dot(normal, mat2(c, s, -s, c) * vec2(-0.55, -0.83));
      light = lighting.z * sideLight * slope.x - lighting.w * (1.0 - slope.y);
    }`;
  const fragmentSource = `
    precision mediump float;
    uniform vec3 pigment;
    varying float light;
    varying float faceLight;
    void main() {
      vec3 faceColor = mix(pigment, vec3(1.0), max(faceLight, 0.0)) * (1.0 + min(faceLight, 0.0));
      vec3 color = mix(faceColor, vec3(1.0), max(light, 0.0));
      gl_FragColor = vec4(color * (1.0 + min(light, 0.0)), 1.0);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  // Constant geometry. Each contour (including the face cutouts) gets a
  // continuous rounded rim, measured in SVG viewBox units.
  const vertices = [];
  const indices = [];
  const arcSegments = 8;
  const slices = new Map();
  for (const path of paths) {
    const first = indices.length;
    const contour = document.createElementNS(svg.namespaceURI, 'path');
    for (const d of path.getAttribute('d').match(/M[^M]+/g)) {
      contour.setAttribute('d', d);
      const length = contour.getTotalLength();
      const count = Math.max(12, Math.ceil(length / 1.25));
      const points = Array.from({ length: count }, (_, i) => contour.getPointAtLength(length * i / count));
      const normals = points.map((_, i) => {
        const a = points[(i + count - 1) % count], b = points[(i + 1) % count];
        const dx = b.x - a.x, dy = b.y - a.y;
        const magnitude = Math.hypot(dx, dy) || 1;
        return [dy / magnitude, -dx / magnitude];
      });
      const winding = points.reduce((area, a, i) => {
        const b = points[(i + 1) % count];
        return area + a.x * b.y - b.x * a.y;
      }, 0);
      // Narrower shoulders preserve the smile and eye openings.
      const inner = winding < 0 ? 1 : 0;
      const start = vertices.length / 6;
      for (let i = 0; i < count; i++) {
        const row = start + i * (arcSegments + 1);
        const next = start + ((i + 1) % count) * (arcSegments + 1);
        for (let j = 0; j <= arcSegments; j++) {
          vertices.push(points[i].x, points[i].y, ...normals[i], j * Math.PI / arcSegments, inner);
          if (j < arcSegments) {
            indices.push(row + j, next + j, row + j + 1, row + j + 1, next + j, next + j + 1);
          }
        }
      }
    }
    slices.set(path, { first, count: indices.length - first, bounds: path.getBBox() });
  }

  let program;
  let uniforms;
  let ready = false;
  function initialize() {
    program = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
      const shader = compile(type, src);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    ready = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!ready) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    ['point', 'normal', 'profile'].forEach((name, i) => {
      const attr = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(attr);
      gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 24, i * 8);
    });
    uniforms = Object.fromEntries(['face', 'depthAxis', 'bounds', 'amount', 'viewport', 'pigment', 'shape', 'lighting', 'lightRotation']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    gl.enable(gl.DEPTH_TEST);
    if ('drawingBufferColorSpace' in gl) gl.drawingBufferColorSpace = 'display-p3';
  }
  initialize();
  const space = gl.drawingBufferColorSpace === 'display-p3' ? 'display-p3' : 'srgb';
  const swatch = document.createElement('canvas');
  swatch.width = swatch.height = 1;
  const paint = swatch.getContext('2d', { colorSpace: space, willReadFrequently: true });
  const colors = new Map();
  function pigment(color) {
    if (!colors.has(color)) {
      paint.fillStyle = color;
      paint.fillRect(0, 0, 1, 1);
      const rgba = paint.getImageData(0, 0, 1, 1, { colorSpace: space }).data;
      colors.set(color, [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255]);
    }
    return colors.get(color);
  }

  const active = new Map();
  let dirty = false;
  function draw() {
    if (!ready || !dirty) return;
    dirty = false;
    canvas.hidden = !active.size;
    if (!active.size) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(3200000 / (rect.width * rect.height)));
    const w = Math.round(rect.width * ratio), h = Math.round(rect.height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const { shape, lighting } = getMaterial();
    gl.uniform3f(uniforms.shape, shape.thickness, shape.outerRadius, shape.cutoutRadius);
    gl.uniform4f(uniforms.lighting, lighting.faceHighlight / 100, lighting.faceShade / 100,
      lighting.rimHighlight / 100, lighting.rimShade / 100);
    const angle = lighting.direction * Math.PI / 180;
    gl.uniform2f(uniforms.lightRotation, Math.cos(angle), Math.sin(angle));
    const view = svg.getScreenCTM();
    gl.uniform4f(uniforms.viewport, 2 * view.a / rect.width, -2 * view.d / rect.height,
      2 * (view.e - rect.left) / rect.width - 1, 1 - 2 * (view.f - rect.top) / rect.height);
    for (const [path, pose] of active) {
      const { m, yaw, pitch, amount, color } = pose;
      const { first, count, bounds } = slices.get(path);
      gl.uniform4f(uniforms.bounds, bounds.x, bounds.y, bounds.width, bounds.height);
      gl.uniformMatrix3fv(uniforms.face, false, [m.a, m.b, 0, m.c, m.d, 0, m.e, m.f, 1]);
      gl.uniform2f(uniforms.depthAxis, Math.tan(yaw), -Math.tan(pitch) / Math.cos(yaw));
      gl.uniform1f(uniforms.amount, amount);
      gl.uniform3fv(uniforms.pigment, pigment(color));
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, first * 2);
    }
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    ready = false;
    canvas.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => { initialize(); dirty = true; draw(); });
  window.addEventListener('resize', () => { dirty = true; draw(); });
  return {
    pose(path, m, yaw, pitch, amount, color) {
      if (amount <= 0.015) {
        if (active.delete(path)) dirty = true;
        return;
      }
      active.set(path, { m, yaw, pitch, amount, color });
      dirty = true;
    },
    draw
  };
}
