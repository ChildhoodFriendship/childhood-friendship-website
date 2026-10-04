/**
 * Animazione procedurale del Builder sullo scheletro generato da `scripts/rig-builder.mjs`.
 *
 * Spazio del modello: Y in alto, fronte +X, destra del personaggio +Z. Le ossa hanno rotazione
 * di riposo nulla, quindi gli assi locali coincidono con quelli del modello:
 *  - rot X sul braccio destro: + abbassa verso il fianco, − alza di lato (specchiato a sinistra)
 *  - rot Z: + porta braccia/gambe in avanti, sul collo/testa − annuisce in avanti
 *  - rot Y: gira busto e testa (+ verso la destra del personaggio)
 *
 * Le pose sono strati additivi pesati (GSAP anima i pesi): riposo + gesto + sguardo + respiro.
 * Sopra le pose, una IK a due ossa tiene le mani agganciate al dispositivo che il Builder regge.
 */
import * as THREE from 'three';
import gsap from 'gsap';

type Rot = [number, number, number];
type Pose = Record<string, Rot>;

export type BuilderMode = 'hero' | 'present' | 'listen' | 'design' | 'build' | 'care' | 'welcome';

const SIDES = ['R', 'L'] as const;

/** Pose definite sul lato destro: `sym` le specchia sul sinistro (X e Y cambiano segno). */
function sym(p: Pose): Pose {
  const out: Pose = {};
  for (const [k, v] of Object.entries(p)) {
    out[k] = v;
    if (k.startsWith('R')) out['L' + k.slice(1)] = [-v[0], -v[1], v[2]];
  }
  return out;
}

// Riposo: dall'A-pose del modello a braccia rilassate lungo i fianchi
const RELAX: Pose = sym({
  RShoulder: [0.08, 0, 0],
  RUpperArm: [0.62, 0, 0.06],
  RLowerArm: [0.12, 0, 0.18],
  RHand: [0.05, 0, 0.05]
});

type Gesture = 'wave' | 'present' | 'listen' | 'design' | 'build' | 'care' | 'welcome' | 'crouch' | 'cheer';
type Weights = Record<Gesture, number>;

// Gesti: delta rispetto al riposo
const POSES: Record<Gesture, Pose> = {
  // saluto con la destra: braccio alto di lato, avambraccio verticale
  wave: { RShoulder: [-0.3, 0, 0], RUpperArm: [-1.8, 0, 0.2], RLowerArm: [-1.45, 0, 0.15], Chest: [0.05, 0, 0], Head: [0.08, 0, 0] },
  // mostra lo schermo: petto aperto, sguardo verso chi guarda, mani sotto il dispositivo
  present: { ...sym({ RHand: [0, 0, -0.35] }), Chest: [0, 0, 0.04], Head: [0, 0, 0.06] },
  // ascoltiamo: si sporge, testa inclinata, mano dietro l'orecchio
  listen: { Spine: [0, 0, -0.12], Chest: [0.05, 0, -0.06], Head: [0.26, 0.15, -0.06], RShoulder: [-0.15, 0, 0], RUpperArm: [-1.05, 0, 0.1], RLowerArm: [-2.35, 0, 0.15], RHand: [0, 0.6, 0] },
  // progettiamo: braccia conserte, mano verso il mento, testa inclinata
  design: { RUpperArm: [0.2, 0.55, 0.75], RLowerArm: [0, 0.2, 2.45], RHand: [0, 0, -0.6], LUpperArm: [-0.2, -0.75, 0.5], LLowerArm: [0, 0, 1.45], Head: [0.12, -0.15, 0.08], Chest: [0, 0, -0.04] },
  // costruiamo: braccio destro che batte (martello invisibile), postura solida
  build: { ...sym({ RUpperLeg: [-0.06, 0, 0.12], RLowerLeg: [0, 0, -0.22], RFoot: [0, 0, 0.1] }), RUpperArm: [-0.3, 0.3, 1.2], RLowerArm: [0, 0, 1.0], LUpperArm: [-0.15, -0.4, 0.5], LLowerArm: [0, 0, 0.9], Spine: [0, 0.15, -0.08], Head: [0, 0.2, -0.15] },
  // restiamo: mano tesa verso chi guarda, testa che annuisce
  care: { RUpperArm: [0.1, 0.35, 0.55], RLowerArm: [0, 0, 1.75], RHand: [-0.6, 0, 0], Chest: [0, 0.1, 0.04], Head: [0, 0.1, 0.06] },
  // finale: braccia aperte, petto in fuori
  welcome: { ...sym({ RShoulder: [-0.12, 0, 0], RUpperArm: [-1.05, 0, 0.45], RLowerArm: [-0.2, 0, 0.35], RHand: [0, 0, 0.2] }), Chest: [0, 0, 0.08], Head: [0, 0, 0.1] },
  // accovacciato (anticipo del salto e atterraggio)
  crouch: { ...sym({ RUpperLeg: [0, 0, 0.7], RLowerLeg: [0, 0, -1.3], RFoot: [0, 0, 0.6], RUpperArm: [-0.15, 0, -0.35] }), Spine: [0, 0, -0.18], Head: [0, 0, 0.12] },
  // in aria: braccia su, gambe raccolte
  cheer: { ...sym({ RShoulder: [-0.25, 0, 0], RUpperArm: [-2.0, 0, 0.3], RLowerArm: [-0.3, 0, 0.1], RUpperLeg: [0, 0, 0.35], RLowerLeg: [0, 0, -0.6] }), Head: [0, 0, 0.12] }
};

