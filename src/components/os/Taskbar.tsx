import { useState, useEffect } from 'react';

export function Taskbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const fmt = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed top-0 left-0 right-0 h-7 z-50 flex items-center justify-between px-4 text-xs font-medium"
      style={{ background: 'hsla(var(--os-taskbar), 0.85)', backdropFilter: 'blur(12px)' }}>
      <span className="text-foreground font-semibold">Koma OS</span>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{date}</span>
        <span className="text-foreground">{fmt}</span>
      </div>
    </div>
  );
}
