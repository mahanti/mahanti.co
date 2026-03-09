/**
 * SVG Path Parser
 * Parses path `d` strings into normalized absolute commands.
 * Also extracts shape elements from SVG DOM.
 */

// ── Tokenizer ──
const CMD_RE = /[MmLlHhVvCcSsQqTtAaZz]/
const NUM_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g

function tokenize(d) {
  const tokens = []
  let i = 0
  while (i < d.length) {
    const ch = d[i]
    if (ch.match(CMD_RE)) {
      tokens.push({ cmd: ch })
      i++
    } else if (ch === ',' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
    } else {
      // Try to parse a number
      const sub = d.slice(i)
      const m = sub.match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)
      if (m) {
        tokens.push({ num: parseFloat(m[0]) })
        i += m[0].length
      } else {
        i++ // skip unknown char
      }
    }
  }
  return tokens
}

// Number of coordinate values each command expects
const PARAM_COUNT = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
}

/**
 * Parse a path `d` string into an array of absolute commands.
 * Each command: { type: 'M'|'L'|'C'|'Q'|'Z', ...coords }
 */
export function parsePath(d) {
  if (!d) return []

  const tokens = tokenize(d)
  const cmds = []
  let curX = 0, curY = 0
  let startX = 0, startY = 0
  let lastCp = null // last control point for S/T
  let lastCmd = ''

  let ti = 0

  function nextNum() {
    while (ti < tokens.length && tokens[ti].cmd !== undefined) ti++
    if (ti < tokens.length) return tokens[ti++].num
    return 0
  }

  while (ti < tokens.length) {
    let cmd
    if (tokens[ti].cmd !== undefined) {
      cmd = tokens[ti].cmd
      ti++
    } else {
      // Implicit repeat of last command
      cmd = lastCmd
      if (cmd === 'M') cmd = 'L'
      if (cmd === 'm') cmd = 'l'
    }

    const upper = cmd.toUpperCase()
    const rel = cmd !== upper
    const paramCount = PARAM_COUNT[upper]

    if (paramCount === undefined) continue

    if (upper === 'Z') {
      cmds.push({ type: 'Z' })
      curX = startX
      curY = startY
      lastCmd = cmd
      lastCp = null
      continue
    }

    // Consume parameters (may repeat for implicit commands)
    const processOnce = () => {
      const ox = rel ? curX : 0
      const oy = rel ? curY : 0

      switch (upper) {
        case 'M': {
          const x = nextNum() + ox
          const y = nextNum() + oy
          cmds.push({ type: 'M', x, y })
          curX = x; curY = y
          startX = x; startY = y
          lastCp = null
          break
        }
        case 'L': {
          const x = nextNum() + ox
          const y = nextNum() + oy
          cmds.push({ type: 'L', x, y })
          curX = x; curY = y
          lastCp = null
          break
        }
        case 'H': {
          const x = nextNum() + (rel ? curX : 0)
          cmds.push({ type: 'L', x, y: curY })
          curX = x
          lastCp = null
          break
        }
        case 'V': {
          const y = nextNum() + (rel ? curY : 0)
          cmds.push({ type: 'L', x: curX, y })
          curY = y
          lastCp = null
          break
        }
        case 'C': {
          const x1 = nextNum() + ox, y1 = nextNum() + oy
          const x2 = nextNum() + ox, y2 = nextNum() + oy
          const x = nextNum() + ox, y = nextNum() + oy
          cmds.push({ type: 'C', x1, y1, x2, y2, x, y })
          lastCp = { x: x2, y: y2 }
          curX = x; curY = y
          break
        }
        case 'S': {
          // Smooth cubic: reflect last cp2
          const x1 = lastCp ? 2 * curX - lastCp.x : curX
          const y1 = lastCp ? 2 * curY - lastCp.y : curY
          const x2 = nextNum() + ox, y2 = nextNum() + oy
          const x = nextNum() + ox, y = nextNum() + oy
          cmds.push({ type: 'C', x1, y1, x2, y2, x, y })
          lastCp = { x: x2, y: y2 }
          curX = x; curY = y
          break
        }
        case 'Q': {
          const x1 = nextNum() + ox, y1 = nextNum() + oy
          const x = nextNum() + ox, y = nextNum() + oy
          // Convert quadratic to cubic
          const cp1x = curX + (2 / 3) * (x1 - curX)
          const cp1y = curY + (2 / 3) * (y1 - curY)
          const cp2x = x + (2 / 3) * (x1 - x)
          const cp2y = y + (2 / 3) * (y1 - y)
          cmds.push({ type: 'C', x1: cp1x, y1: cp1y, x2: cp2x, y2: cp2y, x, y, qx1: x1, qy1: y1 })
          lastCp = { x: x1, y: y1 }
          curX = x; curY = y
          break
        }
        case 'T': {
          const x1 = lastCp ? 2 * curX - lastCp.x : curX
          const y1 = lastCp ? 2 * curY - lastCp.y : curY
          const x = nextNum() + ox, y = nextNum() + oy
          const cp1x = curX + (2 / 3) * (x1 - curX)
          const cp1y = curY + (2 / 3) * (y1 - curY)
          const cp2x = x + (2 / 3) * (x1 - x)
          const cp2y = y + (2 / 3) * (y1 - y)
          cmds.push({ type: 'C', x1: cp1x, y1: cp1y, x2: cp2x, y2: cp2y, x, y, qx1: x1, qy1: y1 })
          lastCp = { x: x1, y: y1 }
          curX = x; curY = y
          break
        }
        case 'A': {
          const rx = nextNum(), ry = nextNum()
          const rotation = nextNum()
          const largeArc = nextNum()
          const sweep = nextNum()
          const x = nextNum() + ox, y = nextNum() + oy
          // Convert arc to cubic beziers
          const cubics = arcToCubics(curX, curY, rx, ry, rotation, largeArc, sweep, x, y)
          for (const c of cubics) {
            cmds.push({ type: 'C', x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, x: c.x, y: c.y })
          }
          curX = x; curY = y
          lastCp = cubics.length > 0 ? { x: cubics[cubics.length - 1].x2, y: cubics[cubics.length - 1].y2 } : null
          break
        }
      }
    }

    processOnce()
    lastCmd = cmd

    // Check for implicit repeated parameters
    if (upper !== 'Z' && upper !== 'M') {
      while (ti < tokens.length && tokens[ti].num !== undefined) {
        processOnce()
      }
    } else if (upper === 'M') {
      // After M, implicit repeats become L
      while (ti < tokens.length && tokens[ti].num !== undefined) {
        const ox = rel ? curX : 0
        const oy = rel ? curY : 0
        const x = nextNum() + ox
        const y = nextNum() + oy
        cmds.push({ type: 'L', x, y })
        curX = x; curY = y
        lastCp = null
      }
    }
  }

  return cmds
}

