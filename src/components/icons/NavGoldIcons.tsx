import React from 'react'

interface NavIconProps {
  active?: boolean
  className?: string
}

// ── 1. Home Icon (Gold Circle with Cozy House & Sparkles) ──────
export const NavHomeIcon: React.FC<NavIconProps> = ({ active = false, className = 'h-6 w-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} transition-all duration-300 ${
        active
          ? 'filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] scale-105 opacity-100'
          : 'grayscale opacity-60 contrast-75 brightness-90'
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="homeBg" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="20" y1="20" x2="80" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id="wallGrad" x1="25" y1="45" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Gold Outer Circle */}
      <circle cx="50" cy="50" r="44" fill="url(#homeBg)" stroke="#78350F" strokeWidth="5" />
      <circle cx="50" cy="50" r="39" stroke="#FEF08A" strokeWidth="2" strokeOpacity="0.8" fill="none" />

      {/* Chimney */}
      <rect x="63" y="32" width="9" height="18" rx="2" fill="#78350F" stroke="#451A03" strokeWidth="2" />

      {/* House Body */}
      <rect x="26" y="44" width="48" height="34" rx="4" fill="url(#wallGrad)" stroke="#78350F" strokeWidth="4" />

      {/* House Roof */}
      <path
        d="M17 46L50 20L83 46C83 46 78 50 74 46L50 27L26 46C22 50 17 46 17 46Z"
        fill="url(#roofGrad)"
        stroke="#451A03"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Door */}
      <path d="M42 78V58C42 55.5 44 53.5 46.5 53.5H53.5C56 53.5 58 55.5 58 58V78H42Z" fill="#78350F" stroke="#451A03" strokeWidth="3" />
      <circle cx="54" cy="66" r="2" fill="#FDE68A" />

      {/* Window */}
      <rect x="42" y="37" width="16" height="11" rx="2" fill="#78350F" stroke="#451A03" strokeWidth="2" />
      <rect x="44" y="39" width="12" height="7" rx="1" fill="#FEF08A" />

      {/* Sparkles */}
      <path d="M18 24L20 18L26 16L20 14L18 8L16 14L10 16L16 18L18 24Z" fill="#FFF" opacity="0.95" />
      <path d="M82 28L83.5 23.5L88 22L83.5 20.5L82 16L80.5 20.5L76 22L80.5 23.5L82 28Z" fill="#FFF" opacity="0.9" />
    </svg>
  )
}

// ── 2. Schemes Icon (Clipboard with Rupee, Coins & Upward Green Arrow) ──────
export const NavSchemesIcon: React.FC<NavIconProps> = ({ active = false, className = 'h-6 w-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} transition-all duration-300 ${
        active
          ? 'filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] scale-105 opacity-100'
          : 'grayscale opacity-60 contrast-75 brightness-90'
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="boardGrad" x1="20" y1="20" x2="70" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="45" y1="50" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="arrowGrad" x1="15" y1="75" x2="85" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Clipboard Back */}
      <rect x="22" y="18" width="56" height="70" rx="7" fill="#78350F" stroke="#451A03" strokeWidth="4" />
      <rect x="26" y="22" width="48" height="62" rx="4" fill="url(#boardGrad)" stroke="#B45309" strokeWidth="2" />

      {/* Clipboard Top Clip */}
      <rect x="38" y="13" width="24" height="10" rx="3" fill="#92400E" stroke="#451A03" strokeWidth="3" />
      <circle cx="50" cy="18" r="3" fill="#FCD34D" />

      {/* Large Rupee Sign on Document */}
      <text x="44" y="52" fill="#B45309" fontSize="28" fontWeight="900" fontFamily="sans-serif">₹</text>

      {/* Coin Stack 1 */}
      <rect x="48" y="58" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="48" y="64" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="48" y="70" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />

      {/* Coin Stack 2 */}
      <rect x="68" y="48" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="68" y="54" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="68" y="60" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="68" y="66" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />
      <rect x="68" y="72" width="22" height="7" rx="3.5" fill="url(#coinGrad)" stroke="#78350F" strokeWidth="2" />

      {/* Soaring Green Arrow */}
      <path
        d="M12 70 C 35 68, 45 42, 86 24"
        stroke="url(#arrowGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M88 22 L66 20 L78 36 Z" fill="#15803D" stroke="#14532D" strokeWidth="2" />
      <path d="M90 20 L68 18 L80 34 Z" fill="#22C55E" />
    </svg>
  )
}

