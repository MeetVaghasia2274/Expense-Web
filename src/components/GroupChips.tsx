import { useState } from 'react';
import { useStore } from '../lib/store';
import { SYSTEM_GROUPS } from '../types/expense';
import type { Group, CustomGroup } from '../types/expense';

interface GroupChipsProps {
  selected: Group;
  onSelect: (g: Group) => void;
}

export default function GroupChips({ selected, onSelect }: GroupChipsProps) {
  const customGroups = useStore((s) => s.customGroups);
  const addGroup     = useStore((s) => s.addGroup);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const allGroups = [...SYSTEM_GROUPS, ...customGroups];

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      setIsAdding(false);
      return;
    }
    const id = newLabel.toLowerCase().replace(/\s+/g, '-');
    const newGroup: CustomGroup = {
      id,
      label: newLabel.trim(),
      emoji: '✨', // Default emoji for custom groups
    };
    await addGroup(newGroup);
    setNewLabel('');
    setIsAdding(false);
    onSelect(id);
  };

  return (
    <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar items-center">
      {allGroups.map((group) => {
        const isSelected = selected === group.id;
        return (
          <button
            key={group.id}
            className={`payment-chip ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(group.id)}
            aria-pressed={isSelected}
            aria-label={group.label}
          >
            <span>{group.emoji}</span>
            <span>{group.label}</span>
          </button>
        );
      })}

      {isAdding ? (
        <div className="flex items-center gap-2 bg-bg-tertiary rounded-full px-3 py-1.5 border border-accent">
          <input
            autoFocus
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Group name"
            className="bg-transparent outline-none text-[13px] w-24 text-text-primary"
          />
        </div>
      ) : (
        <button
          className="payment-chip border-dashed"
          onClick={() => setIsAdding(true)}
          aria-label="Add custom group"
        >
          <span>＋</span>
          <span>New</span>
        </button>
      )}
    </div>
  );
}
