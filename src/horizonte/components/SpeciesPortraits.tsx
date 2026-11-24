import React from 'react';
import type { LifeFormId } from '../types/game';
import { LIFE_FORMS_BY_ID } from '../data/lifeforms';
import { hashString, SeededRNG } from '../utils/rng';

interface SpeciesPortraitProps {
  speciesId: string;
  name: string;
}

export const SpeciesPortraitSvg: React.FC<SpeciesPortraitProps> = ({ speciesId, name }) => {
  const uid = speciesId.replace(/[^a-z0-9_]/gi, '');

  switch (speciesId) {
    // ================= HUMANOIDES =================
    case 'solarianos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#060b16" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          <circle cx="50" cy="14" r="6" fill="#fde047" opacity="0.22" />
          <circle cx="50" cy="14" r="2.5" fill="#fef08a" opacity="0.8" />
          {/* Naval uniform shoulders */}
          <path d="M10 64 C12 48 22 44 32 44 C42 44 52 48 54 64 Z" fill="#0284c7" />
          <path d="M22 45 L32 58 L42 45 Z" fill="#e0f2fe" />
          <path d="M18 46 L26 52 L22 64 L12 64 Z" fill="#0369a1" />
          <path d="M46 46 L38 52 L42 64 L52 64 Z" fill="#0369a1" />
          <rect x="28" y="38" width="8" height="9" rx="3" fill="#d99b78" />
          {/* Humanoid face */}
          <path d="M21 22 C21 13 43 13 43 22 L42 33 C42 39 37 43 32 43 C27 43 22 39 22 33 Z" fill="#f1c29b" />
          {/* Sleek silver-gold hair */}
          <path d="M20 24 C19 12 31 9 41 13 C45 15 45 21 43 25 C41 19 36 16 27 18 C23 19 22 22 20 24 Z" fill="#334155" />
          <path d="M23 17 Q33 13 41 18" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
          {/* Cyber comms visor over one eye */}
          <rect x="33" y="24" width="9" height="4.5" rx="1.5" fill="#38bdf8" opacity="0.85" />
          <circle cx="27" cy="26.5" r="1.6" fill="#0f172a" />
          <circle cx="37" cy="26.5" r="1.3" fill="#e0f2fe" />
          {/* Nose & confident smile */}
          <path d="M31.5 27 L31 32 L33 32" stroke="#c58b68" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M28 36 Q32 38.5 36 35.5" stroke="#9a5b44" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Golden collar pins */}
          <circle cx="24" cy="50" r="1.8" fill="#fbbf24" />
          <circle cx="40" cy="50" r="1.8" fill="#fbbf24" />
        </svg>
      );

    case 'valdris':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#09050a" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          {/* Crimson embers */}
          <circle cx="12" cy="18" r="1" fill="#fb923c" />
          <circle cx="52" cy="24" r="1.2" fill="#f87171" />
          <circle cx="46" cy="11" r="0.9" fill="#fde047" />
          {/* Heavy Vanguard Armor */}
          <path d="M6 64 L13 44 L24 41 L32 47 L40 41 L51 44 L58 64 Z" fill="#334155" />
          <path d="M10 47 L22 42 L26 53 L14 58 Z" fill="#dc2626" />
          <path d="M54 47 L42 42 L38 53 L50 58 Z" fill="#dc2626" />
          <rect x="27" y="38" width="10" height="8" fill="#b46b4c" />
          {/* Strong angular face */}
          <path d="M20 20 C20 12 44 12 44 20 L43 32 L38 41 L26 41 L21 32 Z" fill="#d4896a" />
          {/* Mohawk / Warrior crest */}
          <path d="M28 8 L36 8 L34 19 L30 19 Z" fill="#1e293b" />
          <path d="M31 8 L33 8 L33 17 L31 17 Z" fill="#ef4444" />
          {/* Scar & tactical brow */}
          <path d="M23 22 L28 24 M36 24 L41 22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 20 L27 33" stroke="#991b1b" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="26" cy="26" r="1.6" fill="#fef08a" />
          <rect x="34" y="24.5" width="7" height="3.5" rx="1" fill="#ef4444" />
          <circle cx="37.5" cy="26.2" r="1.1" fill="#ffffff" />
          <path d="M27 35.5 L37 35" stroke="#5c2b1e" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'nyxianos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#04050e" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          <circle cx="32" cy="26" r="19" fill="none" stroke="#6366f1" strokeWidth="0.7" opacity="0.35" />
          {/* Hooded Stealth Cloak */}
          <path d="M11 64 C13 44 20 39 32 39 C44 39 51 44 53 64 Z" fill="#1e1b4b" />
          <path d="M16 42 C16 14 24 8 32 8 C40 8 48 14 48 42 L42 46 L22 46 Z" fill="#0f172a" stroke="#6366f1" strokeWidth="1.2" />
          {/* Shadowed pale face */}
          <path d="M23 22 C23 15 41 15 41 22 L40 34 C38 39 35 42 32 42 C29 42 26 39 24 34 Z" fill="#c7c2e8" />
          {/* Upper hood shadow */}
          <path d="M22 23 C24 16 40 16 42 23 L32 21 Z" fill="#1e1b4b" opacity="0.75" />
          {/* Twin glowing indigo-violet stealth eyes */}
          <path d="M24 26 L30 27.5 L25 28.5 Z" fill="#a5b4fc" />
          <path d="M40 26 L34 27.5 L39 28.5 Z" fill="#a5b4fc" />
          {/* Half-face breathing mask */}
          <path d="M23 31 L32 34 L41 31 L39 41 L32 43 L25 41 Z" fill="#1e293b" stroke="#818cf8" strokeWidth="0.8" />
          <line x1="29" y1="36" x2="35" y2="36" stroke="#38bdf8" strokeWidth="1.2" />
        </svg>
      );

    // ================= ESPECTROID =================
    case 'luminares_eter':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="42%" r="68%">
              <stop offset="0%" stopColor="#701a75" />
              <stop offset="100%" stopColor="#090414" />
            </radialGradient>
            <radialGradient id={`core_${uid}`} cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#fdf4ff" />
              <stop offset="55%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#a21caf" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          {/* Celestial Halo */}
          <circle cx="32" cy="28" r="20" fill="none" stroke="#f0abfc" strokeWidth="1" strokeDasharray="3 3" opacity="0.65" />
          <circle cx="32" cy="28" r="15" fill="#e879f9" opacity="0.18" />
          {/* Ethereal Flowing Ribbons */}
          <path d="M16 64 C18 46 25 40 32 40 C39 40 46 46 48 64 Z" fill="#a855f7" opacity="0.55" />
          <path d="M12 52 Q24 38 32 44 Q40 50 52 38" stroke="#f0abfc" strokeWidth="1.5" fill="none" opacity="0.7" />
          {/* Luminous Energy Head */}
          <path d="M23 26 C23 15 41 15 41 26 C41 35 36 41 32 41 C28 41 23 35 23 26 Z" fill={`url(#core_${uid})`} />
          {/* Crown flame wisps */}
          <path d="M27 15 Q32 6 37 15" fill="#f5d0fe" opacity="0.85" />
          <circle cx="27.5" cy="26" r="2.1" fill="#ffffff" />
          <circle cx="36.5" cy="26" r="2.1" fill="#ffffff" />
          <circle cx="32" cy="18" r="1.4" fill="#fde047" />
        </svg>
      );

    case 'pulsari':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#040510" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          {/* Neutron Star Polar Jets */}
          <line x1="32" y1="2" x2="32" y2="62" stroke="#22d3ee" strokeWidth="2" opacity="0.35" />
          <line x1="8" y1="28" x2="56" y2="28" stroke="#c084fc" strokeWidth="1.2" opacity="0.35" />
          {/* Jagged Plasma Containment Collar */}
          <path d="M12 64 L18 45 L32 49 L46 45 L52 64 Z" fill="#1e1b4b" stroke="#22d3ee" strokeWidth="1.2" />
          {/* Starburst Electric Head */}
          <polygon
            points="32,7 37,16 46,12 42,22 49,28 41,34 43,41 32,39 21,41 23,34 15,28 22,22 18,12 27,16"
            fill="#a855f7"
            stroke="#e9d5ff"
            strokeWidth="1"
          />
          <circle cx="32" cy="27" r="7.5" fill="#581c87" />
          {/* Blinding twin pulsar eyes */}
          <polygon points="24,25 30,27 25,29" fill="#22d3ee" />
          <polygon points="40,25 34,27 39,29" fill="#22d3ee" />
          <circle cx="27" cy="27" r="1.2" fill="#ffffff" />
          <circle cx="37" cy="27" r="1.2" fill="#ffffff" />
        </svg>
      );

    case 'umbrais_fotonicos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#03030b" />
          {/* Eclipse Ring */}
          <circle cx="32" cy="26" r="16" fill="#000000" stroke="#6366f1" strokeWidth="2" />
          <circle cx="32" cy="26" r="19" fill="none" stroke="#312e81" strokeWidth="1" opacity="0.6" />
          {/* Ghostly Void Body */}
          <path d="M14 64 C16 45 23 39 32 39 C41 39 48 45 50 64 Z" fill="#0f0c29" stroke="#4f46e5" strokeWidth="1" />
          <path d="M22 25 C22 14 42 14 42 25 C42 36 36 44 32 44 C28 44 22 36 22 25 Z" fill="#09071a" stroke="#818cf8" strokeWidth="1" />
          {/* Three hypnotic cyan-violet spectral eyes */}
          <circle cx="26.5" cy="26.5" r="2" fill="#38bdf8" />
          <circle cx="37.5" cy="26.5" r="2" fill="#38bdf8" />
          <circle cx="32" cy="21" r="1.6" fill="#c084fc" />
          <circle cx="26.5" cy="26.5" r="0.8" fill="#ffffff" />
          <circle cx="37.5" cy="26.5" r="0.8" fill="#ffffff" />
        </svg>
      );

    // ================= METALOCTO =================
    case 'ferronitas':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <linearGradient id={`metal_${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="#120c05" />
          <circle cx="32" cy="30" r="24" fill="#f59e0b" opacity="0.1" />
          {/* Heavy Industrial Brass Chassis */}
          <path d="M9 64 L14 43 L50 43 L55 64 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="1.2" />
          <rect x="26" y="38" width="12" height="7" fill="#451a03" />
          {/* Rounded Forge-Dome Head */}
          <rect x="19" y="14" width="26" height="26" rx="9" fill={`url(#metal_${uid})`} stroke="#fde68a" strokeWidth="1.2" />
          {/* Rivets */}
          <circle cx="23" cy="18" r="1" fill="#fef3c7" />
          <circle cx="41" cy="18" r="1" fill="#fef3c7" />
          {/* Furnace Visor Strip */}
          <rect x="22" y="23" width="20" height="6" rx="2" fill="#0f172a" />
          <rect x="24" y="24.5" width="16" height="3" rx="1" fill="#fde047" />
          {/* Exhaust Vent Grill */}
          <line x1="25" y1="34" x2="39" y2="34" stroke="#451a03" strokeWidth="1.8" />
          <line x1="27" y1="37" x2="37" y2="37" stroke="#451a03" strokeWidth="1.8" />
        </svg>
      );

    case 'titanios_forja':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#0d0908" />
          <polygon points="32,4 58,20 52,58 12,58 6,20" fill="#ea580c" opacity="0.09" />
          {/* Massive Armored Pauldrons */}
          <polygon points="4,64 8,39 24,42 26,64" fill="#334155" stroke="#f97316" strokeWidth="1.3" />
          <polygon points="60,64 56,39 40,42 38,64" fill="#334155" stroke="#f97316" strokeWidth="1.3" />
          <rect x="23" y="42" width="18" height="22" fill="#1e293b" />
          {/* Dreadnought Horned Helm */}
          <polygon points="17,18 22,9 26,16 38,16 42,9 47,18 44,37 32,43 20,37" fill="#475569" stroke="#fb923c" strokeWidth="1.3" />
          <polygon points="22,23 42,23 39,31 25,31" fill="#0f172a" />
          {/* Fierce Crimson Optic Slit */}
          <polygon points="24,25.5 31,27 25,28.5" fill="#ef4444" />
          <polygon points="40,25.5 33,27 39,28.5" fill="#ef4444" />
          <circle cx="32" cy="52" r="3.5" fill="#f97316" stroke="#fed7aa" strokeWidth="1" />
        </svg>
      );

    case 'cromalitas':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <linearGradient id={`chrome_${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="#070d17" />
          <polygon points="32,6 54,32 32,58 10,32" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" />
          {/* Sleek Chrome Shoulders */}
          <path d="M12 64 L20 43 L32 48 L44 43 L52 64 Z" fill="#475569" stroke="#e2e8f0" strokeWidth="1" />
          {/* Mirrored Diamond Sentinel Head */}
          <polygon points="32,10 45,22 41,40 32,44 23,40 19,22" fill={`url(#chrome_${uid})`} stroke="#ffffff" strokeWidth="1" />
          <polygon points="32,10 32,44 23,40 19,22" fill="#cbd5e1" opacity="0.35" />
          {/* Single Piercing Cyan Diamond Optic */}
          <polygon points="32,21 37,26 32,31 27,26" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <polygon points="32,23 35,26 32,29 29,26" fill="#22d3ee" />
          <circle cx="32" cy="26" r="1" fill="#ffffff" />
        </svg>
      );

    // ================= PLANTÍDEOS =================
    case 'sylvaris':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#04120b" />
          <circle cx="32" cy="26" r="22" fill="#22c55e" opacity="0.12" />
          {/* Leafy Mantle */}
          <path d="M12 64 C14 46 22 41 32 41 C42 41 50 46 52 64 Z" fill="#166534" />
          <path d="M18 44 Q25 52 32 46 Q39 52 46 44" fill="#4ade80" opacity="0.6" />
          {/* Crown of Leaves & Golden Buds */}
          <ellipse cx="20" cy="18" rx="7" ry="4" transform="rotate(-30 20 18)" fill="#22c55e" />
          <ellipse cx="44" cy="18" rx="7" ry="4" transform="rotate(30 44 18)" fill="#22c55e" />
          <ellipse cx="32" cy="11" rx="5" ry="7" fill="#4ade80" />
          <circle cx="24" cy="13" r="2" fill="#fde047" />
          <circle cx="40" cy="13" r="2" fill="#fde047" />
          {/* Bark Visage */}
          <path d="M22 20 C22 14 42 14 42 20 L40 35 C38 40 35 42 32 42 C29 42 26 40 24 35 Z" fill="#4d7c0f" stroke="#86efac" strokeWidth="1" />
          <circle cx="27" cy="26" r="2.2" fill="#fef08a" />
          <circle cx="37" cy="26" r="2.2" fill="#fef08a" />
          <path d="M28 34 Q32 37 36 34" stroke="#bbf7d0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'espinhoes_vex':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#0d1104" />
          {/* Spiky Carnivorous Frill */}
          <polygon points="32,5 37,16 48,9 44,21 55,22 45,30 51,39 39,38 32,45 25,38 13,39 19,30 9,22 20,21 16,9 27,16" fill="#65a30d" stroke="#bef264" strokeWidth="1" />
          <path d="M12 64 L18 44 L32 48 L46 44 L52 64 Z" fill="#365314" />
          {/* Inner Predator Head */}
          <path d="M23 22 C23 16 41 16 41 22 L39 36 L32 41 L25 36 Z" fill="#1a2e05" stroke="#a3e635" strokeWidth="1" />
          <polygon points="25,25 30,27.5 25,29" fill="#f43f5e" />
          <polygon points="39,25 34,27.5 39,29" fill="#f43f5e" />
          {/* Thorny Maw */}
          <path d="M26 34 L29 36 L32 34 L35 36 L38 34" stroke="#ecfccb" strokeWidth="1.5" fill="none" />
        </svg>
      );

    case 'lotus_silenciosos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#041110" />
          {/* Lotus Petals Halo */}
          <ellipse cx="32" cy="14" rx="5" ry="9" fill="#f472b6" opacity="0.85" />
          <ellipse cx="21" cy="19" rx="5" ry="9" transform="rotate(-35 21 19)" fill="#ec4899" opacity="0.8" />
          <ellipse cx="43" cy="19" rx="5" ry="9" transform="rotate(35 43 19)" fill="#ec4899" opacity="0.8" />
          <ellipse cx="16" cy="29" rx="4" ry="8" transform="rotate(-65 16 29)" fill="#db2777" opacity="0.7" />
          <ellipse cx="48" cy="29" rx="4" ry="8" transform="rotate(65 48 29)" fill="#db2777" opacity="0.7" />
          {/* Monk Robes */}
          <path d="M14 64 C16 46 23 41 32 41 C41 41 48 46 50 64 Z" fill="#065f46" />
          {/* Tranquil Jade Face */}
          <path d="M23 23 C23 17 41 17 41 23 L40 35 C38 40 35 42 32 42 C29 42 26 40 24 35 Z" fill="#6ee7b7" stroke="#10b981" strokeWidth="1" />
          {/* Closed meditative eyes & third eye gem */}
          <path d="M25 27 Q27.5 29 30 27" stroke="#064e3b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M34 27 Q36.5 29 39 27" stroke="#064e3b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="21.5" r="1.8" fill="#fef08a" />
        </svg>
      );

    // ================= GRUTOIDES =================
    case 'litoides_basalto':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#0e0d0c" />
          {/* Massive Granite Shoulders */}
          <polygon points="6,64 11,42 24,39 40,39 53,42 58,64" fill="#44403c" stroke="#a8a29e" strokeWidth="1.2" />
          {/* Chiselled Basalt Head */}
          <polygon points="21,15 43,15 46,28 41,41 23,41 18,28" fill="#57534e" stroke="#d6d3d1" strokeWidth="1.2" />
          <line x1="24" y1="15" x2="29" y2="24" stroke="#292524" strokeWidth="1.4" />
          {/* Glowing Amber Miner Eyes */}
          <rect x="24" y="25" width="5" height="3.5" rx="1" fill="#fbbf24" />
          <rect x="35" y="25" width="5" height="3.5" rx="1" fill="#fbbf24" />
          {/* Emerald Runes on Jaw */}
          <line x1="27" y1="35" x2="37" y2="35" stroke="#34d399" strokeWidth="1.6" />
          <circle cx="32" cy="19" r="2" fill="#f59e0b" />
        </svg>
      );

    case 'drakolitos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#130505" />
          <circle cx="32" cy="32" r="22" fill="#dc2626" opacity="0.14" />
          {/* Magma Crystal Horns */}
          <polygon points="21,21 12,7 26,15" fill="#ef4444" stroke="#fde047" strokeWidth="0.9" />
          <polygon points="43,21 52,7 38,15" fill="#ef4444" stroke="#fde047" strokeWidth="0.9" />
          {/* Obsidian Body */}
          <polygon points="10,64 16,43 32,48 48,43 54,64" fill="#1c1917" stroke="#f97316" strokeWidth="1.2" />
          <polygon points="21,17 43,17 44,32 32,43 20,32" fill="#292524" stroke="#ef4444" strokeWidth="1.2" />
          {/* Lava Cracks & Glowing Eyes */}
          <path d="M32 18 L30 25 L34 31" stroke="#fb923c" strokeWidth="1.3" fill="none" />
          <polygon points="23,25 29,27.5 24,29" fill="#fde047" />
          <polygon points="41,25 35,27.5 40,29" fill="#fde047" />
          <path d="M26 36 L32 34 L38 36" stroke="#f97316" strokeWidth="1.6" fill="none" />
        </svg>
      );

    case 'quartzos_thul':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#050e17" />
          {/* Faceted Crystal Spires */}
          <polygon points="32,5 38,18 26,18" fill="#67e8f9" />
          <polygon points="21,11 27,21 17,22" fill="#22d3ee" />
          <polygon points="43,11 47,22 37,21" fill="#a78bfa" />
          {/* Crystal Torso */}
          <polygon points="12,64 21,42 32,47 43,42 52,64" fill="#164e63" stroke="#67e8f9" strokeWidth="1" />
          {/* Translucent Prism Head */}
          <polygon points="32,14 44,24 39,40 32,44 25,40 20,24" fill="#0891b2" stroke="#a5f3fc" strokeWidth="1.2" />
          <polygon points="32,14 32,44 25,40 20,24" fill="#22d3ee" opacity="0.45" />
          {/* Geometric White Glyphs */}
          <polygon points="27,26 30,28 27,30 24,28" fill="#ffffff" />
          <polygon points="37,26 40,28 37,30 34,28" fill="#ffffff" />
        </svg>
      );

    // ================= INSECTOIDES =================
    case 'vespideos_mel':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#120e03" />
          {/* Honeycomb Hex Backdrop */}
          <polygon points="32,6 52,18 52,42 32,54 12,42 12,18" fill="none" stroke="#eab308" strokeWidth="1" opacity="0.25" />
          {/* Striped Gold-Amber Thorax */}
          <path d="M12 64 C14 46 22 42 32 42 C42 42 50 46 52 64 Z" fill="#ca8a04" />
          <path d="M18 52 L46 52" stroke="#1c1917" strokeWidth="3" />
          <path d="M15 58 L49 58" stroke="#1c1917" strokeWidth="3" />
          {/* Antennae */}
          <path d="M27 16 Q21 7 15 10" stroke="#facc15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M37 16 Q43 7 49 10" stroke="#facc15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Wasp Head */}
          <ellipse cx="32" cy="28" rx="11" ry="12" fill="#facc15" stroke="#713f12" strokeWidth="1.2" />
          {/* Large Honey-Amber Compound Eyes */}
          <ellipse cx="25" cy="26" rx="4.2" ry="6" transform="rotate(-14 25 26)" fill="#451a03" stroke="#fef08a" strokeWidth="0.9" />
          <ellipse cx="39" cy="26" rx="4.2" ry="6" transform="rotate(14 39 26)" fill="#451a03" stroke="#fef08a" strokeWidth="0.9" />
          <circle cx="24" cy="24" r="1.2" fill="#fef08a" />
          <circle cx="38" cy="24" r="1.2" fill="#fef08a" />
          <path d="M29 36 L32 39 L35 36" fill="#713f12" />
        </svg>
      );

    case 'krikkari':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#160903" />
          {/* Chitinous War Carapace */}
          <polygon points="9,64 16,42 32,47 48,42 55,64" fill="#9a3412" stroke="#fb923c" strokeWidth="1.2" />
          {/* Jagged Beetle Horn & Antennae */}
          <polygon points="32,4 36,16 28,16" fill="#f97316" />
          <path d="M24 18 L12 10 M40 18 L52 10" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" />
          {/* Armored Locust Head */}
          <polygon points="20,21 32,14 44,21 41,37 32,42 23,37" fill="#ea580c" stroke="#fed7aa" strokeWidth="1" />
          {/* Slit Compound Eyes */}
          <ellipse cx="24.5" cy="26" rx="3.5" ry="4.5" transform="rotate(-20 24.5 26)" fill="#fef08a" />
          <ellipse cx="39.5" cy="26" rx="3.5" ry="4.5" transform="rotate(20 39.5 26)" fill="#fef08a" />
          {/* Serrated Mandibles */}
          <polygon points="24,36 30,43 27,34" fill="#431407" stroke="#fdba74" strokeWidth="0.8" />
          <polygon points="40,36 34,43 37,34" fill="#431407" stroke="#fdba74" strokeWidth="0.8" />
        </svg>
      );

    case 'mantis_sombra':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#090412" />
          {/* Tall Sweeping Raptorial Crest */}
          <path d="M26 16 Q16 5 11 13" stroke="#c084fc" strokeWidth="1.6" fill="none" />
          <path d="M38 16 Q48 5 53 13" stroke="#c084fc" strokeWidth="1.6" fill="none" />
          {/* Sleek Nocturnal Thorax */}
          <path d="M16 64 L24 41 L32 45 L40 41 L48 64 Z" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
          {/* Sharp Triangular Mantis Head */}
          <polygon points="16,20 32,14 48,20 35,41 29,41" fill="#581c87" stroke="#d8b4fe" strokeWidth="1" />
          {/* Huge Glowing Nocturnal Eyes at outer corners */}
          <circle cx="20" cy="23" r="4.5" fill="#22d3ee" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="44" cy="23" r="4.5" fill="#22d3ee" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="20" cy="23" r="1.6" fill="#0f172a" />
          <circle cx="44" cy="23" r="1.6" fill="#0f172a" />
        </svg>
      );

    // ================= ANFÍBIOS AQUALÍFEROS =================
    case 'vaelorianos':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#041014" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          {/* Bioluminescent Bubbles */}
          <circle cx="14" cy="15" r="2.2" fill="none" stroke="#5eead4" strokeWidth="0.9" opacity="0.6" />
          <circle cx="51" cy="21" r="1.6" fill="none" stroke="#5eead4" strokeWidth="0.9" opacity="0.6" />
          {/* Feathered Axolotl / Aquatic Gill Frills */}
          <path d="M21 22 L10 17 L18 25 L9 26 L18 29 L11 33 L21 32 Z" fill="#2dd4bf" />
          <path d="M43 22 L54 17 L46 25 L55 26 L46 29 L53 33 L43 32 Z" fill="#2dd4bf" />
          {/* Pearl Hydro-Suit */}
          <path d="M12 64 C14 46 22 42 32 42 C42 42 50 46 52 64 Z" fill="#0d9488" stroke="#99f6e4" strokeWidth="1" />
          {/* Smooth Amphibious Face */}
          <path d="M21 23 C21 14 43 14 43 23 L41 35 C39 40 35 42 32 42 C29 42 25 40 23 35 Z" fill="#5eead4" />
          <circle cx="26.5" cy="26.5" r="2.4" fill="#042f2e" />
          <circle cx="37.5" cy="26.5" r="2.4" fill="#042f2e" />
          <circle cx="27.2" cy="25.8" r="0.9" fill="#f0fdfa" />
          <circle cx="38.2" cy="25.8" r="0.9" fill="#f0fdfa" />
          <circle cx="32" cy="18.5" r="1.5" fill="#fde047" />
          <path d="M28 35 Q32 37.5 36 35" stroke="#0f766e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'nautilideos_mael':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <rect width="64" height="64" fill="#040d1a" />
          {/* Curved Nautilus Shell Crest */}
          <path d="M20 22 C16 10 30 5 40 10 C48 14 48 24 42 28" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.2" />
          <circle cx="32" cy="14" r="3" fill="#0369a1" stroke="#bae6fd" strokeWidth="0.9" />
          {/* Pressurized Corsair Suit */}
          <path d="M9 64 L15 43 L49 43 L55 64 Z" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M22 22 C22 16 42 16 42 22 L41 37 L32 42 L23 37 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="1" />
          {/* Predator Amber Eyes */}
          <polygon points="24,25 30,27 25,29" fill="#fbbf24" />
          <polygon points="40,25 34,27 39,29" fill="#fbbf24" />
          {/* Brass Deep-Sea Rebreather */}
          <rect x="25" y="32" width="14" height="8" rx="3" fill="#b45309" stroke="#fde68a" strokeWidth="1" />
          <circle cx="32" cy="36" r="2.2" fill="#38bdf8" />
        </svg>
      );

    case 'abissais_glacio':
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
          <defs>
            <radialGradient id={`bg_${uid}`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#075985" />
              <stop offset="100%" stopColor="#020813" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#bg_${uid})`} />
          {/* Glacial Ice Fins */}
          <polygon points="18,24 7,15 14,31 7,36 19,35" fill="#7dd3fc" opacity="0.85" />
          <polygon points="46,24 57,15 50,31 57,36 45,35" fill="#7dd3fc" opacity="0.85" />
          <path d="M13 64 C16 46 23 41 32 41 C41 41 48 46 51 64 Z" fill="#0c4a6e" stroke="#bae6fd" strokeWidth="1" />
          {/* Translucent Abyssal Head */}
          <path d="M22 22 C22 12 42 12 42 22 L40 36 C38 41 35 43 32 43 C29 43 26 41 24 36 Z" fill="#bae6fd" stroke="#e0f2fe" strokeWidth="1" />
          {/* Four Bioluminescent Pale-Cyan Eyes */}
          <circle cx="26.5" cy="25" r="2" fill="#0284c7" />
          <circle cx="37.5" cy="25" r="2" fill="#0284c7" />
          <circle cx="26.5" cy="25" r="0.9" fill="#ffffff" />
          <circle cx="37.5" cy="25" r="0.9" fill="#ffffff" />
          <circle cx="28" cy="30.5" r="1.2" fill="#38bdf8" />
          <circle cx="36" cy="30.5" r="1.2" fill="#38bdf8" />
          <line x1="29" y1="36.5" x2="35" y2="36.5" stroke="#0369a1" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
};

