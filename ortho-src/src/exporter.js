import { rotationToMatrix2D, rotationMatrix3x3, project3D } from './math.js'

/**
 * Export the rotated + extruded SVG as a clean vector SVG string.
 */
export function exportSVG(originalSvgEl, rx, ry, rz, preserveStroke, extrudeDepth, shapes, viewBox) {
  const { a, b, c, d } = rotationToMatrix2D(rx, ry, rz)
  const mat = rotationMatrix3x3(rx, ry, rz)
  const ns = 'http://www.w3.org/2000/svg'

  // Compute transformed bounding box
  const vx = viewBox.x, vy = viewBox.y, vw = viewBox.w, vh = viewBox.h

  // Get all corner points of the extruded bounding box
  const corners = []
  for (const z of [0, extrudeDepth]) {
    corners.push(
      { x: vx, y: vy, z },
      { x: vx + vw, y: vy, z },
      { x: vx + vw, y: vy + vh, z },
      { x: vx, y: vy + vh, z },
    )
  }

  const projected = corners.map(p => {
    const pr = project3D(p.x, p.y, p.z, mat)
    return pr
  })

  const xs = projected.map(p => p.x)
  const ys = projected.map(p => p.y)
  const pad = 10
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const maxX = Math.max(...xs) + pad
  const maxY = Math.max(...ys) + pad
  const newW = maxX - minX
  const newH = maxY - minY

  const outSvg = document.createElementNS(ns, 'svg')
  outSvg.setAttribute('xmlns', ns)
  outSvg.setAttribute('viewBox', `${minX.toFixed(2)} ${minY.toFixed(2)} ${newW.toFixed(2)} ${newH.toFixed(2)}`)
  outSvg.setAttribute('width', Math.round(newW))
  outSvg.setAttribute('height', Math.round(newH))

  const frontFaceZ = mat[2][2] * extrudeDepth
  const frontFirst = frontFaceZ >= 0

  // Helper: project a viewBox point
  const projPt = (x, y, z) => {
    const p = project3D(x, y, z, mat)
    return p
  }

  // Build path string from commands projected at given z
  const buildProjectedPath = (commands, z) => {
    let d = ''
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M': { const p = projPt(cmd.x, cmd.y, z); d += `M${p.x.toFixed(3)},${p.y.toFixed(3)}`; break }
        case 'L': { const p = projPt(cmd.x, cmd.y, z); d += `L${p.x.toFixed(3)},${p.y.toFixed(3)}`; break }
        case 'C': {
          const p1 = projPt(cmd.x1, cmd.y1, z), p2 = projPt(cmd.x2, cmd.y2, z), p = projPt(cmd.x, cmd.y, z)
          d += `C${p1.x.toFixed(3)},${p1.y.toFixed(3)},${p2.x.toFixed(3)},${p2.y.toFixed(3)},${p.x.toFixed(3)},${p.y.toFixed(3)}`
          break
        }
        case 'Z': d += 'Z'; break
      }
    }
    return d
  }

  // Build side face path for a segment
  const buildSidePath = (prevX, prevY, cmd, depth) => {
    if (cmd.type === 'L') {
      const f0 = projPt(prevX, prevY, 0), f1 = projPt(cmd.x, cmd.y, 0)
      const b0 = projPt(prevX, prevY, depth), b1 = projPt(cmd.x, cmd.y, depth)
      return `M${f0.x.toFixed(3)},${f0.y.toFixed(3)}L${f1.x.toFixed(3)},${f1.y.toFixed(3)}L${b1.x.toFixed(3)},${b1.y.toFixed(3)}L${b0.x.toFixed(3)},${b0.y.toFixed(3)}Z`
    } else if (cmd.type === 'C') {
      const f0 = projPt(prevX, prevY, 0), fc1 = projPt(cmd.x1, cmd.y1, 0)
      const fc2 = projPt(cmd.x2, cmd.y2, 0), f1 = projPt(cmd.x, cmd.y, 0)
      const b0 = projPt(prevX, prevY, depth), bc1 = projPt(cmd.x1, cmd.y1, depth)
      const bc2 = projPt(cmd.x2, cmd.y2, depth), b1 = projPt(cmd.x, cmd.y, depth)
      return `M${f0.x.toFixed(3)},${f0.y.toFixed(3)}C${fc1.x.toFixed(3)},${fc1.y.toFixed(3)},${fc2.x.toFixed(3)},${fc2.y.toFixed(3)},${f1.x.toFixed(3)},${f1.y.toFixed(3)}L${b1.x.toFixed(3)},${b1.y.toFixed(3)}C${bc2.x.toFixed(3)},${bc2.y.toFixed(3)},${bc1.x.toFixed(3)},${bc1.y.toFixed(3)},${b0.x.toFixed(3)},${b0.y.toFixed(3)}Z`
    }
    return ''
  }

  if (extrudeDepth > 0 && shapes.length > 0) {
    // Extruded export: create proper faces

    // Back face group
    const backG = document.createElementNS(ns, 'g')
    backG.setAttribute('opacity', '0.4')

    // Side faces group
    const sideG = document.createElementNS(ns, 'g')

    // Front face group
    const frontG = document.createElementNS(ns, 'g')

    for (const shape of shapes) {
      const fill = shape.style.fill === 'none' ? 'none' : (shape.style.fill || 'black')
      const stroke = shape.style.stroke === 'none' ? 'none' : (shape.style.stroke || 'none')
      const sw = shape.style.strokeWidth || 1

      // Front face path
      const frontPath = document.createElementNS(ns, 'path')
      frontPath.setAttribute('d', buildProjectedPath(shape.commands, 0))
      frontPath.setAttribute('fill', fill)
      if (stroke !== 'none') { frontPath.setAttribute('stroke', stroke); frontPath.setAttribute('stroke-width', sw) }
      if (preserveStroke) frontPath.setAttribute('vector-effect', 'non-scaling-stroke')
      frontG.appendChild(frontPath)

      if (shape.isClosed) {
        // Back face path
        const backPath = document.createElementNS(ns, 'path')
        backPath.setAttribute('d', buildProjectedPath(shape.commands, extrudeDepth))
        backPath.setAttribute('fill', fill)
        if (stroke !== 'none') { backPath.setAttribute('stroke', stroke); backPath.setAttribute('stroke-width', sw) }
        if (preserveStroke) backPath.setAttribute('vector-effect', 'non-scaling-stroke')
        backG.appendChild(backPath)

        // Side faces
        let prevX = 0, prevY = 0
        for (const cmd of shape.commands) {
          if (cmd.type === 'M') { prevX = cmd.x; prevY = cmd.y; continue }
          if (cmd.type === 'Z') continue
          const sideD = buildSidePath(prevX, prevY, cmd, extrudeDepth)
          if (sideD) {
            const sidePath = document.createElementNS(ns, 'path')
            sidePath.setAttribute('d', sideD)
            sidePath.setAttribute('fill', '#2a2a35')
            sidePath.setAttribute('stroke', 'rgba(255,255,255,0.1)')
            sidePath.setAttribute('stroke-width', '0.5')
            sideG.appendChild(sidePath)
          }
          prevX = cmd.x; prevY = cmd.y
        }
      }
    }

    if (frontFirst) {
      outSvg.appendChild(backG)
      outSvg.appendChild(sideG)
      outSvg.appendChild(frontG)
    } else {
      outSvg.appendChild(frontG)
      outSvg.appendChild(sideG)
      outSvg.appendChild(backG)
    }
  } else {
    // No extrusion: just transform the original SVG content
    const svgClone = originalSvgEl.cloneNode(true)
    const g = document.createElementNS(ns, 'g')
    g.setAttribute('transform', `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`)
    if (preserveStroke) applyNonScalingStroke(svgClone)
    while (svgClone.firstChild) g.appendChild(svgClone.firstChild)
    outSvg.appendChild(g)
  }

  const serializer = new XMLSerializer()
  let str = serializer.serializeToString(outSvg)
  str = str.replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')
  str = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    str.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return str
}

function applyNonScalingStroke(el) {
  for (const tag of ['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse']) {
    for (const child of el.querySelectorAll(tag)) {
      child.setAttribute('vector-effect', 'non-scaling-stroke')
    }
  }
}

export function downloadString(str, filename, mime = 'image/svg+xml') {
  const blob = new Blob([str], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
