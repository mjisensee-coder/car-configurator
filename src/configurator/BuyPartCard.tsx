import type { Part } from '@/types';

export function BuyPartCard({ part }: { part: Part }) {
  return (
    <a
      href={part.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gradient-to-br from-garage-800 to-garage-900 border border-garage-600 hover:border-accent rounded-xl p-4 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-garage-700 flex-shrink-0">
          <img
            src={part.image}
            alt={part.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-accent-gold font-semibold">
            {part.vendor}
          </div>
          <div className="font-semibold text-sm mt-0.5 line-clamp-2 leading-tight">
            {part.name}
          </div>
          <div className="text-xs text-garage-400 mt-1">{part.brand}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold">
            ${part.price.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-garage-300 line-clamp-1">{part.description}</span>
        <span className="text-accent group-hover:text-accent-hot ml-3 whitespace-nowrap font-semibold">
          Buy →
        </span>
      </div>
    </a>
  );
}
