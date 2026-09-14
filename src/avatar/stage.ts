import {
  ACESFilmicToneMapping, AdditiveBlending, BackSide, Box3, BufferGeometry, CanvasTexture, DirectionalLight, DoubleSide, Float32BufferAttribute,
  HemisphereLight, InstancedMesh, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, PointsMaterial, Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer, type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type Stage = { resize: (w: number, h: number) => void; pointer: (x: number, y: number) => void; setActive: (on: boolean) => void; dispose: () => void };

// seen from the side and looking right, like the artwork
const FACING = 1.5;
// from the right edge of the screen (profile) to the left edge the cursor turns the figure this far towards the viewer
const TURN = 0.3;
const IDLE_FPS = 30;

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
};

// violet studio used only as a reflection environment
function studioEnvironment(renderer: WebGLRenderer): Texture {
  const studio = new Scene();
  studio.add(new Mesh(new SphereGeometry(20, 16, 12), new MeshBasicMaterial({ color: '#07050b', side: BackSide })));
  const panel = (color: string, pos: [number, number, number], size: [number, number]) => {
    const m = new Mesh(new PlaneGeometry(...size), new MeshBasicMaterial({ color, side: DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel('#a57bff', [-6, 7, -5], [8, 3]); panel('#5b2fe0', [7, 1, -6], [4, 10]); panel('#d9c6ff', [0, 9, 3], [6, 2]);
  panel('#3b1d86', [-7, 2, 5], [5, 7]); panel('#1c0f40', [3, -4, 6], [10, 3]);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio, 0.04).texture;
  pmrem.dispose();
  studio.traverse(o => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as Material).dispose(); } });
  return env;
}

