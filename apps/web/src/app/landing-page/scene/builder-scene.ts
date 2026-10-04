/**
 * Scena 3D della landing: il Builder (modello Tripo con scheletro) che regge un laptop, e il logo Legame in 3D.
 * Lo scroll guida la camera con GSAP ScrollTrigger:
 * hero → la camera entra nello schermo del laptop, che mostra il manifesto esattamente come apparirà
 * nella pagina (stesso font, stessa impaginazione, stesse parole accese): a zoom finito lo schermo
 * riempie la finestra e cede il posto alla sezione vera senza stacco → una posa per fase del metodo → dezoom finale.
 * Il Builder è animato sulle ossa da `BuilderRig` (respiro, sguardo, gesti, salto, mani sul laptop).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BuilderRig, type BuilderMode } from './builder-rig';

gsap.registerPlugin(ScrollTrigger);

const INK = new THREE.Color('#120A26');
const VIOLET = new THREE.Color('#7C3AED');
const CHALK = '#F4F0FF';
const BUILDER_HEIGHT = 0.98; // altezza del modello in unità mondo a scala 1

/** Stato animabile da GSAP: la camera interpola tra queste grandezze. */
interface Shot { cx: number; cy: number; cz: number; tx: number; ty: number; tz: number; yaw: number; rings: number; }
// rings: 0 = hero, 1 = finale. Pilota anche la dissolvenza del laptop e la posizione del Builder.

/** Una "recitazione" del Builder per ogni fase del metodo, con il suo orientamento verso la camera. */
const METHOD_STEPS: readonly { mode: BuilderMode; yaw: number }[] = [
  { mode: 'listen', yaw: 0.35 }, { mode: 'design', yaw: -0.3 }, { mode: 'build', yaw: 0.45 }, { mode: 'care', yaw: 0 }
];

export interface SceneIds { hero: string; stage: string; manifesto: string; services: string; method: string; contact: string; }
export interface SceneOptions { reducedMotion: boolean; mobile: boolean; ids: SceneIds; onReady?: () => void; }

