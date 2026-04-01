import { AppInfo } from '@/lib/os-store';

interface AppContainerProps {
  apps: AppInfo[];
  isOpen: boolean;
  onClose: () => void;
  onOpenApp: (appId: string) => void;
  onMoveToDock: (appId: string) => void;
  onMoveToDesktop: (appId: string) => void;
}

export function AppContainer({ apps, isOpen, onClose, onOpenApp, onMoveToDock, onMoveToDesktop }: AppContainerProps) {
  const containerApps = apps.filter(a => a.inContainer);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[90vw] max-w-lg max-h-[70vh] rounded-2xl os-window-glass p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-foreground">App Container</h2>
        <div className="grid grid-cols-4 gap-4">
          {containerApps.map(app => (
            <div key={app.id} className="flex flex-col items-center gap-1 group relative">
              <button
                onClick={() => { onOpenApp(app.id); onClose(); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 hover:bg-secondary/50 active:scale-95 w-full"
              >
                <span className="text-3xl">{app.icon}</span>
                <span className="text-xs text-secondary-foreground truncate max-w-[64px]">{app.name}</span>
              </button>
              <div className="absolute -top-1 -right-1 hidden group-hover:flex flex-col gap-0.5 bg-popover rounded-lg p-1 shadow-lg border border-border text-[10px]">
                {!app.inDock && (
                  <button onClick={() => onMoveToDock(app.id)} className="px-2 py-0.5 hover:bg-secondary rounded text-foreground whitespace-nowrap">
                    → Dock
                  </button>
                )}
                {!app.onDesktop && (
                  <button onClick={() => onMoveToDesktop(app.id)} className="px-2 py-0.5 hover:bg-secondary rounded text-foreground whitespace-nowrap">
                    → Desktop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
