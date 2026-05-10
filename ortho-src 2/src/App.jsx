import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SceneRenderer } from './renderer.js'
import { ShaderPostProcessor } from './shaders.js'
import { extractShapes } from './pathParser.js'
import { exportSVG, downloadString } from './exporter.js'
import { Slider } from './components/ui/slider'
import { Button } from './components/ui/button'

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

const PRESETS = {
  isometric: [-35.264, 45, 0],
  dimetric: [-30, 30, 0],
  mild: [-20, 20, 0],
  topIso: [-45, 45, 0],
  side45: [0, 45, 0],
  front: [0, 0, 0],
}

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

const STORAGE_KEY = 'ortho-last-svg'
const SETTINGS_KEY = 'ortho-settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const _saved = loadSettings()

function parseRgba(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!m) return null
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 }
}

const TOOLBAR_W = 320
const SHADER_EFFECTS = ['neon', 'pixelate', 'crt', 'halftone', 'ascii']
const ANIMATED_EFFECTS = new Set(['neon', 'crt'])

const COLOR_SCHEMES = [
  { name: 'midnight', canvasBg: 'oklch(0.06 0 0)', extrusionColor: 'rgba(60, 63, 80, 0.9)', edgeColor: 'rgba(255, 255, 255, 0.12)' },
  { name: 'snow', canvasBg: 'oklch(0.95 0 0)', extrusionColor: 'rgba(180, 180, 190, 0.9)', edgeColor: 'rgba(0, 0, 0, 0.15)' },
  { name: 'ocean', canvasBg: 'oklch(0.15 0.04 250)', extrusionColor: 'rgba(30, 80, 140, 0.9)', edgeColor: 'rgba(100, 200, 255, 0.2)' },
  { name: 'ember', canvasBg: 'oklch(0.13 0.04 25)', extrusionColor: 'rgba(140, 40, 20, 0.9)', edgeColor: 'rgba(255, 120, 50, 0.2)' },
  { name: 'forest', canvasBg: 'oklch(0.13 0.04 145)', extrusionColor: 'rgba(30, 80, 40, 0.9)', edgeColor: 'rgba(80, 220, 100, 0.15)' },
  { name: 'violet', canvasBg: 'oklch(0.12 0.06 300)', extrusionColor: 'rgba(80, 40, 120, 0.9)', edgeColor: 'rgba(180, 100, 255, 0.18)' },
]

