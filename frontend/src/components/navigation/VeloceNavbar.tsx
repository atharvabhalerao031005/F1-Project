// frontend/src/components/navigation/VeloceNavbar.tsx
/**
 * VELOCE PRO // MINIMALIST FLOATING CERAMIC GLASS TOP NAVIGATION
 * Direction: Swiss Haute Horlogerie & Light Luxury Editorial
 * - Floating ceramic glass pill (rgba(242, 240, 235, 0.78) with backdrop-filter: blur(24px))
 * - Clean interpuncts instead of slashes: 01 Calibration · 02 Oracle · 03 Proving Ground · 04 Arena
 * - Subtle Champagne Quartz dot (#DFD9CC), zero cluttered badges, zero red ping gamer dots
 */

import React, { useEffect, useState } from 'react';
import { getActiveLenis } from '../../utils/motionMasterTicker';

interface VeloceNavbarProps {
  onJumpToSimulation: () => void;
  scrollProgress: number; // 0.0 to 1.0 across full 2,100vh
}

interface NavItem {
  href: string;
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '#act-1', id: 'act-1', label: '01 Calibration' },
  { href: '#act-2', id: 'act-2', label: '02 Oracle' },
  { href: '#act-3', id: 'act-3', label: '03 Proving Ground' },
  { href: '#act-4', id: 'act-4', label: '04 Arena' },
];

export const VeloceNavbar: React.FC<VeloceNavbarProps> = ({
  onJumpToSimulation,
  scrollProgress,
}) => {
  const [activeSection, setActiveSection] = useState('act-1');

  // Transition from Light Ceramic Glass to Smoked Ceramic Glass when entering Act 2 (p > 0.28, ~600vh)
  const isDarkSection = scrollProgress > 0.28;

  // Active section tracking mapped to 2,100vh timeline
  useEffect(() => {
    if (scrollProgress < 0.26) {
      setActiveSection('act-1');
    } else if (scrollProgress >= 0.26 && scrollProgress < 0.57) {
      setActiveSection('act-2');
    } else if (scrollProgress >= 0.57 && scrollProgress < 0.81) {
      setActiveSection('act-3');
    } else {
      setActiveSection('act-4');
    }
  }, [scrollProgress]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      const lenis = getActiveLenis();
      if (lenis) {
        lenis.scrollTo(el as HTMLElement, { duration: 1.5 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-transform duration-500">
      <div
        className={`flex items-center justify-between gap-6 sm:gap-9 px-5 sm:px-7 py-2 rounded-full transition-all duration-500 ease-out select-none ${
          isDarkSection
            ? 'bg-[#14171D]/75 backdrop-blur-[24px] saturate-[180%] border border-white/[0.12] text-[#F7F6F2] shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.14)]'
            : 'bg-[rgba(242,240,235,0.78)] backdrop-blur-[24px] saturate-[180%] border border-[rgba(15,16,18,0.08)] text-[#0F1012] shadow-[0_4px_24px_rgba(15,16,18,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
        }`}
      >
        {/* Brand Wordmark & Subtle Champagne Quartz Dot (#DFD9CC) */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#DFD9CC] shadow-[0_0_8px_rgba(223,217,204,0.7)] shrink-0"
            aria-hidden="true"
          />
          <a
            href="#act-1"
            onClick={(e) => handleNavClick(e, '#act-1')}
            className={`font-display font-extrabold text-xs sm:text-sm tracking-[0.22em] uppercase transition-opacity hover:opacity-75 ${
              isDarkSection ? 'text-[#F7F6F2]' : 'text-[#0F1012]'
            }`}
          >
            VELOCE
          </a>
        </div>

        {/* Minimalist Editorial Navigation with Typographic Interpuncts */}
        <nav className="hidden md:flex items-center gap-3.5 lg:gap-5 text-[10px] sm:text-[11px] font-mono tracking-[0.16em] uppercase font-medium">
          {NAV_ITEMS.map((item, idx) => (
            <React.Fragment key={item.href}>
              {idx > 0 && (
                <span
                  className={`select-none text-[9px] transition-colors ${
                    isDarkSection ? 'text-white/20' : 'text-black/20'
                  }`}
                >
                  ·
                </span>
              )}
              <a
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`transition-all duration-300 relative py-0.5 ${
                  activeSection === item.id
                    ? isDarkSection
                      ? 'text-white font-semibold'
                      : 'text-[#0F1012] font-semibold'
                    : isDarkSection
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-[#6E7179] hover:text-[#0F1012]'
                }`}
              >
                <span>{item.label}</span>
                {activeSection === item.id && (
                  <span
                    className={`absolute -bottom-0.5 left-0 right-0 h-[1.5px] rounded-full transition-all duration-300 ${
                      isDarkSection ? 'bg-white/70' : 'bg-[#0F1012]/70'
                    }`}
                  />
                )}
              </a>
            </React.Fragment>
          ))}
        </nav>

        {/* Minimalist Right Action Pill */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onJumpToSimulation}
            className={`px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center gap-1.5 hover:scale-[1.03] active:scale-[0.98] ${
              isDarkSection
                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15 shadow-sm'
                : 'bg-black/[0.05] hover:bg-black/[0.08] text-[#0F1012] border border-black/[0.08]'
            }`}
          >
            <span>Arena</span>
            <span className="text-[9px] opacity-60">↓</span>
          </button>
        </div>
      </div>
    </header>
  );
};