/** Demo show a bunch of fish and a lil-gui controls */
export default class DemoApplication extends PIXI.Application
{
    constructor()
    {
        const gui = new lil.GUI();

        gui.useLocalStorage = false;

        // Force root UI to adopt custom dark-card style and hide default title
        try {
            gui.domElement.classList.add('dark-card');
            const rootTitle = gui.domElement.querySelector(':scope > .title');
            if (rootTitle) rootTitle.style.display = 'none';
        } catch (e) {}

        // Get the initial dementions for the application
        const domElement = document.querySelector('#container');
        const initWidth = domElement.offsetWidth;
        const initHeight = domElement.offsetHeight;

        super();

        this.domElement = domElement;
        this.resources = null;
        this.initWidth = initWidth;
        this.initHeight = initHeight;
        this.animating = true;
        this.rendering = true;
        this.events = new PIXI.EventEmitter();
        this.animateTimer = 0;
        this.bg = null;
        this.pond = null;
        this.fishCount = 0;
        this.fishes = [];
        this.fishFilters = [];
        this.pondFilters = [];
        this.contentFilters = [];
        this.filterInstances = {};
        this.filterControllers = {};

        this.filterArea = new PIXI.Rectangle();
        this.padding = 100;
        this.bounds = new PIXI.Rectangle(
            -this.padding,
            -this.padding,
            initWidth + (this.padding * 2),
            initHeight + (this.padding * 2),
        );

        this.enabledFilters = [];

        const app = this;

        this.gui = gui;
        this.cnClass = {
            AdjustmentFilter: '调整',
            AdvancedBloomFilter: '高级泛光',
            AlphaFilter: '透明度',
            AsciiFilter: '字符画',
            BackdropBlurFilter: '背景虚化',
            BevelFilter: '斜角',
            BloomFilter: '泛光',
            BlurFilter: '模糊',
            BulgePinchFilter: '鼓包/夹紧',
            ColorGradientFilter: '色彩渐变',
            ColorMapFilter: '色彩映射',
            ColorOverlayFilter: '颜色叠加',
            ColorReplaceFilter: '颜色替换',
            ConvolutionFilter: '卷积',
            CrossHatchFilter: '交叉阴影',
            CRTFilter: '老电视',
            DisplacementFilter: '置换',
            DotFilter: '点阵',
            DropShadowFilter: '投影',
            EmbossFilter: '浮雕',
            GlitchFilter: '故障',
            GlowFilter: '辉光',
            GodrayFilter: '光束',
            GrayscaleFilter: '灰度',
            HslAdjustmentFilter: 'HSL 调整',
            KawaseBlurFilter: '川濑模糊',
            MotionBlurFilter: '运动模糊',
            MultiColorReplaceFilter: '多色替换',
            NoiseFilter: '噪声',
            OldFilmFilter: '老电影',
            OutlineFilter: '描边',
            PixelateFilter: '像素化',
            RadialBlurFilter: '径向模糊',
            ReflectionFilter: '反射',
            RGBSplitFilter: 'RGB 分离',
            ShockwaveFilter: '冲击波',
            SimpleLightmapFilter: '光照贴图',
            SimplexNoiseFilter: 'Simplex 噪声',
            TiltShiftFilter: '移轴',
            TwistFilter: '扭曲',
            ZoomBlurFilter: '缩放模糊',
        };
        this.cnProps = {
            enabled: '启用',
            blur: '模糊',
            quality: '质量',
            angle: '角度',
            scale: '缩放',
            radius: '半径',
            innerRadius: '内半径',
            outerRadius: '外半径',
            strength: '强度',
            alpha: '透明度',
            brightness: '亮度',
            contrast: '对比度',
            saturation: '饱和度',
            gamma: '伽马',
            red: '红',
            green: '绿',
            blue: '蓝',
            hue: '色相',
            lightness: '明度',
            colorize: '着色',
            threshold: '阈值',
            time: '时间',
            center: '中心',
            'center.x': '中心X',
            'center.y': '中心Y',
            centerX: '中心X',
            centerY: '中心Y',
            samples: '采样',
            seed: '种子',
            noise: '噪声',
            noiseSize: '噪声大小',
            pixelSize: '像素大小',
            offset: '偏移',
            color: '颜色',
            colors: '颜色',
            redX: '红X',
            redY: '红Y',
            blueX: '蓝X',
            blueY: '蓝Y',
            greenX: '绿X',
            greenY: '绿Y',
            'red.x': '红X',
            'red.y': '红Y',
            'blue.x': '蓝X',
            'blue.y': '蓝Y',
            'green.x': '绿X',
            'green.y': '绿Y',
            'velocity.x': '速度X',
            'velocity.y': '速度Y',
            curvature: '曲率',
            lineWidth: '线宽',
            lineContrast: '线条对比',
            verticalLine: '垂直线',
            scratch: '划痕',
            scratchDensity: '划痕密度',
            scratchWidth: '划痕宽度',
            vignetting: '暗角',
            vignettingAlpha: '暗角透明度',
            vignettingBlur: '暗角模糊',
            'reset options': '重置选项',
            'from CSS gradient': '从CSS渐变',
            'remove color stop': '删除颜色节点',
            'add color stop': '添加颜色节点',
            type: '类型',
            maxColors: '最多颜色',
            replace: '替换',
            reset: '重置',
            sepia: '棕褐',
            negative: '反色',
            kodachrome: '科达胶片',
            lsd: 'LSD 特效',
            polaroid: '拍立得',
            desaturate: '去饱和',
            grayscale: '灰度',
            saturate: '增强饱和',
            predator: '捕食者',
            gain: '增益',
            lacunarity: '缺隙',
            parallel: '平行',
            bloomScale: '泛光强度',
            kernelSize: '核大小',
            tolerance: '容差',
            '(animating)': '动画',
        };
        this.defaultBackgroundTexture = null;
        this.gui.add(this, 'rendering')
            .name('&bull; 渲染')
            .onChange((value) =>
            {
                if (!value)
                {
                    app.stop();
                }
                else
                {
                    app.start();
                }
            });
        

        this.bgScale = 1;
        this.fitMode = 'original';
        const imageFolder = this.gui.addFolder('主图');
        this.bgScaleCtrl = imageFolder.add(this, 'bgScale', 0.1, 3, 0.01).name('主图大小').onChange(() =>
        {
            this.handleResize();
        });
        imageFolder.add(this, 'fitMode', { '自适应(不裁切)': 'contain', '铺满(裁切)': 'cover', '原始尺寸': 'original' }).name('缩放模式').onChange(() =>
        {
            this.handleResize();
        });
    }

