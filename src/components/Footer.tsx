import { SocialTooltip } from './SocialTooltip';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-6 px-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <div className="text-sm text-gray-600">
          © 2025 dadoooo设计实验工作室
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-8">
          <SocialTooltip id="DADOOOO">
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              小红书
            </a>
          </SocialTooltip>
          <SocialTooltip id="DADOOOO">
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              抖音
            </a>
          </SocialTooltip>
          <SocialTooltip id="DADOOOO">
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              bilibili
            </a>
          </SocialTooltip>
        </div>

        {/* Contact */}
        <div>
          <SocialTooltip id="dadoooo@gmail.com">
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              合作联系
            </a>
          </SocialTooltip>
        </div>
      </div>
    </footer>
  );
}
