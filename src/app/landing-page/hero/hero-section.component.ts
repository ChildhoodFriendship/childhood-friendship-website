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
import gsap from 'gsap';

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
  protected readonly hoveredProject = signal<ProjectExhibit | null>(null);

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
  private dustParticles?: THREE.Points;
  private tecaSpotlights: THREE.SpotLight[] = [];
  private ceilingLedMats: THREE.MeshBasicMaterial[] = [];
  private ceilingNodeMats: THREE.MeshBasicMaterial[] = [];
  private floorMesh?: THREE.Mesh;
  private gridHelper?: THREE.GridHelper;
  private galleryGroup?: THREE.Group;
  private doorDisplayCanvas?: HTMLCanvasElement;
  private doorDisplayTexture?: THREE.CanvasTexture;
  private mouseX = 0;
  private mouseY = 0;
  private targetCameraPos = new THREE.Vector3(0, 0, 120);
  private currentCameraPos = new THREE.Vector3(0, 0, 120);
  private targetCameraRot = new THREE.Euler(0, 0, 0);

  // Web Audio Context for synthesized mechanical sounds
  private audioCtx?: AudioContext;

  // Interactive Drag & Orbit Navigation
  private isDragging = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private pointerDownListener?: (e: PointerEvent) => void;
  private pointerMoveListener?: (e: PointerEvent) => void;
  private pointerUpListener?: (e: PointerEvent) => void;
  private wheelListener?: (e: WheelEvent) => void;
  private keyDownListener?: (e: KeyboardEvent) => void;
  private keyUpListener?: (e: KeyboardEvent) => void;
  private keys = { w: false, a: false, s: false, d: false };

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
      },
      {
        id: 'ecommerce',
        title: 'E-Commerce Avanzati',
        category: 'Digital Retail',
        description: 'Piattaforme di vendita veloci, sicure e ottimizzate per la conversione.',
        tech: ['Shopify', 'Stripe', 'Next.js'],
        metrics: 'High Conversion · Secure',
        color: 0xfacc15
      },
      {
        id: 'ai-integration',
        title: 'AI & Automazione',
        category: 'Machine Learning',
        description: 'Integrazione di intelligenza artificiale per automatizzare i processi aziendali.',
        tech: ['OpenAI', 'Python', 'TensorFlow'],
        metrics: 'Smart Operations · Scalable',
        color: 0xec4899
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
    if (this.vaultCanvasRef?.nativeElement) {
      const c = this.vaultCanvasRef.nativeElement;
      if (this.pointerDownListener) c.removeEventListener('pointerdown', this.pointerDownListener);
      if (this.pointerMoveListener) window.removeEventListener('pointermove', this.pointerMoveListener);
      if (this.pointerUpListener) window.removeEventListener('pointerup', this.pointerUpListener);
      if (this.wheelListener) c.removeEventListener('wheel', this.wheelListener);
    }
    this.renderer?.dispose();
  }

  private playMechanicalClick(freq = 420, duration = 0.04, type: 'triangle' | 'square' | 'sawtooth' = 'triangle'): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        this.audioCtx = new AudioCtx();
      }
      
      // If the context is blocked (suspended) due to browser autoplay rules, 
      // exit early to prevent console spam and warnings.
      if (this.audioCtx.state === 'suspended') {
        return;
      }

      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.2, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
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
        this.playMechanicalClick(300 + (rounded * 5), 0.05, 'square');
      }
      if (rounded % 15 === 0 && rounded < 95) {
        this.playMechanicalClick(120, 0.08, 'sawtooth'); // heavier clunk
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

      // Update the 3D door display canvas
      this.updateDoorDisplay(rounded, this.currentUnlockPhase());

      if (progress >= 100) {
        clearInterval(interval);
        this.playMechanicalClick(120, 0.25, 'square'); // Solid deep thud
        setTimeout(() => this.playMechanicalClick(80, 0.4, 'sawtooth'), 150); // Echo thud
        
        this.vaultUnlocked.set(true);
        this.isUnlocking.set(false);

        // Show the gallery interior elements now that the door is opening
        if (this.floorMesh) this.floorMesh.visible = true;
        if (this.gridHelper) this.gridHelper.visible = true;
        if (this.galleryGroup) this.galleryGroup.visible = true;

        // Slow cinematic camera push into the room
        this.targetCameraPos.set(0, 4.0, 45);

        // GSAP Motion Design: Animate hero text stagger reveal
        setTimeout(() => {
          gsap.fromTo('.eyebrow', 
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
          );
          gsap.fromTo('#hero-title', 
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 1.0, ease: 'power4.out', delay: 0.15 }
          );
          gsap.fromTo('.hero-description', 
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 }
          );
          gsap.fromTo('.hero-actions', 
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.45 }
          );
        }, 100);
      }
    }, 28);
  }

  protected skipVaultIntro(): void {
    this.unlockProgress.set(100);
    this.vaultUnlocked.set(true);
    this.isUnlocking.set(false);
    this.vaultDoorGroup.rotation.y = -Math.PI * 0.85;
    this.vaultDoorGroup.position.x = -80;
    
    // Ensure gallery is visible
    if (this.floorMesh) this.floorMesh.visible = true;
    if (this.gridHelper) this.gridHelper.visible = true;
    if (this.galleryGroup) this.galleryGroup.visible = true;
    
    this.targetCameraPos.set(0, 4.0, 45);
    this.currentCameraPos.set(0, 4.0, 45);
    if (this.camera) {
      this.camera.position.set(0, 4.0, 45);
    }
    
    // GSAP Motion Design (immediate)
    setTimeout(() => {
      gsap.fromTo('.eyebrow', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      gsap.fromTo('#hero-title', { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power4.out', delay: 0.15 });
      gsap.fromTo('.hero-description', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 });
      gsap.fromTo('.hero-actions', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.45 });
    }, 50);
  }

  protected inspectProject(project: ProjectExhibit): void {
    this.selectedProject.set(project);
    const idx = this.projects.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      const angle = (idx - 1) * 0.28;
      this.targetCameraRot.y = -angle;
      this.targetCameraPos.x = (idx - 1) * 8;
      this.targetCameraPos.z = 26; // Smooth zoom into the selected exhibit
    }
  }

  protected closeProjectModal(): void {
    this.selectedProject.set(null);
    this.targetCameraRot.y = 0;
    this.targetCameraPos.x = 0;
    this.targetCameraPos.z = 31;
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
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.006);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 300);
    this.camera.position.copy(this.currentCameraPos);

    // 2. Renderer (Cinema High-End Configuration)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 3. Lighting (Vault Moody Neon Ambience + Spotlights & Rim Lights)
    const ambientLight = new THREE.AmbientLight(0x28263a, 1.8);
    this.scene.add(ambientLight);

    const vaultSpotViolet = new THREE.SpotLight(0x8b5cf6, 6.0, 120, Math.PI / 3, 0.4, 1.2);
    vaultSpotViolet.position.set(0, 35, 25);
    this.scene.add(vaultSpotViolet);

    const vaultAccentCyan = new THREE.PointLight(0xa78bfa, 4.0, 80);
    vaultAccentCyan.position.set(-25, 18, 15);
    this.scene.add(vaultAccentCyan);

    const vaultAccentPink = new THREE.PointLight(0xd946ef, 3.5, 80);
    vaultAccentPink.position.set(25, 18, 15);
    this.scene.add(vaultAccentPink);

    // Frontal directional key light hitting the metal vault door
    const frontKeyLight = new THREE.DirectionalLight(0xf1f5f9, 2.6);
    frontKeyLight.position.set(10, 20, 65);
    this.scene.add(frontKeyLight);

    // Dedicated downlight illuminating the pedestals and computer mockups
    const pedestalLight = new THREE.DirectionalLight(0xffffff, 2.2);
    pedestalLight.position.set(0, 25, 5);
    this.scene.add(pedestalLight);

    // 4. Build Vault Door & Mechanism & Front Wall
    this.buildVaultDoor();

    // 5. Build Dark Gallery Room (Pedestals, Computer Mockups, Interactive Wall Frames)
    this.buildVaultGallery();

    // 6. Interactive Mouse Parallax, Click Detection, & Hover Raycaster
    this.mouseMoveListener = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.mouseX = x;
      this.mouseY = y;
      
      if (this.camera && this.scene && this.vaultUnlocked()) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        const interactables: THREE.Object3D[] = [];
        this.wallFrames.forEach(f => interactables.push(f.mesh));
        this.exhibitMeshes.forEach(m => interactables.push(m.mesh));
        
        const intersects = raycaster.intersectObjects(interactables, true);
        let foundHover: ProjectExhibit | null = null;
        
        if (intersects.length > 0) {
          let hit: THREE.Object3D | null = intersects[0].object;
          while (hit && !hit.userData['project'] && hit.parent && hit !== this.scene) {
            hit = hit.parent;
          }
          if (hit && hit.userData['project']) {
            foundHover = hit.userData['project'];
          }
        }
        
        if (this.hoveredProject()?.id !== foundHover?.id) {
           this.hoveredProject.set(foundHover);
           document.body.style.cursor = foundHover ? 'pointer' : 'default';
        }
      }
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
          const proj = hit.userData['project'] as any; window.open(proj.link || 'https://example.com/project-placeholder', '_blank');
        }
      }
    };
    canvas.addEventListener('click', this.canvasClickListener);

      // 7. Interactive Free Drag & Orbit & Zoom Navigation (Cinematic 3D Room exploration)
      this.pointerDownListener = (e: PointerEvent) => {
        if (!this.vaultUnlocked()) return;
        this.isDragging = true;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;
      };
      canvas.addEventListener('pointerdown', this.pointerDownListener);

      this.pointerMoveListener = (e: PointerEvent) => {
        if (!this.isDragging || !this.vaultUnlocked()) return;
        const dx = e.clientX - this.prevPointerX;
        const dy = e.clientY - this.prevPointerY;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;

        this.orbitYaw -= dx * 0.004;
        this.orbitPitch -= dy * 0.003;
        // Clamp pitch to avoid flipping
        this.orbitPitch = Math.max(-0.45, Math.min(0.55, this.orbitPitch));
      };
      window.addEventListener('pointermove', this.pointerMoveListener);

      this.pointerUpListener = () => {
        this.isDragging = false;
      };
      window.addEventListener('pointerup', this.pointerUpListener);

      // Smooth mouse wheel zoom in/out with deep exploration
      this.wheelListener = (e: WheelEvent) => {
        if (!this.vaultUnlocked()) return;
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.035;
        
        // Deep zoom: from far outside door (z = 45) to deep into the gallery (z = -25)
        this.targetCameraPos.z = Math.max(-25, Math.min(45, this.targetCameraPos.z + zoomDelta));
        
        // Adjust camera Y dynamically based on Z depth to look naturally up at wall frames when deep inside
        const depthRatio = (this.targetCameraPos.z + 25) / 70; // 0 (deep) to 1 (far)
        this.targetCameraPos.y = 2.0 + (depthRatio * 2.0); // Drop low when deep inside for dramatic angle
      };
      canvas.addEventListener('wheel', this.wheelListener, { passive: false });

      // WASD Videogame Navigation
      this.keyDownListener = (e: KeyboardEvent) => {
        if (!this.vaultUnlocked()) return;
        const key = e.key.toLowerCase();
        if (key in this.keys) {
          this.keys[key as keyof typeof this.keys] = true;
        }
      };
      this.keyUpListener = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key in this.keys) {
          this.keys[key as keyof typeof this.keys] = false;
        }
      };
      window.addEventListener('keydown', this.keyDownListener);
      window.addEventListener('keyup', this.keyUpListener);

      // 8. Responsive Resizer
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

      // 9. Render Loop
      let lastTime = performance.now();
      let elapsed = 0;
      const animate = () => {
        this.animFrameId = requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - lastTime) / 1000;
        lastTime = time;
        elapsed += delta;

        // WASD movement logic
        if (this.vaultUnlocked() && this.camera) {
          const moveSpeed = 40.0 * delta; // speed per second
          
          // Move in camera's local forward/right directions
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyQuaternion(this.camera.quaternion);
          forward.y = 0; // Lock vertical movement for walking
          forward.normalize();
          
          const right = new THREE.Vector3(1, 0, 0);
          right.applyQuaternion(this.camera.quaternion);
          right.y = 0;
          right.normalize();

          if (this.keys.w) {
            this.targetCameraPos.addScaledVector(forward, moveSpeed);
          }
          if (this.keys.s) {
            this.targetCameraPos.addScaledVector(forward, -moveSpeed);
          }
          if (this.keys.a) {
            this.targetCameraPos.addScaledVector(right, -moveSpeed);
          }
          if (this.keys.d) {
            this.targetCameraPos.addScaledVector(right, moveSpeed);
          }

          // Clamp movement boundaries (room limits)
          this.targetCameraPos.x = Math.max(-50, Math.min(50, this.targetCameraPos.x));
          this.targetCameraPos.z = Math.max(-25, Math.min(65, this.targetCameraPos.z));
          
          // Adjust height based on Z depth dynamically when moving
          const depthRatio = (this.targetCameraPos.z + 25) / 90; // 0 (deep) to 1 (far)
          this.targetCameraPos.y = 2.0 + (Math.max(0, depthRatio) * 2.0);
        }

        // Smooth camera interpolation
        const smoothFactor = 0.05;
        this.currentCameraPos.lerp(this.targetCameraPos, smoothFactor);
        
        if (this.camera) {
          // Cinematic camera floating + user orbit yaw/pitch
          const breatheY = Math.sin(elapsed * 0.8) * 0.25;
          const breatheX = Math.cos(elapsed * 0.6) * 0.35;

          this.camera.position.x = this.currentCameraPos.x + breatheX + this.mouseX * 2.2;
          this.camera.position.y = this.currentCameraPos.y + breatheY + this.mouseY * 1.4;
          this.camera.position.z = this.currentCameraPos.z;

          // Camera rotation with drag-orbit yaw & pitch + subtle mouse sway
          const targetRotY = this.targetCameraRot.y + this.orbitYaw - this.mouseX * 0.12;
          const targetRotX = this.orbitPitch + this.mouseY * 0.08;

          this.camera.rotation.y += (targetRotY - this.camera.rotation.y) * 0.06;
          this.camera.rotation.x += (targetRotX - this.camera.rotation.x) * 0.06;
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

        // Hover glow animation on wall frames
        this.wallFrames.forEach((frame, index) => {
          const isHovered = this.hoveredProject()?.id === frame.project.id;
          const targetPulse = isHovered ? 3.5 : 0.9 + Math.sin(elapsed * 2.0 + index) * 0.15;
          if (frame.borderMat) {
            frame.borderMat.emissiveIntensity += (targetPulse - frame.borderMat.emissiveIntensity) * 0.1;
          }
        });

        // Dynamic breathing for honeycomb ceiling LED lights
        this.ceilingLedMats.forEach((mat, idx) => {
          mat.opacity = 0.15 + Math.max(0, Math.sin(elapsed * 2.2 + idx * 0.4)) * 0.4;
        });
        this.ceilingNodeMats.forEach((mat, idx) => {
          mat.opacity = 0.4 + Math.max(0, Math.sin(elapsed * 2.2 + idx * 0.4)) * 0.6;
        });

        // Museum spotlight hover effect on teche
        this.tecaSpotlights.forEach((spot, i) => {
          const proj = this.projects[i];
          const isHovered = this.hoveredProject()?.id === proj.id;
          const targetIntensity = isHovered ? 12.0 : 4.2 + Math.sin(elapsed * 1.5 + i * 1.2) * 0.6;
          spot.intensity += (targetIntensity - spot.intensity) * 0.1;
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
      color: 0x14161c, // Slightly lighter than interior so it catches the outside light
      metalness: 0.2,
      roughness: 0.85,
      side: THREE.DoubleSide // Prevent backface culling which made it invisible from outside!
    });
    const wallTrimMat = new THREE.MeshStandardMaterial({
      color: 0x333742,
      metalness: 0.9,
      roughness: 0.25
    });

    // Create a massive wall with a perfect circular hole for the vault door
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-400, -400);
    wallShape.lineTo(400, -400);
    wallShape.lineTo(400, 400);
    wallShape.lineTo(-400, 400);
    wallShape.lineTo(-400, -400);
    
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 17.5, 0, Math.PI * 2, false);
    wallShape.holes.push(holePath);

    const extrudeSettings = { depth: 4, bevelEnabled: false, curveSegments: 48 };
    const frontWallGeo = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
    const frontWallMesh = new THREE.Mesh(frontWallGeo, wallConcreteMat);
    // Extrude geometry grows in +Z, so if we want it centered at 0 we move it back
    frontWallMesh.position.z = -2;
    frontWallGroup.add(frontWallMesh);

    // Vault portal opening rim trim (Heavy Machined Titanium Ring)
    const portalRimGeo = new THREE.TorusGeometry(17.6, 1.4, 24, 80);
    const portalRim = new THREE.Mesh(portalRimGeo, wallTrimMat);
    portalRim.position.set(0, 0, 1.5);
    frontWallGroup.add(portalRim);

    this.scene.add(frontWallGroup);

    // B. Vault Door Group (Scaled and centered to be 100% complete and fully circular)
    this.vaultDoorGroup = new THREE.Group();
    this.vaultDoorGroup.position.set(0, 0, 45);

    const industrialGraySteel = new THREE.MeshStandardMaterial({
      color: 0x4a4e56,
      metalness: 0.94,
      roughness: 0.25
    });
    const darkArmoredSteel = new THREE.MeshStandardMaterial({
      color: 0x24272f,
      metalness: 0.9,
      roughness: 0.32
    });
    const machinedBronzeGold = new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x422d0c,
      emissiveIntensity: 0.3
    });
    const gearPurpleMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.85,
      roughness: 0.22,
      emissive: 0x3b1d75,
      emissiveIntensity: 0.4
    });

    // 1. Heavy Outer Steel Bezel Ring (R = 16.5)
    const rimGeo = new THREE.TorusGeometry(16.5, 1.3, 24, 80);
    const rim = new THREE.Mesh(rimGeo, darkArmoredSteel);
    this.vaultDoorGroup.add(rim);

    // 2. Thick Vault Door Core Disc (Gray machined metal, R = 16.0)
    const doorGeo = new THREE.CylinderGeometry(16.0, 16.0, 2.4, 80);
    const door = new THREE.Mesh(doorGeo, industrialGraySteel);
    door.rotation.x = Math.PI / 2;
    this.vaultDoorGroup.add(door);

    // Central stepped metallic relief plate (R = 12.6)
    const innerPlateGeo = new THREE.CylinderGeometry(12.6, 13.0, 0.6, 80);
    const innerPlate = new THREE.Mesh(innerPlateGeo, darkArmoredSteel);
    innerPlate.rotation.x = Math.PI / 2;
    innerPlate.position.z = 1.25;
    this.vaultDoorGroup.add(innerPlate);

    // 3. Perimeter Bronze/Gold Rivet Bolts around the circle
    const rivetCount = 36;
    const rivetGeo = new THREE.SphereGeometry(0.38, 14, 14);
    for (let i = 0; i < rivetCount; i++) {
      const angle = (i / rivetCount) * Math.PI * 2;
      const rivet = new THREE.Mesh(rivetGeo, machinedBronzeGold);
      rivet.position.set(Math.cos(angle) * 15.2, Math.sin(angle) * 15.2, 1.25);
      this.vaultDoorGroup.add(rivet);
    }

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const innerRivet = new THREE.Mesh(rivetGeo, machinedBronzeGold);
      innerRivet.position.set(Math.cos(angle) * 11.6, Math.sin(angle) * 11.6, 1.55);
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
    // Integrated Security Display Panel on the vault door surface
    this.doorDisplayCanvas = document.createElement('canvas');
    this.doorDisplayCanvas.width = 512;
    this.doorDisplayCanvas.height = 192;
    this.doorDisplayTexture = new THREE.CanvasTexture(this.doorDisplayCanvas);
    this.doorDisplayTexture.minFilter = THREE.LinearFilter;
    this.updateDoorDisplay(0, 'Inizializzazione sensori...');

    // Display housing — dark recessed panel
    const displayHousingGeo = new THREE.BoxGeometry(8.8, 3.6, 0.35);
    const displayHousingMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e14,
      metalness: 0.9,
      roughness: 0.3
    });
    const displayHousing = new THREE.Mesh(displayHousingGeo, displayHousingMat);
    displayHousing.position.set(-6.5, -9.5, 2.6);
    this.vaultDoorGroup.add(displayHousing);

    // Display trim border
    const displayTrimGeo = new THREE.BoxGeometry(9.2, 4.0, 0.2);
    const displayTrimMat = new THREE.MeshStandardMaterial({
      color: 0x333742,
      metalness: 0.95,
      roughness: 0.2
    });
    const displayTrim = new THREE.Mesh(displayTrimGeo, displayTrimMat);
    displayTrim.position.set(-6.5, -9.5, 2.42);
    this.vaultDoorGroup.add(displayTrim);

    // Glowing screen surface
    const displayScreenGeo = new THREE.PlaneGeometry(8.4, 3.2);
    const displayScreenMat = new THREE.MeshBasicMaterial({
      map: this.doorDisplayTexture,
      transparent: true
    });
    const displayScreen = new THREE.Mesh(displayScreenGeo, displayScreenMat);
    displayScreen.position.set(-6.5, -9.5, 2.8);
    this.vaultDoorGroup.add(displayScreen);

    // Small LED indicator dot next to the display
    const ledGeo = new THREE.CircleGeometry(0.18, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const ledDot = new THREE.Mesh(ledGeo, ledMat);
    ledDot.position.set(-10.8, -8.2, 2.82);
    this.vaultDoorGroup.add(ledDot);

    this.scene.add(this.vaultDoorGroup);
  }

  // Draw the progress UI onto the canvas texture applied to the door's built-in screen
  private updateDoorDisplay(progressPercent: number, phaseText: string): void {
    if (!this.doorDisplayCanvas || !this.doorDisplayTexture) return;

    const ctx = this.doorDisplayCanvas.getContext('2d');
    if (!ctx) return;

    const width = this.doorDisplayCanvas.width;
    const height = this.doorDisplayCanvas.height;

    // Clear background (dark screen)
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, width, height);

    // Draw header text
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#8b5cf6'; // cf-color-violet-light
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('VAULT SECURE ENTRY // MECHANICAL UNLOCK', 30, 26);

    // Draw track
    const trackX = 30;
    const trackY = 80;
    const trackWidth = width - 60;
    const trackHeight = 16;
    const radius = 8;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackWidth, trackHeight, radius);
    ctx.fill();

    // Draw progress bar
    if (progressPercent > 0) {
      const pWidth = Math.max(radius * 2, (progressPercent / 100) * trackWidth);
      const gradient = ctx.createLinearGradient(trackX, 0, trackX + pWidth, 0);
      gradient.addColorStop(0, '#7c3aed'); // cf-color-violet
      gradient.addColorStop(1, '#4ade80'); // cf-color-success
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(trackX, trackY, pWidth, trackHeight, radius);
      ctx.fill();
    }

    // Draw bottom texts (Phase and Percentage)
    ctx.font = '18px monospace';
    ctx.fillStyle = '#a3a3a3'; // cf-color-text-muted
    ctx.fillText(phaseText, 30, 130);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${progressPercent}%`, width - 30, 130);

    // Tell Three.js to update the material from canvas
    this.doorDisplayTexture.needsUpdate = true;
  }

  private buildVaultGallery(): void {
    if (!this.scene) return;

    // Procedural Dark Glossy Tiles for Floor and Walls
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const tileCtx = tileCanvas.getContext('2d')!;
    
    // Draw tile
    tileCtx.fillStyle = '#08080c'; // Base glossy color
    tileCtx.fillRect(0, 0, 512, 512);
    // Draw grout (rough borders)
    tileCtx.lineWidth = 12;
    tileCtx.strokeStyle = '#020202';
    tileCtx.strokeRect(0, 0, 512, 512);
    
    const tileTexture = new THREE.CanvasTexture(tileCanvas);
    tileTexture.wrapS = THREE.RepeatWrapping;
    tileTexture.wrapT = THREE.RepeatWrapping;
    tileTexture.repeat.set(30, 30); // 240/30 = 8x8 units per tile

    // Roughness map (white = rough grout, black = glossy tile)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const roughCtx = roughCanvas.getContext('2d')!;
    roughCtx.fillStyle = '#111111'; // Glossy center (roughness 0.06)
    roughCtx.fillRect(0, 0, 512, 512);
    roughCtx.lineWidth = 12;
    roughCtx.strokeStyle = '#ffffff'; // Rough grout (roughness 1.0)
    roughCtx.strokeRect(0, 0, 512, 512);

    const roughTexture = new THREE.CanvasTexture(roughCanvas);
    roughTexture.wrapS = THREE.RepeatWrapping;
    roughTexture.wrapT = THREE.RepeatWrapping;
    roughTexture.repeat.set(30, 30);

    const floorGeo = new THREE.PlaneGeometry(240, 240, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: tileTexture,
      roughnessMap: roughTexture,
      roughness: 0.8, // Base roughness (scaled by map)
      metalness: 0.15,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -6;
    this.floorMesh.visible = false;
    this.scene.add(this.floorMesh);

    // Gallery interior group — hidden during vault loading, shown after unlock
    this.galleryGroup = new THREE.Group();
    this.galleryGroup.visible = false;

    // Realistic Matte Backdrop Wall
    const wallGeo = new THREE.PlaneGeometry(240, 80);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d14, // Dark matte finish
      metalness: 0.1,
      roughness: 0.95,
      side: THREE.DoubleSide
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 15, -26); // Moved closer to be the actual backdrop
    this.galleryGroup.add(backWall);

    // Architectural Dark Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(240, 120);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x08090d,
      roughness: 0.8,
      metalness: 0.4
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 32, -5);
    this.galleryGroup.add(ceiling);

    // Simulated Honeycomb/Alveolare LED Ceiling Lights Matrix (Expanded to cover ceiling)
    const honeycombGroup = new THREE.Group();
    honeycombGroup.position.set(0, 31.8, -8);
    honeycombGroup.rotation.x = Math.PI / 2;

    const hexCols = 17; // Fewer columns
    const hexRows = 11; // Fewer rows
    const hexRadius = 8.5; // Larger radius to cover the same massive area efficiently
    const dx = hexRadius * 1.732;
    const dy = hexRadius * 1.5;

    // Procedural Glow Texture for ceiling LED nodes
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const glowCtx = glowCanvas.getContext('2d')!;
    const glowGrad = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    glowGrad.addColorStop(0.2, 'rgba(190, 210, 255, 0.8)');
    glowGrad.addColorStop(0.5, 'rgba(100, 150, 255, 0.2)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    glowCtx.fillStyle = glowGrad;
    glowCtx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    // Create a pool of materials for performance instead of unique material per hex
    const materialPoolSize = 16;
    for (let i = 0; i < materialPoolSize; i++) {
      const isViolet = i % 2 === 0;
      const baseColor = isViolet ? 0x8b5cf6 : 0x38bdf8;
      
      const hexLedMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.ceilingLedMats.push(hexLedMat);

      const nodeLedMat = new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: baseColor,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85
      });
      this.ceilingNodeMats.push(nodeLedMat);
    }

    const hexGeo = new THREE.RingGeometry(hexRadius - 0.2, hexRadius, 6);
    const nodeGeo = new THREE.PlaneGeometry(6, 6);

    for (let r = 0; r < hexRows; r++) {
      for (let c = 0; c < hexCols; c++) {
        const xOffset = (c - (hexCols - 1) / 2) * dx + (r % 2 === 1 ? dx / 2 : 0);
        const yOffset = (r - (hexRows - 1) / 2) * dy;
        const poolIndex = (r * hexCols + c) % materialPoolSize;

        // Thin glowing hexagon ring
        const hexMesh = new THREE.Mesh(hexGeo, this.ceilingLedMats[poolIndex]);
        hexMesh.position.set(xOffset, yOffset, 0);
        honeycombGroup.add(hexMesh);

        // Center light node inside hexagon (glowing aura)
        const nodeMesh = new THREE.Mesh(nodeGeo, this.ceilingNodeMats[poolIndex]);
        nodeMesh.position.set(xOffset, yOffset, 0.05);
        honeycombGroup.add(nodeMesh);
      }
    }
    this.galleryGroup.add(honeycombGroup);

    // Overhead ambient fill from honeycomb lights (Expanded to cover room)
    const fillLight1 = new THREE.PointLight(0xa78bfa, 2.0, 120);
    fillLight1.position.set(0, 28, 0);
    this.galleryGroup.add(fillLight1);

    const fillLight2 = new THREE.PointLight(0x38bdf8, 1.5, 120);
    fillLight2.position.set(-35, 28, -25);
    this.galleryGroup.add(fillLight2);

    const fillLight3 = new THREE.PointLight(0x8b5cf6, 1.5, 120);
    fillLight3.position.set(35, 28, -25);
    this.galleryGroup.add(fillLight3);

    // Subtle ceiling directional light to highlight the floor and walls
    const galleryDirectional = new THREE.DirectionalLight(0x6366f1, 0.3); // Drastically reduced intensity
    galleryDirectional.position.set(0, 40, -10);
    galleryDirectional.target.position.set(0, 0, -20);
    this.galleryGroup.add(galleryDirectional);
    this.galleryGroup.add(galleryDirectional.target);

    // Vault Side Walls (Minimal Matte)
    const sideWallGeo = new THREE.PlaneGeometry(120, 80);
    const leftSideWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftSideWall.rotation.y = Math.PI / 2;
    leftSideWall.position.set(-45, 15, 0);
    this.galleryGroup.add(leftSideWall);

    const rightSideWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightSideWall.rotation.y = -Math.PI / 2;
    rightSideWall.position.set(45, 15, 0);
    this.galleryGroup.add(rightSideWall);

    // Ambient neon fill lights
    const rightFillLight = new THREE.PointLight(0x7c3aed, 3.5, 90);
    rightFillLight.position.set(30, 12, 10);
    this.galleryGroup.add(rightFillLight);

    const leftFillLight = new THREE.PointLight(0x6366f1, 3.0, 90);
    leftFillLight.position.set(-30, 12, 10);
    this.galleryGroup.add(leftFillLight);

    // 1. Build 3 Pedestals with 3D Computer / Laptop Mockups
    const positions = [
      { x: -33, z: 8, rotY: Math.PI / 2 },
      { x: -33, z: -10, rotY: Math.PI / 2 },
      { x: 0, z: -12, rotY: 0 },
      { x: 33, z: -10, rotY: -Math.PI / 2 },
      { x: 33, z: 8, rotY: -Math.PI / 2 }
    ];

    this.projects.forEach((proj, i) => {
      const pos = positions[i];
      const exhibitGroup = new THREE.Group();
      exhibitGroup.position.set(pos.x, -6, pos.z);
      if (pos.rotY) exhibitGroup.rotation.y = pos.rotY;
      exhibitGroup.userData['project'] = proj;

      // 1. Pedestal Base (Machined Dark Obsidian & Chamfered Rim)
      const baseGeo = new THREE.CylinderGeometry(3.6, 4.3, 4, 40);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x14161d,
        metalness: 0.88,
        roughness: 0.25
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 2;
      base.castShadow = true;
      base.receiveShadow = true;
      exhibitGroup.add(base);

      // Base top metal trim ring
      const baseTopTrimGeo = new THREE.CylinderGeometry(3.65, 3.65, 0.25, 40);
      const metalTrimMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.95,
        roughness: 0.2
      });
      const baseTrim = new THREE.Mesh(baseTopTrimGeo, metalTrimMat);
      baseTrim.position.y = 4.0;
      exhibitGroup.add(baseTrim);

      // 2. Pedestal Neon Ring
      const ringGeo = new THREE.TorusGeometry(3.7, 0.14, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: proj.color,
        emissive: proj.color,
        emissiveIntensity: 2.8,
        roughness: 0.1
      });
      const neonRing = new THREE.Mesh(ringGeo, ringMat);
      neonRing.rotation.x = Math.PI / 2;
      neonRing.position.y = 4.15;
      exhibitGroup.add(neonRing);

      // Upward Internal Glow (Spotlight highlighting the mockup from below)
      const internalUpLight = new THREE.SpotLight(proj.color, 4.5, 25, Math.PI / 4, 0.5, 1.0);
      internalUpLight.position.set(0, 4.2, 0);
      const targetObj = new THREE.Object3D();
      targetObj.position.set(0, 10, 0); // Point straight up at the mockup
      exhibitGroup.add(targetObj);
      internalUpLight.target = targetObj;
      exhibitGroup.add(internalUpLight);

      // 3. Glass Showcase Case
      const glassGeo = new THREE.CylinderGeometry(3.4, 3.4, 7.2, 40, 1, true);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.32,
        roughness: 0.04,
        metalness: 0.08,
        transmission: 0.95,
        ior: 1.52,
        reflectivity: 0.9
      });
      const glassTeca = new THREE.Mesh(glassGeo, glassMat);
      glassTeca.position.y = 7.7;
      exhibitGroup.add(glassTeca);

      // Glass Top Dome / Cap
      const glassCapGeo = new THREE.CylinderGeometry(3.4, 3.4, 0.2, 40);
      const glassCap = new THREE.Mesh(glassCapGeo, glassMat);
      glassCap.position.y = 11.3;
      exhibitGroup.add(glassCap);

      // Metal Ring Crown
      const glassCrownGeo = new THREE.TorusGeometry(3.42, 0.1, 12, 40);
      const crownMesh = new THREE.Mesh(glassCrownGeo, metalTrimMat);
      crownMesh.rotation.x = Math.PI / 2;
      crownMesh.position.y = 11.3;
      exhibitGroup.add(crownMesh);

      // 4. Dedicated Overhead Museum Spotlight & Internal Glow
      const tecaSpot = new THREE.SpotLight(proj.color, 4.5, 30, Math.PI / 4, 0.35, 1.2);
      tecaSpot.position.set(0, 15, 4);
      tecaSpot.target.position.set(0, 5, 0);
      tecaSpot.castShadow = true;
      exhibitGroup.add(tecaSpot);
      exhibitGroup.add(tecaSpot.target);
      this.tecaSpotlights.push(tecaSpot);

      // Add a subtle point light inside the teca to make the glass "glow"
      const internalLight = new THREE.PointLight(proj.color, 1.5, 12);
      internalLight.position.set(0, 6, 0);
      exhibitGroup.add(internalLight);

      // 5. 3D Computer / Laptop Mockup
      const computerMockup = this.createComputerMockup(proj, i);
      computerMockup.position.y = 5.2;
      computerMockup.userData['project'] = proj;
      exhibitGroup.add(computerMockup);

      this.galleryGroup?.add(exhibitGroup);
      this.exhibitMeshes.push({ mesh: computerMockup, project: proj });
    });

    this.scene.add(this.galleryGroup);

    // 2. Atmospheric particles removed per design decision

    // 3. Build Interactive Framed Exhibits on Wall (inside galleryGroup)
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
      { project: this.projects[0], x: -44.5, y: 11, z: 8, width: 14, height: 8.5, rotY: Math.PI / 2 },
      { project: this.projects[1], x: -44.5, y: 11, z: -10, width: 14, height: 8.5, rotY: Math.PI / 2 },
      { project: this.projects[2], x: 0, y: 13, z: -25.5, width: 17, height: 10, rotY: 0 },
      { project: this.projects[3], x: 44.5, y: 11, z: -10, width: 14, height: 8.5, rotY: -Math.PI / 2 },
      { project: this.projects[4], x: 44.5, y: 11, z: 8, width: 14, height: 8.5, rotY: -Math.PI / 2 }
    ];

    frameConfigs.forEach(cfg => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(cfg.x, cfg.y, cfg.z);
      frameGroup.rotation.y = cfg.rotY;
      frameGroup.userData['project'] = cfg.project;
      frameGroup.userData['type'] = 'frame';

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b, // Lighter, warmer retro wood color
        metalness: 0.1,
        roughness: 0.75
      });
      const outerGeo = new THREE.BoxGeometry(cfg.width + 1.8, cfg.height + 1.8, 0.5); // Thicker classic frame
      const outerMesh = new THREE.Mesh(outerGeo, frameMat);
      frameGroup.add(outerMesh);

      const innerTrimMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold accent trim
        metalness: 0.8,
        roughness: 0.3
      });
      const innerTrimGeo = new THREE.BoxGeometry(cfg.width + 0.6, cfg.height + 0.6, 0.6);
      const innerTrimMesh = new THREE.Mesh(innerTrimGeo, innerTrimMat);
      frameGroup.add(innerTrimMesh);

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
      const screenMat = new THREE.MeshBasicMaterial({ 
        map: screenTexture,
        side: THREE.FrontSide
      });
      const screenGeo = new THREE.PlaneGeometry(cfg.width, cfg.height);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.32; // Elevated clearly above the outer and border box
      screenMesh.userData['project'] = cfg.project;
      frameGroup.add(screenMesh);

      const frameLight = new THREE.SpotLight(cfg.project.color, 3.2, 35, Math.PI / 4, 0.4);
      
      // Calculate light offset based on frame rotation to always push the light out into the room
      const lightOffsetZ = Math.cos(cfg.rotY) * 10;
      const lightOffsetX = Math.sin(cfg.rotY) * 10;
      frameLight.position.set(cfg.x + lightOffsetX, cfg.y + 6, cfg.z + lightOffsetZ);
      
      frameLight.target = frameGroup;
      this.galleryGroup?.add(frameLight);

      this.galleryGroup?.add(frameGroup);
      this.wallFrames.push({ mesh: frameGroup, borderMat, project: cfg.project });
    });
  }

  // Floating ambient light particles / dust motes in the 3D room
  private buildAtmosphericParticles(): void {
    if (!this.scene) return;

    const particleCount = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const violetColor = new THREE.Color(0xa78bfa);
    const cyanColor = new THREE.Color(0x38bdf8);
    const goldColor = new THREE.Color(0xfbbf24);

    for (let i = 0; i < particleCount; i++) {
      // Spread across room volume
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = -4 + Math.random() * 26;
      positions[i * 3 + 2] = -35 + Math.random() * 65;

      const pickColor = i % 3 === 0 ? violetColor : (i % 3 === 1 ? cyanColor : goldColor);
      colors[i * 3] = pickColor.r;
      colors[i * 3 + 1] = pickColor.g;
      colors[i * 3 + 2] = pickColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
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
