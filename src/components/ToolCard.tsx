import { ArrowUpRight } from "lucide-react@0.487.0";

interface ToolCardProps {
  title: string;
  description: string;
  image: string;
  link: string;
  category: string;
}

export function ToolCard({ title, description, image, link, category }: ToolCardProps) {
  return (
    <a
      href={link}
      className="group block"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-gray-50 mb-8">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="uppercase tracking-[0.2em] text-xs text-gray-400">
            {category}
          </div>
          <ArrowUpRight 
            size={18} 
            className="text-gray-300 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 flex-shrink-0" 
          />
        </div>
        
        <h3 className="text-black">
          {title}
        </h3>
        
        <p className="text-gray-500 leading-relaxed">
          {description}
        </p>
      </div>
    </a>
  );
}
