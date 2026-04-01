// Central OS state management using localStorage
export interface AppInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  inDock: boolean;
  inContainer: boolean;
  onDesktop: boolean;
}

export interface OSState {
  privacyShieldEnabled: boolean;
  privacyLabInstalled: boolean;
  shieldSettings: {
    sensitivity: number; // 1-10, wider sweet spot
    stealthLevel: number; // 70-100, max darkness %
    fadeSpeed: number; // 100-800ms
  };
  apps: AppInfo[];
  dockApps: string[]; // app ids
  openWindows: string[];
}

const DEFAULT_APPS: AppInfo[] = [
  { id: 'settings', name: 'Settings', icon: '⚙️', color: 'hsl(220, 14%, 18%)', inDock: true, inContainer: true, onDesktop: false },
  { id: 'files', name: 'Files', icon: '📁', color: 'hsl(38, 92%, 50%)', inDock: true, inContainer: true, onDesktop: false },
  { id: 'terminal', name: 'Terminal', icon: '💻', color: 'hsl(142, 71%, 25%)', inDock: false, inContainer: true, onDesktop: false },
  { id: 'notes', name: 'Notes', icon: '📝', color: 'hsl(48, 96%, 53%)', inDock: false, inContainer: true, onDesktop: false },
  { id: 'calculator', name: 'Calculator', icon: '🧮', color: 'hsl(220, 14%, 22%)', inDock: false, inContainer: true, onDesktop: false },
];

const STORAGE_KEY = 'koma-os-state';

const defaultState: OSState = {
  privacyShieldEnabled: false,
  privacyLabInstalled: false,
  shieldSettings: {
    sensitivity: 5,
    stealthLevel: 98,
    fadeSpeed: 300,
  },
  apps: DEFAULT_APPS,
  dockApps: ['settings', 'files'],
  openWindows: [],
};

export function loadOSState(): OSState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    }
  } catch {}
  return { ...defaultState };
}

export function saveOSState(state: OSState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