// ── 3. Passbook Icon (Open Book with Rupee & Green Checkmark) ──
export const NavPassbookIcon: React.FC<NavIconProps> = ({ active = false, className = 'h-6 w-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} transition-all duration-300 ${
        active
          ? 'filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] scale-105 opacity-100'
          : 'grayscale opacity-60 contrast-75 brightness-90'
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coverGrad" x1="10" y1="20" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id="pageGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
      </defs>

      {/* Book Outer Golden/Brown Cover */}
      <path
        d="M12 25C12 21 16 18 20 18H48V82H20C16 82 12 79 12 75V25Z"
        fill="url(#coverGrad)"
        stroke="#78350F"
        strokeWidth="4"
      />
      <path
        d="M88 25C88 21 84 18 80 18H52V82H80C84 82 88 79 88 75V25Z"
        fill="url(#coverGrad)"
        stroke="#78350F"
        strokeWidth="4"
      />

      {/* Book Center Spine Shadow */}
      <rect x="47" y="18" width="6" height="66" rx="2" fill="#78350F" />

      {/* Book Inner Cream Pages */}
      <path d="M16 23C16 21 19 20 22 20H47V78H22C19 78 16 77 16 75V23Z" fill="url(#pageGrad)" stroke="#B45309" strokeWidth="2" />
      <path d="M84 23C84 21 81 20 78 20H53V78H78C81 78 84 77 84 75V23Z" fill="url(#pageGrad)" stroke="#B45309" strokeWidth="2" />

      {/* Left Page: Large Rupee Symbol */}
      <text x="24" y="55" fill="#78350F" fontSize="30" fontWeight="900" fontFamily="sans-serif">₹</text>

      {/* Right Page: Text Lines */}
      <line x1="58" y1="32" x2="78" y2="32" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="42" x2="78" y2="42" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="52" x2="70" y2="52" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />

      {/* Right Page: Bold Green Checkmark */}
      <circle cx="74" cy="58" r="9" fill="#16A34A" stroke="#14532D" strokeWidth="2" />
      <path d="M70 58L73 61L79 54" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── 4. Gold Rate Icon (Gold Bars with % and Upward Green Graph) ──────
export const NavRatesIcon: React.FC<NavIconProps> = ({ active = false, className = 'h-6 w-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} transition-all duration-300 ${
        active
          ? 'filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] scale-105 opacity-100'
          : 'grayscale opacity-60 contrast-75 brightness-90'
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="barGradTop" x1="20" y1="50" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="chartArrowGrad" x1="15" y1="65" x2="85" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Orange Percentage Symbol */}
      <text x="24" y="34" fill="#EA580C" fontSize="24" fontWeight="900" fontFamily="sans-serif">%</text>

      {/* Sparkles */}
      <path d="M80 20L81.5 15.5L86 14L81.5 12.5L80 8L78.5 12.5L74 14L78.5 15.5L80 20Z" fill="#F59E0B" />
      <path d="M16 48L17 44L21 43L17 42L16 38L15 42L11 43L15 44L16 48Z" fill="#F59E0B" />

      {/* Background Chart Bar Columns */}
      <rect x="22" y="66" width="10" height="16" rx="2" fill="#B45309" opacity="0.6" />
      <rect x="36" y="56" width="10" height="26" rx="2" fill="#B45309" opacity="0.8" />
      <rect x="76" y="46" width="10" height="36" rx="2" fill="#B45309" />

      {/* Stacked 3D Gold Bars / Ingots */}
      {/* Bottom Left Ingot */}
      <path d="M22 72L36 65H58L44 72Z" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
      <path d="M22 72H44V82H22Z" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />
      <path d="M44 72L58 65V75L44 82Z" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />

      {/* Bottom Right Ingot */}
      <path d="M48 72L62 65H84L70 72Z" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
      <path d="M48 72H70V82H48Z" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />
      <path d="M70 72L84 65V75L70 82Z" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />

      {/* Top Pyramid Ingot */}
      <path d="M35 60L49 53H71L57 60Z" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
      <path d="M35 60H57V70H35Z" fill="#FCD34D" stroke="#78350F" strokeWidth="1.5" />
      <path d="M57 60L71 53V63L57 70Z" fill="#D97706" stroke="#78350F" strokeWidth="1.5" />

      {/* Upward Green Graph Arrow */}
      <path
        d="M12 66L34 52L52 60L86 22"
        stroke="url(#chartArrowGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M88 20L66 20L78 36Z" fill="#15803D" stroke="#14532D" strokeWidth="2" />
      <path d="M90 18L68 18L80 34Z" fill="#22C55E" />
    </svg>
  )
}

// ── 5. Profile Icon (Gold Coin Circle with Golden Silhouette & Sparkles) ──────
export const NavProfileIcon: React.FC<NavIconProps> = ({ active = false, className = 'h-6 w-6' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} transition-all duration-300 ${
        active
          ? 'filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] scale-105 opacity-100'
          : 'grayscale opacity-60 contrast-75 brightness-90'
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="profBg" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="userGrad" x1="30" y1="30" x2="70" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      {/* Gold Outer Circle */}
      <circle cx="50" cy="50" r="44" fill="url(#profBg)" stroke="#78350F" strokeWidth="5" />
      <circle cx="50" cy="50" r="39" stroke="#FEF08A" strokeWidth="2" strokeOpacity="0.8" fill="none" />

      {/* Head Circle */}
      <circle cx="50" cy="38" r="16" fill="url(#userGrad)" stroke="#451A03" strokeWidth="3" />

      {/* Body / Shoulders Bust */}
      <path
        d="M23 78C23 63 35 56 50 56C65 56 77 63 77 78V84H23V78Z"
        fill="url(#userGrad)"
        stroke="#451A03"
        strokeWidth="3.5"
      />

      {/* Sparkles */}
      <path d="M78 26L79.5 21.5L84 20L79.5 18.5L78 14L76.5 18.5L72 20L76.5 21.5L78 26Z" fill="#FFF" opacity="0.95" />
      <path d="M84 34L85 31L88 30L85 29L84 26L83 29L80 30L83 31L84 34Z" fill="#FFF" opacity="0.9" />
    </svg>
  )
}
