import { useEffect, useRef, useState } from 'preact/hooks';
import type { Stage } from './stage';

const MODEL_URL = `${import.meta.env.BASE_URL}models/knight.glb`;

// The 3D knight in the arch window. Three.js and the model load after the page has painted;
// the original artwork is the fallback when WebGL or the download fails.
export default function Avatar3D({ fallback, alt }: { fallback: string; alt: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = host.current; if (!box || failed) return;
    let stage: Stage | undefined, disposed = false, onScreen = true;
    const canvas = document.createElement('canvas'); box.append(canvas);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sync = () => stage?.setActive(onScreen && !document.hidden);
    const size = new ResizeObserver(([entry]) => { const { width, height } = entry.contentRect; if (width && height) stage?.resize(width, height); });
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse') stage?.pointer(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1)); };
    const lost = (e: Event) => { e.preventDefault(); setFailed(true); };

    import('./stage')
      .then(({ createStage }) => createStage(canvas, MODEL_URL, reduced))
      .then(created => {
        if (disposed) { created.dispose(); return; }
        stage = created;
        const { width, height } = box.getBoundingClientRect();
        stage.resize(width, height);
        size.observe(box); seen.observe(box);
        window.addEventListener('pointermove', move); document.addEventListener('visibilitychange', sync); canvas.addEventListener('webglcontextlost', lost);
        sync();
        canvas.classList.add('is-ready');
      })
      .catch(() => { if (!disposed) setFailed(true); });

    return () => {
      disposed = true;
      size.disconnect(); seen.disconnect();
      window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', sync); canvas.removeEventListener('webglcontextlost', lost);
      stage?.dispose(); canvas.remove();
    };
  }, [failed]);

  if (failed) return <img src={fallback} alt={alt} />;
  return <div ref={host} class="avatar-3d" role="img" aria-label={alt} />;
}
