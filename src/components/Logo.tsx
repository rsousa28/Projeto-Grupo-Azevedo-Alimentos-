import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'auto' | 'dark' | 'light' | 'gold';
  showSubtext?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = 'h-8 w-auto', 
  variant = 'auto',
  showSubtext = true,
  ...props 
}) => {
  const colorClass = 
    variant === 'dark' 
      ? 'text-[#16120b]' 
      : variant === 'light' 
      ? 'text-white' 
      : variant === 'gold'
      ? 'text-[#FFCB05]'
      : 'text-current';

  return (
    <svg 
      viewBox={showSubtext ? "0 0 512 370" : "0 0 512 300"} 
      className={`fill-current object-contain transition-colors duration-300 ${colorClass} ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g transform="translate(256, 145) scale(1.15)">
        {/* Iconic Monogram 'A' with Arch Crossbar */}
        <path d="
          M 0 -115
          C -3 -115 -10 -108 -18 -88
          L -82 82
          C -92 105 -102 112 -122 114
          L -122 122
          L -45 122
          L -45 114
          C -62 112 -65 102 -58 84
          L -40 38
          C -18 15 18 15 40 38
          L 58 84
          C 65 102 62 112 45 114
          L 45 122
          L 122 122
          L 122 114
          C 102 112 92 105 82 82
          L 18 -88
          C 10 -108 3 -115 0 -115 Z

          M 0 -62
          L 28 8
          C 16 -6 -16 -6 -28 8
          L 0 -62 Z
        "/>

        {/* Upward Arch Bar Detail */}
        <path d="
          M -36 30
          Q 0 -12 36 30
          Q 0 4 0 4
          Q -36 30 -36 30 Z
        " opacity="0.95"/>
      </g>

      {/* Wordmark "A Z E V E D O" - Ultra bold, prominent, high legibility */}
      {showSubtext && (
        <text 
          x="256" 
          y="342" 
          textAnchor="middle" 
          fontFamily="'Plus Jakarta Sans', 'Inter', 'Cinzel', -apple-system, sans-serif" 
          fontSize="52" 
          fontWeight="900" 
          letterSpacing="10"
        >
          AZEVEDO
        </text>
      )}
    </svg>
  );
};

export default Logo;