    /** override init */
    init()
    {
        const preference = (new URLSearchParams(window.location.search)).get('preference') || 'webgpu';

        return super.init({
            hello: true,
            width: this.initWidth,
            height: this.initHeight,
            autoStart: false,
            preference,
            useBackBuffer: true,
        });
    }

    /**
     * Load resources
     * @param {object} manifest Collection of resources to load
     */
    async load(manifest)
    {
        PIXI.Assets.addBundle('bundle', manifest);
        this.resources = await PIXI.Assets.loadBundle('bundle');
        this.setup();
        this.start();
    }

    setup()
    {
        document.body.appendChild(this.canvas);

        const { resources } = this;
        const { bounds, initWidth, initHeight } = this;

        // Setup the container
        this.pond = new PIXI.Container();
        this.pond.filterArea = this.filterArea;
        this.stage.addChild(this.pond);

        // Setup the background sprite (no default image)
        this.bg = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this.bg.visible = false;
        this.pond.addChild(this.bg);

        this.overlay = null;

        // Handle window resize event
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize();

        this.ticker.add(this.animate, this);

        const onWheelZoom = (e) =>
        {
            e.preventDefault();
            const step = 0.1;
            const dir = e.deltaY < 0 ? 1 : -1;
            const next = Math.max(0.1, Math.min(3, this.bgScale + dir * step));
            this.bgScale = next;
            if (this.bgScaleCtrl && typeof this.bgScaleCtrl.setValue === 'function') this.bgScaleCtrl.setValue(next);
            this.handleResize();
        };
        this.canvas.addEventListener('wheel', onWheelZoom, { passive: false });
        const uploadBar = document.getElementById('uploadBar');
        if (uploadBar) uploadBar.addEventListener('wheel', onWheelZoom, { passive: false });
        window.addEventListener('wheel', onWheelZoom, { passive: false });
    }

    /**
     * Resize the demo when the window resizes
     */
    handleResize()
    {
        const { padding, bg, overlay, filterArea, bounds } = this;

        const width = this.domElement.offsetWidth;
        const height = this.domElement.offsetHeight;
        const filterAreaPadding = 0;

        // Use equivalent of CSS's contain for the background
        // so that it scales proportionally
        const texW = bg.texture.width;
        const texH = bg.texture.height;
        if (!texW || !texH)
        {
            this.renderer.resize(width, height);
            this.render();
            return;
        }
        const baseScale = this.fitMode === 'contain'
            ? Math.min(width / texW, height / texH)
            : (this.fitMode === 'cover' ? Math.max(width / texW, height / texH) : 1);
        const finalScale = baseScale * this.bgScale;
        bg.scale.set(finalScale);
        const dispW = texW * finalScale;
        const dispH = texH * finalScale;

        bg.x = (width - dispW) / 2;
        bg.y = (height - dispH) / 2;

        if (overlay)
        {
            overlay.width = width;
            overlay.height = height;
        }

        bounds.x = -padding;
        bounds.y = -padding;
        bounds.width = width + (padding * 2);
        bounds.height = height + (padding * 2);

        filterArea.x = filterAreaPadding;
        filterArea.y = filterAreaPadding;
        filterArea.width = width - (filterAreaPadding * 2);
        filterArea.height = height - (filterAreaPadding * 2);

        this.events.emit('resize', width, height);

        this.renderer.resize(width, height);

        this.render();
    }

