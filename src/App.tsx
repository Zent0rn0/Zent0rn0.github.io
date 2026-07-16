import { useRef, useState, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  BriefcaseBusiness,
  Camera,
  Check,
  Code2,
  Database,
  ExternalLink,
  Gamepad2,
  GitBranch,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  Music2,
  Play,
  Radio,
  Send,
  Terminal,
  X,
} from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const

const navItems = [
  ['Главная', 'home'],
  ['Обо мне', 'about'],
  ['Навыки', 'skills'],
  ['Проекты', 'projects'],
  ['Контакты', 'contact'],
]

const skills = [
  { title: 'Frontend', icon: MonitorSmartphone, items: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'], tone: 'cyan' },
  { title: 'Backend', icon: Database, items: ['Node.js', 'Python', 'REST API', 'PostgreSQL'], tone: 'violet' },
  { title: 'Tools', icon: Terminal, items: ['Git & GitHub', 'Docker', 'Figma', 'Vite'], tone: 'lime' },
]

const tools = ['VS Code', 'GitHub', 'Figma', 'Postman', 'Docker', 'Linux', 'Vercel', 'Notion']

const projects = [
  {
    index: '01',
    name: 'Neon Relay',
    description: 'Экспериментальная платформа, где идеи превращаются в живые интерфейсы и прототипы.',
    tags: ['React', 'TypeScript', 'Motion'],
    status: 'Building now',
    color: 'from-cyan/25 via-cyan/5 to-transparent',
  },
  {
    index: '02',
    name: 'Focus Flow',
    description: 'Минималистичный инструмент для управления учебными задачами и личными спринтами.',
    tags: ['Next.js', 'Tailwind', 'Supabase'],
    status: 'In progress',
    color: 'from-violet/25 via-violet/5 to-transparent',
  },
  {
    index: '03',
    name: 'ByteCraft',
    description: 'Пространство для небольших dev-экспериментов, компонентов и полезных микроинструментов.',
    tags: ['Node.js', 'API', 'Docker'],
    status: 'Coming soon',
    color: 'from-primary/20 via-primary/5 to-transparent',
  },
]

const socialLinks = [
  { name: 'GitHub', handle: '@Zent0rn0', href: 'https://github.com/Zent0rn0', icon: GitBranch, active: true },
  { name: 'Telegram', handle: 'add your link', href: '#contact', icon: Send, active: false },
  { name: 'TikTok', handle: 'add your link', href: '#contact', icon: Music2, active: false },
  { name: 'Instagram', handle: 'add your link', href: '#contact', icon: Camera, active: false },
  { name: 'Threads', handle: 'add your link', href: '#contact', icon: MessageCircle, active: false },
  { name: 'Steam', handle: 'add your link', href: '#contact', icon: Gamepad2, active: false },
  { name: 'Reddit', handle: 'add your link', href: '#contact', icon: MessageCircle, active: false },
  { name: 'LinkedIn', handle: 'add your link', href: '#contact', icon: BriefcaseBusiness, active: false },
  { name: 'X / Twitter', handle: 'add your link', href: '#contact', icon: Radio, active: false },
  { name: 'YouTube', handle: 'add your link', href: '#contact', icon: Play, active: false },
]

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease }}
    >
      {children}
    </motion.div>
  )
}