export const CreaturePortraitSvg: React.FC<{
  cardId: string;
  lifeFormId: LifeFormId;
  name: string;
}> = ({ cardId, lifeFormId, name }) => {
  const lf = LIFE_FORMS_BY_ID[lifeFormId] ?? LIFE_FORMS_BY_ID['humanoide'];
  const rng = new SeededRNG(hashString(cardId + '_' + lifeFormId));
  const bodyW = rng.int(12, 20);
  const bodyH = rng.int(11, 18);
  const hornLen = rng.int(4, 10);
  const eyeCount = rng.pick([2, 2, 2, 3, 4]);
  const hasWings = lifeFormId === 'insectoide' || lifeFormId === 'espectroid' || rng.chance(0.3);
  const hasFins = lifeFormId === 'anfibio';

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
      <rect width="64" height="64" fill="#070b14" />
      <circle cx="32" cy="32" r="22" fill={lf.color} opacity="0.14" />
      {hasWings && (
        <>
          <ellipse cx={32 - bodyW * 0.85} cy="29" rx="9" ry="5" transform={`rotate(-22 ${32 - bodyW * 0.85} 29)`} fill={lf.accentColor} opacity="0.45" />
          <ellipse cx={32 + bodyW * 0.85} cy="29" rx="9" ry="5" transform={`rotate(22 ${32 + bodyW * 0.85} 29)`} fill={lf.accentColor} opacity="0.45" />
        </>
      )}
      {hasFins && (
        <>
          <polygon points={`20,30 9,24 14,37`} fill={lf.accentColor} opacity="0.75" />
          <polygon points={`44,30 55,24 50,37`} fill={lf.accentColor} opacity="0.75" />
        </>
      )}
      {/* Limbs / Tentacles */}
      <path d={`M${32 - bodyW * 0.55} 42 L${32 - bodyW * 0.75} 55`} stroke={lf.accentColor} strokeWidth="3" strokeLinecap="round" />
      <path d={`M${32 + bodyW * 0.55} 42 L${32 + bodyW * 0.75} 55`} stroke={lf.accentColor} strokeWidth="3" strokeLinecap="round" />
      {/* Crest / Horns */}
      <polygon points={`26,20 ${24 - hornLen * 0.3},${18 - hornLen} 29,18`} fill={lf.accentColor} />
      <polygon points={`38,20 ${40 + hornLen * 0.3},${18 - hornLen} 35,18`} fill={lf.accentColor} />
      {/* Body */}
      <ellipse cx="32" cy="34" rx={bodyW * 0.78} ry={bodyH * 0.82} fill={lf.color} stroke={lf.accentColor} strokeWidth="1.4" />
      {/* Eyes */}
      <circle cx="27" cy="29" r="2.2" fill="#0f172a" />
      <circle cx="37" cy="29" r="2.2" fill="#0f172a" />
      <circle cx="27.3" cy="28.5" r="0.9" fill="#ffffff" />
      <circle cx="37.3" cy="28.5" r="0.9" fill="#ffffff" />
      {eyeCount >= 3 && <circle cx="32" cy="24" r="1.5" fill="#fef08a" />}
      {eyeCount >= 4 && (
        <>
          <circle cx="23.5" cy="32" r="1.2" fill="#fef08a" />
          <circle cx="40.5" cy="32" r="1.2" fill="#fef08a" />
        </>
      )}
    </svg>
  );
};
