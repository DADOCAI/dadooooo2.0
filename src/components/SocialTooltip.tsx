import { useState } from 'react';

interface SocialTooltipProps {
  children: React.ReactNode;
  id: string;
}

export function SocialTooltip({ children, id }: SocialTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-blue-500 pointer-events-none whitespace-nowrap z-50">
          <span className="text-sm text-black">{id}</span>
        </div>
      )}
    </div>
  );
}
