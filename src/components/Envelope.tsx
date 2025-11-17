import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrambleText } from "./ScrambleText";

export function Envelope() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="relative">
        {/* Invite 手写体文字 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute -top-44 left-1/2 -translate-x-1/2"
              style={{ fontFamily: "'Kunstler Script', 'Dancing Script', cursive", fontSize: "120px", color: "#3b82f6" }}
            >
              Invite
            </motion.div>
          )}
        </AnimatePresence>

        {/* 信封主体 */}
        <motion.div
          className="relative cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            width="480"
            height="320"
            viewBox="0 0 480 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 信封背面 */}
            <rect
              x="1"
              y="1"
              width="478"
              height="318"
              fill="white"
              stroke="#3b82f6"
              strokeWidth="1"
            />
            
            {/* 信封内部阴影线 */}
            <line x1="1" y1="1" x2="240" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
            <line x1="479" y1="1" x2="240" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
            
            {/* 信封顶盖 - 根据状态旋转 */}
            <motion.g
              animate={isOpen ? { rotateX: 180 } : { rotateX: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ originX: "240px", originY: "1px" }}
            >
              <polygon
                points="1,1 240,160 479,1"
                fill="white"
                stroke="#3b82f6"
                strokeWidth="1"
              />
              <line x1="1" y1="1" x2="240" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5" />
              <line x1="479" y1="1" x2="240" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5" />
            </motion.g>

            {/* 信封封口线 */}
            <motion.line
              x1="1"
              y1="1"
              x2="479"
              y2="1"
              stroke="#3b82f6"
              strokeWidth="1"
              animate={isOpen ? { opacity: 0.3 } : { opacity: 1 }}
            />
          </svg>
        </motion.div>

        {/* 纸张 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ y: 0, opacity: 0, scale: 0.8 }}
              animate={{ y: -220, opacity: 1, scale: 1 }}
              exit={{ y: 0, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2"
              style={{ zIndex: 10 }}
            >
              <svg
                width="520"
                height="640"
                viewBox="0 0 520 640"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 纸张背景 */}
                <rect
                  x="1"
                  y="1"
                  width="518"
                  height="638"
                  fill="white"
                  stroke="#3b82f6"
                  strokeWidth="1"
                />
                
                {/* 信件内容 */}
                <foreignObject x="40" y="40" width="440" height="560">
                  <div className="p-6 h-full flex flex-col justify-start text-gray-800" style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: "13px", lineHeight: "1.6" }}>
                    <p className="mb-4">
                      <ScrambleText delay={300} speed={30}>
                        这是一个由创意驱动的「设计师开放实验室」。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={500} speed={25}>
                        我们深知，审美不应该被市场支配。因此，这里没有强制需求，也没有边界。我们邀请每一位创作者，以"云股东"的身份加入，贡献灵感、工具、作品与想法，共同建设一个可以自由创作、学习、展示的全新设计生态。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={800} speed={25}>
                        无论你是设计师、开发者、摄影师，还是单纯热爱视觉表达的灵魂，都可以在这里留下属于你的痕迹。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-3">
                      <ScrambleText delay={1100} speed={20}>
                        【一个共同的挑战】
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={1300} speed={25}>
                        然而，要打造一个由创作者主导的开放生态，其持续高效运转需要高昂的算力与维护。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={1500} speed={25}>
                        这是我们共同的挑战。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={1700} speed={25}>
                        我们相信，这个值得我们共同守护的生态，不应因现实成本而夭折。您的任何贡献，无论是无价的创意、实用的代码，或是对平台可持续性的支持，都将直接投入到实验室的持续升级中。
                      </ScrambleText>
                    </p>
                    
                    <p className="mb-4">
                      <ScrambleText delay={2000} speed={25}>
                        这是一个由我们共同编织的作品集，也是一场关于未来视觉语言的集体创作。
                      </ScrambleText>
                    </p>
                    
                    <p>
                      <ScrambleText delay={2200} speed={25}>
                        欢迎加入——成为我们的云股东，一起创造更有温度、能够持续迭代的设计世界。
                      </ScrambleText>
                    </p>
                  </div>
                </foreignObject>
                
                {/* 右下角关闭三角形 */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="cursor-pointer"
                  style={{ transition: "opacity 0.2s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <polygon
                    points="470,590 520,590 520,640"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    strokeWidth="1"
                  />
                </g>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 提示文字 */}
        {!isOpen && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-gray-500"
          >
            给各位"云股东"的一封信
          </motion.p>
        )}
      </div>
    </div>
  );
}