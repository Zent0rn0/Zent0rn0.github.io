import { useState, type PointerEvent } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import {
  ArrowUpRight,
  Camera,
  Gamepad2,
  GitBranch,
  MessageCircle,
  MessagesSquare,
  Music2,
  Send,
  X,
} from 'lucide-react'

type Panel = 'about' | 'contact' | null

const socials = [
  { label: 'GitHub', handle: '@Zent0rn0', href: 'https://github.com/Zent0rn0', icon: GitBranch },
  { label: 'Telegram', handle: '@Zen_torn', href: 'https://t.me/Zen_torn', icon: Send },
  { label: 'TikTok', handle: '@zentorno42', href: 'https://www.tiktok.com/@zentorno42?_r=1&_t=ZS-985CWH4TL6L', icon: Music2 },
  { label: 'Instagram', handle: '@jeklin.tv', href: 'https://www.instagram.com/jeklin.tv?igsh=MW10dHducWJ1ZjYwNQ%3D%3D&utm_source=qr', icon: Camera },
  { label: 'Threads', handle: '@jeklin.tv', href: 'https://www.threads.com/@jeklin.tv?igshid=NTc4MTIwNjQ2YQ==', icon: MessagesSquare },
  { label: 'Steam', handle: 'zentorno', href: 'https://steamcommunity.com/profiles/76561198885836635', icon: Gamepad2 },
  { label: 'Reddit', handle: 'u/Embarrassed_You2278', href: 'https://www.reddit.com/u/Embarrassed_You2278/s/zmvgKi0hUn', icon: MessageCircle },
]

const panelTransition = { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.8 }