const GESTURES = Object.keys(POSES) as Gesture[];
const MODES = ['present', 'listen', 'design', 'build', 'care', 'welcome'] as const;
const HIPS_DROP = 0.058; // quanto scendono le anche nell'accovacciata

export class BuilderRig {
  private readonly bones = new Map<string, THREE.Bone>();
  private readonly rest = new Map<string, THREE.Quaternion>();
  private hipsRestY = 0;
  /** Pesi animati da GSAP. */
  readonly w: Weights = { wave: 0, present: 0, listen: 0, design: 0, build: 0, care: 0, welcome: 0, crouch: 0, cheer: 0 };
  private mode: BuilderMode | null = null;
  private readonly look = new THREE.Vector2();
  private idleTimer?: gsap.core.Tween;
  private readonly e = new THREE.Euler();
  private readonly q = new THREE.Quaternion();
  private busy = false;
  /** Prese delle mani sul dispositivo (spazio mondo) e quanto pesano. */
  private readonly grip = { R: new THREE.Vector3(), L: new THREE.Vector3(), weight: 0 };
  private readonly v = Array.from({ length: 8 }, () => new THREE.Vector3());
  private readonly qa = new THREE.Quaternion();
  private readonly qb = new THREE.Quaternion();

  constructor(private readonly model: THREE.Object3D, private readonly reduced = false) {
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        this.bones.set(o.name, o as THREE.Bone);
        this.rest.set(o.name, o.quaternion.clone());
      }
    });
    this.hipsRestY = this.bones.get('Hips')?.position.y ?? 0;
  }

  get ok(): boolean { return this.bones.size > 10; }

  /** Il punto da guardare, normalizzato (-1..1) come il puntatore. */
  setLook(x: number, y: number): void { this.look.set(x, y); }

  /** Dove devono stare i polsi (mondo) per reggere il dispositivo; weight 0 = mani libere. */
  setGrip(right: THREE.Vector3, left: THREE.Vector3, weight: number): void {
    this.grip.R.copy(right);
    this.grip.L.copy(left);
    this.grip.weight = weight;
  }

  /** Cambia "recitazione" con una transizione morbida (blend dei pesi). */
  setMode(mode: BuilderMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (this.busy) return; // finito il salto riprende la modalità corrente
    this.blendTo(mode);
  }

  private blendTo(mode: BuilderMode): void {
    const to: Partial<Weights> = {};
    for (const g of MODES) to[g] = g === mode ? 1 : 0;
    gsap.to(this.w, { ...to, duration: this.reduced ? 0 : 0.9, ease: 'power3.inOut', overwrite: 'auto' });
    this.idleTimer?.kill();
    if (mode === 'hero' && !this.reduced) this.scheduleWave(5);
    if (mode === 'welcome' && !this.reduced) this.scheduleWave(1.2);
  }

  /** Saluto: entrata, oscillazioni della mano, uscita. Si ripete con calma nell'hero. */
  wave(): void {
    if (this.reduced || this.busy) return;
    gsap.timeline()
      .to(this.w, { wave: 1, duration: 0.6, ease: 'back.out(1.5)' })
      .to(this.w, { wave: 0, duration: 0.75, ease: 'power2.inOut' }, '+=1.5');
  }

  private scheduleWave(delay: number): void {
    this.idleTimer = gsap.delayedCall(delay, () => {
      if (this.mode !== 'hero' && this.mode !== 'welcome') return;
      this.wave();
      if (this.mode === 'hero') this.scheduleWave(10 + Math.random() * 4);
    });
  }

  /** Salto con anticipo, volo a braccia alzate e atterraggio ammortizzato. */
  jump(target: THREE.Object3D): gsap.core.Timeline | null {
    if (this.reduced || this.busy) return null;
    this.busy = true;
    const tl = gsap.timeline({ onComplete: () => { this.busy = false; if (this.mode) this.blendTo(this.mode); } });
    const clear = Object.fromEntries(GESTURES.filter((g) => g !== 'crouch' && g !== 'cheer').map((g) => [g, 0]));
    tl.to(this.w, { ...clear, crouch: 1, duration: 0.22, ease: 'power2.out' })
      .to(this.w, { crouch: 0, cheer: 1, duration: 0.2, ease: 'power3.out' })
      .to(target.position, { y: 0.22, duration: 0.34, ease: 'power2.out' }, '<')
      .to(target.rotation, { y: `+=${Math.PI * 2}`, duration: 0.75, ease: 'power3.inOut' }, '<')
      .to(target.position, { y: 0, duration: 0.3, ease: 'power2.in' })
      .to(this.w, { cheer: 0, crouch: 0.85, duration: 0.12, ease: 'power2.out' }, '-=0.08')
      .to(this.w, { crouch: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    return tl;
  }

  /** Applica tutti gli strati alle ossa. Da chiamare a ogni frame, con le matrici dei genitori aggiornate. */
  update(t: number): void {
    if (!this.ok) return;
    const w = this.w;
    const acc = new Map<string, Rot>();
    const addPose = (p: Pose, k: number) => {
      if (k === 0) return;
      for (const [b, r] of Object.entries(p)) {
        const a = acc.get(b) ?? [0, 0, 0];
        acc.set(b, [a[0] + r[0] * k, a[1] + r[1] * k, a[2] + r[2] * k]);
      }
    };
    const add = (b: string, x: number, y: number, z: number) => addPose({ [b]: [x, y, z] }, 1);

    addPose(RELAX, 1);
    for (const g of GESTURES) addPose(POSES[g], w[g]);

    const m = this.reduced ? 0 : 1;
    // respiro: petto e spalle si sollevano, peso che passa da un piede all'altro
    const br = Math.sin(t * 1.6) * m, sway = Math.sin(t * 0.55) * m;
    add('Chest', 0, 0, br * 0.025);
    add('Spine', sway * 0.025, 0, 0);
    add('Hips', -sway * 0.03, sway * 0.03, 0);
    for (const s of SIDES) {
      const k = s === 'R' ? 1 : -1;
      add(s + 'Shoulder', -br * 0.03 * k, 0, 0);
      add(s + 'UpperArm', Math.sin(t * 1.6 + 0.6) * 0.03 * k * m, 0, Math.sin(t * 0.8 + (k > 0 ? 0 : 1.7)) * 0.03 * m);
    }

    // gesti con movimento proprio
    if (w.wave) add('RLowerArm', Math.sin(t * 9) * 0.32 * w.wave, Math.sin(t * 9) * 0.2 * w.wave, 0);
    if (w.build) {
      const hit = Math.pow(Math.max(0, Math.sin(t * 5.5)), 3); // colpo secco, ritorno lento
      add('RUpperArm', 0, 0, 0.55 * hit * w.build - 0.25 * w.build);
      add('RLowerArm', 0, 0, 0.6 * hit * w.build);
      add('Spine', 0, 0, -0.05 * hit * w.build);
    }
    if (w.care) add('Head', 0, 0, -Math.max(0, Math.sin(t * 2.4)) * 0.12 * w.care);
    if (w.listen) add('Head', Math.sin(t * 0.8) * 0.05 * w.listen, 0, 0);
    if (w.design) add('Head', 0, Math.sin(t * 0.6) * 0.08 * w.design, 0);

    // sguardo verso il cursore (meno quando pensa)
    const focus = 1 - 0.7 * w.design;
    add('Neck', 0, this.look.x * 0.18 * focus, -this.look.y * 0.08 * focus);
    add('Head', 0, this.look.x * 0.32 * focus, -this.look.y * 0.16 * focus);
    add('Chest', 0, this.look.x * 0.08 * focus, 0);

    for (const [name, bone] of this.bones) {
      const r = acc.get(name);
      const rest = this.rest.get(name)!;
      if (!r) { bone.quaternion.copy(rest); continue; }
      this.e.set(r[0], r[1], r[2], 'YZX');
      bone.quaternion.copy(rest).multiply(this.q.setFromEuler(this.e));
    }
    const hips = this.bones.get('Hips');
    if (hips) hips.position.y = this.hipsRestY - HIPS_DROP * (w.crouch + w.build * 0.05) + br * 0.002;

    // IK: le mani restano sul dispositivo (la destra lo lascia per salutare o saltare)
    const free = Math.max(w.crouch, w.cheer);
    const gw = this.grip.weight * (1 - free);
    if (gw > 0.001) {
      this.model.updateMatrixWorld(true);
      this.reach('L', this.grip.L, gw);
      this.reach('R', this.grip.R, gw * (1 - w.wave));
    }
  }

  /** IK analitica a due ossa (braccio + avambraccio) con il gomito verso il basso e l'esterno. */
  private reach(side: 'R' | 'L', target: THREE.Vector3, weight: number): void {
    if (weight <= 0.001) return;
    const ua = this.bones.get(side + 'UpperArm'), la = this.bones.get(side + 'LowerArm'), ha = this.bones.get(side + 'Hand');
    const chest = this.bones.get('Chest');
    if (!ua || !la || !ha || !chest) return;
    const [S, E0, H0, C, P] = this.v;
    ua.getWorldPosition(S); la.getWorldPosition(E0); ha.getWorldPosition(H0); chest.getWorldPosition(C);
    const l1 = S.distanceTo(E0), l2 = E0.distanceTo(H0);
    const dir = this.v[5].copy(target).sub(S);
    const d = THREE.MathUtils.clamp(dir.length(), 0.02, (l1 + l2) * 0.999);
    dir.normalize();
    // vettore "polo": gomito verso il basso, verso l'esterno e un po' indietro
    const out = C.sub(S).multiplyScalar(-1).setY(0).normalize();
    this.model.getWorldQuaternion(this.qa);
    const fwd = this.v[6].set(1, 0, 0).applyQuaternion(this.qa);
    P.set(0, -1, 0).addScaledVector(out, 0.7).addScaledVector(fwd, -0.35);
    P.addScaledVector(dir, -P.dot(dir)).normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const elbow = E0.copy(S).addScaledVector(dir, a).addScaledVector(P, h);
    this.aim(ua, la.position, C.copy(elbow).sub(S), weight);
    ua.updateMatrixWorld(true);
    la.getWorldPosition(S);
    this.aim(la, ha.position, C.copy(target).sub(S), weight);
    la.updateMatrixWorld(true);
  }

  /** Ruota `bone` perché il figlio (in `childLocal`) punti nella direzione mondo `worldDir`. */
  private aim(bone: THREE.Bone, childLocal: THREE.Vector3, worldDir: THREE.Vector3, weight: number): void {
    bone.parent!.getWorldQuaternion(this.qa).invert();
    const local = worldDir.applyQuaternion(this.qa).normalize();
    this.qb.setFromUnitVectors(this.v[7].copy(childLocal).normalize(), local);
    bone.quaternion.slerp(this.qb, weight);
  }

  dispose(): void { this.idleTimer?.kill(); gsap.killTweensOf(this.w); }
}