// ── Arc to Cubic Bezier conversion ──
function arcToCubics(x1, y1, rx, ry, angleDeg, largeArc, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [{ x1: x2, y1: y2, x2: x2, y2: y2, x: x2, y: y2 }]

  const phi = angleDeg * Math.PI / 180
  rx = Math.abs(rx)
  ry = Math.abs(ry)

  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)

  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s; ry *= s
  }

  const num = Math.max(0, rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p)
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  const sq = den === 0 ? 0 : Math.sqrt(num / den)
  const sign = (largeArc === sweep) ? -1 : 1

  const cxp = sign * sq * (rx * y1p / ry)
  const cyp = sign * sq * (-ry * x1p / rx)

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)))
    if (ux * vy - uy * vx < 0) a = -a
    return a
  }

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dTheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)

  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)))
  const delta = dTheta / segments
  const t = (4 / 3) * Math.tan(delta / 4)

  const result = []
  let th = theta1

  for (let i = 0; i < segments; i++) {
    const cosT = Math.cos(th), sinT = Math.sin(th)
    const cosT2 = Math.cos(th + delta), sinT2 = Math.sin(th + delta)

    const ep1x = cosPhi * rx * cosT - sinPhi * ry * sinT + cx
    const ep1y = sinPhi * rx * cosT + cosPhi * ry * sinT + cy

    const ep2x = cosPhi * rx * cosT2 - sinPhi * ry * sinT2 + cx
    const ep2y = sinPhi * rx * cosT2 + cosPhi * ry * sinT2 + cy

    const dx1 = -rx * sinT, dy1 = ry * cosT
    const dx2 = -rx * sinT2, dy2 = ry * cosT2

    const cp1x = ep1x + t * (cosPhi * dx1 - sinPhi * dy1)
    const cp1y = ep1y + t * (sinPhi * dx1 + cosPhi * dy1)
    const cp2x = ep2x - t * (cosPhi * dx2 - sinPhi * dy2)
    const cp2y = ep2y - t * (sinPhi * dx2 + cosPhi * dy2)

    result.push({ x1: cp1x, y1: cp1y, x2: cp2x, y2: cp2y, x: ep2x, y: ep2y })
    th += delta
  }

  return result
}

