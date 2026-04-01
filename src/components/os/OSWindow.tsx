import { useState, useRef, useEffect, ReactNode } from 'react';

interface OSWindowProps {
  appId: string;
  title: string;
  icon: string;
  children: ReactNode;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

export function OSWindow({ title, icon, children, onClose, zIndex = 30, onFocus }: OSWindowProps) {
  const [pos, setPos] = useState({ x: 80 + Math.random() * 60, y: 40 + Math.random() * 40 });
  const [size, setSize] = useState({ w: 480, h: 400 });
  const [maximized, setMaximized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (maximized) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    onFocus?.();
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const style = maximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 64px)', zIndex }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex };

  return (
    <div
      className="fixed os-window-glass rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={style}
      onMouseDown={onFocus}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-move select-none shrink-0"
        style={{ background: 'hsla(var(--os-window-titlebar), 0.8)' }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-destructive hover:brightness-110 transition-all active:scale-90" />
          <button onClick={() => setMaximized(!maximized)} className="w-3 h-3 rounded-full bg-os-warning hover:brightness-110 transition-all active:scale-90" />
          <button onClick={() => setMaximized(!maximized)} className="w-3 h-3 rounded-full bg-os-success hover:brightness-110 transition-all active:scale-90" />
        </div>
        <span className="ml-2 text-sm font-medium text-foreground flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
}