    /**
     * Animate the fish, overlay and filters (if applicable)
     * @param {number} delta - % difference in time from last frame render
     */
    animate(time)
    {
        const delta = time.deltaTime;
        this.animateTimer += delta;
        this.events.emit('animate', delta, this.animateTimer);
        if (!this.animating)
        {
            return;
        }
        if (this.overlay)
        {
            this.overlay.tilePosition.x = this.animateTimer * -1;
            this.overlay.tilePosition.y = this.animateTimer * -1;
        }
    }

    /**
     * Add a new filter
     * @param {string} id Class name
     * @param {object|function} options The class name of filter or options
     * @param {string} [options.id] The name of the filter class
     * @param {boolean} [options.global] Filter is in pixi.js
     * @param {array} [options.args] Constructor arguments
     * @param {boolean} [options.fishOnly=false] Apply to fish only, not whole scene
     * @param {boolean} [options.enabled=false] Filter is enabled by default
     * @param {function} [oncreate] Function takes filter and gui folder as
     *        arguments and is scoped to the Demo application.
     * @return {Filter} Instance of new filter
     */
    addFilter(id, options)
    {
        if (typeof options === 'function')
        {
            options = { oncreate: options };
        }

        options = Object.assign({
            name: id,
            enabled: false,
            opened: false,
            args: undefined,
            fishOnly: false,
            global: false,
            oncreate: null,
        }, options);

        // Use Chinese display name when available
        options.name = this.cnClass[id] || options.name;

        if (options.global)
        {
            options.name += ' (pixi.js)';
        }

        const app = this;
        const folderRaw = this.gui.addFolder(options.name).close();
        const translateProp = (k) =>
        {
            if (this.cnProps[k]) return this.cnProps[k];
            if (typeof k === 'string')
            {
                const m1 = k.match(/^original\s+(\d+)$/i);
                if (m1) return `原始 ${m1[1]}`;
                const m2 = k.match(/^target\s+(\d+)$/i);
                if (m2) return `目标 ${m2[1]}`;
            }
            return k;
        };
        const folder = new Proxy(folderRaw, {
            get(target, prop)
            {
                if (prop === 'add')
                {
                    const orig = target.add.bind(target);
                    return (obj, key, ...args) =>
                    {
                        const ctrl = orig(obj, key, ...args);
                        if (ctrl && typeof ctrl.name === 'function') ctrl.name(translateProp(key));
                        const origName = ctrl.name.bind(ctrl);
                        return new Proxy(ctrl, {
                            get(ct, p)
                            {
                                if (p === 'name')
                                {
                                    return (label) => origName(translateProp(label));
                                }
                                return ct[p];
                            }
                        });
                    };
                }
                if (prop === 'addColor')
                {
                    const orig = target.addColor.bind(target);
                    return (obj, key) =>
                    {
                        const ctrl = orig(obj, key);
                        if (ctrl && typeof ctrl.name === 'function') ctrl.name(translateProp(key));
                        const origName = ctrl.name.bind(ctrl);
                        return new Proxy(ctrl, {
                            get(ct, p)
                            {
                                if (p === 'name')
                                {
                                    return (label) => origName(translateProp(label));
                                }
                                return ct[p];
                            }
                        });
                    };
                }
                return target[prop];
            }
        });
        const ClassRef = PIXI.filters[id] || PIXI[id];

        if (!ClassRef)
        {
            throw new Error(`Unable to find class name with "${id}"`);
        }

        const filter = new ClassRef(options.args);
        this.filterInstances[id] = filter;

        // Set enabled status
        filter.enabled = (options.enabled && this.enabledFilters.length === 0) || this.enabledFilters.includes(id);

        // TODO: This is a hack for the issue with the 'enabled' toggling
        // https://github.com/orgs/pixijs/projects/2/views/4?pane=issue&itemId=48582986
        const toggleFilter = (enabled) =>
        {
            const contentFilters = [...this.contentFilters];
            if (enabled)
            {
                contentFilters.push(filter);
            }
            else
            {
                const index = contentFilters.indexOf(filter);
                if (index !== -1) contentFilters.splice(index, 1);
            }
            this.contentFilters = contentFilters;
            this.bg.filters = [];
            this.bg.filters = contentFilters;
        };

        // Track enabled change with analytics
        folder.add(filter, 'enabled').onChange((enabled) =>
        {
            ga('send', 'event', id, enabled ? 'enabled' : 'disabled');

            toggleFilter(enabled);
            app.events.emit('enable', enabled);

            this.render();
            if (enabled)
            {
                folder.domElement.className += ' enabled';
                // Close other folders if we want accordion style (optional but good for mobile/clean look)
                // this.gui.folders.forEach(f => {
                //     if (f !== folderRaw && f !== imageFolder) f.close();
                // });
                if (folderRaw && folderRaw.domElement) {
                    folderRaw.domElement.style.display = '';
                    folderRaw.open();
                }
            }
            else
            {
                folder.domElement.className = folder.domElement.className.replace(' enabled', '');
                if (folderRaw && folderRaw.domElement) {
                    folderRaw.close();
                    folderRaw.domElement.style.display = 'none';
                }
            }
        });

        // Hide built-in enabled controller UI; left panel controls enable/disable
        const enabledCtrl = folderRaw.controllers && folderRaw.controllers.find((c) => c.property === 'enabled');
        if (enabledCtrl && enabledCtrl.domElement) {
            enabledCtrl.domElement.style.display = 'none';
        }
        this.filterControllers[id] = { folderRaw, enabledCtrl };

        // Inject Custom Header and Presets
        const childrenContainer = folderRaw.domElement.querySelector('.children');
        if (childrenContainer) {
            const summaryEl = folderRaw.domElement.querySelector('summary');
            if (summaryEl) summaryEl.style.display = 'none';
            const header = document.createElement('div');
            header.className = 'filter-header';
            const resetBtn = document.createElement('button');
            resetBtn.className = 'filter-reset';
            resetBtn.innerHTML = '&#x21ba;';
            resetBtn.title = 'Reset';
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                const ref = this.filterControllers[id];
                if (!ref || !ref.initial) return;
                for (const c of ref.initial.controllers) {
                    if (typeof c.setValue === 'function') c.setValue(ref.initial.values[c.property]);
                }
                this.render();
            };
            header.appendChild(resetBtn);
            childrenContainer.insertBefore(header, childrenContainer.firstChild);
        }

