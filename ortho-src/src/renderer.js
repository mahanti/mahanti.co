import { rotationMatrix3x3, project3D } from './math.js'
import { buildPath2D, buildSideFace, getHandles } from './pathParser.js'

const DEFAULT_STYLE = {
  canvasBg: 'oklch(0.06 0 0)',
  gridColor: 'rgba(255, 255, 255, 0.04)',
  extrusionColor: 'rgba(60, 63, 80, 0.9)',
  edgeColor: 'rgba(255, 255, 255, 0.12)',
  edgeSideColor: 'rgba(255, 255, 255, 0.08)',
  handleAnchorColor: 'oklch(0.72 0.16 65)',
  handleControlColor: 'oklch(0.62 0.14 250)',
  faceColor: null,
  faceOpacity: 1,
  boundingBoxColor: 'rgba(255, 255, 255, 0.3)',
  gridStrokeWidth: 1,
  edgeStrokeWidth: 0.75,
  edgeSideStrokeWidth: 0.5,
  boundingBoxStrokeWidth: 1,
  handleStrokeWidth: 1,
}

/**
 * Full scene renderer: grid, extruded shapes, handle overlay.
 * Uses canvas for everything with drawImage for SVG face rendering.
 */
export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.dpr = window.devicePixelRatio || 1
    this.w = 0
    this.h = 0
    if (canvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this.resize())
      this._resizeObserver.observe(canvas.parentElement)
      this.resize()
    } else {
      // Offscreen canvas — use its existing dimensions
      this._resizeObserver = null
      this.dpr = 1
      this.w = canvas.width
      this.h = canvas.height
    }
  }

  resize() {
    const parent = this.canvas.parentElement
    const w = parent.clientWidth
    const h = parent.clientHeight
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.w = w
    this.h = h
  }

  /**
   * Main render call.
   * @param {Object} state - { rx, ry, rz, zoom, extrudeDepth, showGrid, showAxes, showHandles }
   * @param {Array} shapes - parsed shapes from extractShapes()
   * @param {Image|null} svgImage - pre-rendered SVG as an Image
   * @param {number} imgW - display width of SVG image
   * @param {number} imgH - display height of SVG image
   * @param {Object} viewBox - { x, y, w, h } of original SVG
   * @param {Object} style - optional style overrides
   */
  render(state, shapes, svgImage, imgW, imgH, viewBox, style) {
    const s = { ...DEFAULT_STYLE, ...style }
    const { ctx, dpr, w, h } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear canvas then fill background
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = s.canvasBg
    ctx.fillRect(0, 0, w, h)

    const mat = rotationMatrix3x3(state.rx, state.ry, state.rz)
    const cx = w / 2
    const cy = h / 2
    const zoom = state.zoom
    const depth = state.extrudeDepth

    // Projection: SVG viewBox coords → screen coords
    const scaleX = imgW / viewBox.w
    const scaleY = imgH / viewBox.h

    const projFn = (svgX, svgY, z) => {
      // SVG coords → centered display coords
      const dx = (svgX - viewBox.x) * scaleX - imgW / 2
      const dy = (svgY - viewBox.y) * scaleY - imgH / 2
      // 3D rotation (orthographic)
      const p = project3D(dx, dy, z, mat)
      return {
        x: cx + p.x * zoom,
        y: cy + p.y * zoom,
      }
    }

    // Camera-space Z for a point
    const camZ = (dx, dy, z) => mat[2][0] * dx + mat[2][1] * dy + mat[2][2] * z

    // Grid
    const proj3D = (x, y, z) => {
      const p = project3D(x, y, z, mat)
      return { x: cx + p.x * zoom, y: cy + p.y * zoom }
    }

    if (state.showGrid) this.drawGrid(ctx, proj3D, s, zoom)
    if (state.showAxes) this.drawAxes(ctx, proj3D)

    if (!svgImage || !svgImage.complete) return

    // ── Extrusion rendering ──
    const frontFaceZ = 0
    const backFaceZ = camZ(0, 0, depth) // Z of back face in camera space
    const frontInFront = backFaceZ >= 0 // back face is farther = front is closer

    if (depth > 0 && shapes.length > 0) {
      // Collect side faces for depth sorting
      const sideFaces = []

      for (const shape of shapes) {
        if (!shape.isClosed) continue
        const cmds = shape.commands
        let prevX = 0, prevY = 0

        for (const cmd of cmds) {
          if (cmd.type === 'M') {
            prevX = cmd.x; prevY = cmd.y
            continue
          }
          if (cmd.type === 'Z') continue

          const { path, avgZ } = buildSideFace(prevX, prevY, cmd, projFn, depth)

          // Compute a more accurate depth for this side face
          const midX = (prevX + cmd.x) / 2
          const midY = (prevY + cmd.y) / 2
          const dxm = (midX - viewBox.x) * scaleX - imgW / 2
          const dym = (midY - viewBox.y) * scaleY - imgH / 2
          const sideZ = camZ(dxm, dym, depth / 2)

          // Compute face normal to determine shade
          const p0f = projFn(prevX, prevY, 0)
          const p1f = projFn(cmd.x, cmd.y, 0)
          const p0b = projFn(prevX, prevY, depth)
          const edgeA = { x: p1f.x - p0f.x, y: p1f.y - p0f.y }
          const edgeB = { x: p0b.x - p0f.x, y: p0b.y - p0f.y }
          const cross = edgeA.x * edgeB.y - edgeA.y * edgeB.x

          sideFaces.push({
            path,
            z: sideZ,
            cross,
            style: shape.style,
          })

          prevX = cmd.x; prevY = cmd.y
        }
      }

      // Sort side faces by Z (back to front)
      sideFaces.sort((a, b) => b.z - a.z)

      // Draw back face first if it's behind
      if (frontInFront) {
        this.drawSvgFace(ctx, svgImage, imgW, imgH, mat, cx, cy, zoom, depth, 0.35, s)
      }

      // Derive lit/shadow from single extrusion color
      const ec = s.extrusionColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      const eR = ec ? +ec[1] : 60, eG = ec ? +ec[2] : 63, eB = ec ? +ec[3] : 80, eA = ec && ec[4] !== undefined ? +ec[4] : 0.9
      const litColor = `rgba(${eR}, ${eG}, ${eB}, ${eA})`
      const shadowColor = `rgba(${Math.round(eR * 0.6)}, ${Math.round(eG * 0.6)}, ${Math.round(eB * 0.6)}, ${eA})`

      // Draw side faces
      for (const face of sideFaces) {
        const shade = face.cross > 0 ? litColor : shadowColor
        ctx.fillStyle = shade
        ctx.fill(face.path)
        ctx.strokeStyle = s.edgeSideColor
        ctx.lineWidth = s.edgeSideStrokeWidth
        ctx.stroke(face.path)
      }

      // Draw side edges (connecting front to back at anchor points)
      ctx.strokeStyle = s.edgeColor
      ctx.lineWidth = s.edgeStrokeWidth
      for (const shape of shapes) {
        if (!shape.isClosed) continue
        for (const cmd of shape.commands) {
          if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C') {
            const pf = projFn(cmd.x, cmd.y, 0)
            const pb = projFn(cmd.x, cmd.y, depth)
            ctx.beginPath()
            ctx.moveTo(pf.x, pf.y)
            ctx.lineTo(pb.x, pb.y)
            ctx.stroke()
          }
        }
      }

      // Draw front face if it's in front
      if (frontInFront) {
        this.drawSvgFace(ctx, svgImage, imgW, imgH, mat, cx, cy, zoom, 0, 1, s)
      } else {
        this.drawSvgFace(ctx, svgImage, imgW, imgH, mat, cx, cy, zoom, 0, 0.35, s)
        this.drawSvgFace(ctx, svgImage, imgW, imgH, mat, cx, cy, zoom, depth, 1, s)
      }
    } else {
      // No extrusion, just draw the SVG with rotation
      this.drawSvgFace(ctx, svgImage, imgW, imgH, mat, cx, cy, zoom, 0, 1, s)
    }

    // ── Bounding box ──
    if (state.showBoundingBox && svgImage) {
      this.drawBoundingBox(ctx, imgW, imgH, mat, cx, cy, zoom, 0, s)
      if (depth > 0) {
        this.drawBoundingBox(ctx, imgW, imgH, mat, cx, cy, zoom, depth, s)
        // Connect corners
        this.drawBoundingBoxEdges(ctx, imgW, imgH, mat, cx, cy, zoom, depth, s)
      }
    }

    // ── Handle overlay ──
    if (state.showHandles && shapes.length > 0) {
      this.drawHandles(ctx, shapes, projFn, s)
    }
  }

  drawSvgFace(ctx, img, imgW, imgH, mat, cx, cy, zoom, zOffset, alpha, s) {
    // Use offscreen canvas for tint/darken so effects stay within shape pixels
    const needsOffscreen = s?.faceColor || alpha < 1
    let source = img

    if (needsOffscreen) {
      if (!this._offscreen || this._offscreen.width !== Math.ceil(imgW) || this._offscreen.height !== Math.ceil(imgH)) {
        this._offscreen = document.createElement('canvas')
        this._offscreen.width = Math.ceil(imgW)
        this._offscreen.height = Math.ceil(imgH)
      }
      const oc = this._offscreen.getContext('2d')
      oc.clearRect(0, 0, imgW, imgH)
      oc.drawImage(img, 0, 0, imgW, imgH)

      if (s?.faceColor) {
        oc.globalCompositeOperation = 'source-atop'
        oc.fillStyle = s.faceColor
        oc.fillRect(0, 0, imgW, imgH)
        oc.globalCompositeOperation = 'source-over'
      }

      if (alpha < 1) {
        oc.globalCompositeOperation = 'source-atop'
        oc.fillStyle = 'rgba(0, 0, 0, 0.5)'
        oc.fillRect(0, 0, imgW, imgH)
        oc.globalCompositeOperation = 'source-over'
      }

      source = this._offscreen
    }

    ctx.save()
    ctx.globalAlpha = alpha * (s?.faceOpacity ?? 1)
    ctx.translate(cx, cy)
    ctx.scale(zoom, zoom)
    if (zOffset !== 0) {
      ctx.translate(mat[0][2] * zOffset, mat[1][2] * zOffset)
    }
    ctx.transform(mat[0][0], mat[1][0], mat[0][1], mat[1][1], 0, 0)
    ctx.translate(-imgW / 2, -imgH / 2)
    ctx.drawImage(source, 0, 0, imgW, imgH)
    ctx.restore()
  }

  drawBoundingBox(ctx, imgW, imgH, mat, cx, cy, zoom, zOffset, s) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(zoom, zoom)
    if (zOffset !== 0) {
      ctx.translate(mat[0][2] * zOffset, mat[1][2] * zOffset)
    }
    ctx.transform(mat[0][0], mat[1][0], mat[0][1], mat[1][1], 0, 0)
    ctx.translate(-imgW / 2, -imgH / 2)

    ctx.setLineDash([4, 4])
    ctx.strokeStyle = s.boundingBoxColor || 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = s.boundingBoxStrokeWidth / zoom
    ctx.strokeRect(0, 0, imgW, imgH)
    ctx.restore()
  }

  drawBoundingBoxEdges(ctx, imgW, imgH, mat, cx, cy, zoom, depth, s) {
    const corners = [
      [-imgW / 2, -imgH / 2],
      [imgW / 2, -imgH / 2],
      [imgW / 2, imgH / 2],
      [-imgW / 2, imgH / 2],
    ]

    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = s.boundingBoxColor || 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = s.boundingBoxStrokeWidth

    for (const [lx, ly] of corners) {
      const pf = project3D(lx, ly, 0, mat)
      const pb = project3D(lx, ly, depth, mat)
      ctx.beginPath()
      ctx.moveTo(cx + pf.x * zoom, cy + pf.y * zoom)
      ctx.lineTo(cx + pb.x * zoom, cy + pb.y * zoom)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawHandles(ctx, shapes, projFn, s) {
    for (const shape of shapes) {
      const { anchors, handles } = getHandles(shape.commands)

      // Draw handle lines (dashed)
      ctx.save()
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = s.handleAnchorColor
      ctx.lineWidth = s.handleStrokeWidth
      for (const h of handles) {
        const a = projFn(h.ax, h.ay, 0)
        const hp = projFn(h.hx, h.hy, 0)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(hp.x, hp.y)
        ctx.stroke()
      }
      ctx.restore()

      // Draw control handle points
      for (const h of handles) {
        const hp = projFn(h.hx, h.hy, 0)
        ctx.fillStyle = s.handleControlColor
        ctx.beginPath()
        ctx.arc(hp.x, hp.y, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 0.75
        ctx.stroke()
      }

      // Draw anchor points
      for (const a of anchors) {
        const p = projFn(a.x, a.y, 0)
        ctx.fillStyle = s.handleAnchorColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 0.75
        ctx.stroke()
      }
    }
  }

  drawGrid(ctx, proj, s, zoom) {
    // Scale grid to always fill viewport regardless of zoom
    const maxDim = Math.max(this.w, this.h)
    const gridSize = Math.ceil(maxDim / (zoom || 1)) + 200
    const step = 40
    const lines = Math.ceil(gridSize / step)

    ctx.strokeStyle = s.gridColor
    ctx.lineWidth = s.gridStrokeWidth

    for (let i = -lines; i <= lines; i++) {
      const offset = i * step
      const a1 = proj(-gridSize, 0, offset)
      const a2 = proj(gridSize, 0, offset)
      ctx.beginPath()
      ctx.moveTo(a1.x, a1.y)
      ctx.lineTo(a2.x, a2.y)
      ctx.stroke()

      const b1 = proj(offset, 0, -gridSize)
      const b2 = proj(offset, 0, gridSize)
      ctx.beginPath()
      ctx.moveTo(b1.x, b1.y)
      ctx.lineTo(b2.x, b2.y)
      ctx.stroke()
    }
  }

  drawAxes(ctx, proj) {
    const len = 60
    const origin = proj(0, 0, 0)

    const axes = [
      { end: proj(len, 0, 0), color: 'oklch(0.63 0.26 29)' },
      { end: proj(0, -len, 0), color: 'oklch(0.72 0.19 145)' },
      { end: proj(0, 0, len), color: 'oklch(0.68 0.16 250)' },
    ]

    for (const axis of axes) {
      ctx.strokeStyle = axis.color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(axis.end.x, axis.end.y)
      ctx.stroke()
    }

    // White sphere at origin
    ctx.globalAlpha = 0.9
    const grad = ctx.createRadialGradient(origin.x - 1, origin.y - 1, 0, origin.x, origin.y, 4)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(1, '#888888')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  destroy() {
    this._resizeObserver?.disconnect()
  }
}
