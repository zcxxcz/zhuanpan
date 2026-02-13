/**
 * App — 编辑器主控逻辑
 */
(function () {
    /* ── 主题配色表 ── */
    const THEME_COLORS = {
        fresh: ['#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#f1c40f', '#1dd1a1'],
        neon: ['#ff2e9f', '#6c5ce7', '#00d2d3', '#ff6b6b', '#feca57', '#54a0ff', '#5f27cd', '#01a3a4'],
        classic: ['#c0392b', '#d4a017', '#e74c3c', '#f39c12', '#8e44ad', '#2c3e50', '#e67e22', '#c0392b'],
        minimal: ['#1a1a1a', '#555555', '#888888', '#aaaaaa', '#333333', '#666666', '#999999', '#444444']
    };

    /* ── 状态 ── */
    let currentTheme = 'fresh';
    let items = [
        { label: '选项 A', weight: 1 },
        { label: '选项 B', weight: 1 },
        { label: '选项 C', weight: 1 }
    ];

    /* ── DOM 引用 ── */
    const titleInput = document.getElementById('title-input');
    const optionsList = document.getElementById('options-list');
    const btnAdd = document.getElementById('btn-add');
    const editorView = document.getElementById('editor-view');
    const previewView = document.getElementById('preview-view');
    const btnPreview = document.getElementById('btn-preview');
    const btnBackEdit = document.getElementById('btn-back-edit');
    const btnDownload = document.getElementById('btn-download');
    const btnSpin = document.getElementById('btn-spin');
    const resultOverlay = document.getElementById('result-overlay');
    const resultText = document.getElementById('result-text');
    const btnResultClose = document.getElementById('btn-result-close');
    const toastEl = document.getElementById('toast');

    /* ── Canvas / Spinners ── */
    const previewSmall = new Spinner(document.getElementById('canvas-small'));
    const previewBig = new Spinner(document.getElementById('canvas-big'), {
        onResult: (item, idx) => showResult(item.label)
    });

    /* ── 初始化 ── */
    renderOptions();
    updateSpinners();
    bindThemeCards();
    bindTemplates();

    /* ── 事件绑定 ── */
    titleInput.addEventListener('input', debounce(updateSpinners, 200));
    btnAdd.addEventListener('click', addOption);
    btnPreview.addEventListener('click', enterPreview);
    btnBackEdit.addEventListener('click', exitPreview);
    btnDownload.addEventListener('click', doExport);
    btnSpin.addEventListener('click', () => {
        btnSpin.disabled = true;
        previewBig.spin();
    });
    btnResultClose.addEventListener('click', closeResult);
    resultOverlay.addEventListener('click', (e) => {
        if (e.target === resultOverlay) closeResult();
    });

    /* ── 选项渲染 ── */
    function renderOptions() {
        optionsList.innerHTML = '';
        const colors = THEME_COLORS[currentTheme];
        items.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'option-row';
            row.innerHTML = `
        <span class="color-dot" style="background:${colors[i % colors.length]}"></span>
        <input type="text" value="${escapeAttr(item.label)}" placeholder="选项名称" data-index="${i}" class="opt-label">
        <input type="number" value="${item.weight}" min="0.1" step="0.1" data-index="${i}" class="opt-weight">
        <button class="btn-delete" data-index="${i}" title="删除">✕</button>
      `;
            optionsList.appendChild(row);
        });

        // 绑定事件
        optionsList.querySelectorAll('.opt-label').forEach(el => {
            el.addEventListener('input', debounce((e) => {
                items[+e.target.dataset.index].label = e.target.value;
                updateSpinners();
            }, 200));
        });

        optionsList.querySelectorAll('.opt-weight').forEach(el => {
            el.addEventListener('input', debounce((e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) {
                    items[+e.target.dataset.index].weight = v;
                    updateSpinners();
                }
            }, 200));
        });

        optionsList.querySelectorAll('.btn-delete').forEach(el => {
            el.addEventListener('click', (e) => {
                if (items.length <= 2) {
                    showToast('至少保留 2 个选项');
                    return;
                }
                items.splice(+e.currentTarget.dataset.index, 1);
                renderOptions();
                updateSpinners();
            });
        });
    }

    function addOption() {
        items.push({ label: `选项 ${items.length + 1}`, weight: 1 });
        renderOptions();
        updateSpinners();
        // 滚动到底部
        const rows = optionsList.querySelectorAll('.option-row');
        if (rows.length) rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ── 更新转盘 ── */
    function updateSpinners() {
        const title = titleInput.value;
        const colors = THEME_COLORS[currentTheme];
        previewSmall.setData(items, colors, title);
        previewBig.setData(items, colors, title);
    }

    /* ── 主题切换 ── */
    function bindThemeCards() {
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                currentTheme = card.dataset.theme;
                document.body.setAttribute('data-theme', currentTheme === 'fresh' ? '' : currentTheme);
                // 移除 fresh 的 data-theme (默认)
                if (currentTheme === 'fresh') document.body.removeAttribute('data-theme');
                document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                renderOptions();
                updateSpinners();
            });
        });
    }

    /* ── 模板填充 ── */
    function bindTemplates() {
        document.querySelectorAll('.btn-template').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = +btn.dataset.tplIndex;
                const tpl = TEMPLATES[idx];
                if (!tpl) return;
                titleInput.value = tpl.title;
                items = tpl.items.map(it => ({ ...it }));
                renderOptions();
                updateSpinners();
            });
        });
    }

    /* ── 视图切换 ── */
    function enterPreview() {
        // 校验
        const validItems = items.filter(it => it.label.trim() && it.weight > 0);
        if (validItems.length < 2) {
            showToast('请至少填写 2 个有效选项（名称不为空，权重 > 0）');
            return;
        }
        editorView.classList.remove('active');
        previewView.classList.add('active');
        document.querySelector('.app-header').style.display = 'none';
        updateSpinners();
    }

    function exitPreview() {
        previewView.classList.remove('active');
        editorView.classList.add('active');
        document.querySelector('.app-header').style.display = '';
        previewBig.stop();
        previewBig.highlightIndex = -1;
        updateSpinners();
        btnSpin.disabled = false;
    }

    /* ── 结果弹窗 ── */
    function showResult(label) {
        resultText.textContent = label;
        resultOverlay.classList.remove('hidden');
        btnSpin.disabled = false;
    }

    function closeResult() {
        resultOverlay.classList.add('hidden');
        previewBig.highlightIndex = -1;
        previewBig.draw();
    }

    /* ── 导出 ── */
    function doExport() {
        const validItems = items.filter(it => it.label.trim() && it.weight > 0);
        if (validItems.length < 2) {
            showToast('请至少填写 2 个有效选项');
            return;
        }
        exportHTML({
            title: titleInput.value || '转盘',
            items: validItems,
            theme: currentTheme,
            themeColors: THEME_COLORS[currentTheme]
        });
    }

    /* ── Toast ── */
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

    /* ── 工具函数 ── */
    function debounce(fn, ms) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    function escapeAttr(s) {
        return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
