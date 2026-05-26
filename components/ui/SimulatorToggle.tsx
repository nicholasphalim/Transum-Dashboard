'use client';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export default function SimulatorToggle({ active, onToggle }: Props) {
  return (
    <button
      className={`simulator-toggle ${active ? 'simulator-toggle--active' : ''}`}
      onClick={onToggle}
      title={active ? 'Matikan simulasi' : 'Aktifkan simulasi'}
      aria-label="Toggle simulator"
    >
      <span className="simulator-toggle__track">
        <span className="simulator-toggle__thumb" />
      </span>
      <span className="simulator-toggle__label">Simulasi</span>
    </button>
  );
}