export default function App() {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const fileInputRef = useRef(null)
  const glCanvasRef = useRef(null)
  const postProcessorRef = useRef(null)
  const dragRef = useRef({ active: false, x: 0, y: 0 })

  const [zoom, setZoom] = useState(_saved?.zoom ?? 1)
  const [svgData, setSvgData] = useState(null)
  const [rx, setRx] = useState(_saved?.rx ?? -35.264)
  const [ry, setRy] = useState(_saved?.ry ?? 45)
  const [rz, setRz] = useState(_saved?.rz ?? 0)
  const [extrude, setExtrude] = useState(_saved?.extrude ?? 40)
  const [showGrid, setShowGrid] = useState(_saved?.showGrid ?? true)
  const [showAxes, setShowAxes] = useState(_saved?.showAxes ?? true)
  const [showHandles, setShowHandles] = useState(_saved?.showHandles ?? false)
  const [showBoundingBox, setShowBoundingBox] = useState(_saved?.showBoundingBox ?? false)
  const [preserveStroke, setPreserveStroke] = useState(_saved?.preserveStroke ?? true)
  const [activePreset, setActivePreset] = useState('isometric')

  const [autoRotate, setAutoRotate] = useState(_saved?.autoRotate ?? false)
  const [autoRotateAxis, setAutoRotateAxis] = useState(_saved?.autoRotateAxis ?? 'y')
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(_saved?.autoRotateSpeed ?? 1)

  const [sceneStyle, setSceneStyle] = useState(_saved?.sceneStyle ?? DEFAULT_STYLE)
  const [shaderEffects, setShaderEffects] = useState(_saved?.shaderEffects ?? [])
  const [shaderIntensities, setShaderIntensities] = useState(_saved?.shaderIntensities ?? {})
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const [toolbarOpen, setToolbarOpen] = useState(false)
  const [openSection, setOpenSection] = useState(null)
  const [settingsCopied, setSettingsCopied] = useState(false)
  const [showSettingsImport, setShowSettingsImport] = useState(false)
  const [settingsImportText, setSettingsImportText] = useState('')

  const svgDataRef = useRef(svgData)
  svgDataRef.current = svgData
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const rxRef = useRef(rx)
  rxRef.current = rx
  const ryRef = useRef(ry)
  ryRef.current = ry
  const rzRef = useRef(rz)
  rzRef.current = rz
  const extrudeRef = useRef(extrude)
  extrudeRef.current = extrude
  const showGridRef = useRef(showGrid)
  showGridRef.current = showGrid
  const showAxesRef = useRef(showAxes)
  showAxesRef.current = showAxes
  const showHandlesRef = useRef(showHandles)
  showHandlesRef.current = showHandles
  const shaderEffectsRef = useRef(shaderEffects)
  shaderEffectsRef.current = shaderEffects
  const shaderIntensitiesRef = useRef(shaderIntensities)
  shaderIntensitiesRef.current = shaderIntensities

  // ── Undo history ──
  const historyRef = useRef([])
  const isUndoingRef = useRef(false)
  const undoDebounceRef = useRef(null)
  const snapshotRef = useRef(null)

  const snapshotDeps = [rx, ry, rz, extrude, zoom, showGrid, showAxes, showHandles, showBoundingBox, preserveStroke, autoRotate, autoRotateAxis, autoRotateSpeed, sceneStyle, shaderEffects, shaderIntensities]

  useEffect(() => {
    const snap = JSON.stringify({
      rx, ry, rz, extrude, zoom,
      showGrid, showAxes, showHandles, showBoundingBox, preserveStroke,
      autoRotate, autoRotateAxis, autoRotateSpeed,
      sceneStyle, shaderEffects, shaderIntensities,
    })
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      snapshotRef.current = snap
      return
    }
    if (snapshotRef.current === null) {
      snapshotRef.current = snap
      return
    }
    if (snapshotRef.current === snap) return
    const prev = snapshotRef.current
    clearTimeout(undoDebounceRef.current)
    undoDebounceRef.current = setTimeout(() => {
      historyRef.current.push(prev)
      snapshotRef.current = snap
      if (historyRef.current.length > 50) historyRef.current.shift()
      try { localStorage.setItem(SETTINGS_KEY, snap) } catch {}
    }, 400)
  }, snapshotDeps)

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const snap = JSON.parse(historyRef.current.pop())
    isUndoingRef.current = true
    snapshotRef.current = JSON.stringify(snap)
    setRx(snap.rx); setRy(snap.ry); setRz(snap.rz)
    setExtrude(snap.extrude); setZoom(snap.zoom)
    setShowGrid(snap.showGrid); setShowAxes(snap.showAxes)
    setShowHandles(snap.showHandles); setShowBoundingBox(snap.showBoundingBox)
    setPreserveStroke(snap.preserveStroke)
    setAutoRotate(snap.autoRotate); setAutoRotateAxis(snap.autoRotateAxis)
    setAutoRotateSpeed(snap.autoRotateSpeed)
    setSceneStyle(snap.sceneStyle)
    setShaderEffects(snap.shaderEffects); setShaderIntensities(snap.shaderIntensities)
  }, [])

  // ── Hover preview ──
  const [preview, setPreview] = useState({})
  const pv = useCallback((overrides) => setPreview(p => ({...p, ...overrides})), [])
  const pvEnd = useCallback((...keys) => setPreview(p => {
    const n = {...p}
    for (const k of keys) delete n[k]
    return n
  }), [])
  const pvColor = (key, hex) => {
    const { alpha } = getRgbaParts(sceneStyle[key])
    const { r, g, b } = hexToRgb(hex)
    pv({[key]: `rgba(${r}, ${g}, ${b}, ${alpha})`})
  }

  useEffect(() => {
    const match = Object.entries(PRESETS).find(
      ([, [px, py, pz]]) => Math.abs(rx - px) < 0.1 && Math.abs(ry - py) < 0.1 && Math.abs(rz - pz) < 0.1
    )
    setActivePreset(match ? match[0] : null)
  }, [rx, ry, rz])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!canvasRef.current) return
    rendererRef.current = new SceneRenderer(canvasRef.current)
    // Defer a frame so the canvas has layout dimensions before first render
    requestAnimationFrame(() => setMounted(true))
    return () => rendererRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (!glCanvasRef.current) return
    postProcessorRef.current = new ShaderPostProcessor(glCanvasRef.current)
    return () => postProcessorRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (!rendererRef.current) return
    const sd = svgData
    const has = (k) => k in preview
    const eff = (k, v) => has(k) ? preview[k] : v

    // Merge style overrides from preview
    const styleKeys = Object.keys(DEFAULT_STYLE)
    const styleOverrides = {}
    for (const k of styleKeys) { if (has(k)) styleOverrides[k] = preview[k] }
    const effStyle = Object.keys(styleOverrides).length ? {...sceneStyle, ...styleOverrides} : sceneStyle

    rendererRef.current.render(
      {
        rx: eff('rx', rx), ry: eff('ry', ry), rz: eff('rz', rz), zoom,
        extrudeDepth: extrude,
        showGrid: eff('showGrid', showGrid),
        showAxes: eff('showAxes', showAxes),
        showHandles: eff('showHandles', showHandles),
        showBoundingBox: eff('showBoundingBox', showBoundingBox),
      },
      sd?.shapes || [],
      sd?.image,
      sd?.imgW || 0,
      sd?.imgH || 0,
      sd?.viewBox || { x: 0, y: 0, w: 100, h: 100 },
      effStyle,
    )
    const effShaderEffects = eff('shaderEffects', shaderEffects)
    const effIntensities = has('shaderIntensities') ? preview.shaderIntensities : shaderIntensities
    if (effShaderEffects.length > 0 && postProcessorRef.current) {
      postProcessorRef.current.setEffects(effShaderEffects, effIntensities)
      postProcessorRef.current.render(canvasRef.current)
    } else if (postProcessorRef.current) {
      postProcessorRef.current.setEffects([], {})
    }
  }, [mounted, svgData, preview, sceneStyle, rx, ry, rz, zoom, extrude, showGrid, showAxes, showHandles, showBoundingBox, shaderEffects, shaderIntensities])

  // Continuous render loop for animated shaders (matrix, neon, etc.)
  const activeEffects = ('shaderEffects' in preview) ? preview.shaderEffects : shaderEffects
  const needsAnimLoop = activeEffects.some(e => ANIMATED_EFFECTS.has(e))

  useEffect(() => {
    if (!needsAnimLoop || !postProcessorRef.current || !canvasRef.current) return
    let rafId
    const tick = () => {
      if (postProcessorRef.current && canvasRef.current) {
        postProcessorRef.current.render(canvasRef.current)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [needsAnimLoop])

  useEffect(() => {
    if (!autoRotate) return
    let rafId
    let lastTime = performance.now()

    const tick = (now) => {
      const dt = (now - lastTime) / 16.67
      lastTime = now

      if (!dragRef.current.active) {
        const delta = autoRotateSpeed * 0.3 * dt
        if (autoRotateAxis === 'y' || autoRotateAxis === 'xz') {
          setRy(v => { const n = v + delta; return n > 180 ? n - 360 : n < -180 ? n + 360 : n })
        }
        if (autoRotateAxis === 'x' || autoRotateAxis === 'xz') {
          setRx(v => { const n = v + delta * 0.7; return n > 180 ? n - 360 : n < -180 ? n + 360 : n })
        }
        if (autoRotateAxis === 'yz') {
          setRy(v => { const n = v + delta; return n > 180 ? n - 360 : n < -180 ? n + 360 : n })
          setRz(v => { const n = v + delta * 0.5; return n > 180 ? n - 360 : n < -180 ? n + 360 : n })
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [autoRotate, autoRotateAxis, autoRotateSpeed])

  // ── SVG Loading ──
  const loadSVGString = useCallback((svgStr) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgStr, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return

    // Save to localStorage
    try { localStorage.setItem(STORAGE_KEY, svgStr) } catch {}

    const originalSvg = svg.cloneNode(true)

    let vb = svg.getAttribute('viewBox')
    let vx, vy, vw, vh
    if (vb) {
      ;[vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number)
    } else {
      vx = 0; vy = 0
      vw = parseFloat(svg.getAttribute('width')) || 200
      vh = parseFloat(svg.getAttribute('height')) || 200
      svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)
    }

    const vpW = window.innerWidth
    const vpH = window.innerHeight
    const maxDim = Math.min(vpW, vpH) * 0.55
    const scale = maxDim / Math.max(vw, vh)
    const imgW = vw * scale
    const imgH = vh * scale

    const shapes = extractShapes(svg)

    const clone = svg.cloneNode(true)
    clone.setAttribute('width', imgW)
    clone.setAttribute('height', imgH)
    const serialized = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      setSvgData({ image: img, shapes, imgW, imgH, viewBox: { x: vx, y: vy, w: vw, h: vh }, originalSvg })
    }
    img.src = url
  }, [])

  // Restore last SVG from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) loadSVGString(saved)
    } catch {}
  }, [loadSVGString])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => loadSVGString(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }, [loadSVGString])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.svg')) {
      const reader = new FileReader()
      reader.onload = (ev) => loadSVGString(ev.target.result)
      reader.readAsText(file)
    } else {
      const text = e.dataTransfer.getData('text')
      if (text?.includes('<svg')) loadSVGString(text)
    }
  }, [loadSVGString])

  useEffect(() => {
    const handler = (e) => {
      const text = e.clipboardData.getData('text')
      if (text?.includes('<svg')) { e.preventDefault(); loadSVGString(text) }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [loadSVGString])

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('[data-toolbar]')) return
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      dragRef.current.x = e.clientX
      dragRef.current.y = e.clientY
      const s = 0.5
      if (e.shiftKey) {
        setRz(z => clamp(z + dx * s, -180, 180))
      } else {
        setRx(x => clamp(x + dy * s, -180, 180))
        setRy(y => clamp(y + dx * s, -180, 180))
      }
    }
    const handleMouseUp = () => { dragRef.current.active = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    setZoom(z => clamp(z * delta, 0.1, 10))
  }, [])

  const undoRef = useRef(undo)
  undoRef.current = undo

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undoRef.current()
        return
      }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '1') {
        setRx(-35.264); setRy(45); setRz(0)
      } else if (e.key === '2') {
        setRx(-30); setRy(30); setRz(0)
      } else if (e.key === '0') {
        setRx(0); setRy(0); setRz(0); setZoom(1)
      } else if (e.key === 'g') {
        setShowGrid(v => !v)
      } else if (e.key === 'h') {
        setShowHandles(v => !v)
      } else if (e.key === '+' || e.key === '=') {
        setZoom(z => clamp(z * 1.15, 0.1, 10))
      } else if (e.key === '-') {
        setZoom(z => clamp(z * 0.87, 0.1, 10))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleExportSvg = useCallback(() => {
    const sd = svgDataRef.current
    if (!sd?.originalSvg) return
    const str = exportSVG(sd.originalSvg, rxRef.current, ryRef.current, rzRef.current, preserveStroke, extrudeRef.current, sd.shapes, sd.viewBox)
    downloadString(str, 'ortho-export.svg')
  }, [preserveStroke])

  const handleExportPng = useCallback(() => {
    const canvas = shaderEffectsRef.current.length > 0 && glCanvasRef.current ? glCanvasRef.current : canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'ortho-export.png'
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }, [])

  const handleExport4kImage = useCallback(() => {
    const sourceCanvas = canvasRef.current
    if (!sourceCanvas) return
    const W = 3840, H = 2160
    const offscreen = document.createElement('canvas')
    offscreen.width = W; offscreen.height = H
    const renderer = new SceneRenderer(offscreen)
    const sd = svgDataRef.current
    renderer.render(
      { rx: rxRef.current, ry: ryRef.current, rz: rzRef.current, zoom: zoomRef.current, extrudeDepth: extrudeRef.current,
        showGrid: showGridRef.current, showAxes: showAxesRef.current, showHandles: showHandlesRef.current, showBoundingBox: false },
      sd?.shapes || [], sd?.image, sd?.imgW || 0, sd?.imgH || 0,
      sd?.viewBox || { x: 0, y: 0, w: 100, h: 100 }, sceneStyle,
    )
    const effects = shaderEffectsRef.current
    if (effects.length > 0) {
      const glCanvas = document.createElement('canvas')
      glCanvas.width = W; glCanvas.height = H
      const pp = new ShaderPostProcessor(glCanvas)
      pp.setEffects(effects, shaderIntensitiesRef.current)
      pp.render(offscreen)
      glCanvas.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = 'ortho-4k.png'; a.click(); URL.revokeObjectURL(a.href)
        pp.destroy()
      }, 'image/png')
    } else {
      offscreen.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = 'ortho-4k.png'; a.click(); URL.revokeObjectURL(a.href)
      }, 'image/png')
    }
    renderer.destroy()
  }, [sceneStyle])

  const [recording, setRecording] = useState(false)
  const recorderRef = useRef(null)
  const recordChunksRef = useRef([])

  const handleRecordVideo = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    // Capture the live canvas directly — 1:1 with what's on screen
    const sourceCanvas = shaderEffectsRef.current.length > 0 && glCanvasRef.current
      ? glCanvasRef.current : canvasRef.current
    if (!sourceCanvas) return

    const stream = sourceCanvas.captureStream(60)
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 40_000_000 })
    recorderRef.current = recorder
    recordChunksRef.current = []

    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'
      a.download = `ortho-recording.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
      setRecording(false)
    }

    recorder.start()
    setRecording(true)
  }, [recording])

  const applyPreset = (name) => {
    const [px, py, pz] = PRESETS[name]
    setRx(px); setRy(py); setRz(pz)
  }

  const toggleSection = (name) => {
    setOpenSection(prev => prev === name ? null : name)
  }

  const updateStyle = (key, value) => {
    setSceneStyle(prev => ({ ...prev, [key]: value }))
  }

  // Helper to get hex + alpha from an rgba style value
  const getRgbaParts = (val) => {
    const parsed = parseRgba(val)
    const hex = parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : '#ffffff'
    const alpha = parsed ? parsed.a : 1
    return { hex, alpha }
  }

  const setRgbaColor = (key, currentVal, newHex) => {
    const { alpha } = getRgbaParts(currentVal)
    const { r, g, b } = hexToRgb(newHex)
    updateStyle(key, `rgba(${r}, ${g}, ${b}, ${alpha})`)
  }

  const setRgbaAlpha = (key, currentVal, newAlpha) => {
    const { hex } = getRgbaParts(currentVal)
    const { r, g, b } = hexToRgb(hex)
    updateStyle(key, `rgba(${r}, ${g}, ${b}, ${newAlpha})`)
  }

  const resetAll = useCallback(() => {
    setRx(-35.264); setRy(45); setRz(0)
    setExtrude(40); setZoom(1)
    setShowGrid(true); setShowAxes(true)
    setShowHandles(false); setShowBoundingBox(false)
    setPreserveStroke(true)
    setAutoRotate(false); setAutoRotateAxis('y'); setAutoRotateSpeed(1)
    setSceneStyle(DEFAULT_STYLE)
    setShaderEffects([]); setShaderIntensities({})
  }, [])

  const handleAiSubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return

    // Handle reset locally — no API call needed
    if (/^(reset|restart|default|clear|fresh|start over)s?$/i.test(aiPrompt.trim())) {
      resetAll()
      setAiPrompt('')
      return
    }

    setAiLoading(true)
    try {
      let apiKey = localStorage.getItem('openai_api_key')
      if (!apiKey) {
        apiKey = prompt('Enter your OpenAI API key:')
        if (!apiKey) return
        localStorage.setItem('openai_api_key', apiKey)
      }
      const currentState = {
        rx, ry, rz, extrude, zoom,
        showGrid, showAxes, showHandles, showBoundingBox, preserveStroke,
        autoRotate, autoRotateAxis, autoRotateSpeed,
        shaderEffects, shaderIntensities,
        ...sceneStyle,
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4.1-nano',
          temperature: 0.3,
          messages: [
            { role: 'system', content: `You are a creative theme engine for a 3D SVG viewer. Given the current settings and a user prompt, return ONLY a JSON object with the keys to change. No markdown, no explanation, no wrapping.

