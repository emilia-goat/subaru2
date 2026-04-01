import { AppInfo } from '@/lib/os-store';

interface DesktopProps {
  apps: AppInfo[];
  onOpenApp: (appId: string) => void;
}

export function Desktop({ apps, onOpenApp }: DesktopProps) {
  const desktopApps = apps.filter(a => a.onDesktop);

  return (
    <div className="absolute inset-0 p-6 pt-8 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-4 content-start pointer-events-auto">
      {desktopApps.map(app => (
        <button
          key={app.id}
          onClick={() => onOpenApp(app.id)}
          className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 hover:bg-secondary/40 active:scale-95 group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{app.icon}</span>
          <span className="text-xs text-secondary-foreground truncate max-w-[64px]">{app.name}</span>
        </button>
      ))}
    </div>
  );
}
