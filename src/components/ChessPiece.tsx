import React from 'react';

interface ChessPieceProps {
  type: string; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: 'w' | 'b';
  size?: number | string;
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, size = '100%', className = '' }) => {
  const isWhite = color === 'w';

  // Crisp Staunton SVG paths with tailored highlights and gradient fills
  const baseGradId = `grad_${color}_${type}`;
  const strokeColor = isWhite ? '#4a3d24' : '#11141a';
  const strokeWidth = 1.6;

  const renderContent = () => {
    switch (type.toLowerCase()) {
      case 'p': // Pawn
        return (
          <g transform="translate(4, 2) scale(0.92)">
            <ellipse cx="24" cy="14" rx="6.5" ry="6.5" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <path
              d="M17 21 C17 21, 19 24, 20 28 C21 32, 16 35, 14 38 L34 38 C32 35, 27 32, 28 28 C29 24, 31 21, 31 21 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <path
              d="M12 39 C12 37, 36 37, 36 39 L37 43 C37 44, 11 44, 11 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isWhite && <circle cx="22" cy="12" r="2" fill="#ffffff" opacity="0.6" />}
          </g>
        );

      case 'r': // Rook
        return (
          <g transform="translate(4, 2) scale(0.92)">
            {/* Battlements */}
            <path
              d="M12 11 L16 11 L16 15 L21 15 L21 11 L27 11 L27 15 L32 15 L32 11 L36 11 L36 18 L12 18 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Tower Body */}
            <path
              d="M14 18 L16 36 L32 36 L34 18 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Base */}
            <path
              d="M11 37 C11 36, 37 36, 37 37 L38 43 C38 44, 10 44, 10 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isWhite && <rect x="18" y="22" width="12" height="2.5" rx="1" fill="#ffffff" opacity="0.5" />}
          </g>
        );

      case 'n': // Knight
        return (
          <g transform="translate(4, 2) scale(0.92)">
            <path
              d="M20 9 C18 9, 15 11, 14 13 C12 16, 12 20, 9 24 C8 25, 7 27, 8 29 C9 30, 11 30, 13 29 C14 28, 14 26, 17 26 C16 29, 14 33, 17 37 L34 37 C34 31, 36 21, 33 16 C31 12, 28 9, 23 9 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            {/* Eye */}
            <circle cx="15.5" cy="18" r="1.5" fill={isWhite ? '#2c1e11' : '#f5f5f5'} />
            {/* Mane line */}
            <path d="M23 11 C26 14, 28 20, 29 27" stroke={strokeColor} strokeWidth={1.3} fill="none" />
            {/* Base */}
            <path
              d="M12 38 C12 37, 36 37, 36 38 L37 43 C37 44, 11 44, 11 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>
        );

      case 'b': // Bishop
        return (
          <g transform="translate(4, 2) scale(0.92)">
            {/* Top pip */}
            <circle cx="24" cy="8.5" r="2.2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Mitre head */}
            <path
              d="M24 11 C18 11, 14 16, 15 23 C16 28, 19 32, 18 36 L30 36 C29 32, 32 28, 33 23 C34 16, 30 11, 24 11 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Slit */}
            <path d="M22 17 L29 24" stroke={strokeColor} strokeWidth={1.6} />
            {/* Base */}
            <path
              d="M12 37 C12 36, 36 36, 36 37 L37 43 C37 44, 11 44, 11 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isWhite && <ellipse cx="21" cy="19" rx="2" ry="4" fill="#ffffff" opacity="0.4" />}
          </g>
        );

      case 'q': // Queen
        return (
          <g transform="translate(4, 2) scale(0.92)">
            {/* Crown spheres */}
            <circle cx="10" cy="14" r="2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={1.2} />
            <circle cx="17" cy="11" r="2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={1.2} />
            <circle cx="24" cy="10" r="2.2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={1.2} />
            <circle cx="31" cy="11" r="2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={1.2} />
            <circle cx="38" cy="14" r="2" fill={`url(#${baseGradId})`} stroke={strokeColor} strokeWidth={1.2} />
            {/* Crown spikes */}
            <path
              d="M10 15 L14 26 L17 12 L20 27 L24 11 L28 27 L31 12 L34 26 L38 15 L36 31 C35 34, 32 36, 30 37 L18 37 C16 36, 13 34, 12 31 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            {/* Base */}
            <path
              d="M10 38 C10 37, 38 37, 38 38 L39 43 C39 44, 9 44, 9 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isWhite && <ellipse cx="24" cy="33" rx="7" ry="1.5" fill="#ffffff" opacity="0.6" />}
          </g>
        );

      case 'k': // King
        return (
          <g transform="translate(4, 2) scale(0.92)">
            {/* Cross on top */}
            <path d="M24 6 L24 13 M20.5 8.5 L27.5 8.5" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" />
            {/* Crown Body */}
            <path
              d="M16 14 C14 17, 13 22, 13 27 C13 32, 16 36, 17 37 L31 37 C32 36, 35 32, 35 27 C35 22, 34 17, 32 14 C28 17, 20 17, 16 14 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <path
              d="M18 20 C22 23, 26 23, 30 20"
              stroke={strokeColor}
              strokeWidth={1.4}
              fill="none"
            />
            {/* Base */}
            <path
              d="M10 38 C10 37, 38 37, 38 38 L39 43 C39 44, 9 44, 9 43 Z"
              fill={`url(#${baseGradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {isWhite && <ellipse cx="24" cy="27" rx="3.5" ry="6" fill="#ffffff" opacity="0.4" />}
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`select-none filter drop-shadow-md pointer-events-none transition-transform duration-100 ${className}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {isWhite ? (
          <linearGradient id={baseGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#fdfbf7" />
            <stop offset="100%" stopColor="#e2d8c3" />
          </linearGradient>
        ) : (
          <linearGradient id={baseGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d4451" />
            <stop offset="50%" stopColor="#252a33" />
            <stop offset="100%" stopColor="#15181f" />
          </linearGradient>
        )}
      </defs>
      {renderContent()}
    </svg>
  );
};
