import React from 'react';

interface ZViewBrandIconProps {
  size?: number;
  className?: string;
}

/**
 * Original recognizable ZView app icon combining a geometric "Z" document plane
 * in Cerulean Blue (#007BA7), Neon Rose (#FF2D95) corner scan reticles, and a crisp
 * White (#FFFFFF) optical scan line on a Jet Black (#0A0A0A) / Dark Surface (#17171C) base.
 */
export const ZViewBrandIcon: React.FC<ZViewBrandIconProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="108" height="108" rx="24" fill="#0A0A0A" />
      <rect
        x="10"
        y="10"
        width="88"
        height="88"
        rx="18"
        fill="#17171C"
        stroke="#34343D"
        strokeWidth="2"
      />
      {/* Neon Rose Scan Corner Reticles */}
      <path
        d="M25 36V25H36M72 25H83V36M83 72V83H72M36 83H25V72"
        stroke="#FF2D95"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cerulean Blue Geometric Z Monogram */}
      <path
        d="M37 36H71L37 72H71"
        stroke="#007BA7"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crisp White Optical Scan Horizon */}
      <path d="M31 54H77" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};