function WordsPullUp({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-45px' })

  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${className}`}>
      {text.split(' ').map((word, index) => (
        <span className="mr-[0.22em] overflow-hidden pb-[0.11em]" key={`${word}-${index}`}>
          <motion.span
            className="inline-block"
            initial={{ y: '115%' }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.7, delay: index * 0.055, ease }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

function WordMark({ children }: { children: ReactNode }) {
  return <span className="font-serif text-cyan italic">{children}</span>
}

function StatusDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
    </span>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main id="home" className="relative isolate overflow-hidden bg-black text-[#E1E0CC]">
      <div className="fixed inset-0 -z-20 bg-[#07080d]" />
      <div className="fixed inset-0 -z-10 bg-noise opacity-[0.045] pointer-events-none" />

      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/[.09] bg-black/65 px-4 py-3 backdrop-blur-xl sm:px-5">
          <a href="#home" className="group flex items-center gap-2" aria-label="Zentorno — к началу">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan/50 bg-cyan/10 text-xs font-extrabold text-cyan transition group-hover:rotate-12">Z</span>
            <span className="text-sm font-bold tracking-[-0.04em] text-primary">Zentorno<span className="text-cyan">.</span></span>
          </a>
          <div className="hidden items-center gap-7 lg:flex">
            {navItems.map(([label, id]) => (
              <a key={id} href={`#${id}`} className="text-xs text-[#E1E0CC]/65 transition-colors hover:text-cyan">{label}</a>
            ))}
          </div>
          <a href="#contact" className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary transition hover:border-cyan/50 hover:bg-cyan hover:text-black sm:flex">
            Let's talk <ArrowUpRight size={13} />
          </a>
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-8 w-8 items-center justify-center rounded-lg text-primary lg:hidden" aria-label="Открыть навигацию" aria-expanded={menuOpen}>
            {menuOpen ? <X size={19} /> : <Menu size={20} />}
          </button>
        </nav>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-white/[.09] bg-[#0d0f15]/95 p-2 backdrop-blur-xl lg:hidden">
            {navItems.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-primary/75 transition hover:bg-cyan/10 hover:text-cyan">{label}</a>
            ))}
          </div>
        )}
      </header>

      <section className="relative flex min-h-[780px] items-end px-4 pb-5 pt-28 sm:min-h-screen sm:px-6 sm:pb-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="tech-grid absolute inset-x-0 top-0 h-[85%] opacity-70" />
          <div className="absolute left-[10%] top-[14%] h-[32rem] w-[32rem] rounded-full bg-cyan/10 blur-[130px]" />
          <div className="absolute right-[-8%] top-[15%] h-[30rem] w-[30rem] rounded-full bg-violet/15 blur-[135px]" />
          <div className="absolute inset-x-0 top-[47%] h-px grid-line opacity-50" />
          <div className="noise-overlay absolute inset-0 opacity-[0.09] mix-blend-screen" />
        </div>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/55">
              <StatusDot /> Available for ideas & builds
            </motion.div>
            <h1 className="max-w-5xl text-[17vw] font-bold leading-[.78] tracking-[-0.105em] sm:text-[15vw] lg:text-[10vw] xl:text-[9.5vw]">
              <span className="text-primary">Zent</span><span className="text-shine">orno</span><sup className="ml-[.12em] align-top text-[.22em] text-cyan">®</sup>
            </h1>
          </div>
          <div className="lg:col-span-4 lg:pb-3">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease }} className="max-w-sm text-lg leading-[1.18] tracking-[-.035em] text-primary/75 sm:text-xl">
              Developer. Student. <span className="text-cyan">Builder.</span>
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.36, ease }} className="mt-4 max-w-sm text-xs leading-relaxed text-gray-500 sm:text-sm">
              Делаю цифровые продукты, которые не просто работают — они оставляют ощущение.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.48, ease }} className="mt-7 flex flex-wrap gap-3">
              <a href="#projects" className="group inline-flex items-center gap-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:gap-5 hover:bg-cyan">
                Мои проекты <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-primary transition group-hover:scale-110"><ArrowDown size={15} /></span>
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2.5 text-sm text-primary transition hover:border-cyan/60 hover:text-cyan">
                Связаться <ArrowRight size={15} />
              </a>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[9px] uppercase tracking-[.2em] text-primary/35 md:flex"><span className="h-px w-10 bg-primary/20" /> Scroll to explore <span className="h-px w-10 bg-primary/20" /></div>
      </section>

      <section id="about" className="scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/[.08] bg-[#101116] px-5 py-12 sm:px-10 sm:py-20 lg:px-16">
          <Reveal className="mx-auto max-w-4xl text-center">
            <p className="section-number mb-7 text-[10px] uppercase">01 / About me</p>
            <h2 className="text-3xl leading-[.99] tracking-[-.055em] text-primary sm:text-5xl md:text-6xl lg:text-7xl">
              <WordsPullUp text="Я создаю из кода" />
              <br />
              <WordMark>вещи, которыми хочется пользоваться.</WordMark>
            </h2>
          </Reveal>
          <Reveal delay={0.12} className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-primary/60 sm:text-base">
            Я разработчик и учусь в <span className="text-primary">BMSTU</span>. Исследую современные технологии, собираю продуманные интерфейсы и не останавливаюсь на первом рабочем решении. Мне интересен путь от идеи до продукта — чистый, понятный и живой.
          </Reveal>
          <Reveal delay={0.2} className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-primary/10 border-y border-primary/10 py-6 text-center">
            {[['01+', 'year coding'], ['24/7', 'curiosity'], ['∞', 'ideas to ship']].map(([number, label]) => (
              <div key={label} className="px-2"><strong className="block text-xl font-normal tracking-[-.05em] text-cyan sm:text-2xl">{number}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.15em] text-primary/45 sm:text-[10px]">{label}</span></div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="skills" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="section-number mb-5 text-[10px] uppercase">02 / Toolkit</p>
              <h2 className="max-w-xl text-3xl leading-[.96] tracking-[-.055em] text-primary sm:text-4xl md:text-5xl">Инструменты для <span className="font-serif italic text-violet">сильных</span> идей.</h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">Технологии — не самоцель. Это точный набор средств для быстрого и аккуратного результата.</p>
          </Reveal>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {skills.map((skill, index) => {
              const Icon = skill.icon
              const accents: Record<string, string> = { cyan: 'text-cyan border-cyan/25 bg-cyan/5', violet: 'text-violet border-violet/25 bg-violet/5', lime: 'text-primary border-primary/25 bg-primary/5' }
              return (
                <Reveal key={skill.title} delay={index * 0.08} className="card-border rounded-2xl bg-[#11131a] p-6 sm:p-7">
                  <div className={`mb-12 flex h-11 w-11 items-center justify-center rounded-xl border ${accents[skill.tone]}`}><Icon size={20} strokeWidth={1.6} /></div>
                  <h3 className="text-xl tracking-[-.04em] text-primary">{skill.title}</h3>
                  <ul className="mt-5 space-y-3">
                    {skill.items.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-gray-400"><Check size={14} className="text-cyan" /> {item}</li>)}
                  </ul>
                </Reveal>
              )
            })}
          </div>
          <Reveal className="mt-4 rounded-2xl border border-white/[.08] bg-[#0d0f15] p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><Box size={18} className="text-cyan" /><div><p className="text-xs uppercase tracking-[.15em] text-primary/50">Tools I use</p><p className="mt-1 text-sm text-primary">Мой ежедневный рабочий набор</p></div></div>
              <div className="flex flex-wrap gap-2">{tools.map((tool) => <span key={tool} className="rounded-full border border-primary/10 px-3 py-1.5 text-xs text-primary/60 transition hover:border-cyan/50 hover:text-cyan">{tool}</span>)}</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="projects" className="scroll-mt-24 relative px-4 py-24 sm:px-6 sm:py-32">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.05]" />
        <div className="relative mx-auto max-w-7xl">
          <Reveal className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="section-number mb-5 text-[10px] uppercase">03 / Selected work</p>
              <h2 className="max-w-2xl text-3xl leading-[.96] tracking-[-.055em] text-primary sm:text-4xl md:text-5xl">Пока строю — <span className="text-cyan">уже думаю</span> о следующем.</h2>
            </div>
            <a href="https://github.com/Zent0rn0" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 self-start text-sm text-primary/65 transition hover:text-cyan md:self-auto">Все репозитории <GitBranch size={17} /> <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a>
          </Reveal>
          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Reveal key={project.name} delay={index * 0.1} className="group card-border min-h-[340px] rounded-2xl bg-[#11131a] p-6 sm:p-7">
                <div className={`-mx-6 -mt-6 mb-8 h-28 rounded-t-2xl bg-gradient-to-br ${project.color} p-6 sm:-mx-7 sm:-mt-7`}>
                  <div className="flex items-start justify-between"><span className="font-mono text-xs text-primary/35">{project.index}</span><span className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-black/20 px-2.5 py-1 text-[9px] uppercase tracking-[.12em] text-primary/65"><span className="h-1.5 w-1.5 rounded-full bg-cyan" />{project.status}</span></div>
                </div>
                <h3 className="text-2xl tracking-[-.05em] text-primary">{project.name}</h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">{project.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="rounded-full bg-primary/[.06] px-2.5 py-1 text-[10px] text-primary/55">{tag}</span>)}</div>
                <a href="#contact" className="mt-8 inline-flex items-center gap-2 text-sm text-primary transition group-hover:text-cyan">Запросить детали <ArrowRight size={15} /></a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 sm:py-32">
        <Reveal className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-cyan/20 bg-[#0e1217] md:grid-cols-2">
          <div className="relative overflow-hidden p-7 sm:p-12">
            <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan/15 blur-[85px]" />
            <div className="relative"><p className="section-number mb-6 text-[10px] uppercase">04 / Currently learning</p><h2 className="text-3xl leading-[.98] tracking-[-.06em] text-primary sm:text-4xl">Превращаю <span className="font-serif italic text-cyan">интерес</span> в системный навык.</h2><p className="mt-6 max-w-md text-sm leading-relaxed text-gray-400">Сейчас углубляюсь в архитектуру веб-приложений, работу с API и создание интерфейсов с вниманием к деталям.</p></div>
          </div>
          <div className="border-t border-cyan/15 p-7 md:border-l md:border-t-0 sm:p-12">
            <ul className="space-y-5">
              {[['01', 'Full-stack patterns', 'От интерфейса до продуманного бэкенда'], ['02', 'System design', 'Строю ясные и масштабируемые системы'], ['03', 'Creative coding', 'Ищу новые формы для web-опыта']].map(([number, title, text]) => <li key={number} className="flex gap-4"><span className="font-mono text-xs text-cyan/70">{number}</span><div><h3 className="text-sm text-primary">{title}</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p></div></li>)}
            </ul>
          </div>
        </Reveal>
      </section>

      <section id="contact" className="scroll-mt-24 px-4 pb-6 pt-24 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-[#101116] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/10 blur-[120px]" />
            <div className="relative mx-auto max-w-3xl"><p className="section-number mb-6 text-[10px] uppercase">05 / Open to opportunities</p><h2 className="text-4xl leading-[.91] tracking-[-.07em] text-primary sm:text-6xl md:text-7xl">Есть идея?<br /><span className="font-serif italic text-cyan">Давай соберём её.</span></h2><p className="mx-auto mt-7 max-w-md text-sm leading-relaxed text-gray-400">Открыт к коллаборациям, учебным проектам и задачам, которые хочется сделать по-настоящему хорошо.</p><a href="https://github.com/Zent0rn0" target="_blank" rel="noreferrer" className="group mt-9 inline-flex items-center gap-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:gap-5 hover:bg-cyan">Связаться в GitHub <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-primary transition group-hover:scale-110"><GitBranch size={14} /></span></a></div>
          </Reveal>

          <Reveal delay={0.08} className="mt-4 rounded-[2rem] border border-white/[.08] bg-[#0d0f15] p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-base tracking-[-.03em] text-primary">Online / elsewhere</p><p className="mt-1 text-xs text-gray-500">Найдём удобный канал для связи.</p></div><span className="text-[9px] uppercase tracking-[.16em] text-primary/35">GitHub подключён · остальное легко настроить</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return <a key={social.name} href={social.href} target={social.active ? '_blank' : undefined} rel={social.active ? 'noreferrer' : undefined} className="group flex items-center gap-3 rounded-xl border border-primary/[.08] bg-primary/[.025] p-3 transition hover:border-cyan/45 hover:bg-cyan/[.045]"><Icon size={16} className={social.active ? 'text-cyan' : 'text-primary/55 group-hover:text-cyan'} /><span className="min-w-0"><span className="block text-xs text-primary">{social.name}</span><span className="block truncate pt-0.5 text-[10px] text-gray-500">{social.handle}</span></span><ExternalLink size={12} className="ml-auto shrink-0 text-primary/20 transition group-hover:text-cyan" /></a>
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="px-4 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-primary/10 pt-5 text-[10px] text-primary/35 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Zentorno. Crafted with curiosity.</span><div className="flex items-center gap-2"><Code2 size={12} className="text-cyan" /> Built in the browser, for the web.</div></div>
      </footer>
    </main>
  )
}
