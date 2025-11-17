import { ToolPanel } from "../components/ToolPanel";
import { Screensaver } from "../components/Screensaver";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { Footer } from "../components/Footer";
import typographyImageBase from "../assets/2145e4efd90b06389836e8206ea66f0e40b20e89.png";
import typographyImageBottom from "../assets/9b8d462bb3544bd7ef5f797be7a968ee6c2eda42.png";
import descImage1 from "../assets/7fd55fee59adc5ceaca1c31865f690922447bf76.png";
import descImage2 from "../assets/3ed8b5352fb2066355c1895f695944a1dced2481.png";
import descImage3 from "../assets/8b9fbaef1a71956d0db80a0007c6ccf3f3893e43.png";
import asciiImageBase from "../assets/bba6a9687c6d644288066d1084237b1ececafad3.png";
import asciiImageBottom from "../assets/91aee102210cafb0c5c3f330318b2b5fd924f119.png";
import dotImageBase from "../assets/d00858fed7cf9defbd0e685ee5f86d56bcdc1450.png";
import dotImageBottom from "../assets/7ce6739730ad3f4c57fa92356c5f56358470f9e9.png";

const tools = [
  {
    id: 1,
    title: "字体配对工具",
    description:
      "快速找到完美的字体组合，提升你的设计品质。提供实时预览和智能推荐。",
    image: typographyImageBase,
    imageAlt: typographyImageBottom,
    category: "TYPOGRAPHY",
    link: "/cutout",
    descriptionImage: descImage1,
  },
  {
    id: 2,
    title: "调色板生成器",
    description:
      "基于色彩理论生成和谐的配色方案，支持导出多种格式，适配各种设计工具。",
    image: dotImageBase,
    imageAlt: dotImageBottom,
    category: "COLOR",
    link: "/halftone",
    descriptionImage: descImage2,
  },
  {
    id: 3,
    title: "网格系统计算器",
    description:
      "精确计算网格尺寸和间距，让你的布局更加专业和规范，支持响应式设计。",
    image: asciiImageBase,
    imageAlt: asciiImageBottom,
    category: "LAYOUT",
    descriptionImage: descImage3,
    link: "/ascii",
  },
];

export function Home() {
  // 30秒无操作后进入待机模式
  const { isIdle, resetTimer } = useIdleTimer(30000);
  console.log('home mount')

  return (
    <>
      {/* Screensaver */}
      {isIdle && <Screensaver onExit={resetTimer} />}

      {/* Tools Grid - Left/Right Split Layout */}
      <main className="pt-32 px-8 pb-8">
        <div className="max-w-6xl mx-auto px-8 lg:px-0 overflow-visible">
          {/* First Row - 50/50 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="w-full max-w-[460px] lg:ml-12 relative group">
              {/* Description Image - Positioned outside on the left */}
              {tools[0].descriptionImage && (
                <div className="absolute top-0 left-[-260px] w-[240px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <img
                    src={tools[0].descriptionImage}
                    alt="Tool description"
                    className="w-full h-auto group-hover:animate-border-blink"
                    style={{ boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </div>
              )}
              <ToolPanel
                title={tools[0].title}
                description={tools[0].description}
                image={tools[0].image}
                imageAlt={tools[0].imageAlt}
                category={tools[0].category}
                link={tools[0].link}
                inverted={true}
                publicAccess={true}
                toolLabel="抠图智能化工具"
              />
            </div>
            <div className="lg:translate-x-[calc((100vw-1280px)/2+1280px/2-50%-20rem)] w-full max-w-[460px] relative group">
              {/* Description Image - Positioned outside on the left */}
              {tools[1].descriptionImage && (
                <div className="absolute top-0 left-[-260px] w-[240px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <img
                    src={tools[1].descriptionImage}
                    alt="Tool description"
                    className="w-full h-auto group-hover:animate-border-blink"
                    style={{ boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </div>
              )}
              <ToolPanel
                title={tools[1].title}
                description={tools[1].description}
                image={tools[1].image}
                imageAlt={tools[1].imageAlt}
                category={tools[1].category}
                link={tools[1].link}
                inverted={false}
                toolLabel="点状效果生成工具"
              />
            </div>
          </div>

          {/* Second Row - 50/50 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-8">
            <div className="w-full max-w-[460px] lg:ml-12 relative group">
              {/* Description Image - Positioned outside on the left */}
              {tools[2].descriptionImage && (
                <div className="absolute top-0 left-[-260px] w-[240px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <img
                    src={tools[2].descriptionImage}
                    alt="Tool description"
                    className="w-full h-auto group-hover:animate-border-blink"
                    style={{ boxShadow: '0 0 0 1px #3b82f6' }}
                  />
                </div>
              )}
              <ToolPanel
                title={tools[2].title}
                description={tools[2].description}
                image={tools[2].image}
                imageAlt={tools[2].imageAlt}
                category={tools[2].category}
                link={tools[2].link}
                inverted={true}
                toolLabel="ASCII效果生成器"
              />
            </div>
            <div className="lg:translate-x-[calc((100vw-1280px)/2+1280px/2-50%-20rem)] w-full max-w-[460px]">
              <ToolPanel inverted={false} locked={true} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
