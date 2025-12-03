import React, { useEffect, useState } from "react";

export default function Cutout() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.querySelector('header') as HTMLElement | null;
    if (el) el.style.display = visible ? '' : 'none';
    return () => { if (el) el.style.display = ''; };
  }, [visible]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <iframe
        title="cutout-tool"
        src="/cutout-tool/pixi-demo/filters/examples/index.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
      <div
        style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 10000, display: 'flex', gap: 8 }}
      >
        <button
          onClick={() => setVisible(true)}
          style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '8px 12px' }}
        >
          显示导航
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '8px 12px' }}
        >
          隐藏导航
        </button>
      </div>
    </div>
  );
}
