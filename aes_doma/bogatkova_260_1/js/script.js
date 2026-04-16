/* ============================================
   Виджет выбора окон для мойки
   Версия: 3.0 (только JS, CSS отдельно)
   ============================================ */

(function() {
    // ========== НАСТРОЙКИ (ИЗМЕНИТЕ ПОД СЕБЯ) ==========
    // Ссылка на ваш SVG-файл (в формате .txt на Google Диске)
    const SVG_URL = 'https://raw.githubusercontent.com/aeskomplex-web/aes.komplex/refs/heads/main/aes_doma/bogatkova_260_1/svg/facade.svg';
    
    // Ссылка на Google Apps Script (если есть, иначе оставьте пустой строкой)
    const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxsHzRIJ-chFGXkX4hJjXHnTjf0O6Ge0ybBHtQ5EOcEXkcMqd2qRk5o0h0yfBWbRXc/exec';      
    // Типы окон (по размерам из ваших SVG)
    const WINDOW_TYPES = [
        { name: 'single', label: 'Одиночное окно', minW: 4.5, maxW: 6, minH: 4, maxH: 5, price: 800, color: '#b8e1fc' },
        { name: 'quad',   label: 'Четырёхсекционное', minW: 9, maxW: 10, minH: 4, maxH: 5, price: 1600, color: '#f9d56e' },
        { name: 'penta',  label: 'Пятисекционное', minW: 10, maxW: 11, minH: 4, maxH: 5, price: 1800, color: '#f28b82' }
    ];
    
    const DEFAULT_PRICE = 800;
    const DEFAULT_COLOR = '#b8e1fc';
    const COLORS = {
        unselected: '#e0e0e0',
        locked: '#b0b0b0'
    };
    
    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
    let windows = [];
    let lockedIds = new Set();
    let isSubmitting = false;
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function getWindowType(bbox) {
        const w = bbox.width;
        const h = bbox.height;
        for (let type of WINDOW_TYPES) {
            if (w >= type.minW && w <= type.maxW && h >= type.minH && h <= type.maxH) {
                return { price: type.price, typeName: type.name, label: type.label, color: type.color };
            }
        }
        return { price: DEFAULT_PRICE, typeName: 'default', label: 'Окно', color: DEFAULT_COLOR };
    }
    
    function getSelectedColor(typeName) {
        const found = WINDOW_TYPES.find(t => t.name === typeName);
        return found ? found.color : DEFAULT_COLOR;
    }
    
    function updateTotal() {
        let total = windows.reduce((sum, w) => sum + (w.selected ? w.price : 0), 0);
        const span = document.getElementById('woTotalCost');
        if (span) span.innerText = total;
    }
    
    function applyVisualState(win) {
        if (win.locked) {
            win.path.style.fill = COLORS.locked;
            win.path.style.cursor = 'not-allowed';
            win.path.classList.add('locked');
            return;
        }
        win.path.classList.remove('locked');
        win.path.style.cursor = 'pointer';
        if (win.selected) {
            win.path.style.fill = getSelectedColor(win.typeName);
            win.path.classList.add('selected');
        } else {
            win.path.style.fill = COLORS.unselected;
            win.path.classList.remove('selected');
        }
    }
    
    function toggleWindow(idx) {
        const win = windows[idx];
        if (win.locked) return;
        win.selected = !win.selected;
        applyVisualState(win);
        updateTotal();
    }
    
    // ========== ЗАГРУЗКА БЛОКИРОВОК С СЕРВЕРА ==========
    async function loadLockedWindows() {
        if (!BACKEND_URL || BACKEND_URL === '') return;
        try {
            const response = await fetch(BACKEND_URL);
            const data = await response.json();
            lockedIds.clear();
            data.forEach(id => lockedIds.add(String(id)));
            windows.forEach(win => {
                win.locked = lockedIds.has(win.id);
                if (win.locked && win.selected) win.selected = false;
                applyVisualState(win);
            });
            updateTotal();
            console.log(`Загружено заблокированных окон: ${lockedIds.size}`);
        } catch(e) {
            console.error('Ошибка загрузки блокировок:', e);
        }
    }
    
    // ========== ОТПРАВКА ЗАЯВКИ ==========
    async function sendOrder() {
        if (isSubmitting) return;
        
        const selected = windows.filter(w => w.selected && !w.locked);
        if (selected.length === 0) {
            alert('Выберите хотя бы одно окно на схеме.');
            return;
        }
        
        const clientName = document.getElementById('woClientName').value.trim();
        const clientPhone = document.getElementById('woClientPhone').value.trim();
        if (!clientName || !clientPhone) {
            alert('Пожалуйста, заполните имя и телефон.');
            return;
        }
        
        const total = selected.reduce((s, w) => s + w.price, 0);
        const orderId = 'ORDER_' + Date.now();
        const selectedIds = selected.map(w => w.id);
        
        // Мгновенная блокировка на клиенте
        selectedIds.forEach(id => lockedIds.add(id));
        windows.forEach(win => {
            if (selectedIds.includes(win.id)) {
                win.locked = true;
                win.selected = false;
                applyVisualState(win);
            }
        });
        updateTotal();
        
        isSubmitting = true;
        const sendBtn = document.getElementById('woSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Отправка...';
        }
        
        const payload = {
            orderId: orderId,
            clientName: clientName,
            clientPhone: clientPhone,
            clientComment: document.getElementById('woClientComment').value,
            total: total,
            selectedWindows: selectedIds
        };
        
        try {
            if (BACKEND_URL && BACKEND_URL !== '') {
                await fetch(BACKEND_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            alert(`✅ Заявка №${orderId} отправлена!\nСумма: ${total}₽\nНаш менеджер свяжется с вами.`);
            
            // Очистка полей
            const nameField = document.getElementById('woClientName');
            const phoneField = document.getElementById('woClientPhone');
            const commentField = document.getElementById('woClientComment');
            if (nameField) nameField.value = '';
            if (phoneField) phoneField.value = '';
            if (commentField) commentField.value = '';
        } catch(e) {
            console.error(e);
            alert('Ошибка отправки заявки. Попробуйте позже.');
        } finally {
            isSubmitting = false;
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = '📩 Отправить заявку';
            }
        }
    }
    
    // ========== СБРОС БЛОКИРОВОК (АДМИН) ==========
    function resetAllLocks() {
        if (!confirm('⚠️ Снять блокировку со всех окон? Окна снова станут доступны для выбора.')) return;
        alert('Для сброса очистите лист "ПулОкон" в Google Таблице вручную.');
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ SVG ==========
    async function initWithSVG(svg) {
        const allPaths = svg.querySelectorAll('path');
        let windowPaths = [];
        allPaths.forEach(path => {
            try {
                const bbox = path.getBBox();
                const w = bbox.width, h = bbox.height;
                if (w >= 2 && w <= 12 && h >= 4 && h <= 15 && w * h < 200) {
                    windowPaths.push(path);
                }
            } catch(e) {}
        });
        console.log(`Найдено окон для выбора: ${windowPaths.length}`);
        
        if (windowPaths.length === 0) {
            const container = document.getElementById('woSvgContainer');
            if (container) {
                container.innerHTML += '<p style="color:red;">⚠️ Не удалось найти окна на схеме. Проверьте SVG.</p>';
            }
            return;
        }
        
        windowPaths.forEach((path, idx) => {
            let id = path.getAttribute('id');
            if (!id) {
                id = `win_${idx}`;
                path.setAttribute('id', id);
            }
            const bbox = path.getBBox();
            const type = getWindowType(bbox);
            windows.push({
                id: id,
                path: path,
                price: type.price,
                typeName: type.typeName,
                selected: false,
                locked: false
            });
            path.classList.add('window');
            path.style.fill = COLORS.unselected;
            path.style.cursor = 'pointer';
            if (path._clickHandler) path.removeEventListener('click', path._clickHandler);
            path._clickHandler = (e) => { e.stopPropagation(); toggleWindow(idx); };
            path.addEventListener('click', path._clickHandler);
        });
        
        await loadLockedWindows();
    }
    
    // ========== ПОСТРОЕНИЕ UI И ЗАГРУЗКА SVG ==========
    async function buildAndLoad() {
        const root = document.getElementById('woAppRoot');
        if (!root) {
            console.error('Контейнер woAppRoot не найден');
            return;
        }
        
        root.innerHTML = `
            <div class="wo-app">
                <div class="wo-container">
                    <div class="wo-header">
                        <h2 class="wo-title">Выберите окна для мойки</h2>
                        <div class="wo-divider"></div>
                        <p class="wo-description">Кликните по окну на схеме, чтобы добавить его в заявку. Цена зависит от размера окна.</p>
                    </div>
                    <div id="woSvgContainer" class="wo-svg-container">
                        <div style="text-align:center; padding:40px;">⏳ Загрузка схемы здания...</div>
                    </div>
                    <div class="wo-form">
                        <input type="text" id="woClientName" class="wo-input" placeholder="Ваше имя *">
                        <input type="tel" id="woClientPhone" class="wo-input" placeholder="Телефон *">
                        <input type="text" id="woClientComment" class="wo-input" placeholder="Комментарий (этаж, подъезд)">
                    </div>
                    <div class="wo-panel">
                        <div class="wo-total">💰 Сумма: <span id="woTotalCost">0</span> ₽</div>
                        <button id="woSendBtn" class="wo-btn wo-btn-primary">📩 Отправить заявку</button>
                    </div>
                    <div class="wo-admin">
                        <button id="woResetBtn" class="wo-btn-link">Сбросить блокировку окон (админ)</button>
                    </div>
                </div>
            </div>
        `;
        
        // Загружаем SVG из внешнего файла
        if (!SVG_URL || SVG_URL === 'https://drive.google.com/uc?export=view&id=ВАШ_ID_FACADE_TXT') {
            const container = document.getElementById('woSvgContainer');
            if (container) {
                container.innerHTML = '<p style="color:red;">❌ Не указана ссылка на SVG-файл. Настройте SVG_URL в коде.</p>';
            }
            return;
        }
        
        try {
            const response = await fetch(SVG_URL);
            const svgText = await response.text();
            const container = document.getElementById('woSvgContainer');
            if (container) {
                container.innerHTML = svgText;
                const svg = document.getElementById('buildingSvg');
                if (!svg) {
                    container.innerHTML += '<p style="color:red;">❌ В загруженном файле нет тега &lt;svg id="buildingSvg"&gt;</p>';
                    return;
                }
                await initWithSVG(svg);
            }
        } catch(e) {
            console.error('Ошибка загрузки SVG:', e);
            const container = document.getElementById('woSvgContainer');
            if (container) {
                container.innerHTML = '<p style="color:red;">❌ Не удалось загрузить схему здания. Проверьте ссылку на facade.txt</p>';
            }
        }
        
        const sendBtn = document.getElementById('woSendBtn');
        if (sendBtn) sendBtn.addEventListener('click', sendOrder);
        
        const resetBtn = document.getElementById('woResetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAllLocks);
    }
    
    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildAndLoad);
    } else {
        buildAndLoad();
    }
})();
