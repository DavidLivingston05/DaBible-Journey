import React from 'react';
import { motion } from 'motion/react';

interface AppLogoProps {
  size?: number | string;
  className?: string;
  animate?: boolean;
}

export default function AppLogo({ size = 36, className = "", animate = true }: AppLogoProps) {
  return (
    <div 
      className={`relative select-none flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Background Rounded Squircle with elegant glassmorphism gradient & borders */}
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#021410" />
            <stop offset="50%" stopColor="#042F24" />
            <stop offset="100%" stopColor="#010706" />
          </linearGradient>

          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle base */}
        <rect
          x="12"
          y="12"
          width="488"
          height="488"
          rx="120"
          fill="url(#bgGrad)"
          stroke="#10b981"
          strokeWidth="6"
          strokeOpacity="0.15"
        />

        {/* Ambient background grid pattern for tech-aesthetic */}
        <path
          d="M 112,12 L 112,500 M 212,12 L 212,500 M 312,12 L 312,500 M 412,12 L 412,500"
          stroke="#10b981"
          strokeOpacity="0.03"
          strokeWidth="2"
        />
        <path
          d="M 12,112 L 500,112 M 12,212 L 500,212 M 12,312 L 500,312 M 12,412 L 500,412"
          stroke="#10b981"
          strokeOpacity="0.03"
          strokeWidth="2"
        />

        {/* Celestial Star of Bethlehem / North Star (Guidance) */}
        <g filter="url(#neonGlow)">
          <path
            d="M 256,60 L 265,115 L 320,124 L 265,133 L 256,188 L 247,133 L 192,124 L 247,115 Z"
            fill="url(#goldGrad)"
          />
          <circle cx="256" cy="124" r="5" fill="#ffffff" />
        </g>

        {/* Winding mountain path representing the "Journey" converging from scripture */}
        <path
          d="M 256,134 L 274,220 L 295,296 L 332,370 C 290,400 220,400 180,370 L 217,296 L 238,220 Z"
          fill="url(#glowGrad)"
        />

        {/* Path highlight spine */}
        <path
          d="M 256,150 L 256,380"
          stroke="url(#goldGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="12 8"
          strokeOpacity="0.8"
        />

        {/* The Open Holy Bible Pages (3D layered layout) */}
        {/* Left Page shadow */}
        <path
          d="M 256,360 L 100,310 C 130,260 140,230 150,180 L 256,230 Z"
          fill="#10b981"
          fillOpacity="0.1"
        />
        
        {/* Right Page shadow */}
        <path
          d="M 256,360 L 412,310 C 382,260 372,230 362,180 L 256,230 Z"
          fill="#10b981"
          fillOpacity="0.1"
        />

        {/* Holy Bible Book base/spine */}
        <path
          d="M 230,375 C 246,378 266,378 282,375 L 282,240 C 266,243 246,243 230,240 Z"
          fill="url(#goldGrad)"
        />

        {/* Left Book Page (Elegant wing aesthetic) */}
        <path
          d="M 250,366 C 180,366 120,340 70,320 C 75,250 110,186 160,180 C 190,205 220,230 250,234 Z"
          fill="url(#leafGrad)"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Right Book Page (Elegant wing aesthetic) */}
        <path
          d="M 262,366 C 332,366 392,340 442,320 C 437,250 402,186 352,180 C 322,205 292,230 262,234 Z"
          fill="url(#leafGrad)"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Detail page lines representing written words inside Scripture */}
        {/* Left scriptures */}
        <path d="M 120,250 C 150,255 180,260 210,250" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <path d="M 115,280 C 150,285 180,290 215,280" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <path d="M 110,310 C 145,315 175,320 205,310" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />

        {/* Right scriptures */}
        <path d="M 392,250 C 362,255 332,260 302,250" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <path d="M 397,280 C 362,285 332,290 297,280" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <path d="M 402,310 C 367,315 337,320 307,310" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />

        {/* Beautiful Floating Orbs/Stars */}
        <circle cx="90" cy="140" r="10" fill="url(#goldGrad)" opacity="0.8" />
        <circle cx="430" cy="150" r="14" fill="#ffffff" opacity="0.9" />
        <circle cx="430" cy="150" r="6" fill="url(#goldGrad)" />
        <circle cx="380" cy="80" r="8" fill="#10b981" opacity="0.6" />
        <circle cx="140" cy="80" r="6" fill="url(#goldGrad)" opacity="0.7" />

        {/* Decorative Laurel Wreath for victory/tracker motif at base */}
        <path
          d="M 100,410 C 160,460 352,460 412,410"
          stroke="url(#goldGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="1 16"
        />
      </svg>
    </div>
  );
}