export class BuilderScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.005, 60);
  private readonly root = new THREE.Group();        // posizione e scala del Builder (ancorate allo "stage" dell'hero)
  private readonly follow = new THREE.Group();      // segue il cursore
  private readonly spin = new THREE.Group();        // salti e giri al click
  private readonly rings = new THREE.Group();
  private readonly device = new THREE.Group();      // il laptop (o telefono su mobile) che il Builder regge
  private screen?: THREE.Mesh;
  private readonly screenCanvas = document.createElement('canvas');
  private readonly screenTex: THREE.CanvasTexture;
  private screenSig = '';
  private screenDirtyUntil = 0;
  private logoImg?: HTMLImageElement;
  private readonly grips = { R: new THREE.Vector3(), L: new THREE.Vector3() };
  private deviceAspect = 0;
  private builder?: THREE.Object3D;
  private rig?: BuilderRig;
  /** Orientamento del Builder, separato dalla camera: lo animano le fasi, non lo scrub. */
  private readonly body = { yaw: 0 };
  /** 0 = inquadratura normale, 1 = camera esattamente davanti allo schermo, che riempie la finestra. */
  private readonly zoom = { v: 0 };
  private readonly anchor = { x: 0.6, y: 0, s: 1, ringX: 1.4, ringY: 0.5 };
  private readonly clock = new THREE.Clock();
  private readonly pointer = new THREE.Vector2();
  private readonly look = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly tmp = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), n: new THREE.Vector3() };
  private raf = 0;
  private visible = true;
  private triggers: ScrollTrigger[] = [];
  private readonly shot: Shot;
  private readonly shots: Record<'hero' | 'method' | 'far', Shot>;
  private disposed = false;
  private pendingMode: BuilderMode = 'hero';
  private manifestoEl: HTMLElement | null = null;
  private manifestoHidden = false;
  private pinEnd = Infinity;
  private bound = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly opts: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.mobile, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.background = INK;
    this.scene.fog = new THREE.Fog(INK, 5, 14);
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;

    const m = opts.mobile;
    this.shots = {
      hero: { cx: 0, cy: 0, cz: 3.4, tx: 0, ty: 0, tz: 0, yaw: 0, rings: 0 },
      method: { cx: m ? 0 : -1.55, cy: m ? 0.2 : -0.72, cz: m ? 4.6 : 5.6, tx: m ? 0 : -1.55, ty: m ? 0.2 : -0.74, tz: 0, yaw: 0, rings: 0.6 },
      far: { cx: m ? 0 : -0.9, cy: 0.35, cz: m ? 6.5 : 5.2, tx: m ? 0 : -0.9, ty: 0.25, tz: 0, yaw: 0, rings: 1 }
    };
    this.shot = { ...this.shots.hero };

    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.screenTex.anisotropy = 8;

    this.lights();
    this.buildRings();
    this.root.add(this.follow);
    this.follow.add(this.spin);
    this.spin.add(this.device);
    this.scene.add(this.root, this.rings);
    this.resize();
    void this.loadBuilder();
    void document.fonts?.ready.then(() => { this.screenSig = ''; });
  }

  /* ---------- costruzione ---------- */

  private lights(): void {
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(2, 3, 4);
    const rim = new THREE.DirectionalLight(VIOLET, 5);
    rim.position.set(-3, 1.5, -2.5);
    const fill = new THREE.PointLight(VIOLET, 2.5, 6);
    fill.position.set(0.2, -0.4, 1.4);
    this.scene.add(key, rim, fill, new THREE.AmbientLight('#ffffff', 0.15));
  }

  private async loadBuilder(): Promise<void> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    try {
      const gltf = await loader.loadAsync('/models/builder.glb');
      if (this.disposed) return;
      const model = gltf.scene;
      model.rotation.y = -Math.PI / 2; // il modello guarda lungo +X: così guarda la camera
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false; });
      this.builder = model;
      this.spin.add(model);
      const rig = new BuilderRig(model, this.opts.reducedMotion);
      if (rig.ok) {
        this.rig = rig;
        rig.setMode(this.pendingMode);
      }
      // ingresso: sale dal basso, atterra e saluta
      if (!this.opts.reducedMotion) {
        gsap.from(this.spin.position, { y: -1.6, duration: 1.6, ease: 'expo.out', delay: 0.2 });
        if (this.rig) gsap.delayedCall(1.6, () => this.rig?.wave());
      }
    } catch (err) {
      console.warn('[cf-scene] modello non caricato', err);
    }
    this.opts.onReady?.();
  }

  /**
   * Il dispositivo che il Builder regge, nello spazio del Builder (fronte +Z, destra del personaggio −X).
   * Lo schermo ha le proporzioni della finestra: a zoom completo coincide con la pagina.
   */
  private buildDevice(aspect: number): void {
    if (Math.abs(aspect - this.deviceAspect) < 0.002) return;
    this.deviceAspect = aspect;
    this.device.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose(); });
    this.device.clear();
    const shell = new THREE.MeshPhysicalMaterial({ color: '#1b1530', metalness: 0.8, roughness: 0.35, clearcoat: 0.6 });
    const screenMat = new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false, fog: false });
    const bez = 0.012;
    let sw: number, sh: number;
    if (aspect >= 1) {
      // laptop aperto e girato verso chi guarda: cerniera vicino alla pancia, tastiera verso la camera
      sw = 0.3; sh = sw / aspect;
      const lid = new THREE.Group();
      const lidBody = new THREE.Mesh(new RoundedBoxGeometry(sw + bez * 2, sh + bez * 2, 0.008, 3, 0.004), shell);
      lidBody.position.set(0, sh / 2 + bez, -0.0045);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
      screen.position.set(0, sh / 2 + bez, 0.0002);
      lid.add(lidBody, screen);
      lid.rotation.x = -0.1;
      const base = new THREE.Mesh(new RoundedBoxGeometry(sw + bez * 2, 0.01, 0.17, 3, 0.004), shell);
      base.position.set(0, -0.005, 0.085);
      this.device.add(lid, base);
      this.device.position.set(0, -0.02, 0.15);
      this.device.rotation.x = 0.06;
      this.screen = screen;
      // polsi sotto i lati della base, verso la cerniera
      // polsi sotto i bordi esterni della base: restano fuori dall'inquadratura a zoom completo
      const gx = sw / 2 + bez + 0.035;
      this.grips.R.set(-gx, -0.055, 0.05);
      this.grips.L.set(gx, -0.055, 0.05);
    } else {
      // su schermi verticali regge un telefono con entrambe le mani
      sh = 0.27; sw = sh * aspect;
      const slab = new THREE.Mesh(new RoundedBoxGeometry(sw + bez * 2, sh + bez * 2, 0.01, 3, 0.008), shell);
      slab.position.z = -0.0055;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
      screen.position.z = 0.0002;
      this.device.add(slab, screen);
      this.device.position.set(0, 0.07, 0.19);
      this.device.rotation.x = -0.12;
      this.screen = screen;
      const gx = sw / 2 + bez + 0.03;
      // polsi sotto gli angoli bassi: fuori dall'inquadratura quando lo schermo riempie la finestra
      this.grips.R.set(-gx, -sh / 2 - 0.035, -0.03);
      this.grips.L.set(gx, -sh / 2 - 0.035, -0.03);
    }
    // la tela dello schermo ha la risoluzione della finestra (limitata per non pesare sulla GPU)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    const k = Math.min(dpr, Math.sqrt(3_200_000 / (w * h)));
    this.screenCanvas.width = Math.round(w * k);
    this.screenCanvas.height = Math.round(h * k);
    this.screenSig = '';
  }

  /** Logo Legame in 3D: due anelli squadrati che si agganciano davvero. */
  private buildRings(): void {
    const ring = (size: number, thick: number, r: number) => {
      const shape = roundedRect(size, size, r);
      shape.holes.push(roundedRect(size - thick * 2, size - thick * 2, Math.max(0.01, r - thick)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thick * 0.9, bevelEnabled: true, bevelSize: thick * 0.18, bevelThickness: thick * 0.18, bevelSegments: 4, curveSegments: 24 });
      geo.center();
      return geo;
    };
    const geo = ring(0.6, 0.11, 0.18);
    const a = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: VIOLET, metalness: 0.1, roughness: 0.15, transmission: 0.35, thickness: 0.3, clearcoat: 1, emissive: VIOLET, emissiveIntensity: 0.25 }));
    const b = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: CHALK, metalness: 0.2, roughness: 0.25, clearcoat: 1 }));
    b.rotation.y = Math.PI / 2;
    b.position.set(0.245, -0.245, 0);
    this.rings.add(a, b);
  }

  /* ---------- schermo = manifesto ---------- */

  /**
   * Disegna sulla tela dello schermo il manifesto come apparirà nella finestra quando la sua cima
   * tocca il bordo superiore: stesse posizioni (misurate dal DOM), stesso font, stessa opacità delle parole.
   */
  private paintScreen(): void {
    const el = this.manifestoEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = -Math.max(0, rect.top);   // finché il manifesto è sotto, lo si disegna "come se" fosse in cima
    const lit = el.querySelectorAll('.on').length;
    const now = performance.now();
    const sig = `${Math.round(Math.min(0, rect.top))}|${lit}|${this.screenCanvas.width}`;
    if (sig !== this.screenSig) { this.screenSig = sig; this.screenDirtyUntil = now + 450; } // le parole sfumano in .35s
    else if (now > this.screenDirtyUntil) return;

    const c = this.screenCanvas, g = c.getContext('2d')!;
    const W = window.innerWidth, H = window.innerHeight;
    g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = getComputedStyle(el).backgroundColor || CHALK;
    g.fillRect(0, 0, W, H);

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const ctx = g as CanvasRenderingContext2D & { letterSpacing: string; fontStretch: string };
    let lastParent: Element | null = null;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.sr-only, svg')) continue;
      if (parent !== lastParent) {
        lastParent = parent;
        const st = getComputedStyle(parent);
        const wdth = /"wdth"\s+([\d.]+)/.exec(st.fontVariationSettings)?.[1];
        const stretch = !wdth ? 'normal' : +wdth >= 95 ? 'normal' : +wdth >= 81 ? 'semi-condensed' : 'condensed';
        // `font` azzera `fontStretch`: va impostato dopo
        ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
        ctx.fontStretch = stretch;
        ctx.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing;
        ctx.fillStyle = st.color;
        ctx.globalAlpha = +st.opacity * (parent.parentElement ? +getComputedStyle(parent.parentElement).opacity : 1);
        ctx.textBaseline = 'alphabetic';
      }
      const text = node.data;
      for (const match of text.matchAll(/\S+/g)) {
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        const r = range.getBoundingClientRect();
        const top = r.top + dy;
        if (top > H || top + r.height < 0 || !r.width) continue;
        const mt = ctx.measureText(match[0]);
        const asc = mt.fontBoundingBoxAscent, desc = mt.fontBoundingBoxDescent;
        const base = top + (r.height - (asc + desc)) / 2 + asc;
        ctx.save();
        ctx.translate(r.left, base);
        ctx.scale(r.width / (mt.width || 1), 1); // compensa le piccole differenze di larghezza del font variabile
        ctx.fillText(match[0], 0, 0);
        ctx.restore();
      }
    }
    // il logo della firma
    const svg = el.querySelector('svg');
    if (svg) {
      if (!this.logoImg) {
        const img = new Image();
        const src = new XMLSerializer().serializeToString(svg);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src.includes('xmlns=') ? src : src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
        img.onload = () => { this.screenSig = ''; };
        this.logoImg = img;
      }
      const r = svg.getBoundingClientRect();
      if (this.logoImg.complete && this.logoImg.naturalWidth) {
        g.globalAlpha = 1;
        g.drawImage(this.logoImg, r.left, r.top + dy, r.width, r.height);
      }
    }
    this.screenTex.needsUpdate = true;
  }

  /* ---------- scroll ---------- */

  bindScroll(): void {
    const ids = this.opts.ids;
    const $ = (id: string) => document.getElementById(id);
    const hero = $(ids.hero), method = $(ids.method), contact = $(ids.contact), services = $(ids.services);
    this.manifestoEl = $(ids.manifesto);
    this.screenSig = '';
    if (this.opts.reducedMotion) { this.paintScreen(); return; }
    this.bound = true;
    const toShot = (from: Shot, to: Shot, trigger: Element, start: string, end: string, ease = 'none') => {
      const tw = gsap.fromTo(this.shot, { ...from }, { ...to, ease, immediateRender: false, scrollTrigger: { trigger, start, end, scrub: 1 } });
      if (tw.scrollTrigger) this.triggers.push(tw.scrollTrigger);
    };

    if (hero && this.manifestoEl) {
      // il manifesto si sovrappone all'hero: quando la camera ha finito di entrare nello schermo,
      // la sua cima è esattamente in cima alla finestra
      const mf = this.manifestoEl;
      mf.style.marginTop = '-100vh';
      mf.style.minHeight = '100vh'; // la sezione dopo non deve affacciarsi prima che lo zoom finisca
      mf.style.position = 'relative';
      mf.style.zIndex = '3';
      this.setManifestoHidden(true);
      const pin = ScrollTrigger.create({ trigger: hero, start: 'top top', end: '+=120%', pin: true, pinSpacing: true, onRefresh: (self) => { this.pinEnd = self.end; } });
      this.pinEnd = pin.end;
      this.triggers.push(pin);
      const tw = gsap.fromTo(this.zoom, { v: 0 }, { v: 1, ease: 'power2.inOut', immediateRender: false, scrollTrigger: { trigger: hero, start: 'top top', end: '+=120%', scrub: 0.6 } });
      if (tw.scrollTrigger) this.triggers.push(tw.scrollTrigger);
      // il Builder smette di salutare e mostra lo schermo
      this.triggers.push(ScrollTrigger.create({ trigger: hero, start: 'top top', end: '+=120%', onUpdate: (st) => this.act(st.progress > 0.04 ? 'present' : 'hero') }));
      const copy = hero.querySelectorAll('.copy, .glow, .scroll');
      if (copy.length) {
        const fade = gsap.to(copy, { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '+=40%', scrub: true } });
        if (fade.scrollTrigger) this.triggers.push(fade.scrollTrigger);
      }
    }
    if (services) {
      // dentro i servizi la tela è coperta: la camera torna fuori dallo schermo senza che si veda
      const st = ScrollTrigger.create({
        trigger: services, start: 'top top',
        onEnter: () => { gsap.set(this.zoom, { v: 0 }); },
        onLeaveBack: () => { gsap.set(this.zoom, { v: 1 }); }
      });
      this.triggers.push(st);
    }
    if (method) {
      toShot(this.shots.hero, this.shots.method, method, 'top bottom', 'top top', 'power2.out');
      let step = -1;
      this.triggers.push(ScrollTrigger.create({
        trigger: method, start: 'top 60%', end: 'bottom bottom',
        onUpdate: (st) => {
          const k = Math.min(METHOD_STEPS.length - 1, Math.floor(st.progress * METHOD_STEPS.length));
          if (k === step) return;
          step = k;
          this.act(METHOD_STEPS[k].mode);
          gsap.to(this.body, { yaw: METHOD_STEPS[k].yaw, duration: 1.1, ease: 'power3.inOut', overwrite: true });
        },
        onLeaveBack: () => { step = -1; this.act('present'); gsap.to(this.body, { yaw: 0, duration: 0.8, overwrite: true }); }
      }));
    }
    if (contact) {
      toShot(this.shots.method, this.shots.far, contact, 'top bottom', 'bottom bottom', 'power2.out');
      this.triggers.push(ScrollTrigger.create({
        trigger: contact, start: 'top 55%',
        onEnter: () => { this.act('welcome'); gsap.to(this.body, { yaw: 0, duration: 1.2, ease: 'power3.inOut', overwrite: true }); },
        onLeaveBack: () => this.act(METHOD_STEPS[METHOD_STEPS.length - 1].mode)
      }));
    }
    // render solo quando una sezione "3D" è a schermo
    const watch = [hero, method, contact].filter((e): e is HTMLElement => !!e);
    const update = () => { this.visible = watch.some((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }); };
    this.triggers.push(ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update }));
    ScrollTrigger.refresh();
    update();
  }

  private setManifestoHidden(hidden: boolean): void {
    if (!this.manifestoEl || hidden === this.manifestoHidden) return;
    this.manifestoHidden = hidden;
    this.manifestoEl.style.visibility = hidden ? 'hidden' : '';
  }

  /* ---------- interazione ---------- */

  setPointer(nx: number, ny: number): void { this.pointer.set(nx, ny); }

  private act(mode: BuilderMode): void {
    this.pendingMode = mode;
    this.rig?.setMode(mode);
  }

  /** Click sulla tela: se colpisce il Builder, saltello con giro completo. */
  poke(nx: number, ny: number): boolean {
    if (!this.builder || this.opts.reducedMotion || this.zoom.v > 0.05) return false;
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    if (!this.raycaster.intersectObjects([this.builder, this.device], true).length) return false;
    if (this.rig) { this.rig.jump(this.spin); return true; }
    gsap.timeline()
      .to(this.spin.position, { y: 0.18, duration: 0.28, ease: 'power2.out' })
      .to(this.spin.rotation, { y: `+=${Math.PI * 2}`, duration: 0.7, ease: 'power3.inOut' }, 0)
      .to(this.spin.position, { y: 0, duration: 0.5, ease: 'bounce.out' }, 0.3);
    return true;
  }

  /* ---------- ciclo ---------- */

  start(): void {
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const z = this.zoom.v;
      // il manifesto vero resta nascosto finché la camera non è del tutto dentro lo schermo
      // (oltre la fine del pin il manifesto copre comunque la finestra: lo si mostra sempre)
      if (this.bound) this.setManifestoHidden(z < 0.999 && window.scrollY < this.pinEnd - 1);
      if (!this.visible || document.hidden) return;
      const t = this.clock.getElapsedTime();
      const s = this.shot;
      // con lo zoom il cursore non muove più nulla: lo schermo deve restare fermo
      const calm = 1 - Math.min(1, z * 1.5);
      this.follow.rotation.y += ((this.pointer.x * 0.18 * calm) - this.follow.rotation.y) * 0.06;
      this.follow.rotation.x += ((-this.pointer.y * 0.03 * calm) - this.follow.rotation.x) * 0.06;
      this.look.x += (this.pointer.x * calm - this.look.x) * 0.12;
      this.look.y += (this.pointer.y * calm - this.look.y) * 0.12;
      this.rig?.setLook(this.look.x, this.look.y);

      // fluttuazione leggera (spenta durante lo zoom)
      const a = this.anchor;
      const toCenter = Math.min(1, s.rings / 0.6);
      const sc = THREE.MathUtils.lerp(a.s, 1, toCenter);
      this.root.scale.setScalar(sc);
      this.root.position.x = THREE.MathUtils.lerp(a.x, 0, toCenter);
      this.root.position.y = THREE.MathUtils.lerp(a.y, this.opts.mobile ? -0.08 : 0, toCenter) + (this.opts.reducedMotion ? 0 : Math.sin(t * 1.2) * 0.012 * calm);
      this.root.rotation.y = s.yaw + this.body.yaw;

      // il laptop serve solo nella prima parte: sparisce quando la storia va avanti
      const lap = Math.max(0, Math.min(1, 1 - (s.rings - 0.35) / 0.25));
      this.device.scale.setScalar(Math.max(0.0001, lap));
      this.device.visible = lap > 0.01;

      // anelli: piccoli dietro il Builder all'inizio, protagonisti alla fine
      this.rings.rotation.y = t * 0.25;
      this.rings.rotation.x = Math.sin(t * 0.4) * 0.2;
      this.rings.scale.setScalar(THREE.MathUtils.lerp(0.42 * a.s, 1.5, s.rings));
      this.rings.position.set(
        THREE.MathUtils.lerp(a.ringX, this.opts.mobile ? 0 : 0.7, s.rings),
        THREE.MathUtils.lerp(a.ringY, 0.45, s.rings),
        THREE.MathUtils.lerp(-1.3, -2, s.rings)
      );

      // mani sul dispositivo (IK), poi le pose
      this.scene.updateMatrixWorld();
      if (this.rig) {
        const gw = THREE.MathUtils.smoothstep(lap, 0.6, 1);
        this.rig.setGrip(this.device.localToWorld(this.tmp.p.copy(this.grips.R)).clone(), this.device.localToWorld(this.tmp.n.copy(this.grips.L)).clone(), gw);
        this.rig.update(t);
      }

      // camera: inquadratura della fase, poi (zoom) allineata allo schermo finché lo riempie esattamente
      this.camera.position.set(s.cx, s.cy + (this.opts.reducedMotion ? 0 : this.pointer.y * 0.04 * calm), s.cz);
      this.camera.lookAt(s.tx, s.ty, s.tz);
      if (this.device.visible) this.paintScreen();
      if (z > 0 && this.screen && this.device.visible) {
        this.screen.updateWorldMatrix(true, false);
        this.screen.matrixWorld.decompose(this.tmp.p, this.tmp.q, this.tmp.s);
        const hWorld = (this.screen.geometry as THREE.PlaneGeometry).parameters.height * this.tmp.s.y;
        const dist = (hWorld / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        this.tmp.n.set(0, 0, 1).applyQuaternion(this.tmp.q);
        this.tmp.p.addScaledVector(this.tmp.n, dist);
        this.camera.position.lerp(this.tmp.p, z);
        this.camera.quaternion.slerp(this.tmp.q, z);
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.paintScreen();
    tick();
  }

  /** Posiziona il Builder al centro dello "stage" dell'hero e adatta lo schermo del laptop alla finestra. */
  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // su schermi stretti allarga il campo per non tagliare il personaggio
    this.camera.fov = w / h < 0.8 ? 42 : 30;
    this.camera.updateProjectionMatrix();
    this.buildDevice(window.innerWidth / window.innerHeight);

    const stage = document.getElementById(this.opts.ids.stage);
    const hero = document.getElementById(this.opts.ids.hero);
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.shots.hero.cz;
    if (stage && hero) {
      const r = stage.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top - hr.top + r.height / 2;
      const nx = (cx / w) * 2 - 1, ny = -(cy / h) * 2 + 1;
      // altezza dello stage in unità mondo sul piano del Builder; il Builder ne occupa ~84%
      const sWorld = (r.height / h) * 2 * tanH;
      const s = THREE.MathUtils.clamp((sWorld * 0.84) / BUILDER_HEIGHT, 0.45, 1.5);
      Object.assign(this.anchor, {
        x: nx * tanH * this.camera.aspect,
        y: ny * tanH - 0.02 * s,
        s,
        ringX: nx * tanH * this.camera.aspect + (this.opts.mobile ? 0.5 : 0.78) * s,
        ringY: ny * tanH + 0.3 * s
      });
    }
    this.screenSig = '';
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.triggers.forEach((t) => t.kill());
    gsap.killTweensOf([this.shot, this.body, this.zoom]);
    this.rig?.dispose();
    if (this.manifestoEl) {
      this.manifestoEl.style.visibility = '';
      this.manifestoEl.style.marginTop = '';
      this.manifestoEl.style.minHeight = '';
      this.manifestoEl.style.position = '';
      this.manifestoEl.style.zIndex = '';
    }
    this.screenTex.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.renderer.dispose();
  }
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
