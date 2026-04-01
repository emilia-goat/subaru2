import { useEffect, useRef, useState } from 'react';
import { OSState } from '@/lib/os-store';

interface PrivacyShieldOverlayProps {
  enabled: boolean;
  settings: OSState['shieldSettings'];
}

export function PrivacyShieldOverlay({ enabled, settings }: PrivacyShieldOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const smoothBeta = useRef(45);
  const smoothGamma = useRef(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setOpacity(0);
      return;
    }

    const alpha = 0.15; // low-pass filter strength

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 45;
      const gamma = e.gamma ?? 0;

      // Low-pass filter to smooth hand tremors
      smoothBeta.current = smoothBeta.current + alpha * (beta - smoothBeta.current);
      smoothGamma.current = smoothGamma.current + alpha * (gamma - smoothGamma.current);
    };

    const updateOpacity = () => {
      const { sensitivity, stealthLevel } = settings;
      const toleranceFactor = sensitivity / 5; // 1 = narrow, 2 = wide

      // Sweet spot: Beta 30-55, Gamma -15 to 15
      const betaCenter = 42.5;
      const betaRange = 12.5 * toleranceFactor;
      const gammaRange = 15 * toleranceFactor;

      const betaDist = Math.abs(smoothBeta.current - betaCenter);
      const gammaDist = Math.abs(smoothGamma.current);

      const betaFactor = Math.max(0, (betaDist - betaRange) / betaRange);
      const gammaFactor = Math.max(0, (gammaDist - gammaRange) / gammaRange);

      const rawOpacity = Math.min(1, Math.max(betaFactor, gammaFactor));
      const maxOpacity = stealthLevel / 100;
      const targetOpacity = rawOpacity * maxOpacity;

      setOpacity(targetOpacity);
      animFrame.current = requestAnimationFrame(updateOpacity);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    animFrame.current = requestAnimationFrame(updateOpacity);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(animFrame.current);
    };
  }, [enabled, settings]);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        backgroundColor: `hsla(var(--os-shield-overlay), ${opacity})`,
        transition: `background-color ${settings.fadeSpeed}ms ease-out`,
      }}
    />
  );
}
