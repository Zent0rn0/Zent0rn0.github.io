import {
  ACESFilmicToneMapping, AdditiveBlending, BackSide, Box3, BufferGeometry, CanvasTexture, DirectionalLight, DoubleSide, Float32BufferAttribute,
  HemisphereLight, InstancedMesh, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, PointsMaterial, Scene, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Vector3, WebGLRenderer, type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type Stage = { resize: (w: number, h: number) => void; pointer: (x: number, y: number) => void; setActive: (on: boolean) => void; dispose: () => void };

// seen from the side and looking right, like the artwork
const FACING = 1.5;
// from the right edge of the screen (profile) to the left edge the cursor turns the figure this far towards the viewer
const TURN = 0.3;
const IDLE_FPS = 30;

// small canvas textures drawn once: soft glow, halo ring, light shaft, lily petal
const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
};
const radial = (size: number, stops: [number, string][]) => canvasTexture(size, size, ctx => {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
});
const shaftTexture = () => canvasTexture(32, 256, ctx => {
  const across = ctx.createLinearGradient(0, 0, 32, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(0.5, 'rgba(255,255,255,1)'); across.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = across; ctx.fillRect(0, 0, 32, 256);
  const along = ctx.createLinearGradient(0, 0, 0, 256);
  along.addColorStop(0, 'rgba(0,0,0,1)'); along.addColorStop(0.35, 'rgba(0,0,0,.7)'); along.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = along; ctx.fillRect(0, 0, 32, 256);
});
const petalTexture = () => canvasTexture(64, 128, ctx => {
  ctx.beginPath(); ctx.moveTo(32, 4);
  ctx.bezierCurveTo(60, 30, 58, 92, 32, 124); ctx.bezierCurveTo(6, 92, 4, 30, 32, 4);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#eadfff'); g.addColorStop(1, '#a98ae8');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(160,125,230,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, 18); ctx.quadraticCurveTo(35, 70, 32, 118); ctx.stroke();
});

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
      m.color.setRGB(0.76, 0.73, 0.79); m.needsUpdate = true;
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
  const glowTex = radial(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
  const moteMat = new PointsMaterial({ map: glowTex, color: '#c4a8ff', size: 0.05, transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending });
  const time = { value: 0 };
  moteMat.onBeforeCompile = shader => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float speed;')
      .replace('#include <begin_vertex>', 'vec3 transformed = position;\ntransformed.y = mod(position.y + uTime * speed, 3.2) - 1.2;')
      // twinkle, and grow in at the bottom / shrink away at the top of the loop
      .replace('gl_PointSize = size;', 'float life = (transformed.y + 1.2) / 3.2;\ngl_PointSize = size * (0.55 + 0.45 * sin(uTime * speed * 40.0 + position.x * 31.0)) * smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.75, 1.0, life));');
  };
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // light behind the figure: a wide violet bloom and a thin pale ring, like a moon through the window
  const additive = (map: Texture, color: string, opacity: number) => new MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
  const plane = new PlaneGeometry(1, 1);
  const bloom = new Mesh(plane, additive(radial(128, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,.55)'], [0.55, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]), '#a58dff', 0.5));
  bloom.position.set(0.18, 0.78, -1.4); bloom.scale.set(2.8, 2.8, 1); scene.add(bloom);
  const ring = new Mesh(plane, additive(radial(256, [[0, 'rgba(255,255,255,0)'], [0.84, 'rgba(255,255,255,0)'], [0.9, 'rgba(255,255,255,.9)'], [0.93, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), '#d9c6ff', 0.3));
  ring.position.set(0.12, 0.72, -1.1); ring.scale.set(1.9, 1.9, 1); scene.add(ring);

  // light falling from the upper left through the window
  const shaftTex = shaftTexture();
  const shafts = [[-0.5, 0.2, 0.42], [-0.22, 0.09, 0.34], [0.12, 0.26, 0.3], [0.42, 0.11, 0.3], [0.72, 0.18, 0.24]].map(([x, width, opacity], i) => {
    const m = new Mesh(plane, additive(shaftTex, '#cdb6ff', opacity));
    m.position.set(x, 1.1, -0.6 + i * 0.2); m.rotation.z = 0.32; m.scale.set(width, 4.2, 1);
    scene.add(m); return { mesh: m, opacity };
  });

  // lily petals drifting down past the knight
  const petalCount = 14;
  const petals = new InstancedMesh(plane, new MeshBasicMaterial({ map: petalTexture(), color: '#ddd0ff', transparent: true, alphaTest: 0.05, side: DoubleSide, depthWrite: false }), petalCount);
  petals.frustumCulled = false;
  const petalSeeds = Array.from({ length: petalCount }, (_, i) => {
    const r = (n: number) => { const v = Math.sin(i * 91.7 + n * 12.3) * 24634.6345; return v - Math.floor(v); };
    return { x: -0.75 + r(1) * 1.8, z: -0.4 + r(2) * 1.3, speed: 0.07 + r(3) * 0.06, phase: r(4) * 3, sway: 0.08 + r(5) * 0.12, spin: 0.4 + r(6) * 0.8, size: 0.028 + r(7) * 0.02 };
  });
  scene.add(petals);

  // textured model: neutral key from the front, violet rim behind
  scene.add(new HemisphereLight('#d8d0e6', '#0b0810', 0.55));
  const key = new DirectionalLight('#f1ebff', 2.6); key.position.set(-2.2, 4, 3.2); scene.add(key);
  const rim = new DirectionalLight('#9a6bff', 6); rim.position.set(3.5, 1.2, -4); scene.add(rim);
  const front = new DirectionalLight('#b7a6e0', 0.8); front.position.set(1.5, 0.6, 4); scene.add(front);
  const top = new PointLight('#efe4ff', 4, 6, 1.4); top.position.set(0.5, 2.3, 1.3); scene.add(top);
  // pale edge light from behind on the cape side, so the silhouette separates from the violet window
  const edge = new DirectionalLight('#e6dcff', 3); edge.position.set(-3, 3, -3.5); scene.add(edge);

  // the lily glows and lights the gauntlet holding it (positions are in the model's own space)
  const lily = new Vector3(0, 0.19, 0.56);
  const lilyGlow = new Sprite(new SpriteMaterial({ map: glowTex, color: '#d9c2ff', transparent: true, opacity: 0.75, depthTest: false, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
  lilyGlow.position.copy(lily); lilyGlow.scale.setScalar(0.3); figure.add(lilyGlow);
  const lilyLight = new PointLight('#d7c4ff', 2.2, 0.9, 1.6); lilyLight.position.copy(lily).add(new Vector3(0.12, 0.02, 0.05)); figure.add(lilyLight);

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
    key.intensity = 2.6 * lit; rim.intensity = 6 * lit; top.intensity = 4 * lit; edge.intensity = 3 * lit;
    const pulse = 0.8 + 0.2 * Math.sin(t * 1.3);
    lilyGlow.material.opacity = 0.75 * e * pulse; lilyLight.intensity = 2.2 * e * pulse;
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.45);
    (bloom.material as MeshBasicMaterial).opacity = 0.5 * e * breathe;
    (ring.material as MeshBasicMaterial).opacity = 0.3 * e * (0.8 + 0.2 * Math.sin(t * 0.3 + 1));
    shafts.forEach(({ mesh, opacity }, i) => { (mesh.material as MeshBasicMaterial).opacity = opacity * e * (0.6 + 0.4 * Math.sin(t * (0.21 + i * 0.07) + i * 2)); });
    petalSeeds.forEach((p, i) => {
      const fall = (t * p.speed + p.phase) % 3;
      dummy.position.set(p.x + Math.sin(t * 0.6 + i) * p.sway, 1.7 - fall, p.z);
      dummy.rotation.set(t * p.spin + i, Math.sin(t * 0.8 + i) * 1.2, t * p.spin * 0.6 + i * 2);
      dummy.scale.set(p.size, p.size * 2, 1); dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
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
      lilyGlow.material.dispose(); env.dispose(); renderer.dispose();
    },
  };
}
