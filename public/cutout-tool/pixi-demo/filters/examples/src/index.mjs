import DemoApplication from './DemoApplication.mjs';
import * as filters from './filters/index.mjs';
import { getEnabledFiltersFromQueryString } from './utils.mjs';
import './ga.mjs';

const main = async () =>
{
    const app = new DemoApplication();

    app.enabledFilters = getEnabledFiltersFromQueryString();

    await app.init();
    await app.load([
        { alias: 'overlay', src: 'images/overlay.png' },
        { alias: 'map', src: 'images/displacement_map.png' },
        { alias: 'fish1', src: 'images/displacement_fish1.png' },
        { alias: 'fish2', src: 'images/displacement_fish2.png' },
        { alias: 'fish3', src: 'images/displacement_fish3.png' },
        { alias: 'fish4', src: 'images/displacement_fish4.png' },
        { alias: 'fish5', src: 'images/displacement_fish5.png' },
        { alias: 'lightmap', src: 'images/lightmap.png' },
        { alias: 'colormap', src: 'images/colormap.png' },
    ]);

    await app.setBackgroundFromVideo('videos/1573_1764688855_raw.mp4');
    app.defaultBackgroundTexture = app.bg.texture;

    const allowed = [
        'ascii',
        'adjustment',
        'crossHatch',
        'crt',
        'dot',
        'emboss',
        'multiColorReplace',
        'noise',
        'oldFilm',
    ];
    for (const key of allowed)
    {
        if (filters[key]) filters[key].call(app);
    }

    const uploadInput = document.getElementById('uploadInput');
    const uploadBar = document.getElementById('uploadBar');
    const leftToggles = Array.from(document.querySelectorAll('#leftPanel input[type="checkbox"][data-filter]'));
    const processFile = async (file) =>
    {
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (file.type && file.type.startsWith('video'))
        {
            await app.setBackgroundFromVideo(url);
        }
        else
        {
            await app.setBackgroundFromImage(url);
        }
    };
    if (uploadInput)
    {
        uploadInput.addEventListener('change', async (e) =>
        {
            const file = e.target.files && e.target.files[0];
            await processFile(file);
        });
    }
    if (uploadBar)
    {
        const prevent = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
        uploadBar.addEventListener('dragenter', prevent);
        uploadBar.addEventListener('dragover', prevent);
        uploadBar.addEventListener('drop', async (ev) =>
        {
            prevent(ev);
            const files = ev.dataTransfer && ev.dataTransfer.files;
            const file = files && files[0];
            await processFile(file);
        });
        uploadBar.addEventListener('click', () =>
        {
            if (uploadInput) uploadInput.click();
        });
    }

    // Export JPG helpers
    const captureCanvas = () =>
    {
        try {
            if (app.renderer && app.renderer.extract && typeof app.renderer.extract.canvas === 'function')
            {
                return app.renderer.extract.canvas(app.stage);
            }
        } catch (e) {}
        return app.canvas;
    };
    let watermarkImg = null;
    const getWatermarkImage = async () =>
    {
        if (watermarkImg) return watermarkImg;
        const candidates = [
            '../logo1.png',
            'images/logo.png',
            'images/logo.webp',
            'images/logo.jpg',
            'images/logo.jpeg',
            'images/watermark.png',
            'images/watermark.webp',
            'images/watermark.jpg',
        ];
        for (const src of candidates)
        {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            const ok = await new Promise((resolve) =>
            {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
            });
            if (ok) { watermarkImg = img; break; }
        }
        return watermarkImg;
    };
    const exportJPEG = async (scale, quality, name) =>
    {
        const src = captureCanvas();
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(src.width * scale));
        out.height = Math.max(1, Math.round(src.height * scale));
        const ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, out.width, out.height);
        // Draw watermark bottom-right
        const wm = await getWatermarkImage();
        try {
            if (wm && wm.width && wm.height)
            {
                const margin = Math.round(Math.max(8, out.width * 0.01));
                const targetW = Math.round(Math.min(180 * scale, out.width * 0.18));
                const ratio = wm.height / wm.width;
                const targetH = Math.round(targetW * ratio);
                const x = out.width - targetW - margin;
                const y = out.height - targetH - margin;
                ctx.globalAlpha = 0.92;
                ctx.drawImage(wm, x, y, targetW, targetH);
                ctx.globalAlpha = 1;
            }
        } catch (e) {}
        out.toBlob((blob) =>
        {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${name}-${Date.now()}.jpg`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        }, 'image/jpeg', quality);
    };
    const exportBar = document.getElementById('exportBar');
    if (exportBar)
    {
        const clearBtn = document.getElementById('exportJpgClear');
        const hdBtn = document.getElementById('exportJpgHd');
        if (clearBtn) clearBtn.addEventListener('click', () => exportJPEG(1, 0.92, 'export-clear'));
        if (hdBtn) hdBtn.addEventListener('click', () => exportJPEG(2, 0.98, 'export-hd'));
    }

    // Left preset switches: enable/disable filters
    leftToggles.forEach((el) =>
    {
        const id = el.getAttribute('data-filter');
        const inst = app.filterInstances && app.filterInstances[id];
        if (inst)
        {
            el.checked = !!inst.enabled;
            el.addEventListener('change', (e) =>
            {
                const enabled = !!e.target.checked;
                app.toggleFilterById(id, enabled);
                const ref = app.filterControllers && app.filterControllers[id];
                if (ref && ref.enabledCtrl && typeof ref.enabledCtrl.setValue === 'function')
                {
                    ref.enabledCtrl.setValue(enabled);
                }
            });
        }
        else
        {
            el.disabled = true;
            el.title = (el.title || id) + ' 不可用';
        }
    });

    // Force hide AsciiFilter effect on load
    if (app.filterInstances && app.filterInstances.AsciiFilter)
    {
        app.toggleFilterById('AsciiFilter', false);
        const asciiToggle = document.querySelector('#leftPanel input[data-filter="AsciiFilter"]');
        if (asciiToggle) asciiToggle.checked = false;
    }

    // Ensure any legacy injected preset tiles are removed from right panel
    const legacyPresets = document.querySelectorAll('.preset-wrapper');
    legacyPresets.forEach((el) => el.parentElement && el.parentElement.removeChild(el));
};

main();
