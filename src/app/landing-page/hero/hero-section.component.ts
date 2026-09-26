import { 
  AfterViewInit, 
  ChangeDetectionStrategy, 
  Component, 
  ElementRef, 
  OnDestroy, 
  ViewChild, 
  signal 
} from '@angular/core';
import * as THREE from 'three';

export interface ProjectExhibit {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly tech: readonly string[];
  readonly metrics: string;
  readonly link?: string;
  readonly color: number;
}

@Component({
  selector: 'cf-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vaultCanvas', { static: false }) private readonly vaultCanvasRef?: ElementRef<HTMLCanvasElement>;

  // Vault state signals
  protected readonly vaultUnlocked = signal<boolean>(false);
  protected readonly unlockProgress = signal<number>(0);
  protected readonly isUnlocking = signal<boolean>(false);
  protected readonly currentUnlockPhase = signal<string>('Inizializzazione sensori...');
  protected readonly selectedProject = signal<ProjectExhibit | null>(null);

  // Three.js internal references
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private animFrameId?: number;
  private resizeListener?: () => void;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private canvasClickListener?: (e: MouseEvent) => void;

  // 3D Vault interactive meshes
  private vaultDoorGroup = new THREE.Group();
  private vaultWheelMesh?: THREE.Mesh;
  private vaultLockPins: THREE.Mesh[] = [];
  private vaultGears: { mesh: THREE.Mesh; speed: number }[] = [];
  private vaultCombinationDials: THREE.Mesh[] = [];
  private vaultLockBars: THREE.Mesh[] = [];
  private exhibitMeshes: { mesh: THREE.Group; project: ProjectExhibit }[] = [];
  private wallFrames: { mesh: THREE.Group; borderMat?: THREE.MeshStandardMaterial; project: ProjectExhibit }[] = [];
  private mouseX = 0;
  private mouseY = 0;
  private targetCameraPos = new THREE.Vector3(0, 0, 75);
  private currentCameraPos = new THREE.Vector3(0, 0, 75);
  private targetCameraRot = new THREE.Euler(0, 0, 0);

  // Projects list showcased in the vault pedestals & frames
  protected readonly projects: readonly ProjectExhibit[] = [
    {
      id: 'core-web',
      title: 'Siti & Web App',
      category: 'Digital Architecture',
      description: 'Piattaforme web performanti, veloci, responsive e ottimizzate per massimizzare conversioni e scalabilità.',
      tech: ['Angular', 'Next.js', 'TypeScript', 'Tailwind'],
      metrics: 'Ultra-fast · Solid Foundations',
      color: 0x8b5cf6
    },
    {
      id: 'custom-software',
      title: 'Software su Misura',
      category: 'Bespoke Engineering',
      description: 'Architetture e gestionali costruiti attorno ai reali processi aziendali, senza vincoli di piattaforme preconfezionate.',
      tech: ['Cloud Architecture', 'Node.js', 'PostgreSQL', 'APIs'],
      metrics: 'Custom Built · Zero Compromises',
      color: 0x7c3aed
    },
    {
      id: 'mobile-ecosystem',
      title: 'App Mobile & Prodotti',
      category: 'Cross-Platform',
      description: 'Applicazioni native e cross-platform stabili, curate in ogni dettaglio interattivo e pronte a scalare.',
      tech: ['iOS', 'Android', 'Flutter', 'React Native'],
      metrics: 'Seamless UX · Production Ready',
      color: 0x4ade80
    }
  ];

  ngAfterViewInit(): void {
    this.initThreeVault();
    requestAnimationFrame(() => {
      if (this.resizeListener) {
        this.resizeListener();
      }
    });

    // Automatically initiate cinematic mechanical sequence with 400ms buffer
    setTimeout(() => {
      this.triggerUnlockVault();
    }, 400);
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.canvasClickListener && this.vaultCanvasRef?.nativeElement) {
      this.vaultCanvasRef.nativeElement.removeEventListener('click', this.canvasClickListener);
    }
    this.renderer?.dispose();
  }

  // Synthesize realistic mechanical clicks via Web Audio API without external audio assets
  private playMechanicalClick(freq = 420, duration = 0.04): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  protected triggerUnlockVault(): void {
    if (this.isUnlocking() || this.vaultUnlocked()) return;
    this.isUnlocking.set(true);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 1.5;
      const rounded = Math.min(100, Math.floor(progress));
      this.unlockProgress.set(rounded);

      // Rotate central mechanical wheel
      if (this.vaultWheelMesh) {
        this.vaultWheelMesh.rotation.z += 0.16;
      }

      // Rotate interlinked mechanical gears
      this.vaultGears.forEach(g => {
        g.mesh.rotation.z += g.speed * 0.12;
      });

      // Rotate combination dial tumblers with intermittent mechanical clicks
      this.vaultCombinationDials.forEach((dial, i) => {
        dial.rotation.z += (i % 2 === 0 ? 0.08 : -0.08);
      });

      // Play subtle mechanical clicks every few percent
      if (rounded % 8 === 0 && rounded < 95) {
        this.playMechanicalClick(300 + (rounded * 5));
      }

      // Progress phase messages
      if (rounded < 30) {
        this.currentUnlockPhase.set('Allineamento ingranaggi e combinatori...');
      } else if (rounded < 65) {
        this.currentUnlockPhase.set('Ritiro pistoni e perni magnetici...');
        // Retract locking pins & crossbars
        this.vaultLockPins.forEach(pin => {
          const factor = Math.max(0, 1 - (rounded - 30) / 45);
          pin.scale.set(factor, factor, factor);
        });
        this.vaultLockBars.forEach(bar => {
          const factor = Math.max(0.1, 1 - (rounded - 30) / 50);
          bar.scale.y = factor;
        });
      } else if (rounded < 95) {
        this.currentUnlockPhase.set('Disinnesto cardini in titanio...');
      } else {
        this.currentUnlockPhase.set('Accesso concesso. Benvenuto.');
      }

      if (progress >= 100) {
        clearInterval(interval);
        this.playMechanicalClick(180, 0.15); // Solid deep thud
        this.vaultUnlocked.set(true);
        this.isUnlocking.set(false);

        // Slow cinematic camera push into the room
        this.targetCameraPos.set(0, 4, 34);
      }
    }, 28);
  }

  protected skipVaultIntro(): void {
    this.unlockProgress.set(100);
    this.vaultUnlocked.set(true);
    this.isUnlocking.set(false);
    this.vaultDoorGroup.rotation.y = -Math.PI * 0.85;
    this.vaultDoorGroup.position.x = -80;
    this.targetCameraPos.set(0, 4, 34);
    this.currentCameraPos.set(0, 4, 34);
    if (this.camera) {
      this.camera.position.set(0, 4, 34);
    }
  }

  protected inspectProject(project: ProjectExhibit): void {
    this.selectedProject.set(project);
    const idx = this.projects.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      const angle = (idx - 1) * 0.35;
      this.targetCameraRot.y = -angle;
      this.targetCameraPos.x = (idx - 1) * 6;
    }
  }

  protected closeProjectModal(): void {
    this.selectedProject.set(null);
    this.targetCameraRot.y = 0;
    this.targetCameraPos.x = 0;
  }

  private initThreeVault(): void {
    const canvas = this.vaultCanvasRef?.nativeElement;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.018);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 300);
    this.camera.position.copy(this.currentCameraPos);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Lighting (Vault Moody Neon Ambience + Spotlight on door & exhibits)
    const ambientLight = new THREE.AmbientLight(0x282834, 1.4);
    this.scene.add(ambientLight);

    const vaultSpotViolet = new THREE.SpotLight(0x8b5cf6, 5.0, 100, Math.PI / 3, 0.4, 1.2);
    vaultSpotViolet.position.set(0, 35, 25);
    this.scene.add(vaultSpotViolet);

    const vaultAccentCyan = new THREE.PointLight(0xa78bfa, 3.0, 70);
    vaultAccentCyan.position.set(-25, 18, 15);
    this.scene.add(vaultAccentCyan);

    const vaultAccentPink = new THREE.PointLight(0xd946ef, 2.5, 70);
    vaultAccentPink.position.set(25, 18, 15);
    this.scene.add(vaultAccentPink);

    // Frontal directional key light hitting the metal vault door
    const frontKeyLight = new THREE.DirectionalLight(0xe2e8f0, 2.2);
    frontKeyLight.position.set(10, 20, 65);
    this.scene.add(frontKeyLight);

    // 4. Build Vault Door & Mechanism & Front Wall
    this.buildVaultDoor();

    // 5. Build Dark Gallery Room (Pedestals, Computer Mockups, Interactive Wall Frames)
    this.buildVaultGallery();

    // 6. Interactive Mouse Parallax & Click Detection
    this.mouseMoveListener = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.mouseX = x;
      this.mouseY = y;
    };
    window.addEventListener('mousemove', this.mouseMoveListener);

    // Click on interactive wall frames or computer mockups
    this.canvasClickListener = (e: MouseEvent) => {
      if (!this.vaultUnlocked() || !this.camera || !this.scene) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
      
      const interactables: THREE.Object3D[] = [];
      this.wallFrames.forEach(f => interactables.push(f.mesh));
      this.exhibitMeshes.forEach(m => interactables.push(m.mesh));

      const intersects = raycaster.intersectObjects(interactables, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && !hit.userData['project'] && hit.parent && hit !== this.scene) {
          hit = hit.parent;
        }
        if (hit && hit.userData['project']) {
          this.inspectProject(hit.userData['project']);
        }
      }
    };
    canvas.addEventListener('click', this.canvasClickListener);

    // 7. Responsive Resizer
    this.resizeListener = () => {
      if (!this.camera || !this.renderer || !canvas) return;
      const p = canvas.parentElement;
      const w = p?.clientWidth || window.innerWidth;
      const h = p?.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeListener);

    // 8. Render Loop
    const clock = new THREE.Clock();
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation
      const smoothFactor = 0.05;
      this.currentCameraPos.lerp(this.targetCameraPos, smoothFactor);
      
      if (this.camera) {
        this.camera.position.x = this.currentCameraPos.x + this.mouseX * 2.5;
        this.camera.position.y = this.currentCameraPos.y + this.mouseY * 1.5;
        this.camera.position.z = this.currentCameraPos.z;

        this.camera.rotation.y += (this.targetCameraRot.y - this.camera.rotation.y) * 0.05;
      }

      // Vault door swing open animation when unlocked
      if (this.vaultUnlocked()) {
        if (this.vaultDoorGroup.rotation.y > -Math.PI * 0.85) {
          this.vaultDoorGroup.rotation.y -= delta * 2.0;
        }
        if (this.vaultDoorGroup.position.x > -65) {
          this.vaultDoorGroup.position.x -= delta * 32;
        }
      }

      // Subtle float animation for computer mockups
      this.exhibitMeshes.forEach((item, index) => {
        const floatOffset = Math.sin(elapsed * 1.6 + index * 1.8) * 0.15;
        item.mesh.position.y = 5.2 + floatOffset;
        item.mesh.rotation.y += 0.006;
      });

      // Subtle hover glow animation on wall frames
      this.wallFrames.forEach((frame, index) => {
        const pulse = 0.9 + Math.sin(elapsed * 2.0 + index) * 0.15;
        if (frame.borderMat) {
          frame.borderMat.emissiveIntensity = pulse;
        }
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  private buildVaultDoor(): void {
    if (!this.scene) return;

    // A. Front Massive Reinforced Wall (Surrounding the vault door at z = 44)
    const frontWallGroup = new THREE.Group();
    frontWallGroup.position.set(0, 0, 44);

    const wallConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x1f2227,
      metalness: 0.55,
      roughness: 0.65
    });
    const wallTrimMat = new THREE.MeshStandardMaterial({
      color: 0x333740,
      metalness: 0.85,
      roughness: 0.3
    });

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(100, 70, 4), wallConcreteMat);
    leftWall.position.set(-68, 0, 0);
    frontWallGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(100, 70, 4), wallConcreteMat);
    rightWall.position.set(68, 0, 0);
    frontWallGroup.add(rightWall);

    const topWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 4), wallConcreteMat);
    topWall.position.set(0, 25, 0);
    frontWallGroup.add(topWall);

    const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 4), wallConcreteMat);
    bottomWall.position.set(0, -25, 0);
    frontWallGroup.add(bottomWall);

    const portalRimGeo = new THREE.TorusGeometry(18.8, 1.8, 20, 64);
    const portalRim = new THREE.Mesh(portalRimGeo, wallTrimMat);
    portalRim.position.set(0, 0, 1.5);
    frontWallGroup.add(portalRim);

    this.scene.add(frontWallGroup);

    // B. Vault Door Group
    this.vaultDoorGroup = new THREE.Group();
    this.vaultDoorGroup.position.set(0, 0, 45);

    const industrialGraySteel = new THREE.MeshStandardMaterial({
      color: 0x4a4e56,
      metalness: 0.92,
      roughness: 0.28
    });
    const darkArmoredSteel = new THREE.MeshStandardMaterial({
      color: 0x2b2e34,
      metalness: 0.88,
      roughness: 0.35
    });
    const machinedBronzeGold = new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      metalness: 0.92,
      roughness: 0.22,
      emissive: 0x422d0c,
      emissiveIntensity: 0.25
    });
    const gearPurpleMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x3b1d75,
      emissiveIntensity: 0.35
    });

    const rimGeo = new THREE.TorusGeometry(18.2, 2.0, 24, 64);
    const rim = new THREE.Mesh(rimGeo, darkArmoredSteel);
    this.vaultDoorGroup.add(rim);

    const doorGeo = new THREE.CylinderGeometry(17.6, 17.6, 2.6, 64);
    const door = new THREE.Mesh(doorGeo, industrialGraySteel);
    door.rotation.x = Math.PI / 2;
    this.vaultDoorGroup.add(door);

    const innerPlateGeo = new THREE.CylinderGeometry(13.8, 14.2, 0.6, 64);
    const innerPlate = new THREE.Mesh(innerPlateGeo, darkArmoredSteel);
    innerPlate.rotation.x = Math.PI / 2;
    innerPlate.position.z = 1.35;
    this.vaultDoorGroup.add(innerPlate);

    const rivetCount = 36;
    const rivetGeo = new THREE.SphereGeometry(0.44, 14, 14);
    for (let i = 0; i < rivetCount; i++) {
      const angle = (i / rivetCount) * Math.PI * 2;
      const rivet = new THREE.Mesh(rivetGeo, machinedBronzeGold);
      rivet.position.set(Math.cos(angle) * 16.8, Math.sin(angle) * 16.8, 1.4);
      this.vaultDoorGroup.add(rivet);
    }

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const innerRivet = new THREE.Mesh(rivetGeo, machinedBronzeGold);
      innerRivet.position.set(Math.cos(angle) * 12.8, Math.sin(angle) * 12.8, 1.7);
      this.vaultDoorGroup.add(innerRivet);
    }

    const hingeGroup = new THREE.Group();
    hingeGroup.position.set(-17.5, 0, 0);

    const hingePivotGeo = new THREE.CylinderGeometry(2.2, 2.2, 28, 24);
    const hingePivot = new THREE.Mesh(hingePivotGeo, darkArmoredSteel);
    hingeGroup.add(hingePivot);

    [-10, 10].forEach(y => {
      const collarGeo = new THREE.CylinderGeometry(2.6, 2.6, 2.6, 24);
      const collar = new THREE.Mesh(collarGeo, machinedBronzeGold);
      collar.position.y = y;
      hingeGroup.add(collar);
    });

    [-8, 8].forEach(y => {
      const bracketGeo = new THREE.BoxGeometry(7.5, 3.2, 2.4);
      const bracket = new THREE.Mesh(bracketGeo, industrialGraySteel);
      bracket.position.set(3.2, y, 0.8);
      hingeGroup.add(bracket);
    });
    this.vaultDoorGroup.add(hingeGroup);

    [-3.4, 3.4].forEach(y => {
      const barGeo = new THREE.CylinderGeometry(0.58, 0.58, 26, 16);
      const bar = new THREE.Mesh(barGeo, industrialGraySteel);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, y, 2.3);
      this.vaultLockBars.push(bar);
      this.vaultDoorGroup.add(bar);

      [-8, 0, 8].forEach(x => {
        const guideGeo = new THREE.CylinderGeometry(0.95, 0.95, 1.6, 16);
        const guide = new THREE.Mesh(guideGeo, machinedBronzeGold);
        guide.position.set(x, y, 2.3);
        this.vaultDoorGroup.add(guide);
      });
    });

    const wheelGroup = new THREE.Group();
    const wheelRimGeo = new THREE.TorusGeometry(4.8, 0.52, 16, 40);
    const wheelRim = new THREE.Mesh(wheelRimGeo, machinedBronzeGold);
    wheelGroup.add(wheelRim);

    for (let i = 0; i < 8; i++) {
      const spokeGeo = new THREE.CylinderGeometry(0.26, 0.26, 9.6, 12);
      const spoke = new THREE.Mesh(spokeGeo, industrialGraySteel);
      spoke.rotation.z = (i * Math.PI) / 4;
      wheelGroup.add(spoke);
    }
    const centerCapGeo = new THREE.CylinderGeometry(1.7, 1.7, 1.3, 24);
    const centerCap = new THREE.Mesh(centerCapGeo, machinedBronzeGold);
    centerCap.rotation.x = Math.PI / 2;
    wheelGroup.add(centerCap);

    wheelGroup.position.set(0, 0, 3.4);
    this.vaultWheelMesh = wheelRim;
    this.vaultDoorGroup.add(wheelGroup);

    const dialCoords = [
      { x: 7.5, y: 3.5 },
      { x: 10.5, y: 3.5 },
      { x: 8.5, y: -4.5 }
    ];
    dialCoords.forEach(c => {
      const dialBaseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.8, 24);
      const dialBase = new THREE.Mesh(dialBaseGeo, darkArmoredSteel);
      dialBase.rotation.x = Math.PI / 2;
      dialBase.position.set(c.x, c.y, 1.8);
      this.vaultDoorGroup.add(dialBase);

      const dialKnobGeo = new THREE.CylinderGeometry(1.0, 1.2, 1.3, 24);
      const dialKnob = new THREE.Mesh(dialKnobGeo, machinedBronzeGold);
      dialKnob.rotation.x = Math.PI / 2;
      dialKnob.position.set(c.x, c.y, 2.4);
      this.vaultCombinationDials.push(dialKnob);
      this.vaultDoorGroup.add(dialKnob);
    });

    const gearCoords = [
      { x: -5, y: 6.5, r: 2.2, teeth: 14, speed: 1.2 },
      { x: 4.5, y: 6.5, r: 2.6, teeth: 18, speed: -1.0 },
      { x: -5.5, y: -6.5, r: 2.4, teeth: 16, speed: -1.1 }
    ];
    gearCoords.forEach(gc => {
      const gearGroup = new THREE.Group();
      const gearBodyGeo = new THREE.CylinderGeometry(gc.r, gc.r, 0.6, 28);
      const gearBody = new THREE.Mesh(gearBodyGeo, gearPurpleMat);
      gearBody.rotation.x = Math.PI / 2;
      gearGroup.add(gearBody);

      const toothGeo = new THREE.BoxGeometry(0.35, 0.65, 0.65);
      for (let t = 0; t < gc.teeth; t++) {
        const ta = (t / gc.teeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeo, machinedBronzeGold);
        tooth.position.set(Math.cos(ta) * gc.r, Math.sin(ta) * gc.r, 0);
        tooth.rotation.z = ta;
        gearGroup.add(tooth);
      }

      gearGroup.position.set(gc.x, gc.y, 1.9);
      this.vaultGears.push({ mesh: gearBody, speed: gc.speed });
      this.vaultDoorGroup.add(gearGroup);
    });

    for (let i = 0; i < 6; i++) {
      const pinGeo = new THREE.CylinderGeometry(1.2, 1.2, 6, 20);
      const pin = new THREE.Mesh(pinGeo, machinedBronzeGold);
      const angle = (i * Math.PI) / 3;
      pin.position.set(Math.cos(angle) * 17.5, Math.sin(angle) * 17.5, 0.4);
      pin.rotation.z = angle + Math.PI / 2;
      this.vaultLockPins.push(pin);
      this.vaultDoorGroup.add(pin);
    }

    this.scene.add(this.vaultDoorGroup);
  }

  private buildVaultGallery(): void {
    if (!this.scene) return;

    // Architectural Dark Floor with Grid Lines
    const floorGeo = new THREE.PlaneGeometry(240, 240, 40, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x08080c,
      roughness: 0.85,
      metalness: 0.25
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    this.scene.add(floor);

    // Floor Grid Overlay
    const grid = new THREE.GridHelper(240, 80, 0x8b5cf6, 0x1f1d2b);
    grid.position.y = -5.9;
    this.scene.add(grid);

    // Vault Rear Wall (Wide)
    const wallGeo = new THREE.PlaneGeometry(240, 80);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f1118,
      metalness: 0.7,
      roughness: 0.6
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 15, -40);
    this.scene.add(backWall);

    // Vault Side Walls
    const sideWallGeo = new THREE.PlaneGeometry(120, 80);
    const leftSideWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftSideWall.rotation.y = Math.PI / 2;
    leftSideWall.position.set(-60, 15, 0);
    this.scene.add(leftSideWall);

    const rightSideWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightSideWall.rotation.y = -Math.PI / 2;
    rightSideWall.position.set(60, 15, 0);
    this.scene.add(rightSideWall);

    // Ambient neon fill lights
    const rightFillLight = new THREE.PointLight(0x7c3aed, 3.5, 90);
    rightFillLight.position.set(30, 12, 10);
    this.scene.add(rightFillLight);

    const leftFillLight = new THREE.PointLight(0x6366f1, 3.0, 90);
    leftFillLight.position.set(-30, 12, 10);
    this.scene.add(leftFillLight);

    // 1. Build 3 Pedestals with 3D Computer / Laptop Mockups
    const positions = [
      { x: -18, z: 0 },
      { x: 0, z: -8 },
      { x: 18, z: 0 }
    ];

    this.projects.forEach((proj, i) => {
      const pos = positions[i];
      const exhibitGroup = new THREE.Group();
      exhibitGroup.position.set(pos.x, -6, pos.z);
      exhibitGroup.userData['project'] = proj;

      const baseGeo = new THREE.CylinderGeometry(3.6, 4.2, 4, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x181a20,
        metalness: 0.8,
        roughness: 0.3
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 2;
      exhibitGroup.add(base);

      const ringGeo = new THREE.TorusGeometry(3.9, 0.16, 12, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: proj.color,
        emissive: proj.color,
        emissiveIntensity: 1.8
      });
      const neonRing = new THREE.Mesh(ringGeo, ringMat);
      neonRing.rotation.x = Math.PI / 2;
      neonRing.position.y = 4.1;
      exhibitGroup.add(neonRing);

      const glassGeo = new THREE.CylinderGeometry(3.3, 3.3, 7.0, 32, 1, true);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.5
      });
      const glassTeca = new THREE.Mesh(glassGeo, glassMat);
      glassTeca.position.y = 7.5;
      exhibitGroup.add(glassTeca);

      const computerMockup = this.createComputerMockup(proj, i);
      computerMockup.position.y = 5.2;
      computerMockup.userData['project'] = proj;
      exhibitGroup.add(computerMockup);

      this.scene?.add(exhibitGroup);
      this.exhibitMeshes.push({ mesh: computerMockup, project: proj });
    });

    // 2. Build Interactive Framed Exhibits on Wall
    this.buildInteractiveWallFrames();
  }

  private createComputerMockup(project: ProjectExhibit, typeIndex: number): THREE.Group {
    const group = new THREE.Group();

    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.22
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.4
    });

    const screenTexture = this.createWebsiteTexture(project.title, project.category, project.color);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });

    if (typeIndex === 1) {
      // Desktop Pro Studio Monitor Mockup
      const monitorBodyGeo = new THREE.BoxGeometry(4.2, 2.7, 0.18);
      const monitorBody = new THREE.Mesh(monitorBodyGeo, aluminumMat);
      group.add(monitorBody);

      const displayGeo = new THREE.PlaneGeometry(3.9, 2.4);
      const display = new THREE.Mesh(displayGeo, screenMat);
      display.position.z = 0.1;
      group.add(display);

      const standArmGeo = new THREE.BoxGeometry(0.3, 1.4, 0.15);
      const standArm = new THREE.Mesh(standArmGeo, aluminumMat);
      standArm.position.set(0, -1.6, -0.4);
      group.add(standArm);

      const standBaseGeo = new THREE.BoxGeometry(1.6, 0.08, 1.2);
      const standBase = new THREE.Mesh(standBaseGeo, aluminumMat);
      standBase.position.set(0, -2.3, -0.2);
      group.add(standBase);

      const keyboardGeo = new THREE.BoxGeometry(2.4, 0.06, 0.9);
      const keyboard = new THREE.Mesh(keyboardGeo, darkTrimMat);
      keyboard.position.set(0, -2.25, 0.8);
      group.add(keyboard);
    } else {
      // Modern Laptop Mockup
      const baseGroup = new THREE.Group();
      const baseGeo = new THREE.BoxGeometry(3.6, 0.12, 2.5);
      const baseMesh = new THREE.Mesh(baseGeo, aluminumMat);
      baseGroup.add(baseMesh);

      const kbGeo = new THREE.BoxGeometry(3.2, 0.02, 1.4);
      const kbMesh = new THREE.Mesh(kbGeo, darkTrimMat);
      kbMesh.position.set(0, 0.07, -0.2);
      baseGroup.add(kbMesh);

      const tpGeo = new THREE.BoxGeometry(1.1, 0.02, 0.7);
      const tpMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.3 });
      const tpMesh = new THREE.Mesh(tpGeo, tpMat);
      tpMesh.position.set(0, 0.07, 0.75);
      baseGroup.add(tpMesh);

      group.add(baseGroup);

      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.06, -1.25);
      lidGroup.rotation.x = -Math.PI * 0.22;

      const lidGeo = new THREE.BoxGeometry(3.6, 2.4, 0.1);
      const lidMesh = new THREE.Mesh(lidGeo, aluminumMat);
      lidMesh.position.set(0, 1.2, 0);
      lidGroup.add(lidMesh);

      const screenGeo = new THREE.PlaneGeometry(3.35, 2.15);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 1.2, 0.055);
      lidGroup.add(screenMesh);

      group.add(lidGroup);
    }

    return group;
  }

  private buildInteractiveWallFrames(): void {
    if (!this.scene) return;

    const frameConfigs = [
      {
        project: this.projects[0],
        x: -24,
        y: 12,
        z: -38,
        width: 14,
        height: 8.5,
        rotY: 0.1
      },
      {
        project: this.projects[1],
        x: 0,
        y: 14,
        z: -39,
        width: 16,
        height: 9.5,
        rotY: 0
      },
      {
        project: this.projects[2],
        x: 24,
        y: 12,
        z: -38,
        width: 14,
        height: 8.5,
        rotY: -0.1
      }
    ];

    frameConfigs.forEach(cfg => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(cfg.x, cfg.y, cfg.z);
      frameGroup.rotation.y = cfg.rotY;
      frameGroup.userData['project'] = cfg.project;

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x1e2029,
        metalness: 0.9,
        roughness: 0.25
      });
      const outerGeo = new THREE.BoxGeometry(cfg.width + 1.2, cfg.height + 1.2, 0.4);
      const outerMesh = new THREE.Mesh(outerGeo, frameMat);
      frameGroup.add(outerMesh);

      const borderMat = new THREE.MeshStandardMaterial({
        color: cfg.project.color,
        emissive: cfg.project.color,
        emissiveIntensity: 1.2
      });
      const borderGeo = new THREE.BoxGeometry(cfg.width + 0.3, cfg.height + 0.3, 0.2);
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      borderMesh.position.z = 0.15;
      frameGroup.add(borderMesh);

      const screenTexture = this.createWallFrameTexture(cfg.project);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
      const screenGeo = new THREE.PlaneGeometry(cfg.width, cfg.height);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.25;
      screenMesh.userData['project'] = cfg.project;
      frameGroup.add(screenMesh);

      const frameLight = new THREE.SpotLight(cfg.project.color, 3.2, 35, Math.PI / 4, 0.4);
      frameLight.position.set(cfg.x, cfg.y + 6, cfg.z + 10);
      frameLight.target = frameGroup;
      this.scene?.add(frameLight);

      this.scene?.add(frameGroup);
      this.wallFrames.push({ mesh: frameGroup, borderMat, project: cfg.project });
    });
  }

  private createWebsiteTexture(title: string, category: string, accentColor: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    const hexColor = '#' + accentColor.toString(16).padStart(6, '0');

    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 640);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 640);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1024, 60);

    const dots = ['#ef4444', '#eab308', '#22c55e'];
    dots.forEach((dot, idx) => {
      ctx.beginPath();
      ctx.arc(35 + idx * 26, 30, 8, 0, Math.PI * 2);
      ctx.fillStyle = dot;
      ctx.fill();
    });

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(140, 14, 460, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '14px DM Mono, monospace';
    ctx.fillText('https://childhood-friendship.agency/' + category.toLowerCase().replace(/\s+/g, '-'), 155, 35);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 16px DM Mono, monospace';
    ctx.fillText('EXHIBIT // ' + category.toUpperCase(), 70, 130);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px DM Sans, sans-serif';
    ctx.fillText(title, 70, 195);

    for (let c = 0; c < 3; c++) {
      const cardX = 70 + c * 295;
      const cardY = 240;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, 275, 330, 12);
      ctx.fill();
      ctx.strokeStyle = c === 0 ? hexColor : 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = c === 0 ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = hexColor;
      ctx.fillRect(cardX + 25, cardY + 30, 40, 6);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cardX + 25, cardY + 55, 180, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cardX + 25, cardY + 80, 220, 8);
      ctx.fillRect(cardX + 25, cardY + 98, 190, 8);
      ctx.fillRect(cardX + 25, cardY + 116, 140, 8);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(cardX + 25, cardY + 150, 225, 130);
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 35, cardY + 240);
      ctx.lineTo(cardX + 85, cardY + 210);
      ctx.lineTo(cardX + 135, cardY + 225);
      ctx.lineTo(cardX + 185, cardY + 175);
      ctx.lineTo(cardX + 235, cardY + 185);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  private createWallFrameTexture(project: ProjectExhibit): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 760;
    const ctx = canvas.getContext('2d')!;

    const hexColor = '#' + project.color.toString(16).padStart(6, '0');

    const grad = ctx.createLinearGradient(0, 0, 1280, 760);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 760);

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 760);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(18, 24, 38, 0.85)';
    ctx.fillRect(0, 0, 1280, 75);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 22px DM Sans, sans-serif';
    ctx.fillText('CF // DIGITAL', 60, 46);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px DM Sans, sans-serif';
    ctx.fillText('Case Study', 300, 46);
    ctx.fillText('Architecture', 420, 46);
    ctx.fillText('Performance', 550, 46);

    ctx.fillStyle = hexColor;
    ctx.beginPath();
    ctx.roundRect(1080, 20, 140, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 13px DM Mono, monospace';
    ctx.fillText('INTERACTIVE', 1105, 43);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px DM Mono, monospace';
    ctx.fillText('0' + (this.projects.indexOf(project) + 1) + ' — ' + project.category.toUpperCase(), 60, 150);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px DM Sans, sans-serif';
    ctx.fillText(project.title, 60, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px DM Sans, sans-serif';
    ctx.fillText(project.description.slice(0, 68) + '...', 60, 270);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(60, 320, 380, 50, 10);
    ctx.fill();
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 16px DM Mono, monospace';
    ctx.fillText('⚡ ' + project.metrics, 80, 352);

    ctx.fillStyle = hexColor;
    ctx.beginPath();
    ctx.roundRect(60, 400, 220, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 16px DM Sans, sans-serif';
    ctx.fillText('Clicca per esplorare ↗', 85, 432);

    const mockX = 540;
    const mockY = 140;
    const mockW = 680;
    const mockH = 550;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(mockX, mockY, mockW, mockH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px DM Sans, sans-serif';
    ctx.fillText('Live Performance & Metrics Overview', mockX + 40, mockY + 50);

    const barHeights = [180, 260, 220, 310, 280, 360, 340, 420];
    barHeights.forEach((h, bi) => {
      const bx = mockX + 40 + bi * 74;
      const by = mockY + mockH - 60 - h * 0.7;
      const bGrad = ctx.createLinearGradient(0, by, 0, mockY + mockH - 60);
      bGrad.addColorStop(0, hexColor);
      bGrad.addColorStop(1, 'rgba(124, 58, 237, 0.2)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, 50, h * 0.7, 6);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }
}
