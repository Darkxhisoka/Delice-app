import React, { useState } from 'react';

/**
 * High-Contrast Vibrant French Croissant & Bakery SVG Icon
 * Designed to be distinctly visible on both dark (slate/indigo) and light backgrounds.
 */
export const BakeryMinimalIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Rich golden-amber pastry gradient */}
        <linearGradient id="delicePastryGoldGrad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Luminous sheen on top crust */}
        <linearGradient id="delicePastrySheen" x1="8" y1="5" x2="24" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FEF3C7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.0" />
        </linearGradient>

        {/* Subtle shadow filter for depth */}
        <filter id="deliceShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#deliceShadow)">
        {/* Main croissant curved body with golden bake */}
        <path
          d="M4.8 19.8C3.5 17.2 4.2 13.8 6.9 11.4C10.8 7.9 16.6 6.8 22.2 8.3C25 9 27.4 10.6 28.5 12.8C29.9 15.6 29.1 18.9 26.5 20.6C23.6 22.5 19.8 22 15.8 22.7C12.5 23.3 9.2 24 6.5 22.4C5.4 21.6 4.9 20.8 4.8 19.8Z"
          fill="url(#delicePastryGoldGrad)"
          stroke="#78350F"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Outer pastry shine highlights */}
        <path
          d="M8.2 12.2C11.8 9.6 17.2 8.6 22.4 9.8C24.4 10.3 26.2 11.4 27.2 13"
          stroke="url(#delicePastrySheen)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Laminated flaky dough score lines (left, center, right) */}
        <path
          d="M10 11.2C11.8 14 13.4 17.6 12.6 21.6"
          stroke="#78350F"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M16 8.5C17.6 12.2 18.6 16.8 17.5 22.2"
          stroke="#78350F"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M22 9.2C23.4 12.6 23.8 16.8 22.5 20.8"
          stroke="#78350F"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Inner delicate flake details */}
        <path
          d="M13.2 13C14 15 14.5 17.5 14.2 19.8"
          stroke="#B45309"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M19.2 12C20 14.2 20.3 16.5 19.8 18.8"
          stroke="#B45309"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.85"
        />
      </g>
    </svg>
  );
};

/**
 * Minimalist Golden Wheat Stem Icon
 */
export const WheatMinimalIcon: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="#F59E0B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 22 16 8" stroke="#D97706" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" fill="#FBBF24" fillOpacity="0.4" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" fill="#FBBF24" fillOpacity="0.4" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" fill="#FBBF24" fillOpacity="0.4" />
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" fill="#F59E0B" fillOpacity="0.5" />
      <path d="M11.47 15.47 13 17l1.53-1.53a3.5 3.5 0 0 0 0-4.94L13 9l-1.53 1.53a3.5 3.5 0 0 0 0 4.94Z" fill="#FBBF24" fillOpacity="0.4" />
      <path d="M15.47 11.47 17 13l1.53-1.53a3.5 3.5 0 0 0 0-4.94L17 5l-1.53 1.53a3.5 3.5 0 0 0 0 4.94Z" fill="#FBBF24" fillOpacity="0.4" />
    </svg>
  );
};

interface CompanyLogoProps {
  imgClassName?: string;
  alt?: string;
  variant?: 'icon' | 'image' | 'wheat';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  imgClassName = 'w-7 h-7 sm:w-8 sm:h-8',
  alt = 'Délice Logo',
  variant = 'icon',
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  // If wheat variant requested
  if (variant === 'wheat') {
    return (
      <div className="flex items-center justify-center shrink-0">
        <WheatMinimalIcon className={imgClassName} />
      </div>
    );
  }

  // If explicit image requested and hasn't errored
  if (variant === 'image' && !imgError) {
    return (
      <img
        src="/logo.png"
        alt={alt}
        onError={() => setImgError(true)}
        className={`${imgClassName} object-contain`}
        loading="eager"
        decoding="async"
      />
    );
  }

  // Default: Pristine, high-contrast SVG croissant emblem with vivid amber/golden tones
  return (
    <div className="flex items-center justify-center shrink-0 drop-shadow-sm">
      <BakeryMinimalIcon className={imgClassName} />
    </div>
  );
};
