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
  const addGroup = useStore((s) => s.addGroup);
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
    onSelect(newGroup.id);
  };

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {allGroups.map((group) => {
          const isSelected = selected === group.id;
          return (
            <button
              key={group.id}
              className={`group-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(group.id)}
            >
              <span>{group.emoji}</span>
              <span>{group.label}</span>
            </button>
          );
        })}

        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              onBlur={() => !newLabel && setIsAdding(false)}
              placeholder="Group name..."
              className="bg-bg-tertiary border border-accent/30 rounded-full px-4 py-2 text-[13px] text-text-primary outline-none min-w-[120px]"
            />
            <button
              onClick={handleAdd}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-accent text-bg-primary text-sm font-bold"
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            className="group-chip opacity-70 border-dashed border-border"
            onClick={() => setIsAdding(true)}
          >
            <span>＋</span>
            <span>New Group</span>
          </button>
        )}
      </div>
    </div>
  );
}
