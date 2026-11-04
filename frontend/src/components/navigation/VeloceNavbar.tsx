// frontend/src/components/navigation/VeloceNavbar.tsx
import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';

interface VeloceNavbarProps {
  onJumpToSimulation: () => void;
  scrollProgress: number;
}

export const VeloceNavbar: React.FC<VeloceNavbarProps> = ({
  onJumpToSimulation,
  scrollProgress,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine whether background is obsidian (Act 2 & Act 4) or stone (Act 1 & Act 3)
  const isDarkSection = scrollProgress > 0.22 && scrollProgress < 0.52 || scrollProgress > 0.72;

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 z-50 transition-all duration-300 px-6 sm:px-12 flex items-center justify-between ${
        isScrolled
          ? isDarkSection
            ? 'bg-[#0B0C0E]/80 backdrop-blur-xl border-b border-white/10 shadow-lg text-[#F7F6F2]'
            : 'bg-[#F4F2ED]/85 backdrop-blur-xl border-b border-[rgba(15,16,18,0.08)] shadow-sm text-[#0F1012]'
          : isDarkSection
          ? 'bg-transparent text-[#F7F6F2]'
          : 'bg-transparent text-[#0F1012]'
      }`}
    >
      {/* Brand Title */}
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] shadow-[0_0_10px_#FF3B00]" />
        <a href="#" className="font-display font-extrabold text-base tracking-tight hover:opacity-80 transition-opacity">
          VELOCE <span className="font-sans font-medium text-xs opacity-50 tracking-widest ml-1">// F1 INTELLIGENCE</span>
        </a>
      </div>

      {/* Center Anchor Links */}
      <nav className="hidden md:flex items-center gap-8 font-sans text-xs uppercase tracking-widest font-semibold">
        <a
          href="#act-1"
          className="hover:text-[#FF3B00] transition-colors opacity-80 hover:opacity-100"
        >
          01. The Machine
        </a>
        <a
          href="#act-2"
          className="hover:text-[#FF3B00] transition-colors opacity-80 hover:opacity-100"
        >
          02. Physics & Wear
        </a>
        <a
          href="#act-3"
          className="hover:text-[#FF3B00] transition-colors opacity-80 hover:opacity-100"
        >
          03. Strategy Oracle
        </a>
        <a
          href="#act-4"
          className="hover:text-[#FF3B00] transition-colors opacity-80 hover:opacity-100"
        >
          04. Live 3D Circuit
        </a>
      </nav>

      {/* Right CTA Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onJumpToSimulation}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 shadow-md bg-[#FF3B00] text-white hover:bg-[#e03400] hover:scale-105 active:scale-95"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">3D Race Simulation ↓</span>
          <span className="sm:hidden">3D Sim ↓</span>
        </button>
      </div>
    </header>
  );
};
