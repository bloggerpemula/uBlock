// ==UserScript==
// @name            MonkeyConfig Mod Enhanced
// @noframes
// @version         2.2
// @namespace       http://odyniec.net/
// @contributionURL https://saweria.co/Bloggerpemula
// @description     Enhanced Configuration Dialog Builder with column layout, custom styling, additional input types, scrollable labels, and customizable checkbox/number sizes and positions
// ==/UserScript==
/*
 * MonkeyConfig Enhanced
 * Based on version 0.1.4 by Michal Wojciechowski (odyniec.net)
 * v0.1.4 - January 2020 - David Hosier (https://github.com/david-hosier/MonkeyConfig)
 * Enhanced by Bloggerpemula - March 2025
 * Additions: Column layout, font size/color customization, new input types (textarea, range, radio, file, button, group)
 * Modified: Checkbox, number, and text inputs aligned inline with labels - March 2025
 * Fixed: Improved Shadow DOM and Optimized Iframe for consistent styling across sites - March 2025
 * Enhanced: Added horizontal scrolling for labels, customizable checkbox/number sizes and positions - April 2025
 */
function MonkeyConfig(data) {
    let cfg = this, params = data.parameters || data.params, values = {}, storageKey,
        displayed, openLayer, shadowRoot, container, iframeFallback;
    function log(message) { console.log(`[MonkeyConfig v2.2] ${message}`); }
    function init() {
        data.buttons = data.buttons || ['save', 'reset', 'close', 'reload', 'homepage'];
        storageKey = '_MonkeyConfig_' + (data.title || 'Configuration').replace(/[^a-zA-Z0-9]/g, '_') + '_cfg';
        const storedValues = GM_getValue(storageKey) ? JSON.parse(GM_getValue(storageKey)) : {};
        cfg.shadowWidth = data.shadowWidth || storedValues.shadowWidth || "600px";
        cfg.shadowHeight = data.shadowHeight || storedValues.shadowHeight || "300px";
        cfg.iframeWidth = data.iframeWidth || storedValues.iframeWidth || "600px";
        cfg.iframeHeight = data.iframeHeight || storedValues.iframeHeight || "300px";
        cfg.shadowFontSize = data.shadowFontSize || storedValues.shadowFontSize || "14px";
        cfg.shadowFontColor = data.shadowFontColor || storedValues.shadowFontColor || "#000000";
        cfg.iframeFontSize = data.iframeFontSize || storedValues.iframeFontSize || "14px";
        cfg.iframeFontColor = data.iframeFontColor || storedValues.iframeFontColor || "#000000";
        cfg.title = data.title || (typeof GM_getMetadata === 'function' ? GM_getMetadata('name') + ' Configuration' : 'Configuration');
        for (let key in params) {
            const param = params[key];
            values[key] = storedValues[key] ?? param.default ?? '';
        }
        if (data.menuCommand) GM_registerMenuCommand(data.menuCommand === true ? cfg.title : data.menuCommand, () => cfg.open());
        cfg.open = open;
        cfg.close = close;
        cfg.get = name => values[name];
        cfg.set = (name, value) => { values[name] = value; update(); };
    }
    function setDefaults() {
        for (let key in params) if (params[key].default !== undefined) values[key] = params[key].default;
        update();
    }
    function render() {
        let html = `<div class="__MonkeyConfig_container"><h1>${cfg.title}</h1><div class="__MonkeyConfig_content"><div class="__MonkeyConfig_top">`;
        for (let key in params) if (params[key].column === 'top') html += MonkeyConfig.formatters.tr(key, params[key]);
        html += `</div><div class="__MonkeyConfig_columns"><div class="__MonkeyConfig_left_column">`;
        for (let key in params) if (params[key].column === 'left') html += MonkeyConfig.formatters.tr(key, params[key]);
        html += `</div><div class="__MonkeyConfig_right_column">`;
        for (let key in params) if (params[key].column === 'right') html += MonkeyConfig.formatters.tr(key, params[key]);
        html += `</div></div><table class="__MonkeyConfig_default">`;
        for (let key in params) if (!params[key].column) html += MonkeyConfig.formatters.tr(key, params[key]);
        html += `</table><div class="__MonkeyConfig_bottom">`;
        for (let key in params) if (params[key].column === 'bottom') html += MonkeyConfig.formatters.tr(key, params[key]);
        html += `</div></div><div class="__MonkeyConfig_buttons_container"><table><tr>`;
        data.buttons.forEach(btn => {
            html += '<td>';
            if (btn === 'save') html += `<button type="button" id="__MonkeyConfig_button_save"><img src="data:image/png;base64,${MonkeyConfig.res.icons.save}" alt="Save"/> Save</button>`;
            else if (btn === 'reset') html += `<button type="button" id="__MonkeyConfig_button_reset"><img src="data:image/png;base64,${MonkeyConfig.res.icons.reset}" alt="Reset"/> Reset</button>`;
            else if (btn === 'close') html += `<button type="button" id="__MonkeyConfig_button_close"><img src="data:image/png;base64,${MonkeyConfig.res.icons.close}" alt="Close"/> Close</button>`;
            else if (btn === 'reload') html += `<button type="button" id="__MonkeyConfig_button_reload"><img src="data:image/png;base64,${MonkeyConfig.res.icons.reload}" alt="Reload"/> Reload</button>`;
            else if (btn === 'homepage') html += `<button type="button" id="__MonkeyConfig_button_homepage"><img src="data:image/png;base64,${MonkeyConfig.res.icons.home}" alt="Homepage"/> Homepage</button>`;
            html += '</td>';
        });
        return html + '</tr></table></div></div>';
    }
    function update() {
        if (!displayed) return;
        const root = shadowRoot || (iframeFallback && iframeFallback.contentDocument);
        if (!root) return;
        for (let key in params) {
            const elem = root.querySelector(`[name="${key}"]`), param = params[key];
            if (!elem) continue;
            if (param.type === 'checkbox') {
                elem.checked = !!values[key];
                elem.style.width = param.width || '11px';
                elem.style.height = param.height || '11px';
                elem.style.position = 'relative';
                if (param.position) {
                    if (param.position === 'left-top') {
                        elem.style.left = '0';
                        elem.style.top = '0';
                    } else if (param.position === 'right-top') {
                        elem.style.right = '0';
                        elem.style.top = '0';
                    } else if (param.position === 'left-bottom') {
                        elem.style.left = '0';
                        elem.style.bottom = '0';
                    } else if (param.position === 'right-bottom') {
                        elem.style.right = '0';
                        elem.style.bottom = '0';
                    }
                }
            } else if (param.type === 'number') {
                elem.value = values[key] || param.default;
                elem.style.width = param.width || '40px';
                elem.style.height = param.height || '20px';
                elem.style.position = 'relative';
                if (param.position) {
                    if (param.position === 'left-top') {
                        elem.style.left = '0';
                        elem.style.top = '0';
                    } else if (param.position === 'right-top') {
                        elem.style.right = '0';
                        elem.style.top = '0';
                    } else if (param.position === 'left-bottom') {
                        elem.style.left = '0';
                        elem.style.bottom = '0';
                    } else if (param.position === 'right-bottom') {
                        elem.style.right = '0';
                        elem.style.bottom = '0';
                    }
                }
            } else if (param.type === 'custom' && param.set) {
                param.set(values[key], root.querySelector(`#__MonkeyConfig_parent_${key}`));
            } else if (['text', 'color', 'textarea', 'range'].includes(param.type)) {
                elem.value = values[key] || param.default;
            } else if (param.type === 'radio') {
                const radio = root.querySelector(`[name="${key}"][value="${values[key]}"]`);
                if (radio) radio.checked = true;
            } else if (param.type === 'file') {
                elem.value = '';
            } else if (param.type === 'select') {
                const currentValue = values[key];
                if (elem.type === 'checkbox') {
                    const checkboxes = root.querySelectorAll(`input[name="${key}"]`);
                    checkboxes.forEach(cb => cb.checked = currentValue.includes(cb.value));
                } else if (elem.multiple) {
                    const options = root.querySelectorAll(`select[name="${key}"] option`);
                    options.forEach(opt => opt.selected = currentValue.includes(opt.value));
                } else {
                    elem.value = currentValue;
                }
            }
            const fontSize = shadowRoot ? cfg.shadowFontSize : cfg.iframeFontSize;
            const defaultFontColor = shadowRoot ? cfg.shadowFontColor : cfg.iframeFontColor;
            const labelFontColor = param.fontColor || defaultFontColor;
            elem.style.fontSize = fontSize;
            elem.style.color = labelFontColor;
            if (param.type === 'checkbox' || param.type === 'textarea') {
                elem.style.backgroundColor = 'inherit';
                elem.style.color = labelFontColor;
            }
            const label = root.querySelector(`label[for="__MonkeyConfig_field_${key}"]`);
            if (label) {
                label.style.fontSize = fontSize;
                label.style.color = labelFontColor;
                label.style.cssText += param.type === 'textarea' ? 'text-align:center;display:block;width:100%;overflow-x:auto;white-space:nowrap;' : 'text-align:left;display:inline-block;width:auto;overflow-x:auto;white-space:nowrap;';
            }
        }
    }
    function saveClick() {
        const root = shadowRoot || (iframeFallback && iframeFallback.contentDocument);
        for (let key in params) {
            const elem = root.querySelector(`[name="${key}"]`), param = params[key];
            if (!elem) continue;
            if (param.type === 'checkbox') values[key] = elem.checked;
            else if (param.type === 'custom' && param.get) values[key] = param.get(root.querySelector(`#__MonkeyConfig_parent_${key}`));
            else if (['number', 'text', 'color', 'textarea', 'range'].includes(param.type)) values[key] = elem.value;
            else if (param.type === 'radio') values[key] = root.querySelector(`[name="${key}"]:checked`)?.value || '';
            else if (param.type === 'file') values[key] = elem.dataset.value || values[key];
            else if (param.type === 'select') {
                if (elem.type === 'checkbox') values[key] = Array.from(root.querySelectorAll(`input[name="${key}"]:checked`)).map(input => input.value);
                else if (elem.multiple) values[key] = Array.from(root.querySelectorAll(`select[name="${key}"] option:selected`)).map(opt => opt.value);
                else values[key] = elem.value;
            }
        }
        const allValues = {
            ...values,
            shadowWidth: cfg.shadowWidth,
            shadowHeight: cfg.shadowHeight,
            iframeWidth: cfg.iframeWidth,
            iframeHeight: cfg.iframeHeight,
            shadowFontSize: cfg.shadowFontSize,
            shadowFontColor: cfg.shadowFontColor,
            iframeFontSize: cfg.iframeFontSize,
            iframeFontColor: cfg.iframeFontColor
        };
        GM_setValue(storageKey, JSON.stringify(allValues));
        close();
        if (data.onSave) data.onSave(values);
    }
    function open() {
        function openDone(root) {
            if (window.self !== window.top) return;
            const saveBtn = root.querySelector('#__MonkeyConfig_button_save');
            if (saveBtn) saveBtn.addEventListener('click', saveClick, false);
            const resetBtn = root.querySelector('#__MonkeyConfig_button_reset');
            if (resetBtn) resetBtn.addEventListener('click', setDefaults, false);
            const closeBtn = root.querySelector('#__MonkeyConfig_button_close');
            if (closeBtn) closeBtn.addEventListener('click', close, false);
            const reloadBtn = root.querySelector('#__MonkeyConfig_button_reload');
            if (reloadBtn) reloadBtn.addEventListener('click', () => location.reload(), false);
            const homepageBtn = root.querySelector('#__MonkeyConfig_button_homepage');
            if (homepageBtn) homepageBtn.addEventListener('click', () => window.open('https://bloggerpemula.pythonanywhere.com/', '_blank'), false);
            displayed = true;
            update();
        }
        const body = document.querySelector('body') || document.documentElement;
        if (!body) {
            log("Body not found, cannot open dialog");
            return;
        }
        openLayer = document.createElement('div');
        openLayer.className = '__MonkeyConfig_layer';
        shadowRoot = openLayer.attachShadow({ mode: 'open' });
        const shadowWidth = cfg.shadowWidth || "600px";
        const shadowHeight = cfg.shadowHeight || "300px";
        log(`Preparing Shadow DOM with title: ${cfg.title}, dimensions - Width: ${shadowWidth}, Height: ${shadowHeight}`);
        const heightStyle = shadowHeight === 'auto' ? 'auto' : shadowHeight;
        shadowRoot.innerHTML = `
            <style>
                :host { all: initial; display: block !important; font-family: Arial, sans-serif !important; isolation: isolate; z-index: 2147483647 !important; font-size: ${cfg.shadowFontSize} !important; color: ${cfg.shadowFontColor} !important; }
                h1 { font-size: 120% !important; font-weight: normal !important; margin: 0 !important; padding: 0 !important; }
                ${MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, cfg.shadowFontSize).replace(/__FONT_COLOR__/g, cfg.shadowFontColor)}
                .__MonkeyConfig_overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(0, 0, 0, 0.6) !important; z-index: 2147483646 !important; }
                .__MonkeyConfig_container { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: 2147483647 !important; width: ${shadowWidth} !important; height: ${heightStyle} !important; max-width: 90vw !important; max-height: 80vh !important; overflow-y: auto !important; box-sizing: border-box !important; }
            </style>
            <div class="__MonkeyConfig_overlay"></div>
            ${render()}
        `;
        container = shadowRoot.querySelector('.__MonkeyConfig_container');
        openLayer.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 2147483647 !important;';
        body.appendChild(openLayer);
        log('Dialog appended to body via Shadow DOM');
        const appliedWidth = container.offsetWidth;
        const appliedHeight = container.offsetHeight;
        log(`Actual applied dimensions - Width: ${appliedWidth}px, Height: ${appliedHeight}px`);
        if (!container || shadowRoot.querySelector('.__MonkeyConfig_overlay').offsetHeight === 0) {
            log('Shadow DOM failed, switching to iframe fallback');
            body.removeChild(openLayer);
            shadowRoot = null;
            iframeFallback = document.createElement('iframe');
            const iframeWidth = cfg.iframeWidth || "600px";
            const iframeHeight = cfg.iframeHeight || "300px";
            log(`Switching to iframe with dimensions - Width: ${iframeWidth}, Height: ${iframeHeight}`);
            iframeFallback.style.cssText = `position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: ${iframeWidth} !important; height: ${iframeHeight} !important; max-width: 90vw !important; max-height: 80vh !important; z-index: 2147483647 !important; border: none !important; background: #eee !important; box-shadow: 2px 2px 16px #000 !important; border-radius: 0.5em !important;`;
            body.appendChild(iframeFallback);
            const iframeDoc = iframeFallback.contentDocument;
            iframeDoc.open();
            iframeDoc.write(`<!DOCTYPE html><html><head><style>
                html, body, * { all: initial !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; font-size: ${cfg.iframeFontSize} !important; color: ${cfg.iframeFontColor} !important; height: 100% !important; width: 100% !important; box-sizing: border-box !important; }
                html, body { background: #eee !important; display: block !important; isolation: isolate !important; }
                input, textarea, button, label, table, td, div, span { all: unset !important; }
                ${MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, cfg.iframeFontSize).replace(/__FONT_COLOR__/g, cfg.iframeFontColor)}
                .__MonkeyConfig_overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(0, 0, 0, 0.6) !important; z-index: 2147483646 !important; }
                .__MonkeyConfig_container { position: relative !important; width: 100% !important; height: 100% !important; padding: 1em !important; box-sizing: border-box !important; overflow-y: auto !important; border-radius: 0.5em !important; font-size: ${cfg.iframeFontSize} !important; isolation: isolate !important; background: #eee linear-gradient(180deg, #f8f8f8 0, #ddd 100%) !important; }
                .__MonkeyConfig_container h1 { font-size: 120% !important; font-weight: normal !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="checkbox"] { width: 11px !important; height: 11px !important; margin: 0 0.5em 0 0 !important; vertical-align: middle !important; accent-color: #007bff !important; display: inline-block !important; }
                .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="number"] { width: 40px !important; height: 20px !important; margin: 0 0.5em 0 0 !important; vertical-align: middle !important; display: inline-block !important; }
                .__MonkeyConfig_container textarea { width: 100% !important; padding: 1.2em !important; border: 1px solid #ccc !important; border-radius: 0.3em !important; box-sizing: border-box !important; font-size: 20px !important; color: ${cfg.iframeFontColor} !important; resize: vertical !important; min-height: 140px !important; white-space: pre-wrap !important; display: block !important; }
                .__MonkeyConfig_container button { background: #ccc linear-gradient(180deg, #ddd 0, #ccc 45%, #bbb 50%, #aaa 100%) !important; border: 1px solid #999 !important; border-radius: 0.5em !important; box-shadow: 0 0 1px #000 !important; padding: 12px 16px 12px 48px !important; white-space: nowrap !important; font-size: 20px !important; color: ${cfg.iframeFontColor} !important; cursor: pointer !important; display: inline-block !important; }
                .__MonkeyConfig_container button:hover { background: #d2d2d2 linear-gradient(180deg, #e2e2e2 0, #d2d2d2 45%, #c2c2c2 50%, #b2b2b2 100%) !important; }
                .__MonkeyConfig_container label { display: inline-block !important; line-height: 120% !important; vertical-align: middle !important; overflow-x: auto !important; white-space: nowrap !important; }
                .__MonkeyConfig_container table { border-spacing: 0 !important; margin: 0 !important; width: 100% !important; display: table !important; }
                .__MonkeyConfig_container td { border: none !important; line-height: 100% !important; padding: 0.3em !important; text-align: left !important; vertical-align: middle !important; white-space: normal !important; display: table-cell !important; }
            </style></head><body><div class="__MonkeyConfig_overlay"></div>${render()}</body></html>`);
            iframeDoc.close();
            openLayer = iframeFallback;
            openDone(iframeDoc);
            const iframeAppliedWidth = iframeFallback.offsetWidth;
            const iframeAppliedHeight = iframeFallback.offsetHeight;
            log(`Iframe actual applied dimensions - Width: ${iframeAppliedWidth}px, Height: ${iframeAppliedHeight}px`);
        } else {
            openDone(shadowRoot);
        }
    }
    function close() {
        if (openLayer) openLayer.parentNode.removeChild(openLayer);
        openLayer = shadowRoot = iframeFallback = undefined;
        displayed = false;
    }
    init();
}
MonkeyConfig.esc = string => string.replace(/"/g, '"');
MonkeyConfig.HTML = {
    _field: (name, opt) => opt.type && MonkeyConfig.HTML[opt.type] ? (opt.html ? opt.html.replace(/\[FIELD\]/, MonkeyConfig.HTML[opt.type](name, opt)) : MonkeyConfig.HTML[opt.type](name, opt)) : '',
    _label: (name, opt) => `<label for="__MonkeyConfig_field_${name}"${opt.labelAlign || opt.fontSize || opt.fontColor ? ` style="${[opt.labelAlign && `text-align:${opt.labelAlign}`, opt.fontSize && `font-size:${opt.fontSize}`, opt.fontColor && `color:${opt.fontColor}`].filter(Boolean).join(';')};"` : ''}>${opt.label || name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')}</label>`,
    checkbox: name => `<input id="__MonkeyConfig_field_${name}" type="checkbox" name="${name}" />`,
    custom: (name, opt) => opt.html || '',
    number: (name, opt) => `<input id="__MonkeyConfig_field_${name}" type="number" class="__MonkeyConfig_field_number" name="${name}" min="${opt.min || ''}" max="${opt.max || ''}" step="${opt.step || '1'}" />`,
    text: name => `<input id="__MonkeyConfig_field_${name}" type="text" class="__MonkeyConfig_field_text" name="${name}" />`,
    color: name => `<input id="__MonkeyConfig_field_${name}" type="color" class="__MonkeyConfig_field_text" name="${name}" />`,
    textarea: (name, opt) => `<textarea id="__MonkeyConfig_field_${name}" class="__MonkeyConfig_field_text" name="${name}" rows="${opt.rows || 4}" cols="${opt.cols || 20}"></textarea>`,
    range: (name, opt) => `<input id="__MonkeyConfig_field_${name}" type="range" name="${name}" min="${opt.min || 0}" max="${opt.max || 100}" step="${opt.step || 1}" />`,
    radio: (name, opt) => Object.entries(opt.choices).map(([val, text]) => `<label><input type="radio" name="${name}" value="${MonkeyConfig.esc(val)}" /> ${text}</label><br/>`).join(''),
    file: (name, opt) => `<input id="__MonkeyConfig_field_${name}" type="file" name="${name}" accept="${opt.accept || '*/*'}" />`,
    button: (name, opt) => `<button type="button" id="__MonkeyConfig_field_${name}" name="${name}">${opt.label || 'Click'}</button>`,
    group: (name, opt) => `<fieldset><legend>${opt.label || name}</legend>${Object.entries(opt.params).map(([subName, subOpt]) => MonkeyConfig.formatters.tr(subName, subOpt)).join('')}</fieldset>`,
    select: (name, opt) => {
        const choices = Array.isArray(opt.choices) ? Object.fromEntries(opt.choices.map(val => [val, val])) : opt.choices;
        return `<select id="__MonkeyConfig_field_${name}" class="__MonkeyConfig_field_select" name="${name}"${opt.multiple ? ' multiple="multiple"' : ''}>${Object.entries(choices).map(([val, text]) => `<option value="${MonkeyConfig.esc(val)}">${text}</option>`).join('')}</select>`;
    }
};
MonkeyConfig.formatters = {
    tr: (name, opt) => `<tr>${['checkbox', 'number', 'text'].includes(opt.type) ? `<td id="__MonkeyConfig_parent_${name}" colspan="2" class="__MonkeyConfig_inline">${MonkeyConfig.HTML._label(name, opt)} ${MonkeyConfig.HTML._field(name, opt)}</td>` : opt.type === 'group' ? `<td colspan="2">${MonkeyConfig.HTML._field(name, opt)}</td>` : `<td>${MonkeyConfig.HTML._label(name, opt)}</td><td id="__MonkeyConfig_parent_${name}">${MonkeyConfig.HTML._field(name, opt)}</td>`}</tr>`
};
MonkeyConfig.res = {
    icons: {
        // tidak ada perubahan
    },
    stylesheets: {
        main: `:host, body { all: initial; font-family: Arial, sans-serif !important; display: block !important; isolation: isolate; }
.__MonkeyConfig_container { display: flex !important; flex-direction: column !important; padding: 1em !important; font-size: __FONT_SIZE__ !important; color: __FONT_COLOR__ !important; background: #eee linear-gradient(180deg, #f8f8f8 0, #ddd 100%) !important; border-radius: 0.5em !important; box-shadow: 2px 2px 16px #000 !important; box-sizing: border-box !important; }
.__MonkeyConfig_container h1 { border-bottom: solid 1px #999 !important; font-size: 120% !important; font-weight: normal !important; margin: 0 0 0.5em 0 !important; padding: 0 0 0.3em 0 !important; text-align: center !important; }
.__MonkeyConfig_content { flex: 1 !important; overflow-y: auto !important; max-height: 60vh !important; }
.__MonkeyConfig_top, .__MonkeyConfig_bottom { margin-bottom: 1em !important; }
.__MonkeyConfig_columns { display: flex !important; justify-content: space-between !important; margin-bottom: 1em !important; }
.__MonkeyConfig_left_column, .__MonkeyConfig_right_column { width: 48% !important; }
.__MonkeyConfig_container table { border-spacing: 0 !important; margin: 0 !important; width: 100% !important; }
.__MonkeyConfig_container td { border: none !important; line-height: 100% !important; padding: 0.3em !important; text-align: left !important; vertical-align: middle !important; white-space: normal !important; }
.__MonkeyConfig_container td.__MonkeyConfig_inline { display: flex !important; align-items: center !important; white-space: nowrap !important; }
.__MonkeyConfig_container td.__MonkeyConfig_inline label { margin-right: 0.5em !important; flex-shrink: 0 !important; display: block !important; overflow-x: auto !important; white-space: nowrap !important; }
.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="checkbox"] { flex-grow: 0 !important; margin: 0 0.3em 0 0 !important; display: inline-block !important; width: 11px !important; height: 11px !important; }
.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="number"] { flex-grow: 0 !important; width: 40px !important; height: 20px !important; margin: 0 0.3em 0 0 !important; }
.__MonkeyConfig_buttons_container { margin-top: 1em !important; border-top: solid 1px #999 !important; padding-top: 0.6em !important; text-align: center !important; }
.__MonkeyConfig_buttons_container table { width: auto !important; margin: 0 auto !important; }
.__MonkeyConfig_buttons_container td { padding: 0.3em !important; }
.__MonkeyConfig_container button { background: #ccc linear-gradient(180deg, #ddd 0, #ccc 45%, #bbb 50%, #aaa 100%) !important; border: solid 1px !important; border-radius: 0.5em !important; box-shadow: 0 0 1px #000 !important; padding: 3px 8px 3px 24px !important; white-space: nowrap !important; }
.__MonkeyConfig_container button img { vertical-align: middle !important; }
.__MonkeyConfig_container label { line-height: 120% !important; vertical-align: middle !important; display: inline-block !important; overflow-x: auto !important; white-space: nowrap !important; }
.__MonkeyConfig_container textarea { vertical-align: text-top !important; width: 100% !important; white-space: pre-wrap !important; resize: vertical !important; text-align: left !important; }
.__MonkeyConfig_container input[type="text"], .__MonkeyConfig_container input[type="number"], .__MonkeyConfig_container input[type="color"] { background: #fff !important; }
.__MonkeyConfig_container button:hover { background: #d2d2d2 linear-gradient(180deg, #e2e2e2 0, #d2d2d2 45%, #c2c2c2 50%, #b2b2b2 100%) !important; }
@media (max-width: 600px) { .__MonkeyConfig_columns { flex-direction: column !important; } .__MonkeyConfig_left_column, .__MonkeyConfig_right_column { width: 100% !important; } }`
    }
};