SETTINGS (return only keys you want to change):
- rx, ry, rz: rotation degrees (-180 to 180)
- extrude: extrusion depth (0-300)
- zoom: zoom level (0.1-10)
- showGrid, showAxes, showHandles, showBoundingBox, preserveStroke: boolean
- autoRotate: boolean
- autoRotateAxis: "x"|"y"|"xz"|"yz"
- autoRotateSpeed: 0.1-5
- shaderEffects: array of active effects, e.g. [] or ["neon"] or ["pencil","crt"]. Available: "pencil","neon","pixelate","crt","halftone","ascii","matrix". Multiple can be layered.
- shaderIntensities: object mapping effect name to intensity 0-2, e.g. {"neon":0.7,"crt":0.5}. Defaults to 0.5 for any effect not specified. Values above 1.0 overdrive the effect.

- canvasBg: hex color string (the background behind everything)
- gridColor: "rgba(r, g, b, a)" string
- extrusionColor: "rgba(r, g, b, a)" string (the 3D side faces)
- edgeColor: "rgba(r, g, b, a)" string (top edges)
- edgeSideColor: "rgba(r, g, b, a)" string (side edges)
- handleAnchorColor: hex string
- handleControlColor: hex string
- faceColor: hex string or null (tint overlay on the SVG face — null = original colors)
- faceOpacity: 0-1
- boundingBoxColor: "rgba(r, g, b, a)" string
- gridStrokeWidth, edgeStrokeWidth, edgeSideStrokeWidth, boundingBoxStrokeWidth, handleStrokeWidth: 0.25-4

