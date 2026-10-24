import React from 'react';

/**
 * LiveBackground
 * 
 * Visually rich, clean, and pictorial animated background.
 * Features:
 * - Visible navy, soft teal, and cyan palette
 * - Animated geometric civic data constellation network (nodes, pulses, connecting vectors)
 * - Faint isometric matrix grid representing land cadastres & citizen registries
 * - Smooth CSS hardware-accelerated animations
 * - Strictly pointer-events-none & -z-20 isolate so it never blocks UI or text
 * - Reduced-motion accessibility compliance
 */
const LiveBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden -z-20 select-none isolate"
    >
      {/* Base Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-navy-950 to-navy-900 opacity-95" />

      {/* Subtle Geometric Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(#14B8A6 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Visible Ambient Floating Teal & Navy Gradient Waves */}
      <div
        className="absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-govTeal-500/25 via-teal-400/10 to-transparent blur-3xl animate-bg-drift pointer-events-none"
        style={{ willChange: 'transform' }}
      />
      <div
        className="absolute top-1/4 -right-28 w-[38rem] h-[38rem] rounded-full bg-gradient-to-tl from-govTeal-600/20 via-navy-700/30 to-teal-200/10 blur-3xl animate-bg-drift-reverse pointer-events-none"
        style={{ willChange: 'transform' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tr from-teal-500/15 via-navy-800/20 to-transparent blur-3xl animate-bg-drift pointer-events-none"
        style={{ willChange: 'transform' }}
      />

      {/* Animated Civic Network Constellation (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60 animate-bg-network"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id="liveMesh1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#028090" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="liveMesh2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00A896" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.15" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Network Vectors */}
        <line x1="10%" y1="18%" x2="28%" y2="30%" stroke="url(#liveMesh1)" strokeWidth="1.2" strokeDasharray="4 4" />
        <line x1="28%" y1="30%" x2="45%" y2="16%" stroke="url(#liveMesh1)" strokeWidth="1.2" />
        <line x1="45%" y1="16%" x2="62%" y2="34%" stroke="url(#liveMesh2)" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="62%" y1="34%" x2="82%" y2="20%" stroke="url(#liveMesh1)" strokeWidth="1.5" />
        <line x1="82%" y1="20%" x2="92%" y2="40%" stroke="url(#liveMesh2)" strokeWidth="1.2" />

        <line x1="12%" y1="68%" x2="30%" y2="82%" stroke="url(#liveMesh2)" strokeWidth="1.2" />
        <line x1="30%" y1="82%" x2="54%" y2="62%" stroke="url(#liveMesh1)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="54%" y1="62%" x2="74%" y2="84%" stroke="url(#liveMesh2)" strokeWidth="1.2" />
        <line x1="74%" y1="84%" x2="90%" y2="70%" stroke="url(#liveMesh1)" strokeWidth="1.2" strokeDasharray="3 3" />

        {/* Diagonal Cross-Network Connections */}
        <line x1="28%" y1="30%" x2="30%" y2="82%" stroke="url(#liveMesh1)" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 4" />
        <line x1="62%" y1="34%" x2="54%" y2="62%" stroke="url(#liveMesh2)" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 4" />

        {/* Glowing Network Nodes */}
        <circle cx="10%" cy="18%" r="4" fill="#14B8A6" filter="url(#glow)" className="animate-bg-node" />
        <circle cx="28%" cy="30%" r="5" fill="#00A896" filter="url(#glow)" />
        <circle cx="45%" cy="16%" r="4" fill="#38BDF8" filter="url(#glow)" className="animate-bg-node" />
        <circle cx="62%" cy="34%" r="5.5" fill="#14B8A6" filter="url(#glow)" />
        <circle cx="82%" cy="20%" r="4" fill="#028090" filter="url(#glow)" className="animate-bg-node" />
        <circle cx="92%" cy="40%" r="4.5" fill="#00A896" filter="url(#glow)" />

        <circle cx="12%" cy="68%" r="4" fill="#00A896" filter="url(#glow)" />
        <circle cx="30%" cy="82%" r="5" fill="#14B8A6" filter="url(#glow)" className="animate-bg-node" />
        <circle cx="54%" cy="62%" r="6" fill="#38BDF8" filter="url(#glow)" />
        <circle cx="74%" cy="84%" r="4" fill="#028090" filter="url(#glow)" className="animate-bg-node" />
        <circle cx="90%" cy="70%" r="5" fill="#14B8A6" filter="url(#glow)" />
      </svg>
    </div>
  );
};

export default LiveBackground;
