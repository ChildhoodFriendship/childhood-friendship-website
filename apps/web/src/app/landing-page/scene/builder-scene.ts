/**
 * Scena 3D della landing: il Builder (modello Tripo), il laptop in cui la camera "entra"
 * e il logo Legame in 3D. Lo scroll guida la camera con GSAP ScrollTrigger:
 * hero → zoom dentro lo schermo (manifesto) → orbita nel metodo → dezoom finale sui contatti.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const INK = new THREE.Color('#120A26');
const VIOLET = new THREE.Color('#7C3AED');
const CHALK = '#F4F0FF';

/** Stato animabile da GSAP: la camera interpola tra queste grandezze. */
interface Shot { cx: number; cy: number; cz: number; tx: number; ty: number; tz: number; yaw: number; rings: number; }
// rings: 0 = hero, 1 = finale. Pilota anche la dissolvenza del laptop e la posizione del logo.

export interface SceneOptions { reducedMotion: boolean; mobile: boolean; onReady?: () => void; }

export class BuilderScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.01, 60);
  private readonly root = new THREE.Group();        // posizione del Builder
  private readonly follow = new THREE.Group();      // segue il cursore
  private readonly spin = new THREE.Group();        // salti e giri al click
  private readonly rings = new THREE.Group();
  private readonly laptop = new THREE.Group();
  private screenCenter = new THREE.Vector3();
  private builder?: THREE.Object3D;
  private readonly clock = new THREE.Clock();
  private readonly pointer = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private raf = 0;
  private visible = true;
  private triggers: ScrollTrigger[] = [];
  private readonly shot: Shot;
  private readonly shots: Record<'hero' | 'screen' | 'method' | 'far', Shot>;
  private disposed = false;

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
    // Builder a destra su desktop, centrato (e più lontano) su mobile
    const bx = m ? 0 : 0.62;
    this.root.position.set(bx, m ? -0.08 : 0, 0);
    this.shots = {
      hero: { cx: m ? 0 : 0.05, cy: m ? 0.05 : 0.08, cz: m ? 3.8 : 3.15, tx: m ? 0 : 0.05, ty: m ? 0.1 : 0.02, tz: 0, yaw: 0, rings: 0 },
      screen: { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 0, yaw: 0, rings: 0.3 }, // calcolato dopo aver posizionato il laptop
      method: { cx: m ? 0 : -1.55, cy: m ? 0.2 : -0.72, cz: m ? 4.6 : 5.6, tx: m ? 0 : -1.55, ty: m ? 0.2 : -0.74, tz: 0, yaw: 0, rings: 0.6 },
      far: { cx: m ? 0 : -0.9, cy: 0.35, cz: m ? 6.5 : 5.2, tx: m ? 0 : -0.9, ty: 0.25, tz: 0, yaw: 0, rings: 1 }
    };
    this.shot = { ...this.shots.hero };

    this.lights();
    this.buildLaptop();
    this.buildRings();
    this.root.add(this.follow);
    this.follow.add(this.spin);
    this.scene.add(this.root, this.rings);
    this.resize();
    void this.loadBuilder();
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
      model.rotation.y = -Math.PI / 2; // il modello Tripo guarda lungo -X
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false; });
      this.builder = model;
      this.spin.add(model);
      // ingresso: sale dal basso
      if (!this.opts.reducedMotion) gsap.from(this.spin.position, { y: -1.4, duration: 1.6, ease: 'expo.out', delay: 0.2 });
    } catch (err) {
      console.warn('[cf-scene] modello non caricato', err);
    }
    this.opts.onReady?.();
  }

  private buildLaptop(): void {
    const w = 0.46, d = 0.3;
    const shell = new THREE.MeshPhysicalMaterial({ color: '#1b1530', metalness: 0.8, roughness: 0.35, clearcoat: 0.6 });
    const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.016, d, 4, 0.008), shell);
    const lid = new THREE.Group();
    const lidBody = new THREE.Mesh(new RoundedBoxGeometry(w, d, 0.012, 4, 0.006), shell);
    lidBody.position.y = d / 2;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, d * 0.86), new THREE.MeshBasicMaterial({ map: this.screenTexture(), toneMapped: false }));
    screen.position.set(0, d / 2, 0.0065);
    lid.add(lidBody, screen);
    lid.position.set(0, 0.008, -d / 2);
    lid.rotation.x = -0.18; // leggermente aperto all'indietro
    this.laptop.add(base, lid);
    // davanti al Builder, all'altezza delle mani, ruotato verso la camera
    const bp = this.root.position;
    this.laptop.position.set(bp.x - (this.opts.mobile ? 0 : 0.36), bp.y - 0.16, bp.z + 0.28);
    this.laptop.rotation.set(0.1, this.opts.mobile ? 0 : 0.55, 0);
    this.laptop.scale.setScalar(0.85);
    this.scene.add(this.laptop);
    this.laptop.updateMatrixWorld(true);
    screen.getWorldPosition(this.screenCenter);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()));
    const eye = this.screenCenter.clone().addScaledVector(normal, 0.06);
    this.shotsScreen(eye);
  }

  /** Inquadratura "dentro lo schermo": occhio a pochi cm dal display, lungo la sua normale. */
  private shotsScreen(eye: THREE.Vector3): void {
    Object.assign(this.shots.screen, { cx: eye.x, cy: eye.y, cz: eye.z, tx: this.screenCenter.x, ty: this.screenCenter.y, tz: this.screenCenter.z });
  }

  /** Schermo del laptop: interfaccia CF stilizzata su fondo "gesso", lo stesso colore della sezione che segue. */
  private screenTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 640;
    const g = c.getContext('2d')!;
    g.fillStyle = CHALK; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#120A26'; g.fillRect(0, 0, c.width, 56);
    g.fillStyle = '#7C3AED'; g.beginPath(); g.arc(40, 28, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(244,240,255,.5)'; [0, 1, 2].forEach((i) => g.fillRect(760 + i * 80, 22, 56, 12));
    g.fillStyle = '#120A26';
    g.font = '800 92px "Bricolage Grotesque", sans-serif';
    g.fillText('Costruiamo', 64, 220);
    g.fillStyle = '#7C3AED';
    g.fillText('esperienze.', 64, 316);
    g.fillStyle = 'rgba(18,10,38,.18)';
    [0, 1, 2].forEach((i) => g.fillRect(64, 380 + i * 34, 560 - i * 120, 14));
    g.fillStyle = '#7C3AED'; g.fillRect(64, 520, 220, 56);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // i font web possono arrivare dopo: ridisegna una volta pronti
    void document.fonts?.ready.then(() => { if (!this.disposed) { this.redrawScreen(g); t.needsUpdate = true; } });
    return t;
  }

  private redrawScreen(g: CanvasRenderingContext2D): void {
    g.fillStyle = CHALK; g.fillRect(0, 56, 1024, 584);
    g.fillStyle = '#120A26';
    g.font = '800 92px "Bricolage Grotesque", sans-serif';
    g.fillText('Costruiamo', 64, 220);
    g.fillStyle = '#7C3AED';
    g.fillText('esperienze.', 64, 316);
    g.fillStyle = 'rgba(18,10,38,.18)';
    [0, 1, 2].forEach((i) => g.fillRect(64, 380 + i * 34, 560 - i * 120, 14));
    g.fillStyle = '#7C3AED'; g.fillRect(64, 520, 220, 56);
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
    this.rings.position.set(this.opts.mobile ? 0.3 : 1.35, 0.5, -1.6);
    this.rings.scale.setScalar(0.6);
  }

  /* ---------- scroll ---------- */

  /** Collega le fasi della camera alle sezioni della pagina (id DOM). */
  bindScroll(ids: { manifesto: string; method: string; contact: string; hero: string }): void {
    if (this.opts.reducedMotion) return;
    const $ = (id: string) => document.getElementById(id);
    const toShot = (from: Shot, to: Shot, trigger: Element, start: string, end: string, ease = 'none') => {
      const tw = gsap.fromTo(this.shot, { ...from }, { ...to, ease, immediateRender: false, scrollTrigger: { trigger, start, end, scrub: 1 } });
      if (tw.scrollTrigger) this.triggers.push(tw.scrollTrigger);
    };
    const manifesto = $(ids.manifesto), method = $(ids.method), contact = $(ids.contact), hero = $(ids.hero);
    if (hero) {
      // l'hero resta fermo mentre la camera entra nello schermo del laptop: alla fine lo schermo
      // (color gesso) riempie la vista e il manifesto, dello stesso colore, sale senza stacco
      const pin = ScrollTrigger.create({ trigger: hero, start: 'top top', end: '+=120%', pin: true, pinSpacing: true });
      this.triggers.push(pin);
      toShot(this.shots.hero, this.shots.screen, hero, 'top top', '+=120%', 'power3.in');
      const copy = hero.querySelectorAll('.inner, .glow, .scroll');
      if (copy.length) {
        const fade = gsap.to(copy, { opacity: 0, y: -80, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '+=45%', scrub: true } });
        if (fade.scrollTrigger) this.triggers.push(fade.scrollTrigger);
      }
    }
    void manifesto;
    if (method) {
      toShot(this.shots.screen, this.shots.method, method, 'top bottom', 'top top', 'power2.out');
      // dentro il metodo: la camera gira attorno al Builder (un quarto di giro per fase)
      const tw = gsap.to(this.shot, { yaw: Math.PI * 1.5, ease: 'none', immediateRender: false, scrollTrigger: { trigger: method, start: 'top top', end: 'bottom bottom', scrub: 1 } });
      if (tw.scrollTrigger) this.triggers.push(tw.scrollTrigger);
    }
    if (contact) toShot({ ...this.shots.method, yaw: Math.PI * 1.5 }, { ...this.shots.far, yaw: Math.PI * 2 }, contact, 'top bottom', 'bottom bottom', 'power2.out');
    // render solo quando una sezione "3D" è a schermo
    const watch = [hero, method, contact].filter((e): e is HTMLElement => !!e);
    const update = () => { this.visible = watch.some((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }); };
    this.triggers.push(ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update }));
    update();
  }

  /* ---------- interazione ---------- */

  setPointer(nx: number, ny: number): void { this.pointer.set(nx, ny); }

  /** Click sulla tela: se colpisce il Builder, saltello con giro completo. */
  poke(nx: number, ny: number): boolean {
    if (!this.builder || this.opts.reducedMotion) return false;
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    if (!this.raycaster.intersectObject(this.builder, true).length) return false;
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
      if (!this.visible || document.hidden) return;
      const t = this.clock.getElapsedTime();
      const s = this.shot;
      // cursore: il Builder si gira verso il puntatore (morbido)
      this.follow.rotation.y += ((this.pointer.x * 0.45) - this.follow.rotation.y) * 0.06;
      this.follow.rotation.x += ((-this.pointer.y * 0.08) - this.follow.rotation.x) * 0.06;
      if (!this.opts.reducedMotion) this.root.position.y = (this.opts.mobile ? -0.08 : 0) + Math.sin(t * 1.2) * 0.012;
      this.rings.rotation.y = t * 0.25;
      this.rings.rotation.x = Math.sin(t * 0.4) * 0.2;
      // anelli: da lontani a protagonisti alla fine
      // il laptop serve solo all'inizio: sparisce quando la storia va avanti
      const lap = Math.max(0, Math.min(1, 1 - (s.rings - 0.35) / 0.25));
      this.laptop.scale.setScalar(0.85 * lap);
      this.laptop.visible = lap > 0.01;
      // nel metodo e nel finale il Builder si sposta al centro della scena
      this.root.position.x = THREE.MathUtils.lerp(this.opts.mobile ? 0 : 0.62, 0, Math.min(1, s.rings / 0.6));
      const rs = 0.6 + s.rings * 0.9;
      this.rings.scale.setScalar(rs);
      this.rings.position.z = -1.6 - s.rings * 0.4;
      this.rings.position.x = THREE.MathUtils.lerp(this.opts.mobile ? 0.3 : 1.35, this.opts.mobile ? 0 : 0.7, s.rings);
      this.rings.position.y = THREE.MathUtils.lerp(0.5, 0.45, s.rings);
      // camera: posizione base + orbita (yaw) attorno al target
      // yaw fa girare il Builder su se stesso (la camera resta composta con il layout)
      this.root.rotation.y = s.yaw;
      this.camera.position.set(s.cx, s.cy + (this.opts.reducedMotion ? 0 : this.pointer.y * 0.04), s.cz);
      this.camera.lookAt(s.tx, s.ty, s.tz);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // su schermi stretti allarga il campo per non tagliare il personaggio
    this.camera.fov = w / h < 0.8 ? 42 : 30;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.triggers.forEach((t) => t.kill());
    gsap.killTweensOf(this.shot);
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
