import React from 'react';
import { MascotOutfit } from '../types';

interface ZikoMascotProps {
  mood?: 'happy' | 'celebrating' | 'thinking' | 'encouraging';
  outfit?: MascotOutfit;
  size?: number;
  className?: string;
}

export const ZikoMascot: React.FC<ZikoMascotProps> = ({
  mood = 'happy',
  outfit = 'classic',
  size = 96,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      aria-label="Ziko Mascot"
    >
      {/* Subtle drop shadow */}
      <ellipse cx="100" cy="186" rx="54" ry="9" fill="#CBD5E1" opacity="0.55" />

      {/* Astronaut Helmet Back Ring */}
      {outfit === 'astronaut' && (
        <circle cx="100" cy="112" r="76" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="6" />
      )}

      {/* Big Fennec Ears */}
      <path d="M52 94 L24 28 C21 20 31 15 38 21 L84 64 Z" fill="#FFB800" />
      <path d="M56 86 L39 40 L76 68 Z" fill="#FFF3B0" />
      <path d="M148 94 L176 28 C179 20 169 15 162 21 L116 64 Z" fill="#FFB800" />
      <path d="M144 86 L161 40 L124 68 Z" fill="#FFF3B0" />

      {/* Cute Rounded Body */}
      <rect x="62" y="138" width="76" height="44" rx="22" fill="#58CC02" />
      <rect x="78" y="146" width="44" height="30" rx="14" fill="#A5ED6E" />
      {/* Emerald Star on Belly */}
      <path
        d="M100 152 L103 159 L110 160 L105 165 L106 172 L100 168 L94 172 L95 165 L90 160 L97 159 Z"
        fill="#FFFFFF"
      />

      {/* Waving Paws */}
      {mood === 'celebrating' ? (
        <>
          <ellipse cx="50" cy="134" rx="14" ry="9" transform="rotate(-35 50 134)" fill="#FFB800" />
          <ellipse cx="150" cy="134" rx="14" ry="9" transform="rotate(35 150 134)" fill="#FFB800" />
        </>
      ) : (
        <>
          <ellipse cx="56" cy="154" rx="13" ry="9" transform="rotate(15 56 154)" fill="#FFB800" />
          <ellipse cx="144" cy="154" rx="13" ry="9" transform="rotate(-15 144 154)" fill="#FFB800" />
        </>
      )}

      {/* Head */}
      <ellipse cx="100" cy="106" rx="60" ry="52" fill="#FFC800" />
      <ellipse cx="100" cy="118" rx="46" ry="36" fill="#FFFBEB" />

      {/* Cheek Blush */}
      <ellipse cx="64" cy="118" rx="9" ry="5" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="136" cy="118" rx="9" ry="5" fill="#FF8FA3" opacity="0.55" />

      {/* Expressive Eyes */}
      {mood === 'celebrating' ? (
        <>
          <path d="M66 100 Q78 86 90 100" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M110 100 Q122 86 134 100" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="77" cy="98" r="17" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          <circle cx="123" cy="98" r="17" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          <circle
            cx={mood === 'thinking' ? 81 : 79}
            cy={mood === 'thinking' ? 93 : 98}
            r="9.5"
            fill="#1E293B"
          />
          <circle
            cx={mood === 'thinking' ? 127 : 121}
            cy={mood === 'thinking' ? 93 : 98}
            r="9.5"
            fill="#1E293B"
          />
          <circle cx="82" cy="94" r="3.5" fill="#FFFFFF" />
          <circle cx="124" cy="94" r="3.5" fill="#FFFFFF" />
        </>
      )}

      {/* Cool Shades Outfit */}
      {outfit === 'cool_shades' && (
        <g>
          <rect x="56" y="86" width="38" height="24" rx="7" fill="#0F172A" />
          <rect x="106" y="86" width="38" height="24" rx="7" fill="#0F172A" />
          <line x1="94" y1="95" x2="106" y2="95" stroke="#0F172A" strokeWidth="5" />
          <line x1="63" y1="92" x2="75" y2="104" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <line x1="113" y1="92" x2="125" y2="104" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {/* Cute Nose */}
      <ellipse cx="100" cy="114" rx="8" ry="5.5" fill="#FF5A5F" />

      {/* Mouth */}
      {mood === 'thinking' ? (
        <path d="M92 128 Q100 125 108 129" stroke="#1E293B" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      ) : mood === 'encouraging' ? (
        <path d="M89 126 Q100 134 111 126" stroke="#1E293B" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      ) : (
        <path
          d="M86 124 Q100 140 114 124 Z"
          fill="#FF4B4B"
          stroke="#1E293B"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}

      {/* Outfits: Moroccan Tarbouche (Fez) */}
      {outfit === 'tarbouche' && (
        <g>
          <path d="M78 58 L84 26 C85 21 115 21 116 26 L122 58 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="3" />
          <path d="M100 23 Q124 26 127 48" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="127" cy="50" r="4" fill="#1E293B" />
        </g>
      )}

      {/* Outfits: Royal Legendary Crown */}
      {outfit === 'royal_crown' && (
        <g>
          <path
            d="M72 58 L68 28 L88 42 L100 22 L112 42 L132 28 L128 58 Z"
            fill="#FFC800"
            stroke="#D97706"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="45" r="4.5" fill="#1CB0F6" />
          <circle cx="82" cy="48" r="3.5" fill="#FF4B4B" />
          <circle cx="118" cy="48" r="3.5" fill="#58CC02" />
        </g>
      )}

      {/* Astronaut Glass Glare */}
      {outfit === 'astronaut' && (
        <path
          d="M48 76 Q65 48 102 46"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.7"
          fill="none"
        />
      )}
    </svg>
  );
};
