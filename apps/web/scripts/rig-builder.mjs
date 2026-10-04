// Uso: node rig-builder.mjs <input.glb> <output.glb>  (poi: gltf-transform resize 2048, webp, meshopt)
// Auto-rig umanoide procedurale per il Builder (mesh A-pose, Y up, fronte +X, destra +Z)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc = await io.read(process.argv[2]);
const root = doc.getRoot(), buf = root.listBuffers()[0];
const scene = root.listScenes()[0], meshNode = root.listNodes()[0];
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION');

// joint: [nome, padre, posizione mondo, raggio "carne" del segmento verso il figlio]
const J = [];
const add = (name, parent, pos, r) => (J.push({ name, parent, pos, r }), J.length - 1);
const hips = add('Hips', -1, [0, -0.11, 0], 0.13);
const spine = add('Spine', hips, [0, 0.0, 0], 0.14);
const chest = add('Chest', spine, [0, 0.11, 0], 0.13);
const neck = add('Neck', chest, [0, 0.20, 0], 0.08);
const head = add('Head', neck, [0, 0.25, 0], 0.14);
const headEnd = add('HeadEnd', head, [0, 0.49, 0], 0);
const side = (s, S) => {
  const sh = add(S + 'Shoulder', chest, [0, 0.165, 0.07 * s], 0.06);
  const ua = add(S + 'UpperArm', sh, [0, 0.155, 0.155 * s], 0.055);
  const la = add(S + 'LowerArm', ua, [0, 0.045, 0.245 * s], 0.05);
  const ha = add(S + 'Hand', la, [0, -0.05, 0.31 * s], 0.045);
  add(S + 'HandEnd', ha, [0, -0.15, 0.35 * s], 0);
  const ul = add(S + 'UpperLeg', hips, [0, -0.14, 0.072 * s], 0.075);
  const ll = add(S + 'LowerLeg', ul, [0, -0.30, 0.072 * s], 0.065);
  const ft = add(S + 'Foot', ll, [0, -0.425, 0.072 * s], 0.07);
  add(S + 'Toe', ft, [0.09, -0.46, 0.072 * s], 0);
};
side(1, 'R'); side(-1, 'L');

// segmenti deformanti: ogni joint con un figlio "principale"
const childOf = i => J.findIndex((j, k) => j.parent === i && !/Shoulder|UpperLeg/.test(j.name) || (j.parent === i && J[i].name !== 'Hips' && J[i].name !== 'Chest' && j.parent === i));
const segs = J.map((j, i) => {
  const kids = J.map((c, k) => [c, k]).filter(([c]) => c.parent === i);
  if (!kids.length) return null;
  // per Hips e Chest il segmento va lungo la colonna
  const k = kids.find(([c]) => /Spine|Neck/.test(c.name)) || kids[0];
  return { i, a: j.pos, b: k[0].pos, r: j.r };
}).filter(Boolean);

const segDist = (p, a, b) => {
  const ab = b.map((x, k) => x - a[k]), ap = p.map((x, k) => x - a[k]);
  const t = Math.max(0, Math.min(1, ap.reduce((s, x, k) => s + x * ab[k], 0) / ab.reduce((s, x) => s + x * x, 0)));
  return Math.hypot(...p.map((x, k) => x - (a[k] + ab[k] * t)));
};
const allowed = (p, name) => {
  const s = p[2] >= 0 ? 'R' : 'L';
  if (/^[LR]/.test(name) && name[0] !== s) return false;          // niente pesi incrociati
  if (p[1] > 0.27) return name === 'Head';                        // testa rigida
  if (p[1] < -0.17) return /(Upper|Lower)Leg|Foot/.test(name);     // gambe
  if (/Leg|Foot/.test(name) && p[1] > -0.06) return false;
  if (/Arm|Hand/.test(name) && Math.abs(p[2]) < 0.13) return false; // il busto non segue le braccia
  return true;
};
const n = P.getCount(), joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
const v = [0, 0, 0];
for (let i = 0; i < n; i++) {
  P.getElement(i, v);
  const sc = segs.filter(s => allowed(v, J[s.i].name)).map(s => {
    const d = Math.max(0.004, segDist(v, s.a, s.b) - s.r * 0.6);
    return [s.i, 1 / Math.pow(d, 4)];
  }).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tot = sc.reduce((s, x) => s + x[1], 0);
  sc.forEach(([j, w], k) => { joints[i * 4 + k] = j; weights[i * 4 + k] = w / tot; });
}
prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(joints).setBuffer(buf));
prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(weights).setBuffer(buf));

// nodi ossa
const nodes = J.map(j => doc.createNode(j.name));
J.forEach((j, i) => {
  const pp = j.parent < 0 ? [0, 0, 0] : J[j.parent].pos;
  nodes[i].setTranslation(j.pos.map((x, k) => x - pp[k]));
  if (j.parent < 0) scene.addChild(nodes[i]); else nodes[j.parent].addChild(nodes[i]);
});
const ibm = new Float32Array(J.length * 16);
J.forEach((j, i) => { const m = [1,0,0,0, 0,1,0,0, 0,0,1,0, -j.pos[0],-j.pos[1],-j.pos[2],1]; ibm.set(m, i * 16); });
const skin = doc.createSkin('BuilderRig').setSkeleton(nodes[0])
  .setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
nodes.forEach(nd => skin.addJoint(nd));
meshNode.setName('Builder').setSkin(skin);
root.listExtensionsUsed().forEach(e => /meshopt|quantiz/i.test(e.extensionName) && e.dispose());
await io.write(process.argv[3], doc);
console.log('rig ok', J.length, 'joints');