function PrismaticObject() {
  const reduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const objectX = useSpring(useTransform(pointerX, [-1, 1], [-20, 20]), { stiffness: 75, damping: 20 })
  const objectY = useSpring(useTransform(pointerY, [-1, 1], [-16, 16]), { stiffness: 75, damping: 20 })
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [7, -7]), { stiffness: 70, damping: 20 })
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-9, 9]), { stiffness: 70, damping: 20 })
  const hazeX = useSpring(useTransform(pointerX, [-1, 1], [-34, 34]), { stiffness: 45, damping: 22 })
  const hazeY = useSpring(useTransform(pointerY, [-1, 1], [-24, 24]), { stiffness: 45, damping: 22 })

  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2)
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2)
  }

  function resetPointer() {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <section className="artifact-stage" onPointerMove={trackPointer} onPointerLeave={resetPointer} aria-label="Интерактивный цифровой объект">
      <motion.div className="artifact-haze" style={{ x: reduceMotion ? 0 : hazeX, y: reduceMotion ? 0 : hazeY }} />
      <div className="artifact-orbit artifact-orbit--outer" />
      <div className="artifact-orbit artifact-orbit--inner" />
      <div className="artifact-signal artifact-signal--one" />
      <div className="artifact-signal artifact-signal--two" />
      <motion.div
        className="artifact-object"
        style={{ x: reduceMotion ? 0 : objectX, y: reduceMotion ? 0 : objectY, rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
      >
        <svg viewBox="0 0 640 640" role="img" aria-label="Призматический артефакт Zentorno" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shell" x1="110" y1="80" x2="532" y2="570" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e8e6df" stopOpacity=".94" />
              <stop offset=".18" stopColor="#7787b2" stopOpacity=".7" />
              <stop offset=".46" stopColor="#0c0d11" stopOpacity=".84" />
              <stop offset=".7" stopColor="#d7b4a0" stopOpacity=".6" />
              <stop offset="1" stopColor="#e8e6df" stopOpacity=".74" />
            </linearGradient>
            <linearGradient id="edge" x1="250" y1="80" x2="420" y2="560" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f7f4e8" />
              <stop offset=".3" stopColor="#a6b5e6" />
              <stop offset=".67" stopColor="#e7a78e" />
              <stop offset="1" stopColor="#f7f4e8" />
            </linearGradient>
            <radialGradient id="core" cx="50%" cy="45%" r="58%">
              <stop stopColor="#dfe9ff" stopOpacity=".92" />
              <stop offset=".25" stopColor="#8298ce" stopOpacity=".56" />
              <stop offset=".65" stopColor="#141723" stopOpacity=".14" />
              <stop offset="1" stopColor="#050506" stopOpacity="0" />
            </radialGradient>
            <filter id="grain" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="26" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="17" xChannelSelector="R" yChannelSelector="B" />
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="11" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="bodyClip"><path d="M321 67 520 180 553 389 363 570 139 493 86 279 180 122Z" /></clipPath>
          </defs>
          <ellipse cx="322" cy="326" rx="222" ry="218" fill="url(#core)" filter="url(#glow)" opacity=".78" />
          <g filter="url(#grain)">
            <path d="M321 67 520 180 553 389 363 570 139 493 86 279 180 122Z" fill="url(#shell)" opacity=".94" />
            <path d="m321 67 47 218-5 285L139 493l86-229Z" fill="#0a0c12" opacity=".45" />
            <path d="m321 67 199 113-152 105-47-218Z" fill="#eff0eb" opacity=".32" />
            <path d="m520 180 33 209-190 181 5-285 152-105Z" fill="#b3c6f8" opacity=".32" />
            <path d="m86 279 282 6-229 208-53-214Z" fill="#e4a48d" opacity=".23" />
          </g>
          <g clipPath="url(#bodyClip)" opacity=".72">
            <path d="M83 191c109 25 155 73 260 67 107-6 159-54 240-16" fill="none" stroke="#f5f2e7" strokeWidth="1" opacity=".58" />
            <path d="M74 251c128 18 195 82 302 35 85-38 126-74 202-63" fill="none" stroke="#b8ccff" strokeWidth="1" opacity=".58" />
            <path d="M91 354c122-39 205 61 309 18 87-36 119-92 178-70" fill="none" stroke="#f2b59f" strokeWidth="1" opacity=".52" />
            <path d="M108 423c125-53 164 50 298 17 72-18 92-77 140-72" fill="none" stroke="#e9ede5" strokeWidth="1" opacity=".5" />
          </g>
          <path d="M321 67 520 180 553 389 363 570 139 493 86 279 180 122Z" fill="none" stroke="url(#edge)" strokeWidth="1.6" opacity=".94" />
          <path d="m321 67 47 218 185 104M368 285 139 493m229-208L180 122m188 163L363 570" fill="none" stroke="#f6f3e9" strokeWidth=".8" opacity=".54" />
          <circle cx="322" cy="293" r="12" fill="#eaf5ff" opacity=".9" filter="url(#glow)" />
          <circle cx="322" cy="293" r="3" fill="#050506" />
        </svg>
      </motion.div>
      <div className="artifact-metadata artifact-metadata--left"><span>znt / 26</span><i /><span>refractive system</span></div>
      <div className="artifact-metadata artifact-metadata--right"><span>pointer sensitive</span><i /><span>001</span></div>
    </section>
  )
}

export default function App() {
  const [panel, setPanel] = useState<Panel>(null)
  const closePanel = () => setPanel(null)

  function togglePanel(next: Exclude<Panel, null>) {
    setPanel((current) => current === next ? null : next)
  }

  return (
    <main className="scene">
      <div className="scene-noise" aria-hidden="true" />
      <div className="scene-grid" aria-hidden="true" />
      <header className="scene-header">
        <a className="wordmark" href="#top" aria-label="Zentorno — к началу">ZENTORNO<span>®</span></a>
        <div className="scene-controls" aria-label="Информация">
          <button className={panel === 'about' ? 'is-active' : ''} onClick={() => togglePanel('about')} aria-expanded={panel === 'about'}>ABOUT</button>
          <button className={panel === 'contact' ? 'is-active' : ''} onClick={() => togglePanel('contact')} aria-expanded={panel === 'contact'}>CONTACT</button>
        </div>
      </header>

      <section id="top" className="hero" aria-labelledby="page-title">
        <div className="hero-title">
          <p>Independent developer / BMSTU</p>
          <h1 id="page-title">Zentorno<span className="hero-mark">.</span></h1>
        </div>
        <PrismaticObject />
        <div className="hero-summary">
          <span className="summary-index">01</span>
          <p>Разработчик и студент BMSTU.<br />Собираю вещи для сети.</p>
        </div>
        <p className="scene-instruction"><span /> move through the field <span /></p>
      </section>

      <AnimatePresence>
        {panel && (
          <motion.aside
            className="info-layer"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            transition={panelTransition}
            aria-label={panel === 'about' ? 'Обо мне' : 'Контакты'}
          >
            <div className="layer-heading">
              <span>{panel === 'about' ? '01 / ABOUT' : '02 / CONTACT'}</span>
              <button onClick={closePanel} aria-label="Закрыть панель"><X size={16} /></button>
            </div>
            {panel === 'about' ? (
              <div className="about-copy">
                <p>Мне нравится собирать ясные цифровые вещи из сложных частей — от первого импульса до работающего интерфейса.</p>
                <div><span>based in</span><strong>moscow / web</strong></div>
              </div>
            ) : (
              <div className="contact-list">
                {socials.map((social, index) => {
                  const Icon = social.icon
                  return (
                    <a href={social.href} target="_blank" rel="noreferrer" key={social.label}>
                      <span className="contact-number">0{index + 1}</span>
                      <Icon size={16} strokeWidth={1.5} />
                      <span>{social.label}<small>{social.handle}</small></span>
                      <ArrowUpRight size={15} />
                    </a>
                  )
                })}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <footer className="scene-footer">
        <span>© 2026 / ZNT</span>
        <span>no templates, no noise</span>
      </footer>
    </main>
  )
}
