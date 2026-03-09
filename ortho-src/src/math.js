/**
 * 3D rotation matrix math for orthographic projection.
 *
 * For a flat SVG (z=0), rotating in 3D and projecting orthographically
 * reduces to a 2x2 affine transform:
 *
 *   x' = R[0][0]*x + R[0][1]*y
 *   y' = R[1][0]*x + R[1][1]*y
 *
 * where R = Rz(γ) · Ry(β) · Rx(α) is the combined 3x3 rotation matrix.
 */

const DEG = Math.PI / 180

export function degToRad(d) {
  return d * DEG
}

/**
 * Compute the 2D affine matrix [a, b, c, d] from Euler rotation angles.
 * Convention: rotate X first, then Y, then Z (extrinsic).
 *
 * Returns { a, b, c, d } where:
 *   x' = a*x + c*y
 *   y' = b*x + d*y
 *
 * This maps to SVG transform="matrix(a, b, c, d, 0, 0)"
 */
export function rotationToMatrix2D(rx, ry, rz) {
  const ax = degToRad(rx)
  const ay = degToRad(ry)
  const az = degToRad(rz)

  const sx = Math.sin(ax), cx = Math.cos(ax)
  const sy = Math.sin(ay), cy = Math.cos(ay)
  const sz = Math.sin(az), cz = Math.cos(az)

  // R = Rz · Ry · Rx — only first two rows needed (orthographic drops z')
  const a = cy * cz
  const c = sx * sy * cz - cx * sz
  const b = cy * sz
  const d = sx * sy * sz + cx * cz

  return { a, b, c, d }
}

/**
 * Build a CSS matrix() string from rotation angles.
 * CSS matrix(a, b, c, d, tx, ty) uses column-major order for the 2x2 part.
 */
export function rotationToCSSMatrix(rx, ry, rz) {
  const { a, b, c, d } = rotationToMatrix2D(rx, ry, rz)
  return `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`
}

/**
 * Transform a 2D point through the rotation matrix.
 */
export function transformPoint(x, y, matrix) {
  return {
    x: matrix.a * x + matrix.c * y,
    y: matrix.b * x + matrix.d * y,
  }
}

/**
 * Get the 3x3 rotation matrix (full) for 3D grid rendering.
 */
export function rotationMatrix3x3(rx, ry, rz) {
  const ax = degToRad(rx)
  const ay = degToRad(ry)
  const az = degToRad(rz)

  const sx = Math.sin(ax), cx = Math.cos(ax)
  const sy = Math.sin(ay), cy = Math.cos(ay)
  const sz = Math.sin(az), cz = Math.cos(az)

  return [
    [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
    [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
    [-sy,     sx * cy,                 cx * cy],
  ]
}

/**
 * Project a 3D point to 2D using the rotation matrix (orthographic).
 */
export function project3D(x, y, z, mat) {
  return {
    x: mat[0][0] * x + mat[0][1] * y + mat[0][2] * z,
    y: mat[1][0] * x + mat[1][1] * y + mat[1][2] * z,
  }
}
