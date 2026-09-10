import { useEffect, useRef, useState } from 'react';

type Social = { name: string; url: string; caption: string };
type Profile = { name: string; role: string; bio: string; avatar: string; email: string; socials: Social[] };
const initial: Profile = { name: 'zentorno', role: 'DEVELOPER / BUILDER', bio: 'Код, интерфейсы и идеи, которые хочется открыть ещё раз.', avatar: './images/developer-avatar.jpg', email: '', socials: [{ name: 'GitHub', url: 'https://github.com/zentorno', caption: '@zentorno' }, { name: 'Discord', url: '', caption: 'zentorno' }, { name: 'Telegram', url: 'https://t.me/zentorno', caption: '@zentorno' }, { name: 'Instagram', url: 'https://www.instagram.com/zentorno/', caption: '@zentorno' }, { name: 'TikTok', url: 'https://www.tiktok.com/@zentorno', caption: '@zentorno' }] };
const validProfile = (p: unknown): p is Profile => { if (!p || typeof p !== 'object') return false; const q = p as Profile; return ['name', 'role', 'bio', 'avatar', 'email'].every(k => typeof q[k as keyof Profile] === 'string') && Array.isArray(q.socials); };
const safeUrl = (url: string) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const p = name.toLowerCase(); const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (p.includes('github')) return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.64.35-1.08.64-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0 1 12 6.83c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>;
  if (p.includes('discord')) return <svg {...common}><g transform="translate(0 1.5)"><path d="M7 6.5A15 15 0 0 1 12 5c1.8 0 3.5.5 5 1.5 1.2 1.8 1.8 3.8 2 6-1.4 1.8-3 3-5 3.5l-1-1.3m-2 0-1 1.3c-2-.5-3.6-1.7-5-3.5.2-2.2.8-4.2 2-6Z"/><path d="M9.5 12h.01M14.5 12h.01" strokeWidth="3"/><path d="M8 15c2.5 1.2 5.5 1.2 8 0"/></g></svg>;
  if (p.includes('telegram')) return <svg {...common}><path d="m21 3-4 18-6-5-4 3v-6L3 11 21 3Z"/><path d="m7 13 14-10-10 13"/></svg>;
  if (p.includes('instagram')) return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01" strokeWidth="3"/></svg>;
  if (p.includes('tiktok')) return <svg {...common}><g transform="translate(-0.9 0.95)"><path d="M14 4v10.3a4 4 0 1 1-3-3.86"/><path d="M14 4c1 2.4 2.6 3.8 5 4"/></g></svg>;
  if (name === 'mail') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
  if (name === 'copy') return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>;
  return <svg {...common}><path d="M5 12h13M14 7l5 5-5 5"/></svg>;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(initial); const plaque = useRef<HTMLDivElement>(null);
  useEffect(() => { let live = true; fetch('./profile.json').then(r => r.ok ? r.json() : null).then(p => { if (live && validProfile(p)) setProfile(p); }).catch(() => {}); return () => { live = false; }; }, []);
  useEffect(() => { document.title = `${profile.name} — personal space`; }, [profile.name]);
  return <div className="site"><div className="grain" aria-hidden="true" />
    <header className="header"><a className="wordmark" href="#top" aria-label="В начало"><span>zen</span>torno<span className="dot">.</span></a><div className="header-note"><i /> online</div></header>
    <main id="top"><section className="hero"><div className="hero-copy"><p className="kicker">{profile.role}</p><h1>Привет.<br />Я <em>{profile.name}</em></h1><p className="bio">{profile.bio}</p></div>
      <div className="portrait-zone" onPointerMove={e => { const box = e.currentTarget.getBoundingClientRect(); plaque.current?.style.setProperty('--tilt', `${((e.clientX - box.left) / box.width - .5) * 5}deg`); plaque.current?.style.setProperty('--shift', `${((e.clientY - box.top) / box.height - .5) * -10}px`); }} onPointerLeave={() => { plaque.current?.style.setProperty('--tilt', '0deg'); plaque.current?.style.setProperty('--shift', '0px'); }}><div className="sun-disc" /><div className="ruler ruler-a" /><div className="ruler ruler-b" /><div ref={plaque} className="portrait-plaque"><div className="portrait"><img src={profile.avatar || initial.avatar} alt={`Портрет ${profile.name}`} /></div><div className="plaque-bottom"><span>{profile.name.toUpperCase()} / 01</span><span>DIGITAL CARD</span></div></div><p className="side-label">CODE · DESIGN · SYSTEMS</p></div>
    </section><section className="links" aria-labelledby="links-title"><div className="section-head"><p>02 — networks</p><h2 id="links-title">Контакты</h2><span>нажмите, чтобы перейти</span></div><div className="link-list">{profile.socials.map((s, i) => { const url = safeUrl(s.url); return <a key={s.name} className={`link-row ${url ? '' : 'inactive'}`} href={url || undefined} target={url ? '_blank' : undefined} rel="noreferrer"><span className="link-number">0{i + 1}</span><span className="network-icon"><Icon name={s.name} /></span><strong>{s.name}</strong><span className="handle">{s.caption}</span><Icon name="arrow" size={20} /></a>; })}</div></section></main>
    <footer><span>© {new Date().getFullYear()} {profile.name}</span><span>contacts / links</span><span className="footer-mark">zt</span></footer>
  </div>;
}
