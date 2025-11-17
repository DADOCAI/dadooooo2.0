import { useState, useEffect } from "react";

interface ScrambleTextProps {
  children: string;
  delay?: number;
  speed?: number;
  className?: string;
}

export function ScrambleText({ children, delay = 0, speed = 30, className = "" }: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // 乱码字符集（包含中文、英文、数字、符号）
    const scrambleChars = "我你他她它们的是在有人这个那什么哪里怎样为什么一二三四五六七八九十abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    const getRandomChar = () => {
      return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    };

    const timeout = setTimeout(() => {
      let currentIndex = 0;
      const targetText = children;
      const scrambleFrames = 8; // 每个字符在变成正确字符前的乱码帧数
      
      const interval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          // 生成当前显示的文本
          let newText = "";
          
          for (let i = 0; i < targetText.length; i++) {
            if (i < currentIndex) {
              // 已经确定的字符
              newText += targetText[i];
            } else if (i < currentIndex + 3) {
              // 正在变化的字符（显示乱码）
              newText += getRandomChar();
            } else {
              // 还未开始变化的字符（显示乱码）
              newText += getRandomChar();
            }
          }
          
          setDisplayText(newText);
          
          // 每隔几帧推进一个字符
          if (Math.random() > 0.5) {
            currentIndex++;
          }
          
          if (currentIndex > targetText.length) {
            setDisplayText(targetText);
            setIsComplete(true);
            clearInterval(interval);
          }
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [children, delay, speed]);

  return <span className={className}>{displayText}</span>;
}
