import { useState } from 'react';
import { OSState } from '@/lib/os-store';

interface PrivacyLabAppProps {
  state: OSState;
  onUpdateSettings: (settings: Partial<OSState['shieldSettings']>) => void;
  shieldEnabled: boolean;
}

export function PrivacyLabApp({ state, onUpdateSettings, shieldEnabled }: PrivacyLabAppProps) {
  const [calibrated, setCalibrated] = useState(false);
  const [calibrating, setCalibratingState] = useState(false);

  const handleCalibrate = async () => {
    setCalibratingState(true);
    try {
      // iOS 13+ requires permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          setCalibrated(true);
        }
      } else {
        // Android / desktop — assume granted
        setCalibrated(true);
      }
    } catch (err) {
      console.warn('Orientation permission denied', err);
    }
    setCalibratingState(false);
  };

  if (!shieldEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
        <span className="text-5xl opacity-40">🛡️</span>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">Sensor Deactivated</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Enable Privacy Shield in Settings to activate sensor tracking and customization.
          </p>
        </div>
      </div>
    );
  }

  const { sensitivity, stealthLevel, fadeSpeed } = state.shieldSettings;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛡️</span>
        <div>
          <h3 className="text-base font-semibold text-foreground">Privacy Lab</h3>
          <p className="text-xs text-muted-foreground">Customize your Privacy Shield</p>
        </div>
      </div>

      {/* Calibrate */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'hsla(var(--secondary), 0.5)' }}>
        <h4 className="text-sm font-medium text-foreground">Device Calibration</h4>
        <p className="text-xs text-muted-foreground">
          Required for iOS. Grants access to the gyroscope sensor.
        </p>
        <button
          onClick={handleCalibrate}
          disabled={calibrating}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-97 disabled:opacity-50"
        >
          {calibrating ? 'Calibrating...' : calibrated ? '✓ Calibrated' : 'Calibrate Sensor'}
        </button>
      </div>

      {/* Sensitivity */}
      <SliderControl
        label="Sensitivity"
        description="Width of the 'sweet spot' tilt tolerance"
        value={sensitivity}
        min={1}
        max={10}
        onChange={(v) => onUpdateSettings({ sensitivity: v })}
        displayValue={`${sensitivity}`}
      />

      {/* Stealth Level */}
      <SliderControl
        label="Stealth Level"
        description="Maximum darkness of the privacy overlay"
        value={stealthLevel}
        min={70}
        max={100}
        onChange={(v) => onUpdateSettings({ stealthLevel: v })}
        displayValue={`${stealthLevel}%`}
      />

      {/* Fade Speed */}
      <SliderControl
        label="Fade Speed"
        description="Transition speed of the dimming effect"
        value={fadeSpeed}
        min={100}
        max={800}
        step={50}
        onChange={(v) => onUpdateSettings({ fadeSpeed: v })}
        displayValue={`${fadeSpeed}ms`}
      />
    </div>
  );
}

function SliderControl({
  label, description, value, min, max, step = 1, onChange, displayValue,
}: {
  label: string; description: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; displayValue: string;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'hsla(var(--secondary), 0.5)' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{label}</h4>
        <span className="text-xs font-mono text-primary">{displayValue}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
      />
    </div>
  );
}
