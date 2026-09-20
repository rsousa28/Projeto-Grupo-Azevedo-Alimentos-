import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'auto' | 'dark' | 'light' | 'gold' | 'white';
  showSubtext?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = 'h-8 w-auto', 
  variant = 'white',
  showSubtext = true,
  ...props 
}) => {
  const isDarkCanvas = variant === 'white' || variant === 'light';

  return (
    <svg 
      viewBox={showSubtext ? "0 0 512 470" : "0 0 512 300"} 
      className={`object-contain transition-transform duration-300 ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd22a" />
          <stop offset="60%" stopColor="#f5a60b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Iconic Serif Letter 'A' */}
      <path 
        fill={isDarkCanvas ? '#ffffff' : '#16120b'}
        d="
          M 256 70
          C 252 70 246 74 241 84
          L 173 222
          C 165 238 155 245 138 247
          L 138 254
          L 204 254
          L 204 247
          C 188 245 184 237 190 224
          L 203 198
          C 220 181 240 174 256 174
          C 272 174 292 181 309 198
          L 322 224
          C 328 237 324 245 308 247
          L 308 254
          L 374 254
          L 374 247
          C 357 245 347 238 339 222
          L 271 84
          C 266 74 260 70 256 70 Z

          M 256 114
          L 278 160
          C 268 151 244 151 234 160
          L 256 114 Z
        " 
      />

      {/* Golden Swoosh / Arch Crossing through the 'A' */}
      <path 
        fill="url(#logoGold)" 
        d="
          M 182 214
          C 210 154 276 148 328 220
          C 316 206 300 182 278 174
          C 246 162 210 182 182 214 Z
        " 
      />

      {showSubtext && (
        <>
          {/* Wordmark "AZEVEDO" */}
          <text 
            x="256" 
            y="312" 
            textAnchor="middle" 
            fill={isDarkCanvas ? '#ffffff' : '#16120b'}
            fontFamily="'Montserrat', 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" 
            fontSize="48" 
            fontWeight="900" 
            letterSpacing="5"
          >
            AZEVEDO
          </text>

          {/* Wordmark "GRUPO" */}
          <text 
            x="256" 
            y="364" 
            textAnchor="middle" 
            fill="url(#logoGold)" 
            fontFamily="'Montserrat', 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" 
            fontSize="40" 
            fontWeight="900" 
            letterSpacing="14"
          >
            GRUPO
          </text>

          {/* Golden Divider Line */}
          <rect 
            x="176" 
            y="384" 
            width="160" 
            height="6" 
            rx="3" 
            fill="url(#logoGold)" 
          />

          {/* Wordmark "ALIMENTOS" */}
          <text 
            x="256" 
            y="422" 
            textAnchor="middle" 
            fill={isDarkCanvas ? '#ffffff' : '#334155'}
            fontFamily="'Montserrat', 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" 
            fontSize="21" 
            fontWeight="600" 
            letterSpacing="11"
          >
            ALIMENTOS
          </text>
        </>
      )}
    </svg>
  );
};

export default Logo;
