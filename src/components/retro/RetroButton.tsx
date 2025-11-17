import React, { useState } from "react";

interface RetroButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function RetroButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: RetroButtonProps) {
  const [isClicking, setIsClicking] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 300);
    onClick?.();
  };

  return (
    <button
      className={`btn ${isClicking ? "clickyblinky" : ""} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      style={{ paddingLeft: "12px", paddingRight: "12px" }}
    >
      {children}
    </button>
  );
}