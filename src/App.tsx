import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import Avatar3D from './avatar/Avatar3D';
import { brandPaths } from './brand-icons';
import data from '../public/profile.json';

type Social = { name: string; url: string; caption: string };
type Profile = { name: string; role: string; bio: string; avatar: string; email: string; socials: Social[] };
// profile.json is baked into the prerendered page at build time, so there is no extra request
const profile: Profile = data;
const safeUrl = (url: string) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    area.style.cssText = 'position:fixed;opacity:0'; document.body.append(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
};
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as JSX.CSSProperties;

function Icon({ name }: { name: 'arrow' | 'copy' | 'check' }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true } as const;
  if (name === 'copy') return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V4H4v12h4" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
  return <svg {...common}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

// brand glyph matched by network name; anything unknown gets a neutral globe
function SocialIcon({ name }: { name: string }) {
  const path = brandPaths[name.toLowerCase().replace(/[^a-z]/g, '')];
  return <span class="contact-icon" aria-hidden="true">
    {path
      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d={path} /></svg>
      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>}
  </span>;
}

function ContactRow({ social }: { social: Social }) {
  const [copied, setCopied] = useState(false);
  const url = safeUrl(social.url);
  const inner = <>
    <SocialIcon name={social.name} />
    <span class="contact-name">{social.name}</span>
    <span class="contact-handle">{copied ? 'скопировано' : social.caption}</span>
    <Icon name={url ? 'arrow' : copied ? 'check' : 'copy'} />
  </>;
  if (url) return <li><a class="contact-row" href={url} target="_blank" rel="noreferrer">{inner}</a></li>;
  const copy = () => copyText(social.caption).then(ok => { if (ok) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } });
  return <li><button class="contact-row" type="button" onClick={copy} aria-label={`${social.name}: скопировать ник ${social.caption}`}>{inner}</button></li>;
}

export default function App() {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) ? profile.email.trim() : '';
  const socials = profile.socials.filter(s => s.name && (safeUrl(s.url) || s.caption)).sort((a, b) => Number(!safeUrl(a.url)) - Number(!safeUrl(b.url)));

  return <div class="site">
    <div class="glow" aria-hidden="true" />
    <header class="topbar reveal" style={delay(900)}>
      <a class="mark" href="#top" aria-label="В начало"><span class="mark-letters">zt</span><i /><span class="label">Личная карточка</span></a>
      {email && <a class="topbar-link label" href={`mailto:${email}`}>Написать <Icon name="arrow" /></a>}
    </header>

    <main id="top" class="stage">
      <section class="intro reveal" style={delay(1000)}>
        <p class="kicker label"><i />{profile.role}</p>
        <p class="greeting">Привет, я на связи.</p>
        <p class="bio">{profile.bio}</p>
      </section>

      <figure class="arch">
        <div class="arch-frame" />
        <div class="arch-window"><Avatar3D fallback={profile.avatar} alt={`Аватар ${profile.name}`} /></div>
      </figure>

      <section class="contacts reveal" style={delay(1120)} aria-labelledby="contacts-title">
        <div class="contacts-head"><h2 id="contacts-title">Где меня найти</h2><span class="label">Соцсети</span></div>
        <ul class="contact-list">{socials.map(s => <ContactRow key={s.name} social={s} />)}</ul>
        {email && <div class="mail"><span class="label">Почта</span><a href={`mailto:${email}`}>{email}</a></div>}
      </section>

      <h1 class="name" aria-label={profile.name}>{[...profile.name].map((ch, i) => <span key={i} aria-hidden="true" style={{ '--i': i } as JSX.CSSProperties}>{ch}</span>)}</h1>
    </main>
    <div class="grain" aria-hidden="true" />
  </div>;
}
