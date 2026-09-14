import {
  ACESFilmicToneMapping, AdditiveBlending, BackSide, Box3, BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, DirectionalLight, DoubleSide,
  Float32BufferAttribute, HemisphereLight, InstancedMesh, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  Object3D, OctahedronGeometry, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Points, PointsMaterial, Scene, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, TubeGeometry, Vector3, WebGLRenderer, type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { lilyPetals, lilyStamens } from './lily';

export type Stage = { resize: (w: number, h: number) => void; pointer: (x: number, y: number) => void; setActive: (on: boolean) => void; dispose: () => void };

const FACING = 0.62; // the baked knight: body turned three-quarters to the right, both arms readable
const HEAD_TURN = 0.42; // the helm looks further right, towards the lily
// framing in world units: crown tips just under the arch apex, pauldrons reaching the sides
const KNIGHT_FRAME = { top: 1.38, halfWidth: 0.7, centerX: 0.03, lift: 0.2 };
// imported models: seen from the side and looking right, like the artwork; framed by height
const EXTERNAL_FACING = 1.5;

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
};

// violet studio used only as a reflection environment for the metal
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
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  const camera = new PerspectiveCamera(24, 420 / 680, 0.1, 40);
  const target = new Vector3();
  let distance = 6;
  const shot = { ...KNIGHT_FRAME };
  // fit the figure to the canvas: width decides the distance, the crown stays pinned under the top edge
  const fitCamera = () => {
    const half = Math.tan((camera.fov * Math.PI) / 360);
    distance = shot.halfWidth / (half * camera.aspect);
    target.set(shot.centerX, shot.top - distance * half, 0);
  };
  fitCamera();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl);
  const figure = gltf.scene;
  scene.add(figure);
  // our baked knight carries named anchors; any other GLB (e.g. from an image-to-3D service) is
  // normalised: faces the camera, scaled to a common height, centred, and framed from its bounds
  const baked = !!figure.getObjectByName('head') && !!figure.getObjectByName('body');
  const facing = baked ? FACING : EXTERNAL_FACING;
  figure.rotation.y = facing;
  if (!baked) {
    let box = new Box3().setFromObject(figure);
    figure.scale.multiplyScalar(2.4 / Math.max(box.max.y - box.min.y, 1e-6));
    box = new Box3().setFromObject(figure);
    const center = box.getCenter(new Vector3());
    figure.position.set(-center.x, -box.min.y - 1.2, -center.z);
    // the figure fills ~88% of the arch height from just under the apex; the sides may crop a little
    const height = box.max.y - box.min.y;
    Object.assign(shot, { top: 1.2 + height * 0.11, halfWidth: height * 1.0 * 0.5 * (420 / 670), centerX: 0.16, lift: 0.12 });
    fitCamera();
    // generated PBR maps tend to read as glossy plastic: keep the texture, calm the metal and reflections
    figure.traverse(o => {
      if (!(o instanceof Mesh)) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!(m instanceof MeshStandardMaterial)) return;
        m.metalnessMap = null; m.roughnessMap = null; m.metalness = 0.3; m.roughness = 0.62; m.envMapIntensity = 0.5;
        m.color.setRGB(0.72, 0.68, 0.78); m.needsUpdate = true;
      });
    });
    renderer.toneMappingExposure = 1.05;
  }
  const baseY = figure.position.y;

  const clock = { time: 0 };
  const uniforms = { uTime: { value: 0 } };
  const materials = {
    armor: new MeshStandardMaterial({ color: '#251b31', metalness: 0.9, roughness: 0.4, envMapIntensity: 1.55 }),
    crown: new MeshPhysicalMaterial({ color: '#3a3044', metalness: 1, roughness: 0.2, envMapIntensity: 1.6 }),
    mail: new MeshStandardMaterial({ color: '#130e1a', metalness: 0.9, roughness: 0.55, envMapIntensity: 0.9 }),
    cloth: new MeshPhysicalMaterial({ color: '#241337', metalness: 0, roughness: 0.78, sheen: 1, sheenColor: '#8d58e8', sheenRoughness: 0.45, envMapIntensity: 0.5, side: DoubleSide }),
  };
  // the cloak sways a little, more towards the hem
  materials.cloth.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = modelMatrix * vec4(transformed, 1.0);
        float hem = clamp(0.25 - mvPosition.y, 0.0, 1.8);
        vec3 worldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        mvPosition.xyz += worldNormal * sin(uTime * 0.9 + mvPosition.y * 2.6 + mvPosition.x * 1.9) * 0.011 * hem;
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  };

  const node = (name: string) => figure.getObjectByName(name);
  figure.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const own = materials[(o.material as Material).name as keyof typeof materials];
    if (!own) return;
    (o.material as Material).dispose();
    o.material = own;
  });

  // anchors are optional: any GLB renders, the knight's own nodes light up the extras
  const head = node('head') ?? figure, body = node('body') ?? figure;
  const glowTex = glowTexture();
  const glow = (color: string, opacity: number) => new SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
  const glowMaterials = { lily: glow('#8f62ff', 0.5), visor: glow('#9a6bff', 0.9) };

  // lilies: one instanced petal and stamen mesh per parent frame (crown turns with the head)
  const petalMat = new MeshStandardMaterial({ color: '#8d74c4', emissive: '#4a24b0', emissiveIntensity: 0.55, roughness: 0.55, side: DoubleSide });
  const stamenMat = new MeshStandardMaterial({ color: '#e3d6ff', emissive: '#8c5cff', emissiveIntensity: 0.8, roughness: 0.4 });
  const petals = lilyPetals(), stamens = lilyStamens();
  const plantLilies = (parent: Object3D, names: string[]) => {
    const anchors = names.map(n => parent.getObjectByName(n)).filter((a): a is Object3D => !!a);
    const p = new InstancedMesh(petals, petalMat, anchors.length), s = new InstancedMesh(stamens, stamenMat, anchors.length);
    anchors.forEach((a, i) => {
      a.updateMatrix(); p.setMatrixAt(i, a.matrix); s.setMatrixAt(i, a.matrix);
      const halo = new Sprite(glowMaterials.lily); halo.position.set(0, 0.08, 0); halo.scale.setScalar(0.34); a.add(halo);
    });
    parent.add(p, s);
  };
  plantLilies(head, Array.from({ length: 6 }, (_, i) => `lily_${i}`));
  plantLilies(body, ['lily_held']);

  // gems set in the circlet
  const gemAnchors = Array.from({ length: 12 }, (_, i) => head.getObjectByName(`gem_${i}`)).filter((a): a is Object3D => !!a);
  const gems = new InstancedMesh(new OctahedronGeometry(1).scale(0.7, 1, 1), new MeshStandardMaterial({ color: '#6b3cf5', emissive: '#5a2be0', emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.15, flatShading: true }), gemAnchors.length);
  gemAnchors.forEach((a, i) => { a.updateMatrix(); gems.setMatrixAt(i, a.matrix); });
  head.add(gems);

  // light behind the eye slit
  const visor = node('visor');
  if (visor) {
    const slit = new BoxGeometry(visor.scale.x * 2, 0.012, 0.01);
    const eyeMat = new MeshBasicMaterial({ color: '#c3a2ff' });
    for (const side of [-1, 1]) {
      const eye = new Mesh(slit, eyeMat); eye.position.set(visor.position.x + side * visor.scale.z, visor.position.y, visor.position.z); head.add(eye);
      const halo = new Sprite(glowMaterials.visor); halo.position.copy(eye.position).add(new Vector3(0, 0, 0.02)); halo.scale.set(visor.scale.x * 3.4, visor.scale.x * 1.6, 1); head.add(halo);
    }
  }

  // lily stem between the gauntlets
  const stemAnchor = node('stem');
  if (stemAnchor) {
    const from = stemAnchor.position, height = stemAnchor.scale.y;
    const curve = new CatmullRomCurve3([from.clone(), from.clone().add(new Vector3(0.004, height * 0.5, 0.012)), from.clone().add(new Vector3(0, height, 0))]);
    body.add(new Mesh(new TubeGeometry(curve, 24, 0.011, 6), new MeshStandardMaterial({ color: '#2b1a45', emissive: '#2a1360', emissiveIntensity: 0.5, roughness: 0.6 })));
  }

  // violet shards drifting around the bust and rising motes
  const shardCount = 7;
  const shards = new InstancedMesh(new OctahedronGeometry(1).scale(0.45, 1.25, 0.2), new MeshStandardMaterial({ color: '#5d34e6', emissive: '#4d22c9', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, flatShading: true }), shardCount);
  const shardSeeds = Array.from({ length: shardCount }, (_, i) => ({ x: i < 4 ? -0.78 - (i % 2) * 0.12 : 0.8 + (i % 2) * 0.1, y: 1.5 - i * 0.3, z: 0.35 - ((i * 37) % 7) * 0.1, s: 0.045 + ((i * 13) % 5) * 0.009 }));
  scene.add(shards);
  const moteCount = 150, motePos = new Float32Array(moteCount * 3), moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) { const r = (n: number) => { const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); }; motePos.set([(r(1) - 0.5) * 2.8, r(2) * 3.2 - 1.2, (r(3) - 0.5) * 1.6], i * 3); moteSeed[i] = r(4); }
  const moteGeo = new BufferGeometry(); moteGeo.setAttribute('position', new Float32BufferAttribute(motePos, 3));
  const motes = new Points(moteGeo, new PointsMaterial({ map: glowTex, color: '#b99aff', size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending }));
  scene.add(motes);

  // lighting: violet rims from behind, a cool fill in front, a pale light over the crown
  // the baked knight is dark metal lit by violet lamps; textured models already carry their colours,
  // so they get a neutral key from the front and keep only a violet rim
  scene.add(baked ? new HemisphereLight('#7d5cc9', '#08050c', 0.9) : new HemisphereLight('#d8d0e6', '#0b0810', 0.55));
  const key = baked ? new DirectionalLight('#b996ff', 6) : new DirectionalLight('#f1ebff', 2.6);
  key.position.set(baked ? -3 : -2.2, 4, baked ? -2.5 : 3.2); scene.add(key);
  const rim = new DirectionalLight(baked ? '#8453ff' : '#9a6bff', baked ? 8 : 5); rim.position.set(3.5, 1.2, -4); scene.add(rim);
  const front = new DirectionalLight(baked ? '#6f55c8' : '#b7a6e0', baked ? 1.6 : 0.8); front.position.set(1.5, 0.6, 4); scene.add(front);
  const top = new PointLight('#efe4ff', baked ? 14 : 4, 6, 1.4); top.position.set(0.5, 2.3, 1.3); scene.add(top);

  // the cursor drives a heavy spring: the figure lags, swings a little past and settles
  const pointerTarget = { x: baked ? 0 : 1, y: 0 }, pointer = { ...pointerTarget }, velocity = { x: 0, y: 0 };
  const dummy = new Object3D();
  let intro = reducedMotion ? 1 : 0, frame = 0, active = false, last = 0;

  const update = (dt: number) => {
    clock.time += dt; uniforms.uTime.value = clock.time;
    intro = Math.min(1, intro + dt / 2.6);
    const e = intro * intro * (3 - 2 * intro);
    if (reducedMotion) { pointer.x = pointerTarget.x; pointer.y = pointerTarget.y; }
    else for (const axis of ['x', 'y'] as const) {
      velocity[axis] += ((pointerTarget[axis] - pointer[axis]) * 7 - velocity[axis] * 4.6) * dt;
      pointer[axis] += velocity[axis] * dt;
    }
    const t = reducedMotion ? 0 : clock.time;
    camera.position.set(target.x - pointer.x * (baked ? 0.1 : 0), target.y + shot.lift + pointer.y * 0.06, distance * (1.24 - 0.24 * e));
    camera.lookAt(target);
    // imported model: the cursor sweeps it between the profile (right edge of the screen, and before the
    // cursor moves) and a small turn towards the viewer that shows the chest (left edge)
    const toChest = Math.min(Math.max((1 - pointer.x) / 2, 0), 1) * 0.3 + (0.5 - 0.5 * Math.cos(t * 0.23)) * 0.015;
    figure.rotation.y = baked ? facing + pointer.x * 0.12 : facing - toChest;
    if (!baked) figure.rotation.set(pointer.y * -0.09 + Math.sin(t * 0.31 + 1.2) * 0.025, figure.rotation.y, Math.sin(t * 0.19) * 0.018, 'YXZ');
    figure.position.y = baseY + (1 - e) * -0.16 + Math.sin(t * 0.7) * 0.012;
    if (head !== figure) head.rotation.set(0.1 - pointer.y * 0.08, HEAD_TURN + pointer.x * 0.2 + Math.sin(t * 0.35) * 0.04, 0);
    const lit = 0.25 + 0.75 * e;
    key.intensity = (baked ? 6 : 2.6) * lit; rim.intensity = (baked ? 8 : 5) * lit; top.intensity = (baked ? 14 : 4) * lit;
    shardSeeds.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(t * 0.5 + i * 1.7) * 0.06, s.z);
      dummy.rotation.set(t * 0.23 + i, t * 0.35 + i * 2.1, 0);
      dummy.scale.setScalar(s.s); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
    });
    shards.instanceMatrix.needsUpdate = true;
    const mp = moteGeo.getAttribute('position') as Float32BufferAttribute;
    for (let i = 0; i < moteCount; i++) { let y = mp.getY(i) + dt * (0.06 + moteSeed[i] * 0.1); if (y > 2) y = -1.2; mp.setY(i, y); }
    mp.needsUpdate = true;
    renderer.render(scene, camera);
  };
  const tick = (now: number) => { const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60; last = now; update(dt); frame = requestAnimationFrame(tick); };

  return {
    resize: (w, h) => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fitCamera();
      if (!frame) update(0);
    },
    pointer: (x, y) => { pointerTarget.x = x; pointerTarget.y = y; if (reducedMotion) update(0); },
    setActive: on => {
      if (on === active) return; active = on;
      if (reducedMotion) { if (on) update(0); return; }
      if (on) { last = 0; frame = requestAnimationFrame(tick); } else { cancelAnimationFrame(frame); frame = 0; }
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      const geometries = new Set<BufferGeometry>(), used = new Set<Material>();
      scene.traverse(o => {
        if (o instanceof Mesh || o instanceof Points) { geometries.add(o.geometry); used.add(o.material as Material); }
        if (o instanceof Sprite) used.add(o.material);
      });
      geometries.forEach(g => g.dispose()); used.forEach(m => m.dispose());
      glowTex.dispose(); env.dispose(); renderer.dispose();
    },
  };
}
