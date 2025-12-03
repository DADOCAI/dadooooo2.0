import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConversionOptions, CHARACTER_SETS } from '../utils/imageToAscii';

interface ControlPanelProps {
  options: ConversionOptions;
  onOptionsChange: (options: Partial<ConversionOptions>) => void;
  isProcessing?: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const CHARSET_OPTIONS = [
  { name: '标准', key: 'standard', preview: '@%#*+' },
  { name: '标准反转', key: 'standard-reverse', preview: ' .:-%' },
  { name: '详细', key: 'detailed', preview: '$@B%8&WM#*' },
  { name: '简单', key: 'simple', preview: '@O:.' },
  { name: '极简', key: 'minimal', preview: 'Oo.' },
  { name: '10级灰度', key: '10-levels', preview: '@%#*+=-:' },
  { name: '70级灰度', key: '70-levels', preview: '$@B%8&WM#*oahkbdpq' },
];

export function ControlPanel({ options, onOptionsChange, isProcessing, fontSize, onFontSizeChange }: ControlPanelProps) {
  const getCurrentCharsetKey = () => {
    const entry = Object.entries(CHARACTER_SETS).find(([_, value]) => value === options.charset);
    return entry ? entry[0] : 'standard-reverse';
  };

  const getCurrentCharsetOption = () => {
    return CHARSET_OPTIONS.find(opt => opt.key === getCurrentCharsetKey());
  };

  return (
    <div className="space-y-6">
      {/* Width Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="width" className="text-black text-sm">
            宽度
          </Label>
          <span className="text-neutral-500 text-sm">
            {options.width}
          </span>
        </div>
        <Slider
          id="width"
          min={40}
          max={200}
          step={10}
          value={[options.width]}
          onValueChange={(value) => onOptionsChange({ width: value[0] })}
          className="w-full"
          disabled={isProcessing}
        />
      </div>

      {/* Font Size Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="fontSize" className="text-black text-sm">
            字体大小
          </Label>
          <span className="text-neutral-500 text-sm">
            {fontSize}px
          </span>
        </div>
        <Slider
          id="fontSize"
          min={6}
          max={50}
          step={1}
          value={[fontSize]}
          onValueChange={(value) => onFontSizeChange(value[0])}
          className="w-full"
          disabled={isProcessing}
        />
      </div>

      {/* Character Set Selection */}
      <div className="space-y-2">
        <Label className="text-black text-sm">字符集</Label>
        
        <Select 
          value={getCurrentCharsetKey()}
          onValueChange={(key) => {
            const charset = CHARACTER_SETS[key as keyof typeof CHARACTER_SETS];
            if (charset) {
              onOptionsChange({ charset });
            }
          }}
          disabled={isProcessing}
        >
          <SelectTrigger className="bg-white border-neutral-300 text-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-neutral-200">
            {CHARSET_OPTIONS.map((option) => (
              <SelectItem 
                key={option.key} 
                value={option.key}
                className="text-black focus:bg-neutral-100"
              >
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Colored Switch */}
      <div className="flex items-center justify-between py-2 border-t border-neutral-200">
        <Label htmlFor="colored" className="text-black text-sm">
          彩色
        </Label>
        <Switch
          id="colored"
          checked={options.colored}
          onCheckedChange={(checked) => onOptionsChange({ colored: checked })}
          disabled={isProcessing}
        />
      </div>

      {/* Background Selection (only visible when colored) */}
      {options.colored && (
        <div className="space-y-2">
          <Label className="text-black text-sm">背景</Label>
          <Select 
            value={options.background}
            onValueChange={(value: 'white' | 'black') => onOptionsChange({ background: value })}
            disabled={isProcessing}
          >
            <SelectTrigger className="bg-white border-neutral-300 text-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-neutral-200">
              <SelectItem value="black" className="text-black focus:bg-neutral-100">
                黑色
              </SelectItem>
              <SelectItem value="white" className="text-black focus:bg-neutral-100">
                白色
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Invert Switch */}
      <div className="flex items-center justify-between py-2 border-t border-neutral-200">
        <Label htmlFor="invert" className="text-black text-sm">
          反转
        </Label>
        <Switch
          id="invert"
          checked={options.invert}
          onCheckedChange={(checked) => onOptionsChange({ invert: checked })}
          disabled={isProcessing}
        />
      </div>

      {/* Pixel Mode Switch */}
      <div className="flex items-center justify-between py-2 border-t border-neutral-200">
        <Label htmlFor="pixelMode" className="text-black text-sm">
          像素模式
        </Label>
        <Switch
          id="pixelMode"
          checked={options.pixelMode}
          onCheckedChange={(checked) => onOptionsChange({ pixelMode: checked })}
          disabled={isProcessing}
        />
      </div>

      {/* Show Characters Switch (only visible when pixelMode is enabled) */}
      {options.pixelMode && (
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="showCharacters" className="text-black text-sm">
            显示字符
          </Label>
          <Switch
            id="showCharacters"
            checked={options.showCharacters}
            onCheckedChange={(checked) => onOptionsChange({ showCharacters: checked })}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-6 mt-6 border-t border-neutral-200 space-y-3 text-center">
        <p className="text-xs text-black font-[Alfa_Slab_One] text-[20px]">
          dadoooo · 个人原创开发的 ASCII 生成器
        </p>
        <p className="text-xs text-neutral-500 leading-relaxed">
          生成的内容可自由用于个人或商业用途，纯为爱发电，此功能完全免费。
        </p>
        <p className="text-xs text-neutral-500 leading-relaxed">
          之前提前使用过我这个网站的朋友可能发现少了些功能，为了流畅性我做了个简化，后续可能会更新回来，更新咨询可全平台关注：@大荳
        </p>
        <p className="text-xs text-neutral-400 text-[10px] copyright-note">
          © 2025 dadoooo. All rights reserved.
        </p>
      </div>
    </div>
  );
}
