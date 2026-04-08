import { useRef } from 'react';

export default function PinInput({ value, onChange, label }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (idx, e) => {
    const digit = e.target.value.replace(/\D/, '').slice(-1);
    const arr = value.split('');
    arr[idx] = digit;
    const newVal = arr.join('');
    onChange(newVal);
    if (digit && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  return (
    <div className="input-wrap">
      {label && <label className="input-label">{label}</label>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map(i => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="input-field"
            style={{ width: 60, textAlign: 'center', fontSize: 22, padding: 10 }}
          />
        ))}
      </div>
    </div>
  );
}
