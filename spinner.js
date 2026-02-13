/**
 * Spinner — Canvas 转盘渲染与物理旋转动画
 */
class Spinner {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} opts
     * @param {Function} opts.onResult  — 旋转结束回调 (item, index)
     */
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onResult = opts.onResult || (() => { });

        this.items = [];
        this.colors = [];
        this.title = '';
        this.rotation = 0;          // 当前累计旋转角 (rad)
        this.angularVelocity = 0;   // 当前角速度 (rad/s)
        this.isSpinning = false;
        this.animFrameId = null;
        this.lastTime = 0;
        this.highlightIndex = -1;

        this._resizeObserver = new ResizeObserver(() => this._handleResize());
        this._resizeObserver.observe(canvas.parentElement || canvas);
        this._handleResize();
    }

    /* ───────── public API ───────── */

    setData(items, colors, title) {
        this.items = items || [];
        this.colors = colors || [];
        this.title = title || '';
        this.highlightIndex = -1;
        this.draw();
    }

    spin() {
        if (this.isSpinning || this.items.length < 2) return;
        this.isSpinning = true;
        this.highlightIndex = -1;
        // 随机初始角速度 16‑26 rad/s
        this.angularVelocity = 16 + Math.random() * 10;
        this.lastTime = performance.now();
        this._animate();
    }

    stop() {
        this.isSpinning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    destroy() {
        this.stop();
        this._resizeObserver.disconnect();
    }

    /* ───────── 绘制 ───────── */

    draw() {
        const { ctx, canvas, items, colors, title, rotation, highlightIndex } = this;
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const R = Math.min(cx, cy) * 0.88;

        ctx.clearRect(0, 0, W, H);
        if (items.length === 0) return;

        const totalWeight = items.reduce((s, it) => s + it.weight, 0);
        if (totalWeight <= 0) return;

        // ── 外环阴影 ──
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fill();
        ctx.restore();

        // ── 扇区 ──
        let startAngle = rotation;
        for (let i = 0; i < items.length; i++) {
            const sweep = (items[i].weight / totalWeight) * Math.PI * 2;
            const endAngle = startAngle + sweep;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R, startAngle, endAngle);
            ctx.closePath();

            const color = colors[i % colors.length];
            if (highlightIndex === i) {
                ctx.fillStyle = color;
                ctx.fill();
                // 高亮光晕
                ctx.shadowColor = color;
                ctx.shadowBlur = 24;
                ctx.fill();
            } else {
                ctx.fillStyle = color;
                ctx.fill();
                if (highlightIndex >= 0) {
                    // 非高亮扇区变暗
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.fill();
                }
            }
            ctx.restore();

            // 分割线
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + R * Math.cos(startAngle), cy + R * Math.sin(startAngle));
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // 文字 — 自动翻转使文字始终可读
            const midAngle = startAngle + sweep / 2;
            const textR = R * 0.62;
            const tx = cx + textR * Math.cos(midAngle);
            const ty = cy + textR * Math.sin(midAngle);
            const maxCharW = R * 0.42;
            const fontSize = Math.min(Math.max(R * 0.09, 11), maxCharW / Math.max(items[i].label.length, 1) * 1.7);

            // 规范化角度到 0—2π
            let normAngle = midAngle % (Math.PI * 2);
            if (normAngle < 0) normAngle += Math.PI * 2;
            // 如果角度在右半圈 (π/2 ~ 3π/2)，翻转文字 180°
            const flipText = normAngle > Math.PI / 2 && normAngle < Math.PI * 1.5;
            const textAngle = flipText ? midAngle + Math.PI : midAngle;

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(textAngle);
            ctx.font = `bold ${fontSize}px "Outfit", "PingFang SC", "Microsoft YaHei", sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(items[i].label, 0, 0);
            ctx.restore();

            startAngle = endAngle;
        }

        // ── 中心圆 ──
        const centerR = R * 0.18;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // 中心标题
        if (title) {
            const cFontSize = Math.min(centerR * 0.55, 14);
            ctx.save();
            ctx.font = `bold ${cFontSize}px "Outfit", "PingFang SC", sans-serif`;
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // 多行简单截断
            const maxLen = 6;
            const line1 = title.substring(0, maxLen);
            const line2 = title.length > maxLen ? title.substring(maxLen, maxLen * 2) : '';
            if (line2) {
                ctx.fillText(line1, cx, cy - cFontSize * 0.55);
                ctx.fillText(line2, cx, cy + cFontSize * 0.55);
            } else {
                ctx.fillText(line1, cx, cy);
            }
            ctx.restore();
        }

        // ── 指针（顶部三角） ──
        this._drawPointer(cx, cy, R);
    }

    _drawPointer(cx, cy, R) {
        const ctx = this.ctx;
        const pSize = R * 0.13;
        const py = cy - R - 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, py + pSize * 1.5);
        ctx.lineTo(cx - pSize * 0.6, py - pSize * 0.3);
        ctx.lineTo(cx + pSize * 0.6, py - pSize * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    /* ───────── 动画 ───────── */

    _animate() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap delta
        this.lastTime = now;

        // 摩擦力减速: dω/dt = -friction * ω
        const friction = 2.2;
        this.angularVelocity *= Math.exp(-friction * dt);
        // 额外细微随机扰动让停止位置不可预测
        this.angularVelocity *= 1 - (Math.random() * 0.002);

        this.rotation += this.angularVelocity * dt;
        // 归一化到 0—2π
        this.rotation = this.rotation % (Math.PI * 2);

        this.draw();

        if (this.angularVelocity < 0.08) {
            // 停止
            this.angularVelocity = 0;
            this.isSpinning = false;
            this._resolveResult();
            return;
        }

        this.animFrameId = requestAnimationFrame(() => this._animate());
    }

    _resolveResult() {
        const totalWeight = this.items.reduce((s, it) => s + it.weight, 0);
        if (totalWeight <= 0) return;

        // 指针在顶部 (−π/2)，需要算出指针对应的角度
        // rotation 是顺时针旋转的角度
        // 扇区从 rotation 开始绘制，指针位置是 -π/2
        // 对应的转盘角度 = −π/2 − rotation (取正归一化)
        let pointerAngle = (-Math.PI / 2 - this.rotation) % (Math.PI * 2);
        if (pointerAngle < 0) pointerAngle += Math.PI * 2;

        let cumAngle = 0;
        for (let i = 0; i < this.items.length; i++) {
            const sweep = (this.items[i].weight / totalWeight) * Math.PI * 2;
            cumAngle += sweep;
            if (pointerAngle < cumAngle) {
                this.highlightIndex = i;
                this.draw();
                this.onResult(this.items[i], i);
                return;
            }
        }
        // fallback
        const last = this.items.length - 1;
        this.highlightIndex = last;
        this.draw();
        this.onResult(this.items[last], last);
    }

    /* ───────── 响应式 ───────── */

    _handleResize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const size = Math.min(parent.clientWidth, parent.clientHeight, 600);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // 重新用 CSS 尺寸计算
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!this.isSpinning) this.draw();
    }
}
