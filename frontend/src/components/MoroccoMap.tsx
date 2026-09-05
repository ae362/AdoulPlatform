import React, { useState } from 'react';

interface MoroccoMapProps {
  onSelectRegion: (region: string) => void;
  selectedRegion?: string;
  className?: string;
}

export const MoroccoMap: React.FC<MoroccoMapProps> = ({ onSelectRegion, selectedRegion, className }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regions = [
    { id: 'tanger', name: 'طنجة تطوان الحسيمة', path: 'M180,20 L220,20 L230,40 L200,50 L170,40 Z', cx: 200, cy: 35 },
    { id: 'oriental', name: 'الشرق', path: 'M230,40 L280,40 L290,100 L240,120 L220,80 Z', cx: 260, cy: 80 },
    { id: 'fes', name: 'فاس مكناس', path: 'M200,50 L230,40 L220,80 L190,90 L180,60 Z', cx: 205, cy: 70 },
    { id: 'rabat', name: 'الرباط سلا القنيطرة', path: 'M170,40 L200,50 L180,60 L160,80 L140,60 Z', cx: 170, cy: 60 },
    { id: 'benimellal', name: 'بني ملال خنيفرة', path: 'M180,90 L220,80 L210,130 L170,120 Z', cx: 195, cy: 105 },
    { id: 'casablanca', name: 'الدار البيضاء سطات', path: 'M140,60 L160,80 L150,110 L120,90 Z', cx: 140, cy: 85 },
    { id: 'marrakech', name: 'مراكش آسفي', path: 'M120,90 L170,120 L160,160 L110,140 Z', cx: 140, cy: 125 },
    { id: 'draa', name: 'درعة تافيلالت', path: 'M210,130 L240,120 L250,180 L200,170 Z', cx: 225, cy: 150 },
    { id: 'souss', name: 'سوس ماسة', path: 'M110,140 L160,160 L150,190 L100,170 Z', cx: 130, cy: 165 },
    { id: 'guelmim', name: 'كلميم واد نون', path: 'M100,170 L150,190 L130,220 L80,200 Z', cx: 115, cy: 195 },
    { id: 'laayoune', name: 'العيون الساقية الحمراء', path: 'M80,200 L130,220 L110,270 L60,250 Z', cx: 95, cy: 235 },
    { id: 'dakhla', name: 'الداخلة وادي الذهب', path: 'M60,250 L110,270 L90,330 L40,310 Z', cx: 75, cy: 290 },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 350 350" className="w-full h-auto drop-shadow-xl">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {regions.map((region) => {
          const isSelected = selectedRegion === region.name;
          const isHovered = hoveredRegion === region.id;
          
          return (
            <g 
              key={region.id}
              onClick={() => onSelectRegion(region.name)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className="cursor-pointer transition-all duration-300"
            >
              <path
                d={region.path}
                fill={isSelected ? '#0f2d62' : isHovered ? '#c37a1f' : '#e6dfcd'}
                stroke="white"
                strokeWidth="1"
                className="transition-colors duration-300"
              />
              <text
                x={region.cx}
                y={region.cy}
                textAnchor="middle"
                fill={isSelected || isHovered ? 'white' : '#0f2d62'}
                fontSize="8"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {region.name.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Tooltip for full name */}
      {hoveredRegion && (
        <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow text-sm font-bold text-[#0f2d62] border border-[#c5bfac]">
          {regions.find(r => r.id === hoveredRegion)?.name}
        </div>
      )}
    </div>
  );
};
