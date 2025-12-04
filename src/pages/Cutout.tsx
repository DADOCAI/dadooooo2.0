import React, { useEffect, useMemo, useState } from "react";

export default function Cutout() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.querySelector('header') as HTMLElement | null;
    if (el) el.style.display = visible ? '' : 'none';
    return () => { if (el) el.style.display = ''; };
  }, [visible]);

  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const [htmlRes, filtersRes] = await Promise.all([
          fetch('/cutout-tool/pixi-demo/filters/examples/index.html'),
          fetch('/cutout-tool/pixi-demo/filters/dist/pixi-filters.js'),
        ]);
        const html = await htmlRes.text();
        const filtersJs = filtersRes.ok ? await filtersRes.text() : '';
        const shim = '<script>try{if(window.PIXI&&!window.PIXI.EventEmitter&&window.PIXI.utils&&window.PIXI.utils.EventEmitter){window.PIXI.EventEmitter=window.PIXI.utils.EventEmitter;}}catch(e){}</script>';
        const fixed = html
          .replace('<head>', '<head><base href="/cutout-tool/pixi-demo/filters/examples/" />')
          .replace('<script src="https://pixijs.download/dev/pixi.min.js"></script>', `<script src="https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js"></script>${shim}`)
          .replace('https://pixijs.download/dev/pixi.min.js', 'https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js')
          .replace('<script src="../dist/pixi-filters.js"></script>', filtersJs ? `<script>${filtersJs}\n</script>` : '<script src="/cutout-tool/pixi-demo/filters/dist/pixi-filters.js"></script>');
        setSrcdoc(fixed);
      } catch (e) {
        setSrcdoc(null);
      }
    };
    load();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {srcdoc ? (
        <iframe title="cutout-tool" srcDoc={srcdoc} style={{ width: '100%', height: '100%', border: 'none' }} />
      ) : (
        <iframe title="cutout-tool" src="/cutout-tool/pixi-demo/filters/examples/index.html" style={{ width: '100%', height: '100%', border: 'none' }} />
      )}
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
