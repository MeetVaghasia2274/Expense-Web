interface NumberPadProps {
  onKey: (key: string) => void;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

export default function NumberPad({ onKey }: NumberPadProps) {
  const handlePress = (key: string) => {
    if (navigator.vibrate) navigator.vibrate(8);
    onKey(key);
  };

  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {KEYS.map((key) => (
        <button
          key={key}
          className={`numpad-btn ${key === '⌫' ? 'text-text-secondary' : ''}`}
          onPointerDown={() => handlePress(key)}
          aria-label={key === '⌫' ? 'Backspace' : key}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
