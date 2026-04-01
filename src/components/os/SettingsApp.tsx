import { useState } from 'react';
import { OSState } from '@/lib/os-store';

interface SettingsAppProps {
  state: OSState;
  onTogglePrivacyShield: (enabled: boolean) => void;
}

type SettingsTab = 'general' | 'privacy' | 'display' | 'about';

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'privacy', label: 'Privacy', icon: '🛡️' },
  { id: 'display', label: 'Display', icon: '🎨' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

export function SettingsApp({ state, onTogglePrivacyShield }: SettingsAppProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="flex h-full -m-4">
      {/* Sidebar */}
      <div
        className="w-[140px] shrink-0 border-r border-border/50 p-2 flex flex-col gap-0.5"
        style={{ background: 'hsla(var(--secondary), 0.3)' }}
      >
        <div className="px-2 py-3 mb-1">
          <h3 className="text-xs font-bold text-foreground tracking-wide uppercase opacity-60">Settings</h3>
        </div>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'privacy' && (
          <PrivacyTab state={state} onTogglePrivacyShield={onTogglePrivacyShield} />
        )}
        {activeTab === 'display' && <DisplayTab />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
}

/* ── General ─────────────────────────────────── */
function GeneralTab() {
  return (
    <div className="space-y-5">
      <SectionHeader title="General" subtitle="System preferences and configuration" />

      <SettingsCard>
        <SettingsRow label="Language" description="Interface language">
          <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">Auto (System)</span>
        </SettingsRow>
        <Divider />
        <SettingsRow label="Notifications" description="Enable system notifications">
          <ToggleSwitch defaultChecked />
        </SettingsRow>
        <Divider />
        <SettingsRow label="Sounds" description="Play UI feedback sounds">
          <ToggleSwitch defaultChecked />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow label="Storage" description="Local data usage">
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary/70 w-[15%]" />
            </div>
            <span className="text-[10px] text-muted-foreground">15%</span>
          </div>
        </SettingsRow>
        <Divider />
        <SettingsRow label="Clear Cache" description="Remove temporary files">
          <button className="text-[11px] font-medium text-destructive hover:underline">Clear</button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

/* ── Privacy ─────────────────────────────────── */
function PrivacyTab({ state, onTogglePrivacyShield }: { state: OSState; onTogglePrivacyShield: (v: boolean) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Privacy & Security" subtitle="Control your privacy shield and data" />

      <SettingsCard highlight={state.privacyShieldEnabled}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: state.privacyShieldEnabled ? 'hsla(142, 71%, 45%, 0.15)' : 'hsla(var(--muted), 0.6)' }}>
              🛡️
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Privacy Shield</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Uses device orientation to hide screen content when the phone is tilted away from you
              </p>
              {state.privacyShieldEnabled && state.privacyLabInstalled && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-os-success animate-pulse" />
                  <span className="text-[10px] text-os-success font-medium">Active — Privacy Lab in your Dock</span>
                </div>
              )}
            </div>
          </div>
          <ToggleSwitch checked={state.privacyShieldEnabled} onChange={(v) => onTogglePrivacyShield(v)} />
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow label="Lock Screen" description="Require unlock after inactivity">
          <ToggleSwitch />
        </SettingsRow>
        <Divider />
        <SettingsRow label="Private Browsing" description="Don't save browsing history">
          <ToggleSwitch />
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

/* ── Display ─────────────────────────────────── */
function DisplayTab() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Display" subtitle="Appearance and visual preferences" />

      <SettingsCard>
        <SettingsRow label="Theme" description="Choose your interface theme">
          <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">Dark</span>
        </SettingsRow>
        <Divider />
        <SettingsRow label="Blur Effects" description="Glassmorphism transparency effects">
          <ToggleSwitch defaultChecked />
        </SettingsRow>
        <Divider />
        <SettingsRow label="Animations" description="Enable motion and transitions">
          <ToggleSwitch defaultChecked />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow label="Font Size" description="Interface text scaling">
          <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">Default</span>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

/* ── About ───────────────────────────────────── */
function AboutTab() {
  return (
    <div className="space-y-5">
      <SectionHeader title="About" subtitle="System information" />

      <SettingsCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl shadow-inner">
            🖥️
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Koma OS</h4>
            <p className="text-[11px] text-muted-foreground">Beta v6.4</p>
          </div>
        </div>
        <Divider />
        <div className="grid grid-cols-2 gap-y-2.5 mt-3 text-[11px]">
          <span className="text-muted-foreground">Kernel</span>
          <span className="text-foreground font-medium text-right">KomaKernel 2.1</span>
          <span className="text-muted-foreground">Memory</span>
          <span className="text-foreground font-medium text-right">128 MB Simulated</span>
          <span className="text-muted-foreground">Runtime</span>
          <span className="text-foreground font-medium text-right">WebKit / Chromium</span>
          <span className="text-muted-foreground">Build</span>
          <span className="text-foreground font-medium text-right">2026.03.24</span>
        </div>
      </SettingsCard>

      <p className="text-center text-[10px] text-muted-foreground/50">
        © 2026 KomaStream Studios
      </p>
    </div>
  );
}

/* ── Shared UI Components ────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function SettingsCard({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 border transition-colors ${
        highlight
          ? 'border-os-success/30 bg-os-success/5'
          : 'border-border/40'
      }`}
      style={!highlight ? { background: 'hsla(var(--secondary), 0.35)' } : undefined}
    >
      {children}
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <h4 className="text-[13px] font-medium text-foreground">{label}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/30 my-2.5" />;
}

function ToggleSwitch({ checked, defaultChecked, onChange }: { checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isOn = checked !== undefined ? checked : internal;

  const toggle = () => {
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      onClick={toggle}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        isOn ? 'bg-primary' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isOn ? 'translate-x-[18px]' : ''
        }`}
      />
    </button>
  );
}
