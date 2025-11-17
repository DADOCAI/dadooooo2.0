import { ArrowUpRight, Plus } from "lucide-react@0.487.0";
import { useState } from "react";
import logoDefault from 'figma:asset/cb7518acee88e4f203be6734e15429ff9c58e4e1.png';
import logoHover from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';
import { FeedbackDialog } from "./FeedbackDialog";
import { useAuth } from "../contexts/AuthContext";

interface ToolPanelProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  link?: string;
  category?: string;
  inverted?: boolean;
  locked?: boolean;
  toolLabel?: string; // 底部显示的工具名称
  introduction?: string; // 工具介绍文案
  descriptionImage?: string; // 左上角显示的描述图片
  publicAccess?: boolean; // 允许免登录访问
}

export function ToolPanel({
  title,
  description,
  image,
  imageAlt,
  link,
  category,
  inverted = false,
  locked = false,
  toolLabel,
  introduction,
  descriptionImage,
  publicAccess = false,
}: ToolPanelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isLoggedIn, setShowLoginDialog } = useAuth();

  const handleClick = (e: React.MouseEvent) => {
    if (!locked && !isLoggedIn && !publicAccess) {
      e.preventDefault();
      setShowLoginDialog(true);
    }
  };

  const Component = locked ? 'div' : 'a';

  // 如果是锁定状态，只显示加号
  if (locked) {
    const [isFeedbackHovered, setIsFeedbackHovered] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    
    return (
      <>
        <div
          onMouseEnter={() => setIsFeedbackHovered(true)}
          onMouseLeave={() => setIsFeedbackHovered(false)}
          className={`group relative h-[75vh] flex flex-col overflow-hidden transition-all duration-300 ${
            inverted ? "bg-black" : "bg-white"
          } cursor-pointer`}
          onClick={() => setIsFeedbackOpen(true)}
        >
          {/* Centered Plus Icon */}
          <div className="flex-1 flex items-center justify-center relative">
            <Plus
              size={80}
              strokeWidth={1}
              className={`${inverted ? "text-white/40" : "text-black/40"} transition-transform duration-500 ${
                isFeedbackHovered ? "rotate-180" : ""
              }`}
            />
            
            {/* Feedback Tooltip - Positioned absolutely below the plus icon */}
            {isFeedbackHovered && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 bg-white border-2 border-blue-500 rounded-none px-6 py-3 shadow-lg pointer-events-none">
                <p className="text-black whitespace-nowrap">点击反馈意见</p>
              </div>
            )}
          </div>
        </div>
        
        <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
      </>
    );
  }

  return (
    <div 
      className="flex flex-col relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        outline: isHovered ? '1px solid #3b82f6' : 'none',
      }}
    >
      <Component
        {...(!locked && { href: link })}
        className={`group relative h-[75vh] flex flex-col overflow-hidden transition-all duration-300 ${
          inverted ? "bg-black" : "bg-white"
        }`}
        onClick={handleClick}
      >
        {/* Image Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Base Image */}
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Alternative Image - Revealed by scan line */}
          <div
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              clipPath: isHovered ? 'inset(0 0 50% 0)' : 'inset(0 0 100% 0)',
            }}
          >
            <img
              src={imageAlt}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Scanning Line - Simple blue line with subtle glow */}
          <div
            className="absolute inset-x-0 h-0.5 pointer-events-none transition-all duration-700 ease-out"
            style={{
              top: isHovered ? '50%' : '0%',
              background: '#3b82f6',
              boxShadow: isHovered ? '0 0 20px 4px rgba(59, 130, 246, 0.6)' : 'none',
              opacity: isHovered ? 1 : 0,
            }}
          />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 pointer-events-none">
          <ArrowUpRight
            size={20}
            className={`absolute top-8 right-8 ${
              inverted ? "text-white/40" : "text-black/40"
            } group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300`}
          />
        </div>
      </Component>

      {/* Logo and Tool Label Section */}
      {toolLabel && (
        <div className="pt-3 pb-8 bg-white">
          <div className="flex flex-col items-start gap-2">
            <img
              src={isHovered ? logoHover : logoDefault}
              alt="dado logo"
              className={`h-14 object-contain ${
                isHovered ? "animate-flicker" : ""
              }`}
            />
            <h1 className="text-black px-[1px] mx-[0px] my-[-25px] px-[6px] py-[0px]">
              {toolLabel}
            </h1>
          </div>
        </div>
      )}
      
      {/* Introduction Text - Blue border white background */}
      {introduction && (
        <div 
          className="absolute top-0 h-full flex items-start pt-12 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: 1,
            right: inverted ? 'auto' : 'calc(100% + 3rem)',
            left: inverted ? 'auto' : 'auto',
            transform: inverted ? 'translateX(calc(-100% - 3rem))' : 'none',
          }}
        >
          <div 
            className="max-w-xs"
            style={{
              backgroundColor: 'white',
              border: '1px solid #3b82f6',
              padding: '1rem 1.25rem',
            }}
          >
            <p style={{ 
              fontFamily: "'Courier New', 'STKaiti', 'KaiTi', monospace",
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: '1.6',
              letterSpacing: '0.02em',
              color: '#000',
              margin: 0,
            }}>
              {introduction}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}