THEMING GUIDE — when the user gives a vibe/mood/aesthetic, think holistically:
- "matrix" → shaderEffects:["matrix"], canvasBg:"#000000", extrusionColor green-tinted, edgeColor bright green, shaderIntensities:{"matrix":0.85}, faceColor:"#00ff00"
- "cyberpunk" / "neon" → shaderEffects:["neon"], canvasBg:"#0a0010", edgeColor hot pink/cyan, extrusionColor deep purple
- "retro" / "vhs" → shaderEffects:["crt"], canvasBg:"#1a1a2e", warm scanline colors
- "sketch" / "hand-drawn" → shaderEffects:["pencil"], canvasBg:"#f5f0e8" (paper), edgeColor dark, shaderIntensities:{"pencil":0.9}
- "pop art" → shaderEffects:["halftone"], bright saturated colors, canvasBg white or yellow
- "8bit" / "pixel" → shaderEffects:["pixelate"], bold primary colors
- "clean" / "minimal" → shaderEffects:[], canvasBg:"#050505", subtle edges, no grid
- "blueprint" → canvasBg:"#0d1b2a", edgeColor/gridColor white-blue, showGrid:true, showAxes:true
- "sunset" / "warm" → canvasBg warm dark, extrusionColor/edgeColor warm oranges/pinks, shaderEffects:["neon"] for glow
- "ice" / "frost" → canvasBg:"#0a1628", edgeColor icy cyan/white, extrusionColor blue-tinted
- "noir" / "dark" → canvasBg:"#000000", extrusionColor near-black, edgeColor dim white, high contrast
- "glitch" → shaderEffects:["crt","pixelate"], canvasBg dark, edgeColor bright, high intensity
- "dreamy" → shaderEffects:["neon"], low intensity ~0.4, soft pastel colors, canvasBg deep blue/purple
- "terminal" / "hacker" → same as matrix
- "comic" → shaderEffects:["halftone","pencil"], bold outlines, bright bg
- "vapor" / "vaporwave" → shaderEffects:["neon","crt"], pink/cyan/purple palette, canvasBg dark purple
Combine effects freely. Always change multiple settings together to create a cohesive theme. Don't just toggle one shader — also set colors, background, grid visibility, etc. to match the mood.