// ── Shape extraction from SVG DOM ──

function getAttr(el, name, inherit) {
  const val = el.getAttribute(name)
  if (val !== null && val !== 'inherit') return val
  if (inherit && el.parentElement && el.parentElement.tagName !== 'svg') {
    return getAttr(el.parentElement, name, true)
  }
  return null
}

function getStyle(el) {
  const fill = getAttr(el, 'fill', true) || 'black'
  const stroke = getAttr(el, 'stroke', true) || 'none'
  const strokeWidth = parseFloat(getAttr(el, 'stroke-width', true)) || 1
  const opacity = parseFloat(getAttr(el, 'opacity', true)) || 1
  const fillOpacity = parseFloat(getAttr(el, 'fill-opacity', true)) || 1
  return { fill, stroke, strokeWidth, opacity, fillOpacity }
}

function rectToPath(el) {
  const x = parseFloat(el.getAttribute('x')) || 0
  const y = parseFloat(el.getAttribute('y')) || 0
  const w = parseFloat(el.getAttribute('width')) || 0
  const h = parseFloat(el.getAttribute('height')) || 0
  let rx = parseFloat(el.getAttribute('rx')) || 0
  let ry = parseFloat(el.getAttribute('ry')) || rx
  if (rx === 0 && ry === 0) {
    return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`
  }
  rx = Math.min(rx, w / 2)
  ry = Math.min(ry, h / 2)
  return `M${x + rx},${y}L${x + w - rx},${y}A${rx},${ry},0,0,1,${x + w},${y + ry}L${x + w},${y + h - ry}A${rx},${ry},0,0,1,${x + w - rx},${y + h}L${x + rx},${y + h}A${rx},${ry},0,0,1,${x},${y + h - ry}L${x},${y + ry}A${rx},${ry},0,0,1,${x + rx},${y}Z`
}

function circleToPath(el) {
  const cx = parseFloat(el.getAttribute('cx')) || 0
  const cy = parseFloat(el.getAttribute('cy')) || 0
  const r = parseFloat(el.getAttribute('r')) || 0
  return `M${cx - r},${cy}A${r},${r},0,1,1,${cx + r},${cy}A${r},${r},0,1,1,${cx - r},${cy}Z`
}

function ellipseToPath(el) {
  const cx = parseFloat(el.getAttribute('cx')) || 0
  const cy = parseFloat(el.getAttribute('cy')) || 0
  const rx = parseFloat(el.getAttribute('rx')) || 0
  const ry = parseFloat(el.getAttribute('ry')) || 0
  return `M${cx - rx},${cy}A${rx},${ry},0,1,1,${cx + rx},${cy}A${rx},${ry},0,1,1,${cx - rx},${cy}Z`
}

function lineToPath(el) {
  const x1 = parseFloat(el.getAttribute('x1')) || 0
  const y1 = parseFloat(el.getAttribute('y1')) || 0
  const x2 = parseFloat(el.getAttribute('x2')) || 0
  const y2 = parseFloat(el.getAttribute('y2')) || 0
  return `M${x1},${y1}L${x2},${y2}`
}

function polyToPath(el, close) {
  const pts = el.getAttribute('points')
  if (!pts) return ''
  const nums = pts.match(/-?[\d.]+/g)
  if (!nums || nums.length < 2) return ''
  let d = `M${nums[0]},${nums[1]}`
  for (let i = 2; i < nums.length; i += 2) {
    d += `L${nums[i]},${nums[i + 1]}`
  }
  if (close) d += 'Z'
  return d
}

/**
 * Extract all shapes from an SVG element.
 * Returns array of { commands, style, isClosed }
 */
export function extractShapes(svgEl) {
  const shapes = []

  function walk(el, parentTransform) {
    const localTransform = el.getAttribute('transform')
    // For now, we skip transform handling (we use the SVG's own viewBox mapping)

    for (const child of el.children) {
      const tag = child.tagName.toLowerCase()
      let d = null

      switch (tag) {
        case 'path': d = child.getAttribute('d'); break
        case 'rect': d = rectToPath(child); break
        case 'circle': d = circleToPath(child); break
        case 'ellipse': d = ellipseToPath(child); break
        case 'line': d = lineToPath(child); break
        case 'polyline': d = polyToPath(child, false); break
        case 'polygon': d = polyToPath(child, true); break
        case 'g': walk(child, parentTransform); continue
        default: continue
      }

      if (d) {
        const commands = parsePath(d)
        if (commands.length === 0) continue
        const isClosed = commands[commands.length - 1].type === 'Z'
        const style = getStyle(child)
        shapes.push({ commands, style, isClosed })
      }
    }
  }

  walk(svgEl, null)
  return shapes
}

/**
 * Get anchor points and control handles from parsed commands.
 * Returns { anchors: [{x,y}], handles: [{ax,ay, hx,hy}] }
 */
export function getHandles(commands) {
  const anchors = []
  const handles = []
  let curX = 0, curY = 0

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        anchors.push({ x: cmd.x, y: cmd.y })
        curX = cmd.x; curY = cmd.y
        break
      case 'L':
        anchors.push({ x: cmd.x, y: cmd.y })
        curX = cmd.x; curY = cmd.y
        break
      case 'C':
        handles.push({ ax: curX, ay: curY, hx: cmd.x1, hy: cmd.y1 })
        handles.push({ ax: cmd.x, ay: cmd.y, hx: cmd.x2, hy: cmd.y2 })
        anchors.push({ x: cmd.x, y: cmd.y })
        curX = cmd.x; curY = cmd.y
        break
      case 'Z':
        break
    }
  }

  return { anchors, handles }
}

/**
 * Build a canvas Path2D from parsed commands (transformed through a projection function).
 * projFn(x, y, z) => {x, y}
 */
export function buildPath2D(commands, projFn, z = 0) {
  const path = new Path2D()
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M': {
        const p = projFn(cmd.x, cmd.y, z)
        path.moveTo(p.x, p.y)
        break
      }
      case 'L': {
        const p = projFn(cmd.x, cmd.y, z)
        path.lineTo(p.x, p.y)
        break
      }
      case 'C': {
        const p1 = projFn(cmd.x1, cmd.y1, z)
        const p2 = projFn(cmd.x2, cmd.y2, z)
        const p = projFn(cmd.x, cmd.y, z)
        path.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
        break
      }
      case 'Z':
        path.closePath()
        break
    }
  }
  return path
}

/**
 * Build side face Path2D for a single segment between front (z=0) and back (z=depth).
 */
export function buildSideFace(prevX, prevY, cmd, projFn, depth) {
  const path = new Path2D()

  if (cmd.type === 'L') {
    const f0 = projFn(prevX, prevY, 0)
    const f1 = projFn(cmd.x, cmd.y, 0)
    const b1 = projFn(cmd.x, cmd.y, depth)
    const b0 = projFn(prevX, prevY, depth)
    path.moveTo(f0.x, f0.y)
    path.lineTo(f1.x, f1.y)
    path.lineTo(b1.x, b1.y)
    path.lineTo(b0.x, b0.y)
    path.closePath()
  } else if (cmd.type === 'C') {
    // Front bezier edge
    const f0 = projFn(prevX, prevY, 0)
    const fc1 = projFn(cmd.x1, cmd.y1, 0)
    const fc2 = projFn(cmd.x2, cmd.y2, 0)
    const f1 = projFn(cmd.x, cmd.y, 0)
    // Back bezier edge (reversed)
    const b0 = projFn(prevX, prevY, depth)
    const bc1 = projFn(cmd.x1, cmd.y1, depth)
    const bc2 = projFn(cmd.x2, cmd.y2, depth)
    const b1 = projFn(cmd.x, cmd.y, depth)

    path.moveTo(f0.x, f0.y)
    path.bezierCurveTo(fc1.x, fc1.y, fc2.x, fc2.y, f1.x, f1.y)
    path.lineTo(b1.x, b1.y)
    path.bezierCurveTo(bc2.x, bc2.y, bc1.x, bc1.y, b0.x, b0.y)
    path.closePath()
  }

  // Compute average Z for depth sorting
  let avgZ = 0
  if (cmd.type === 'L' || cmd.type === 'C') {
    const midZ = depth / 2
    // Average of front and back midpoints
    const mx = (prevX + cmd.x) / 2
    const my = (prevY + cmd.y) / 2
    avgZ = midZ // simplified
  }

  return { path, avgZ }
}
