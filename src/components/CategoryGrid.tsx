import type { Category } from '../types/expense';
import { CATEGORY_META } from '../types/expense';

interface CategoryGridProps {
  selected: Category;
  onSelect: (c: Category) => void;
}

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {CATEGORIES.map((cat) => {
        const { label, emoji, color } = CATEGORY_META[cat];
        const isSelected = selected === cat;
        return (
          <button
            key={cat}
            className={`cat-btn ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(cat)}
            aria-pressed={isSelected}
            aria-label={label}
          >
            <span
              className="cat-emoji"
              style={{ background: isSelected ? color : undefined }}
            >
              {emoji}
            </span>
            <span className="cat-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
