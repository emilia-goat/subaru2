import { AppInfo } from '@/lib/os-store';

interface DockProps {
  apps: AppInfo[];
  dockAppIds: string[];
  openWindows: string[];
  onOpenApp: (appId: string) => void;
  onShowContainer: () => void;
}

export function Dock({ apps, dockAppIds, openWindows, onOpenApp, onShowContainer }: DockProps) {
  const dockApps = dockAppIds.map(id => apps.find(a => a.id === id)).filter(Boolean) as AppInfo[];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-end gap-1.5 px-3 py-2 rounded-2xl os-glass">
      {dockApps.map(app => (
        <button
          key={app.id}
          onClick={() => onOpenApp(app.id)}
          className="os-dock-icon relative"
          title={app.name}
        >
          <span className="text-2xl">{app.icon}</span>
          {openWindows.includes(app.id) && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
          )}
        </button>
      ))}
      <div className="w-px h-8 bg-border mx-1" />
      <button
        onClick={onShowContainer}
        className="os-dock-icon"
        title="App Container"
      >
        <span className="text-2xl">📦</span>
      </button>
    </div>
  );
}
