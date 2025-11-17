import { useEffect, useState } from "react";
import screensaverLogo from "figma:asset/99bca8763491dfc4ff7182708980d6155b86f39f.png";

interface ScreensaverProps {
  onExit: () => void;
}

export function Screensaver({ onExit }: ScreensaverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleExit = () => {
    // Wait a bit before starting the flicker animation
    setTimeout(() => {
      setIsExiting(true);
      // Wait for flicker animation to complete before actually exiting
      setTimeout(() => {
        onExit();
      }, 600); // Match the flicker animation duration
    }, 500); // Initial delay before flicker starts
  };

  return (
    <div
      onClick={handleExit}
      onMouseMove={handleExit}
      onKeyDown={handleExit}
      className={`fixed inset-0 z-[100] bg-transparent cursor-pointer flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      tabIndex={0}
    >
      {/* Rotating Logo - 70% of viewport */}
      <img 
        src={screensaverLogo} 
        alt="dadoooo" 
        className={`w-[70vw] h-[70vh] object-contain animate-spin-slow ${
          isExiting ? 'animate-flicker-exit' : ''
        }`}
      />
    </div>
  );
}