        if (filter.enabled)
        {
            folder.open();
            folder.domElement.className += ' enabled';
            if (folderRaw && folderRaw.domElement) folderRaw.domElement.style.display = '';
        }
        else
        {
            if (folderRaw && folderRaw.domElement) folderRaw.domElement.style.display = 'none';
        }

        if (options.oncreate)
        {
            options.oncreate.call(filter, folder);
        }

        const ctrlList = (folderRaw.controllers || []).filter((c) => c.property !== 'enabled');
        const values = {};
        for (const c of ctrlList) {
            if (c.object === filter) values[c.property] = c.object[c.property];
        }
        this.filterControllers[id].initial = { controllers: ctrlList.filter((c) => c.object === filter), values };

        toggleFilter(filter.enabled);

        return filter;
    }

    /** Programmatically toggle a filter by class id without changing preset logic */
    toggleFilterById(id, enabled)
    {
        const filter = this.filterInstances[id];
        if (!filter) return;
        filter.enabled = enabled;
        const contentFilters = [...this.contentFilters];
        if (enabled)
        {
            if (!contentFilters.includes(filter)) contentFilters.push(filter);
        }
        else
        {
            const index = contentFilters.indexOf(filter);
            if (index !== -1) contentFilters.splice(index, 1);
        }
        this.contentFilters = contentFilters;
        this.bg.filters = [];
        this.bg.filters = contentFilters;
        // Show/hide right-panel folder based on enabled state
        const ref = this.filterControllers && this.filterControllers[id];
        if (ref && ref.folderRaw && ref.folderRaw.domElement)
        {
            ref.folderRaw.domElement.style.display = enabled ? '' : 'none';
            if (enabled) ref.folderRaw.open(); else ref.folderRaw.close();
        }
        this.render();
    }

    async setBackgroundFromImage(url)
    {
        const img = new Image();
        img.src = url;
        await new Promise((resolve) => { img.onload = resolve; });
        const tex = PIXI.Texture.from(img);
        this.bg.texture = tex;
        this.bg.visible = true;
        this.handleResize();
        this.render();
    }

    async setBackgroundFromVideo(url)
    {
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        await video.play().catch(() => {});
        const tex = PIXI.Texture.from(video);
        this.bg.texture = tex;
        this.bg.visible = true;
        video.addEventListener('loadedmetadata', () => this.handleResize(), { once: true });
        video.addEventListener('loadeddata', () => this.handleResize(), { once: true });
        video.addEventListener('canplay', () => this.handleResize(), { once: true });
        this.handleResize();
        this.render();
    }

    resetBackground()
    {
        if (this.defaultBackgroundTexture)
        {
            this.bg.texture = this.defaultBackgroundTexture;
            this.handleResize();
            this.render();
        }
    }
}