export async function createStage(canvas: HTMLCanvasElement, modelUrl: string, reducedMotion: boolean): Promise<Stage> {
  const dpr = window.devicePixelRatio || 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  // high-density screens already look smooth, so MSAA is only paid for where it shows
  const renderer = new WebGLRenderer({ canvas, antialias: dpr < 1.5, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  const camera = new PerspectiveCamera(24, 420 / 680, 0.1, 40);
  const target = new Vector3();
  const shot = { top: 1.2, halfWidth: 0.75, centerX: 0, lift: 0.12 };
  let distance = 6;
  // fit the figure to the canvas: width decides the distance, the top of the figure stays under the top edge
  const fitCamera = () => {
    const half = Math.tan((camera.fov * Math.PI) / 360);
    distance = shot.halfWidth / (half * camera.aspect);
    target.set(shot.centerX, shot.top - distance * half, 0);
  };

  // meshopt decoding runs in workers so the page stays responsive while the model unpacks
  MeshoptDecoder.useWorkers?.(2);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl);
  const figure = gltf.scene;
  figure.rotation.y = FACING;
  scene.add(figure);

  // normalise any GLB: common height, centred, framed from its bounds
  let box = new Box3().setFromObject(figure);
  figure.scale.multiplyScalar(2.4 / Math.max(box.max.y - box.min.y, 1e-6));
  box = new Box3().setFromObject(figure);
  const center = box.getCenter(new Vector3());
  figure.position.set(-center.x, -box.min.y - 1.2, -center.z);
  const height = box.max.y - box.min.y;
  Object.assign(shot, { top: 1.2 + height * 0.11, halfWidth: height * 0.5 * (420 / 670), centerX: 0.16 });
  fitCamera();
  const baseY = figure.position.y;

  // generated PBR maps read as glossy plastic: keep colour and normals, calm the metal and reflections
  figure.traverse(o => {
    if (!(o instanceof Mesh)) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (!(m instanceof MeshStandardMaterial)) return;
      m.metalnessMap = null; m.roughnessMap = null; m.metalness = 0.3; m.roughness = 0.62; m.envMapIntensity = 0.5;
      m.color.setRGB(0.72, 0.68, 0.78); m.needsUpdate = true;
    });
  });

  // violet shards drifting around the figure
  const shardCount = 7;
  const shards = new InstancedMesh(new OctahedronGeometry(1).scale(0.45, 1.25, 0.2), new MeshStandardMaterial({ color: '#5d34e6', emissive: '#4d22c9', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, flatShading: true }), shardCount);
  const shardSeeds = Array.from({ length: shardCount }, (_, i) => ({ x: i < 4 ? -0.78 - (i % 2) * 0.12 : 0.8 + (i % 2) * 0.1, y: 1.5 - i * 0.3, z: 0.35 - ((i * 37) % 7) * 0.1, s: 0.045 + ((i * 13) % 5) * 0.009 }));
  scene.add(shards);

  // rising motes, animated entirely on the GPU (no per-frame buffer uploads)
  const moteCount = 150, motePos = new Float32Array(moteCount * 3), moteSpeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    const r = (n: number) => { const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
    motePos.set([(r(1) - 0.5) * 2.8, r(2) * 3.2, (r(3) - 0.5) * 1.6], i * 3); moteSpeed[i] = 0.06 + r(4) * 0.1;
  }
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute('position', new Float32BufferAttribute(motePos, 3));
  moteGeo.setAttribute('speed', new Float32BufferAttribute(moteSpeed, 1));
  const glowTex = glowTexture();
  const moteMat = new PointsMaterial({ map: glowTex, color: '#b99aff', size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending });
  const time = { value: 0 };
  moteMat.onBeforeCompile = shader => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float speed;')
      .replace('#include <begin_vertex>', 'vec3 transformed = position;\ntransformed.y = mod(position.y + uTime * speed, 3.2) - 1.2;');
  };
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // textured model: neutral key from the front, violet rim behind
  scene.add(new HemisphereLight('#d8d0e6', '#0b0810', 0.55));
  const key = new DirectionalLight('#f1ebff', 2.6); key.position.set(-2.2, 4, 3.2); scene.add(key);
  const rim = new DirectionalLight('#9a6bff', 5); rim.position.set(3.5, 1.2, -4); scene.add(rim);
  const front = new DirectionalLight('#b7a6e0', 0.8); front.position.set(1.5, 0.6, 4); scene.add(front);
  const top = new PointLight('#efe4ff', 4, 6, 1.4); top.position.set(0.5, 2.3, 1.3); scene.add(top);

  // the cursor drives a heavy spring: the figure lags, swings a little past and settles
  const pointerTarget = { x: 1, y: 0 }, pointer = { ...pointerTarget }, velocity = { x: 0, y: 0 };
  const dummy = new Object3D();
  let intro = reducedMotion ? 1 : 0, clock = 0, frame = 0, active = false, last = 0, lastDraw = 0;
  // adaptive resolution: step the pixel ratio down while frames keep running long
  let pixelRatio = Math.min(dpr, coarse ? 1.5 : 1.75), slow = 0, cssW = 420, cssH = 670;
  const applySize = () => { renderer.setPixelRatio(pixelRatio); renderer.setSize(cssW, cssH, false); };

  const update = (dt: number) => {
    clock += dt; time.value = clock;
    intro = Math.min(1, intro + dt / 2.6);
    const e = intro * intro * (3 - 2 * intro);
    if (reducedMotion) { pointer.x = pointerTarget.x; pointer.y = pointerTarget.y; }
    else for (const axis of ['x', 'y'] as const) {
      velocity[axis] += ((pointerTarget[axis] - pointer[axis]) * 7 - velocity[axis] * 4.6) * dt;
      pointer[axis] += velocity[axis] * dt;
    }
    const t = reducedMotion ? 0 : clock;
    camera.position.set(target.x, target.y + shot.lift + pointer.y * 0.06, distance * (1.24 - 0.24 * e));
    camera.lookAt(target);
    const toChest = Math.min(Math.max((1 - pointer.x) / 2, 0), 1) * TURN + (0.5 - 0.5 * Math.cos(t * 0.23)) * 0.015;
    figure.rotation.set(pointer.y * -0.09 + Math.sin(t * 0.31 + 1.2) * 0.025, FACING - toChest, Math.sin(t * 0.19) * 0.018, 'YXZ');
    figure.position.y = baseY + (1 - e) * -0.16 + Math.sin(t * 0.7) * 0.012;
    const lit = 0.25 + 0.75 * e;
    key.intensity = 2.6 * lit; rim.intensity = 5 * lit; top.intensity = 4 * lit;
    shardSeeds.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(t * 0.5 + i * 1.7) * 0.06, s.z);
      dummy.rotation.set(t * 0.23 + i, t * 0.35 + i * 2.1, 0);
      dummy.scale.setScalar(s.s); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
    });
    shards.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const settling = intro < 1 || Math.abs(velocity.x) + Math.abs(velocity.y) > 0.01 || Math.abs(pointerTarget.x - pointer.x) + Math.abs(pointerTarget.y - pointer.y) > 0.005;
    // full frame rate while something visibly moves, half of it for the slow idle drift
    if (!settling && now - lastDraw < 1000 / IDLE_FPS - 2) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    if (settling && lastDraw && pixelRatio > 1) {
      slow = now - lastDraw > 24 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20) { pixelRatio = Math.max(1, pixelRatio - 0.25); slow = 0; applySize(); }
    }
    last = now; lastDraw = now;
    update(dt);
  };

  return {
    resize: (w, h) => {
      cssW = w; cssH = h; applySize();
      camera.aspect = w / h; camera.updateProjectionMatrix(); fitCamera();
      if (!frame) update(0);
    },
    pointer: (x, y) => { pointerTarget.x = x; pointerTarget.y = y; if (reducedMotion) update(0); },
    setActive: on => {
      if (on === active) return; active = on;
      if (reducedMotion) { if (on) update(0); return; }
      if (on) { last = 0; lastDraw = 0; frame = requestAnimationFrame(tick); } else { cancelAnimationFrame(frame); frame = 0; }
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      const geometries = new Set<BufferGeometry>(), used = new Set<Material>(), textures = new Set<Texture>();
      scene.traverse(o => {
        if (!(o instanceof Mesh || o instanceof Points)) return;
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: Material) => {
          used.add(m);
          Object.values(m).forEach(v => { if (v && (v as Texture).isTexture) textures.add(v as Texture); });
        });
      });
      geometries.forEach(g => g.dispose()); used.forEach(m => m.dispose()); textures.forEach(tx => tx.dispose());
      env.dispose(); renderer.dispose();
    },
  };
}
