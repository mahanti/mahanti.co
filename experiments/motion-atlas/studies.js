/* 20 geometric systems × 5 compositions. All positions are procedural. */
export const families = [
  ['orbits', 'Orbits', ['Satellite', 'Double sun', 'Orbital braid', 'Inclined paths', 'Epicycle'], 'Circles travel along nested orbital paths.'],
  ['contours', 'Contours', ['Breathing rings', 'Soft square', 'Diamond echo', 'Offset contours', 'Pinched circles'], 'Nested outlines expand, contract, and drift in phase.'],
  ['waves', 'Waves', ['Sine field', 'Standing wave', 'Cross current', 'Ribbon tide', 'Wave packet'], 'Phase offsets turn a series of lines into a traveling wave.'],
  ['grids', 'Grids', ['Magnetic field', 'Ripple mesh', 'Rotating cells', 'Lens field', 'Diagonal pulse'], 'A regular grid responds to a moving geometric field.'],
  ['depth', 'Perspective', ['Horizon', 'Runway', 'Vanishing squares', 'Star corridor', 'Descending steps'], 'Repeating lines and shapes move through simulated depth.'],
  ['radial', 'Radial', ['Sun dial', 'Iris', 'Turbine', 'Radial tide', 'Spoke wheel'], 'Repeated spokes rotate and breathe around a shared center.'],
  ['pendulums', 'Pendulums', ['Pendulum choir', 'Double swing', 'Hanging wave', 'Counterweights', 'Metronomes'], 'Related oscillations gradually separate and align again.'],
  ['ribbons', 'Ribbons', ['Helix', 'Twisted ladder', 'Double ribbon', 'Ribbon fan', 'Woven loop'], 'Two wave paths twist around one another, joined by fine lines.'],
  ['polygons', 'Polygons', ['Triangle cascade', 'Square procession', 'Pentagon drift', 'Hexagon chamber', 'Octagon bloom'], 'Nested polygons rotate at different phases and scales.'],
  ['spirals', 'Spirals', ['Coil', 'Twin spiral', 'Spiral beads', 'Square spiral', 'Unwinding'], 'A rotating path winds around a slowly changing center.'],
  ['interference', 'Interference', ['Two sources', 'Line moiré', 'Circle moiré', 'Crosshatch', 'Wave collision'], 'Overlapping simple patterns produce complex moving interference.'],
  ['particles', 'Particles', ['Phyllotaxis', 'Orbit cloud', 'Breathing cloud', 'Vortex', 'Rain circle'], 'Small points follow ordered paths rather than random motion.'],
  ['tiles', 'Tiles', ['Domino wave', 'Checker turn', 'Diamond tiles', 'Scale field', 'Sliding rows'], 'A wave of rotation or translation passes through repeated tiles.'],
  ['arcs', 'Arcs', ['Arc relay', 'Broken circles', 'Crescent fan', 'Clockwork', 'Open orbit'], 'Incomplete circles trade alignment as they turn.'],
  ['scans', 'Scans', ['Line scanner', 'Radar sweep', 'Window study', 'Moving comb', 'Contour scan'], 'An accent moves across an otherwise ordered white structure.'],
  ['lattices', 'Lattices', ['Diamond net', 'Elastic net', 'Hexagonal net', 'String loom', 'Rotating weave'], 'Connected lines form a lattice that shifts and deforms.'],
  ['portals', 'Portals', ['Square portal', 'Round portal', 'Triangle portal', 'Offset portal', 'Twisted portal'], 'Successive outlines emerge from the center and expand outward.'],
  ['traces', 'Traces', ['Lissajous', 'Figure eight', 'Rose curve', 'Spirograph', 'Rolling circle'], 'A moving accent traces a closed mathematical curve.'],
  ['balance', 'Balance', ['Mobile', 'See-saw', 'Three bodies', 'Balance beam', 'Suspended rings'], 'A small set of shapes trades weight around a center.'],
  ['folds', 'Folds', ['Accordion', 'Turning planes', 'Paper fan', 'Cube turn', 'Hinged squares'], 'Flat outlines appear to fold through rotation and projection.'],
];
const accents = ['#f09a66','#91c6ec','#c0a0f1','#e5ca79','#93c8b4','#ed969f','#adbdf2','#cbda94','#d5a4df','#79c9d1','#e6ad87','#9dcb99','#c3b1ee','#edb2cd','#94b9de','#d5c891','#b1d8cc','#e09c83','#a4b1ed','#c9cc7d'];
export const studies = families.flatMap(([family, label, names, description], f) => names.map((name, variant) => ({
  id: f * 5 + variant + 1, family, label, name, variant, description,
  accent: accents[(f * 7 + variant * 3) % accents.length],
  background: ['#161616','#1c1c1c','#202020','#181818','#242424'][(f + variant) % 5],
  duration: [16, 20, 24, 18, 22][variant],
})));
