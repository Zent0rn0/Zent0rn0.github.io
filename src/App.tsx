import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

type Social = { name: string; url: string; caption: string };
type Profile = { name: string; role: string; bio: string; avatar: string; email: string; socials: Social[] };
const initial: Profile = { name: 'zentorno', role: 'DEVELOPER / BUILDER', bio: 'Код, интерфейсы и идеи, которые хочется открыть ещё раз.', avatar: './images/developer-avatar.jpg', email: '', socials: [] };
const validProfile = (p: unknown): p is Profile => { if (!p || typeof p !== 'object') return false; const q = p as Profile; return ['name', 'role', 'bio', 'avatar', 'email'].every(k => typeof q[k as keyof Profile] === 'string') && Array.isArray(q.socials); };
const safeUrl = (url: string) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    area.style.cssText = 'position:fixed;opacity:0'; document.body.append(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
};
const roman = (n: number) => [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((out, [v, s]) => { while (n >= (v as number)) { out += s; n -= v as number; } return out; }, '');

function Icon({ name }: { name: 'arrow' | 'copy' | 'check' }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (name === 'copy') return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V4H4v12h4" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
  return <svg {...common}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

function ContactRow({ social, index }: { social: Social; index: number }) {
  const [copied, setCopied] = useState(false);
  const url = safeUrl(social.url);
  const inner = <>
    <span className="contact-index">{roman(index + 1)}</span>
    <span className="contact-name">{social.name}</span>
    <span className="contact-handle">{copied ? 'скопировано' : social.caption}</span>
    <Icon name={url ? 'arrow' : copied ? 'check' : 'copy'} />
  </>;
  if (url) return <li><a className="contact-row" href={url} target="_blank" rel="noreferrer">{inner}</a></li>;
  const copy = () => copyText(social.caption).then(ok => { if (ok) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } });
  return <li><button className="contact-row" type="button" onClick={copy} aria-label={`${social.name}: скопировать ник ${social.caption}`}>{inner}</button></li>;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(initial);
  const arch = useRef<HTMLElement>(null);
  useEffect(() => { let live = true; fetch('./profile.json').then(r => r.ok ? r.json() : null).then(p => { if (live && validProfile(p)) setProfile(p); }).catch(() => {}); return () => { live = false; }; }, []);
  useEffect(() => { document.title = `${profile.name} — личная карточка`; }, [profile.name]);

  const drift = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    arch.current?.style.setProperty('--dx', `${(e.clientX / window.innerWidth - .5) * -14}px`);
    arch.current?.style.setProperty('--dy', `${(e.clientY / window.innerHeight - .5) * -10}px`);
  };
  const email = profile.email.trim();

  return <div className="site" onPointerMove={drift}>
    <div className="glow" aria-hidden="true" />
    <header className="topbar reveal" style={{ '--d': '900ms' } as CSSProperties}>
      <a className="mark" href="#top" aria-label="В начало"><span className="mark-letters">zt</span><i /><span className="label">Личная карточка</span></a>
      {email && <a className="topbar-link label" href={`mailto:${email}`}>Написать <Icon name="arrow" /></a>}
    </header>

    <main id="top" className="stage">
      <section className="intro reveal" style={{ '--d': '1000ms' } as CSSProperties}>
        <p className="kicker label"><i />{profile.role}</p>
        <p className="greeting">Привет.</p>
        <p className="bio">{profile.bio}</p>
      </section>

      <figure className="arch" ref={arch}>
        <div className="arch-frame" />
        <div className="arch-window"><img src={profile.avatar || initial.avatar} alt={`Аватар ${profile.name}`} /></div>
      </figure>

      <section className="contacts reveal" style={{ '--d': '1120ms' } as CSSProperties} aria-labelledby="contacts-title">
        <div className="contacts-head"><h2 id="contacts-title">Где меня найти</h2><span className="label">Index</span></div>
        <ul className="contact-list">{profile.socials.filter(s => s.name && (safeUrl(s.url) || s.caption)).sort((a, b) => Number(!safeUrl(a.url)) - Number(!safeUrl(b.url))).map((s, i) => <ContactRow key={s.name} social={s} index={i} />)}</ul>
        {email && <div className="mail"><span className="label">Почта</span><a href={`mailto:${email}`}>{email}</a></div>}
      </section>

      <h1 className="name" aria-label={profile.name}>{[...profile.name].map((ch, i) => <span key={i} aria-hidden="true" style={{ '--i': i } as CSSProperties}>{ch}</span>)}</h1>
    </main>
    <div className="grain" aria-hidden="true" />
  </div>;
}