If the user says "more" or "intense", increase shaderIntensities values and push colors further. If "subtle" or "less", dial back.
If the user references a rotation like "spin", "rotate", enable autoRotate.

Current settings: ${JSON.stringify(currentState)}` },
            { role: 'user', content: aiPrompt }
          ]
        })
      })
      if (res.status === 401) {
        localStorage.removeItem('openai_api_key')
        alert('Invalid API key. Please try again.')
        return
      }
      const data = await res.json()
      let text = data.choices?.[0]?.message?.content?.trim()
      if (!text) return
      // Strip markdown code fences if the model wraps its response
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'')
      const changes = JSON.parse(text)

      const styleKeys = new Set(Object.keys(DEFAULT_STYLE))
      const setters = {
        rx: setRx, ry: setRy, rz: setRz, extrude: setExtrude, zoom: setZoom,
        showGrid: setShowGrid, showAxes: setShowAxes, showHandles: setShowHandles,
        showBoundingBox: setShowBoundingBox, preserveStroke: setPreserveStroke,
        autoRotate: setAutoRotate, autoRotateAxis: setAutoRotateAxis,
        autoRotateSpeed: setAutoRotateSpeed,
      }
      for (const [k, v] of Object.entries(changes)) {
        if (styleKeys.has(k)) { updateStyle(k, v); continue }
        if (k === 'shaderEffects') { setShaderEffects(Array.isArray(v) ? v : []); continue }
        if (k === 'shaderIntensities' && typeof v === 'object') { setShaderIntensities(prev => ({...prev, ...v})); continue }
        if (setters[k]) setters[k](v)
      }
      setAiPrompt('')
    } catch (e) {
      console.error('AI request failed:', e)
    } finally {
      setAiLoading(false)
    }
  }, [aiPrompt, aiLoading, resetAll, rx, ry, rz, extrude, zoom, showGrid, showAxes, showHandles, showBoundingBox, preserveStroke, autoRotate, autoRotateAxis, autoRotateSpeed, shaderEffects, shaderIntensities, sceneStyle])

  const sectionContent = {
    rotation: (
      <>
        <SectionLabel>Angles</SectionLabel>
        <SliderRow label="x" value={rx} min={-180} max={180} step={0.5} onChange={setRx} />
        <SliderRow label="y" value={ry} min={-180} max={180} step={0.5} onChange={setRy} />
        <SliderRow label="z" value={rz} min={-180} max={180} step={0.5} onChange={setRz} />
        <SectionLabel>Presets</SectionLabel>
        <div className="grid grid-cols-2 gap-1 [&>*]:mb-0">
          {Object.keys(PRESETS).map(name => (
            <CheckboxRow key={name} label={name} checked={activePreset === name} onChange={() => applyPreset(name)}
              onMouseEnter={() => { const [px,py,pz] = PRESETS[name]; pv({rx:px, ry:py, rz:pz}) }}
              onMouseLeave={() => pvEnd('rx','ry','rz')} />
          ))}
        </div>
      </>
    ),
    scene: (
      <>
        <SectionLabel>Background</SectionLabel>
        <StyleColorRow label="background" value={sceneStyle.canvasBg} onChange={v => updateStyle('canvasBg', v)}
          onPreview={v => pv({canvasBg: v})} onPreviewEnd={() => pvEnd('canvasBg')} />
        <SectionLabel>Overlays</SectionLabel>
        <CheckboxRow label="grid" checked={showGrid} onChange={setShowGrid}
          onMouseEnter={() => pv({showGrid: !showGrid})} onMouseLeave={() => pvEnd('showGrid')} />
        {showGrid && (
          <InlineSettings>
            <StyleSliderRow label="opacity" value={getRgbaParts(sceneStyle.gridColor).alpha} onChange={v => setRgbaAlpha('gridColor', sceneStyle.gridColor, v)} />
          </InlineSettings>
        )}
        <CheckboxRow label="axes" checked={showAxes} onChange={setShowAxes}
          onMouseEnter={() => pv({showAxes: !showAxes})} onMouseLeave={() => pvEnd('showAxes')} />
      </>
    ),
    shape: (
      <>
        <SectionLabel>Face</SectionLabel>
        <CheckboxRow label="tint" checked={sceneStyle.faceColor !== null} onChange={() => updateStyle('faceColor', sceneStyle.faceColor !== null ? null : '#ffffff')}
          onMouseEnter={() => pv({faceColor: sceneStyle.faceColor !== null ? null : '#ffffff'})} onMouseLeave={() => pvEnd('faceColor')} />
        {sceneStyle.faceColor !== null && (
          <InlineSettings>
            <StyleColorRow label="color" value={sceneStyle.faceColor} onChange={v => updateStyle('faceColor', v)}
              onPreview={v => pv({faceColor: v})} onPreviewEnd={() => pvEnd('faceColor')} />
          </InlineSettings>
        )}
        <StyleSliderRow label="opacity" value={sceneStyle.faceOpacity} onChange={v => updateStyle('faceOpacity', v)} />
        <CheckboxRow label="preserve stroke" checked={preserveStroke} onChange={setPreserveStroke} />

        <SettingsGroup label="Extrusion">
          <StyleColorRow label="extrusion" value={getRgbaParts(sceneStyle.extrusionColor).hex} onChange={v => setRgbaColor('extrusionColor', sceneStyle.extrusionColor, v)}
            onPreview={v => pvColor('extrusionColor', v)} onPreviewEnd={() => pvEnd('extrusionColor')} />
          <StyleSliderRow label="depth" value={extrude} min={0} max={300} step={1} onChange={setExtrude} />
          <StyleSliderRow label="opacity" value={getRgbaParts(sceneStyle.extrusionColor).alpha} onChange={v => setRgbaAlpha('extrusionColor', sceneStyle.extrusionColor, v)} />
        </SettingsGroup>

        <SettingsGroup label="Edges">
          <StyleColorRow label="edge color" value={getRgbaParts(sceneStyle.edgeColor).hex} onChange={v => setRgbaColor('edgeColor', sceneStyle.edgeColor, v)}
            onPreview={v => pvColor('edgeColor', v)} onPreviewEnd={() => pvEnd('edgeColor')} />
          <StyleSliderRow label="opacity" value={getRgbaParts(sceneStyle.edgeColor).alpha} onChange={v => setRgbaAlpha('edgeColor', sceneStyle.edgeColor, v)} />
          <StyleSliderRow label="stroke" value={sceneStyle.edgeStrokeWidth} min={0.25} max={4} step={0.25} onChange={v => updateStyle('edgeStrokeWidth', v)} />
          <StyleSliderRow label="side stroke" value={sceneStyle.edgeSideStrokeWidth} min={0.25} max={4} step={0.25} onChange={v => updateStyle('edgeSideStrokeWidth', v)} />
        </SettingsGroup>

        <SettingsGroup label="Debug">
          <CheckboxRow label="handles" checked={showHandles} onChange={setShowHandles}
            onMouseEnter={() => pv({showHandles: !showHandles})} onMouseLeave={() => pvEnd('showHandles')} />
          {showHandles && (
            <InlineSettings>
              <StyleColorRow label="anchor" value={sceneStyle.handleAnchorColor} onChange={v => updateStyle('handleAnchorColor', v)}
                onPreview={v => pv({handleAnchorColor: v})} onPreviewEnd={() => pvEnd('handleAnchorColor')} />
              <StyleColorRow label="control" value={sceneStyle.handleControlColor} onChange={v => updateStyle('handleControlColor', v)}
                onPreview={v => pv({handleControlColor: v})} onPreviewEnd={() => pvEnd('handleControlColor')} />
              <StyleSliderRow label="stroke" value={sceneStyle.handleStrokeWidth} min={0.25} max={4} step={0.25} onChange={v => updateStyle('handleStrokeWidth', v)} />
            </InlineSettings>
          )}
          <CheckboxRow label="bounding box" checked={showBoundingBox} onChange={setShowBoundingBox}
            onMouseEnter={() => pv({showBoundingBox: !showBoundingBox})} onMouseLeave={() => pvEnd('showBoundingBox')} />
          {showBoundingBox && (
            <InlineSettings>
              <StyleColorRow label="color" value={getRgbaParts(sceneStyle.boundingBoxColor).hex} onChange={v => setRgbaColor('boundingBoxColor', sceneStyle.boundingBoxColor, v)}
                onPreview={v => pvColor('boundingBoxColor', v)} onPreviewEnd={() => pvEnd('boundingBoxColor')} />
              <StyleSliderRow label="opacity" value={getRgbaParts(sceneStyle.boundingBoxColor).alpha} onChange={v => setRgbaAlpha('boundingBoxColor', sceneStyle.boundingBoxColor, v)} />
              <StyleSliderRow label="stroke" value={sceneStyle.boundingBoxStrokeWidth} min={0.25} max={4} step={0.25} onChange={v => updateStyle('boundingBoxStrokeWidth', v)} />
            </InlineSettings>
          )}
        </SettingsGroup>
      </>
    ),
    animate: (
      <>
        <CheckboxRow label="auto-rotate" checked={autoRotate} onChange={setAutoRotate} />
        {autoRotate && (
          <InlineSettings>
            <SliderRow label="spd" value={autoRotateSpeed} min={0.1} max={5} step={0.1} onChange={setAutoRotateSpeed} />
            {['y', 'x', 'xz', 'yz'].map(axis => (
              <CheckboxRow key={axis} label={axis} checked={autoRotateAxis === axis} onChange={() => setAutoRotateAxis(axis)} />
            ))}
          </InlineSettings>
        )}
      </>
    ),
    effects: (
      <>
        {SHADER_EFFECTS.map(name => (
          <StyleSliderRow key={name} label={name} min={0} max={2} step={0.01}
            value={shaderIntensities[name] ?? 0}
            onChange={v => {
              setShaderIntensities(prev => ({...prev, [name]: v}))
              if (v > 0 && !shaderEffects.includes(name)) {
                setShaderEffects(prev => [...prev, name])
              } else if (v === 0 && shaderEffects.includes(name)) {
                setShaderEffects(prev => prev.filter(n => n !== name))
              }
            }} />
        ))}
      </>
    ),
    file: (
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Import / Export</SectionLabel>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} className="w-full justify-between">
          <span>Load SVG</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="10" x2="6" y2="2" />
            <polyline points="2.5,5.5 6,2 9.5,5.5" />
          </svg>
        </Button>
        <Button size="sm" onClick={handleExportSvg} className="w-full justify-between">
          <span>Export SVG</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="2" x2="6" y2="10" />
            <polyline points="2.5,6.5 6,10 9.5,6.5" />
          </svg>
        </Button>
        <Button size="sm" onClick={handleExportPng} className="w-full justify-between">
          <span>Export PNG</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="2" x2="6" y2="10" />
            <polyline points="2.5,6.5 6,10 9.5,6.5" />
          </svg>
        </Button>
        <Button size="sm" onClick={handleExport4kImage} className="w-full justify-between">
          <span>Export 4K</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="2" x2="6" y2="10" />
            <polyline points="2.5,6.5 6,10 9.5,6.5" />
          </svg>
        </Button>
        <Button size="sm" onClick={handleRecordVideo} className={`w-full justify-between ${recording ? '!bg-[oklch(0.35_0.08_25)]' : ''}`}>
          <span className={recording ? 'text-[oklch(0.65_0.2_25)]' : ''}>{recording ? 'Stop' : 'Record'}</span>
          {recording ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-[oklch(0.65_0.2_25)]">
              <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="2" x2="6" y2="10" />
              <polyline points="2.5,6.5 6,10 9.5,6.5" />
            </svg>
          )}
        </Button>

        <SectionLabel>Settings</SectionLabel>
        <Button size="sm" onClick={() => {
          const settings = {
            rx, ry, rz, extrude, zoom,
            showGrid, showAxes, showHandles, showBoundingBox, preserveStroke,
            autoRotate, autoRotateAxis, autoRotateSpeed,
            sceneStyle, shaderEffects, shaderIntensities,
          }
          navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
          setSettingsCopied(true)
          setTimeout(() => setSettingsCopied(false), 1500)
        }} className="w-full">
          <span>{settingsCopied ? 'Copied!' : 'Copy settings'}</span>
        </Button>
        <Button size="sm" onClick={() => setShowSettingsImport(v => !v)} className="w-full">
          <span>Paste settings</span>
        </Button>
        {showSettingsImport && (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={settingsImportText}
              onChange={e => setSettingsImportText(e.target.value)}
              placeholder="Paste settings JSON here..."
              className="w-full h-[80px] rounded-[8px] bg-white/5 border border-white/10 px-3 py-2 text-[11px] font-mono text-white/70 placeholder-white/30 outline-none resize-none focus:border-white/20"
            />
            <Button size="sm" onClick={() => {
              try {
                const s = JSON.parse(settingsImportText)
                if (s.rx != null) setRx(s.rx)
                if (s.ry != null) setRy(s.ry)
                if (s.rz != null) setRz(s.rz)
                if (s.extrude != null) setExtrude(s.extrude)
                if (s.zoom != null) setZoom(s.zoom)
                if (s.showGrid != null) setShowGrid(s.showGrid)
                if (s.showAxes != null) setShowAxes(s.showAxes)
                if (s.showHandles != null) setShowHandles(s.showHandles)
                if (s.showBoundingBox != null) setShowBoundingBox(s.showBoundingBox)
                if (s.preserveStroke != null) setPreserveStroke(s.preserveStroke)
                if (s.autoRotate != null) setAutoRotate(s.autoRotate)
                if (s.autoRotateAxis != null) setAutoRotateAxis(s.autoRotateAxis)
                if (s.autoRotateSpeed != null) setAutoRotateSpeed(s.autoRotateSpeed)
                if (s.sceneStyle) setSceneStyle(prev => ({ ...prev, ...s.sceneStyle }))
                if (s.shaderEffects) setShaderEffects(s.shaderEffects)
                if (s.shaderIntensities) setShaderIntensities(prev => ({ ...prev, ...s.shaderIntensities }))
                setShowSettingsImport(false)
                setSettingsImportText('')
              } catch {
                // invalid JSON — ignore
              }
            }} className="w-full justify-center">
              <span>Apply</span>
            </Button>
          </div>
        )}
      </div>
    ),
  }

  const SECTIONS = ['rotation', 'scene', 'shape', 'animate', 'effects', 'file']

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: 'oklch(0.06 0 0)' }}>
      {/* ── Canvas viewport ── */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <canvas ref={glCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: ('shaderEffects' in preview ? preview.shaderEffects : shaderEffects).length > 0 ? 'block' : 'none' }} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="absolute bottom-3 left-3 text-[12px] px-2 py-1 pointer-events-none" style={{ color: 'oklch(0.55 0 0)', background: 'oklch(0.08 0 0)', border: '1px solid oklch(0.18 0 0)' }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* ── Bottom toolbar ── */}
      <div
        data-toolbar
        className="absolute bottom-5 right-5 select-none flex flex-col"
        style={{ width: TOOLBAR_W }}
      >
        <AnimatePresence initial={false}>
          {toolbarOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.05 }}
              className="rounded-t-[32px] backdrop-blur-[40px] overflow-hidden"
              style={{ background: '#111111' }}
            >
              <div style={{ padding: '24px 24px 12px' }}>
                {(() => {
                  const visibleSections = SECTIONS.filter(name =>
                    openSection === null || openSection === name
                  )
                  return visibleSections.map((name, i) => {
                    const isOpen = openSection === name
                    return (
                      <div key={name}>
                        {i > 0 && !isOpen && <div className="border-t border-white/[0.06] my-2" />}
                        <div
                          className="flex items-center justify-between py-1.5 cursor-pointer group"
                          onClick={() => toggleSection(name)}
                        >
                          <span className={`text-[13px] font-semibold transition-colors ${isOpen ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                            {name}
                          </span>
                          {isOpen && (
                            <div className="text-white/50 hover:text-white transition-colors">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="4" y1="7" x2="10" y2="7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {isOpen && (
                          <div className="pt-2 pb-2 max-h-[480px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {sectionContent[name]}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* AI input — always visible at bottom */}
        <div className={`backdrop-blur-[40px] ${toolbarOpen ? 'rounded-b-[32px]' : 'rounded-[32px]'}`} style={{ background: '#111111' }}>
          <div style={{ padding: '20px 24px' }}>
            <div className="flex items-center">
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                placeholder={aiLoading ? 'applying...' : 'describe changes'}
                disabled={aiLoading}
                className="flex-1 bg-transparent text-[13px] font-medium text-white/70 placeholder-white/40 outline-none disabled:opacity-50"
              />
              {aiPrompt.trim() ? (
                <div
                  className="cursor-pointer text-white/60 hover:text-white/95 shrink-0"
                  onClick={handleAiSubmit}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="10" x2="6" y2="2" />
                    <polyline points="2.5,5.5 6,2 9.5,5.5" />
                  </svg>
                </div>
              ) : (
                <div
                  className="cursor-pointer text-white/60 hover:text-white/95 shrink-0 flex flex-col items-center gap-[3px]"
                  onClick={() => { setToolbarOpen(v => !v); if (toolbarOpen) setOpenSection(null) }}
                >
                  <div className="w-[10px] h-[2px] rounded-full bg-current" />
                  <div className="w-[10px] h-[2px] rounded-full bg-current" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div className="text-[11px] font-medium text-white/40 tracking-wide mt-3 mb-1.5">{children}</div>
}

function InlineSettings({ children }) {
  return <div className="flex flex-col [&>*]:!mb-1 [&_.dialkit-slider-wrapper]:!mb-1">{children}</div>
}

function SettingsGroup({ label, children }) {
  return (
    <div className="mt-1">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="flex flex-col [&>*]:!mb-1 [&_.dialkit-slider-wrapper]:!mb-1">{children}</div>
    </div>
  )
}

const COLOR_PRESETS = [
  '#d4820a', '#d4440a', '#a8c928', '#22b84a', '#1a8fd4', '#7a2ad4', '#c42aad',
]

function oklchToHex(str) {
  const m = str.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!m) return str
  // Use a temporary element to resolve oklch to rgb
  const el = document.createElement('div')
  el.style.color = str
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)
  const rgb = computed.match(/(\d+)/g)
  if (!rgb || rgb.length < 3) return str
  return '#' + rgb.slice(0, 3).map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
}

function normalizeToHex(val) {
  if (val.startsWith('#')) return val
  if (val.startsWith('oklch')) return oklchToHex(val)
  // Try rgba
  const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
  return val
}

function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex)
  const r1 = r / 255, g1 = g / 255, b1 = b / 255
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r1) h = ((g1 - b1) / d + 6) % 6
    else if (max === g1) h = (b1 - r1) / d + 2
    else h = (r1 - g1) / d + 4
    h *= 60
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToHex(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r1, g1, b1
  if (h < 60) { r1 = c; g1 = x; b1 = 0 }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0 }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }
  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`
}

function InlineColorPicker({ value, onChange }) {
  const padRef = useRef(null)
  const hsv = hexToHsv(normalizeToHex(value))
  const [hue, setHue] = useState(hsv.h)
  const [sat, setSat] = useState(hsv.s)
  const [val, setVal] = useState(hsv.v)
  const draggingRef = useRef(null)

  // Sync from external value changes
  const prevValue = useRef(value)
  if (value !== prevValue.current) {
    prevValue.current = value
    const next = hexToHsv(normalizeToHex(value))
    if (Math.abs(next.h - hue) > 1 || Math.abs(next.s - sat) > 0.01 || Math.abs(next.v - val) > 0.01) {
      setHue(next.h); setSat(next.s); setVal(next.v)
    }
  }

  const emit = (h, s, v) => onChange(hsvToHex(h, s, v))

  const handlePadPointer = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newS = x, newV = 1 - y
    setSat(newS); setVal(newV)
    emit(hue, newS, newV)
  }, [hue])

  const handleHuePointer = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newH = x * 360
    setHue(newH)
    emit(newH, sat, val)
  }, [sat, val])

  const onPointerDown = useCallback((type) => (e) => {
    e.preventDefault()
    e.target.setPointerCapture(e.pointerId)
    draggingRef.current = type
    if (type === 'pad') handlePadPointer(e)
    else handleHuePointer(e)
  }, [handlePadPointer, handleHuePointer])

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    if (draggingRef.current === 'pad') handlePadPointer(e)
    else handleHuePointer(e)
  }, [handlePadPointer, handleHuePointer])

  const onPointerUp = useCallback(() => { draggingRef.current = null }, [])

  const pureHueColor = hsvToHex(hue, 1, 1)

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {/* Saturation/Value pad */}
      <div
        ref={padRef}
        className="relative w-full h-[120px] rounded-[8px] cursor-crosshair select-none touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHueColor})`,
        }}
        onPointerDown={onPointerDown('pad')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white pointer-events-none"
          style={{
            left: `calc(${sat * 100}% - 6px)`,
            top: `calc(${(1 - val) * 100}% - 6px)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.4)',
          }}
        />
      </div>
      {/* Hue strip */}
      <div
        className="relative w-full h-[28px] rounded-full cursor-pointer select-none touch-none"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        }}
        onPointerDown={onPointerDown('hue')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white pointer-events-none -translate-y-1/2"
          style={{
            left: `calc(${(hue / 360) * 100}% - 6px)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </div>
  )
}

function StyleColorRow({ label, value, onChange, onPreview, onPreviewEnd }) {
  const [showPicker, setShowPicker] = useState(false)
  const hexValue = normalizeToHex(value)
  const isPreset = COLOR_PRESETS.includes(hexValue)
  return (
    <div className="rounded-[8px] bg-white/5 px-3 pt-2.5 pb-2.5 mb-1.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-white/70">{label}</span>
        <span className="text-[11px] font-medium text-white/40 font-mono">{hexValue}</span>
      </div>
      <div className="flex gap-1 items-center">
        {COLOR_PRESETS.map(c => (
          <div
            key={c}
            className={`flex-1 h-[28px] rounded-full cursor-pointer transition-opacity border border-white/20 ${hexValue === c ? 'ring-1 ring-white/50' : 'opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: c }}
            onClick={() => { onChange(c); setShowPicker(false) }}
            onMouseEnter={() => onPreview?.(c)}
            onMouseLeave={() => onPreviewEnd?.()}
          />
        ))}
        <div
          className={`flex-1 h-[28px] rounded-full cursor-pointer relative overflow-hidden transition-opacity border border-white/20 ${showPicker || !isPreset ? 'ring-1 ring-white/50' : 'opacity-60 hover:opacity-100'}`}
          style={{ background: showPicker ? hexValue : 'linear-gradient(90deg, #d4440a, #d4820a, #a8c928, #22b84a, #1a8fd4, #7a2ad4, #c42aad)' }}
          onClick={() => setShowPicker(v => !v)}
        />
      </div>
      {showPicker && <InlineColorPicker value={hexValue} onChange={onChange} />}
    </div>
  )
}

function StyleSliderRow({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <Slider label={label} value={value} onChange={onChange} min={min} max={max} step={step} />
  )
}

const AXIS_COLORS = { x: 'oklch(0.63 0.26 29)', y: 'oklch(0.72 0.19 145)', z: 'oklch(0.68 0.16 250)' }

function SliderRow({ label, value, min, max, step, onChange }) {
  const color = AXIS_COLORS[label] || undefined
  return (
    <Slider label={label} value={value} onChange={onChange} min={min} max={max} step={step} labelColor={color} />
  )
}

function CheckboxRow({ label, checked, onChange, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className="h-[36px] px-3 bg-white/5 rounded-[8px] flex items-center justify-between cursor-pointer group hover:bg-white/[0.08] transition-colors mb-1.5"
      onClick={() => onChange(!checked)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label && <span className={`text-[13px] font-medium ${checked ? 'text-white/95' : 'text-white/70'}`}>{label}</span>}
      <div
        className="w-2 h-2 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: checked ? '#ffffff' : 'rgba(255, 255, 255, 0.15)' }}
      />
    </div>
  )
}
