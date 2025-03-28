// ==UserScript==
// @name            MonkeyConfig Mod
// @noframes
// @version         2.1
// @namespace       http://odyniec.net/
// @contributionURL https://saweria.co/Bloggerpemula
// @description     Enhanced Configuration Dialog Builder with column layout, custom styling, additional input types
// ==/UserScript==

function MonkeyConfig(data) {
    let cfg = this, params = data.parameters || data.params, values = {}, storageKey,
        displayed, openLayer, shadowRoot, container, iframeFallback;

    function log(message) {
        if (message === 'Dialog appended to body via Shadow DOM' || message === 'Shadow DOM failed, switching to iframe fallback') {
            console.log(`[MonkeyConfig v2.1] ${message}`);
        }
    }

    function init() {
        data.buttons = data.buttons || ['save', 'defaults', 'cancel', 'homepage'];
        storageKey = '_MonkeyConfig_' + data.title.replace(/[^a-zA-Z0-9]/g, '_') + '_cfg';
        const storedValues = GM_getValue(storageKey) ? JSON.parse(GM_getValue(storageKey)) : {};

        // Inisialisasi nilai ukuran dan font dari penyimpanan atau default
        this.shadowWidth = storedValues.shadowWidth || (data.shadowWidth || "600px");
        this.shadowHeight = storedValues.shadowHeight || (data.shadowHeight || "400px");
        this.iframeWidth = storedValues.iframeWidth || (data.iframeWidth || "600px");
        this.iframeHeight = storedValues.iframeHeight || (data.iframeHeight || "300px");
        this.fontSize = storedValues.fontSize || (data.fontSize || "14px");
        this.fontColor = storedValues.fontColor || (data.fontColor || "#000000");
        this.title = data.title || (typeof GM_getMetadata === 'function' ? GM_getMetadata('name') + ' Configuration' : 'Configuration');

        // Inisialisasi parameter
        for (let key in params) {
            const param = params[key];
            values[key] = storedValues[key] ?? param.default ?? '';
        }

        if (data.menuCommand) GM_registerMenuCommand(data.menuCommand === true ? this.title : data.menuCommand, () => cfg.open());
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
        let html = `<div class="__MonkeyConfig_container"><h1>${this.title}</h1><div class="__MonkeyConfig_content"><div class="__MonkeyConfig_top">`;
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
            if (btn === 'cancel') html += `<button type="button" id="__MonkeyConfig_button_cancel"><img src="data:image/png;base64,${MonkeyConfig.res.icons.cancel}" alt="Cancel"/> Cancel</button>`;
            else if (btn === 'defaults') html += `<button type="button" id="__MonkeyConfig_button_defaults"><img src="data:image/png;base64,${MonkeyConfig.res.icons.arrow_undo}" alt="Defaults"/> Set Defaults</button>`;
            else if (btn === 'save') html += `<button type="button" id="__MonkeyConfig_button_save"><img src="data:image/png;base64,${MonkeyConfig.res.icons.tick}" alt="Save"/> Save</button>`;
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
            if (param.type === 'checkbox') elem.checked = !!values[key];
            else if (param.type === 'custom' && param.set) param.set(values[key], root.querySelector(`#__MonkeyConfig_parent_${key}`));
            else if (['number', 'text', 'color', 'textarea', 'range'].includes(param.type)) elem.value = values[key] || param.default;
            else if (param.type === 'radio') { const radio = root.querySelector(`[name="${key}"][value="${values[key]}"]`); if (radio) radio.checked = true; }
            else if (param.type === 'file') elem.value = '';
            else if (param.type === 'select') {
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
            elem.style.fontSize = this.fontSize;
            elem.style.color = this.fontColor;
            const label = root.querySelector(`label[for="__MonkeyConfig_field_${key}"]`);
            if (label) {
                label.style.fontSize = this.fontSize;
                label.style.color = this.fontColor;
                label.style.cssText += param.type === 'textarea' ? 'text-align:center;display:block;width:100%' : 'text-align:left;display:inline-block;width:auto';
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
        // Simpan semua nilai, termasuk ukuran dan font
        const allValues = {
            ...values,
            shadowWidth: this.shadowWidth,
            shadowHeight: this.shadowHeight,
            iframeWidth: this.iframeWidth,
            iframeHeight: this.iframeHeight,
            fontSize: this.fontSize,
            fontColor: this.fontColor
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
            const defaultsBtn = root.querySelector('#__MonkeyConfig_button_defaults');
            if (defaultsBtn) defaultsBtn.addEventListener('click', setDefaults, false);
            const cancelBtn = root.querySelector('#__MonkeyConfig_button_cancel');
            if (cancelBtn) cancelBtn.addEventListener('click', close, false);
            const homepageBtn = root.querySelector('#__MonkeyConfig_button_homepage');
            if (homepageBtn) homepageBtn.addEventListener('click', () => window.open('https://bloggerpemula.pythonanywhere.com/', '_blank'), false);
            displayed = true;
            update();
        }

        const body = document.querySelector('body') || document.documentElement;
        if (!body) return;

        openLayer = document.createElement('div');
        openLayer.className = '__MonkeyConfig_layer';
        shadowRoot = openLayer.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
            <style>
                :host { all: initial; display: block !important; font-family: Arial, sans-serif !important; isolation: isolate; z-index: 2147483647 !important; font-size: ${this.fontSize} !important; }
                h1 { font-size: 120% !important; font-weight: normal !important; margin: 0 !important; padding: 0 !important; }
                ${MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, this.fontSize).replace(/__FONT_COLOR__/g, this.fontColor)}
                .__MonkeyConfig_overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(0, 0, 0, 0.6) !important; z-index: 2147483646 !important; }
                .__MonkeyConfig_container { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: 2147483647 !important; width: ${this.shadowWidth} !important; height: ${this.shadowHeight} !important; max-width: 90vw !important; max-height: 80vh !important; overflow-y: auto !important; }
            </style>
            <div class="__MonkeyConfig_overlay"></div>
            ${render()}
        `;
        container = shadowRoot.querySelector('.__MonkeyConfig_container');
        openLayer.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 2147483647 !important;';
        body.appendChild(openLayer);
        log('Dialog appended to body via Shadow DOM');

        if (!container || shadowRoot.querySelector('.__MonkeyConfig_overlay').offsetHeight === 0) {
            log('Shadow DOM failed, switching to iframe fallback');
            body.removeChild(openLayer);
            shadowRoot = null;
            iframeFallback = document.createElement('iframe');
            iframeFallback.style.cssText = `position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: ${this.iframeWidth} !important; height: ${this.iframeHeight} !important; max-width: 90vw !important; max-height: 80vh !important; z-index: 2147483647 !important; border: none !important; background: #eee !important;`;
            body.appendChild(iframeFallback);
            const iframeDoc = iframeFallback.contentDocument;
            iframeDoc.open();
            iframeDoc.write(`<!DOCTYPE html><html><head><style>body { margin: 0 !important; padding: 0 !important; background: #eee linear-gradient(180deg, #f8f8f8 0, #ddd 100%) !important; font-family: Arial, sans-serif !important; font-size: ${this.fontSize} !important; color: ${this.fontColor} !important; }${MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, this.fontSize).replace(/__FONT_COLOR__/g, this.fontColor)}.__MonkeyConfig_overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(0, 0, 0, 0.6) !important; z-index: 2147483646 !important; }.__MonkeyConfig_container { position: relative !important; width: 100% !important; height: 100% !important; overflow-y: auto !important; }</style></head><body><div class="__MonkeyConfig_overlay"></div>${render()}</body></html>`);
            iframeDoc.close();
            openLayer = iframeFallback;
            openDone(iframeDoc);
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
        arrow_undo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIJSURBVDjLpVM9aJNRFD35GsRSoUKKzQ/B0NJJF3EQlKrVgijSCBmC4NBFKihIcXBwEZdSHVoUwUInFUEkQ1DQ4CKiFsQsTrb5xNpgaZHw2Uog5t5zn0NJNFaw0guX97hwzuPcc17IOYfNlIdNVrhxufR6xJkZjAbSQGXjNAorqixSWFDV3KPhJ+UGLtSQMPryrDscPwLnAHOEOQc6gkbUpIagGmApWIb/pZRX4fjj889nWiSQtgYyBZ1BTUEj6AjPa0P71nb0Jfqwa+futIheHrzRn2yRQCUK/lOQhApBJVQJChHfnkCqOwWEQ+iORJHckUyX5ksvAEyGNuJC+s6xCRXNHNxzKMmQ4luwgjfvZp69uvr2+IZcyJ8rjIporrxURggetnV0QET3rrPxzMNM2+n7p678jUTrCiWhphAjVHR9DlR0WkSzf4IHxg5MSF0zXZEuVKWKSlCBCostS8zeG7oV64wPqxInbw86lbVXKEQ8mkAqmUJ4SxieeVhcnANFC02C7N2h69HO2IXeWC8MDj2JnqaFNAMd8f3HKjx6+LxQRmnOz1OZaxKIaF1VISYwB9ARZoQaYY6o1WpYCVYxt+zDn/XzVBv/MOWXW5J44ubRyVgkelFpmF/4BJVfOVDlVyqLVBZI5manPjajDOdcswfG9k/3X9v3/vfZv7rFBanriIo++J/f+BMT+YWS6hXl7QAAAABJRU5ErkJggg==',
        cancel: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHdSURBVDjLpZNraxpBFIb3a0ggISmmNISWXmOboKihxpgUNGWNSpvaS6RpKL3Ry//Mh1wgf6PElaCyzq67O09nVjdVlJbSDy8Lw77PmfecMwZg/I/GDw3DCo8HCkZl/RlgGA0e3Yfv7+DbAfLrW+SXOvLTG+SHV/gPbuMZRnsyIDL/OASziMxkkKkUQTJJsLaGn8/iHz6nd+8mQv87Ahg2H9Th/BxZqxEkEgSrq/iVCvLsDK9awtvfxb2zjD2ARID+lVVlbabTgWYTv1rFL5fBUtHbbeTJCb3EQ3ovCnRC6xAgzJtOE+ztheYIEkqbFaS3vY2zuIj77AmtYYDusPy8/zuvunJkDKXM7tYWTiyGWFjAqeQnAD6+7ueNx/FLpRGAru7mcoj5ebqzszil7DggeF/DX1BN82rzPqrzbRayIsLhJqMPT2N83Sdy2GApwFqRN7jFPL0tF+10cDd3MTZ2AjNUkGCoyO6y9cRxfQowFUbpufr1ct4ZoHg+Dg067zduTmEbq4yi/UkYidDe+kaTcP4ObJIajksPd/eyx3c+N2rvPbMDPbUFPZSLKzcGjKPrbJaDsu+dQO3msfZzeGY2TCvKGYQhdSYeeJjUt21dIcjXQ7U7Kv599f4j/oF55W4g/2e3b8AAAAASUVORK5CYII=',
        tick: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjRuqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/26gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrEh546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8VgBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUPujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmHvwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaNZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzSCwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTkSuQmCC',
        home: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAACB0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVi7kSokAAAAFnRFWHRDcmVhdGlvbiBUaW1lADExLzA1LzA33bqJ2wAAAlxJREFUeJx9U0tIVGEU/v7fe30wLQxCDKdykmrUCiqTIgrG1pGBMElto1VQyySMWhVl0qJNix6QGLhQWom6isRHE5SWBWLFNGqlmTWOd+bOf85pcfU6I9WBsznn+77z4BwlIsi1089e791QWHDNVqrOUggaJiQzJpFyTSzpmqsDZ46M5eJVrsC53rfdtlaNsa+/EE86cMnL2VqhrMRCKGDDMdTTf/boqTyBqcXl4ruvPk9O/VwODs0s4n8WClgotZDYF5Adt5siaQ0AN4Y/dv6NHA1vRntDdV7sU8pgLk3B5wumEwDUhf53Bw3L6NMPs+vI5WiPhMECdL2ZwqWhL3n5qkICMdcXhKPnH43NJasW0tk88p1IGCwCFmBXWSm22IS+xG8fYwRQTJV6Y1FBTTzp/IO85id3V+JmfYWPS7GCJlNjEUvF6raj4XK0RcIgETCL3wGLQERwonYbWASXX86AoWCIKrRh8lUvHqj0iJxbncEinqgIjm0vh/1jxhuDGDqTpWlbKwDA4Y5h0AqYRPDwxRgeD46vibHg+K0OaGcJSgRZ4mk957gTZSWW30UuuK1vBG19IyAWz1eOLhPcCYtcuNATulijJRSwfQFaGWEVnN5anbfMVdPpFEw226K7mg7FHEM9oYDld0DrwMTsdwEAVnoJWZae+dbmmAUADZsKmwe+OZPBIhUMPxhEcfx93tHsfzLqx7QCOOMk3Nl4M7Dumerv93cLc+N3o5BiBYa3XCUCi1zodMqrfCWa/0y5Vnuvdw+YrgtRHZEJGmK4jERWJGZEtc63NI3n4v8As6uX85AjWHEAAAAASUVORK5CYII='
    },
    stylesheets: {
        main: `:host, body { all: initial; font-family: Arial, sans-serif !important; display: block !important; isolation: isolate; }.__MonkeyConfig_container { display: flex !important; flex-direction: column !important; padding: 1em !important; font-size: __FONT_SIZE__ !important; color: __FONT_COLOR__ !important; background: #eee linear-gradient(180deg, #f8f8f8 0, #ddd 100%) !important; border-radius: 0.5em !important; box-shadow: 2px 2px 16px #000 !important; box-sizing: border-box !important; }.__MonkeyConfig_container h1 { border-bottom: solid 1px #999 !important; font-size: 120% !important; font-weight: normal !important; margin: 0 0 0.5em 0 !important; padding: 0 0 0.3em 0 !important; text-align: center !important; }.__MonkeyConfig_content { flex: 1 !important; overflow-y: auto !important; max-height: 60vh !important; }.__MonkeyConfig_top, .__MonkeyConfig_bottom { margin-bottom: 1em !important; }.__MonkeyConfig_columns { display: flex !important; justify-content: space-between !important; margin-bottom: 1em !important; }.__MonkeyConfig_left_column, .__MonkeyConfig_right_column { width: 48% !important; }.__MonkeyConfig_container table { border-spacing: 0 !important; margin: 0 !important; width: 100% !important; }.__MonkeyConfig_container td { border: none !important; line-height: 100% !important; padding: 0.3em !important; text-align: left !important; vertical-align: middle !important; white-space: normal !important; }.__MonkeyConfig_container td.__MonkeyConfig_inline { display: flex !important; align-items: center !important; white-space: nowrap !important; }.__MonkeyConfig_container td.__MonkeyConfig_inline label { margin-right: 0.5em !important; flex-shrink: 0 !important; display: block !important; }.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="checkbox"] { flex-grow: 0 !important; margin: 0 0.3em 0 0 !important; display: inline-block !important; width: 16px !important; height: 16px !important; }.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="number"], .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="text"] { flex-grow: 0 !important; width: 100px !important; min-width: 50px !important; }.__MonkeyConfig_buttons_container { margin-top: 1em !important; border-top: solid 1px #999 !important; padding-top: 0.6em !important; text-align: center !important; }.__MonkeyConfig_buttons_container table { width: auto !important; margin: 0 auto !important; }.__MonkeyConfig_buttons_container td { padding: 0.3em !important; }.__MonkeyConfig_container button { background: #ccc linear-gradient(180deg, #ddd 0, #ccc 45%, #bbb 50%, #aaa 100%) !important; border: solid 1px !important; border-radius: 0.5em !important; box-shadow: 0 0 1px #000 !important; padding: 3px 8px 3px 24px !important; white-space: nowrap !important; }.__MonkeyConfig_container button img { vertical-align: middle !important; }.__MonkeyConfig_container label { line-height: 120% !important; vertical-align: middle !important; display: inline-block !important; }.__MonkeyConfig_container textarea { vertical-align: text-top !important; width: 100% !important; white-space: pre-wrap !important; resize: vertical !important; text-align: left !important; }.__MonkeyConfig_container input[type="text"], .__MonkeyConfig_container input[type="number"], .__MonkeyConfig_container input[type="color"] { background: #fff !important; }.__MonkeyConfig_container button:hover { background: #d2d2d2 linear-gradient(180deg, #e2e2e2 0, #d2d2d2 45%, #c2c2c2 50%, #b2b2b2 100%) !important; }@media (max-width: 600px) { .__MonkeyConfig_columns { flex-direction: column !important; } .__MonkeyConfig_left_column, .__MonkeyConfig_right_column { width: 100% !important; } }`
    }
};

// Contoh Penggunaan
const dynamicConfig = new MonkeyConfig({
    title: "Dynamic Size Configuration",
    menuCommand: "Open Dynamic Config",
    parameters: {
        shadowWidth: { 
            type: "number", 
            default: 600, 
            label: "Shadow DOM Width (px)", 
            min: 200, 
            max: 1200 
        },
        shadowHeight: { 
            type: "number", 
            default: 400, 
            label: "Shadow DOM Height (px)", 
            min: 100, 
            max: 800 
        },
        iframeWidth: { 
            type: "number", 
            default: 600, 
            label: "Iframe Width (px)", 
            min: 200, 
            max: 1200 
        },
        iframeHeight: { 
            type: "number", 
            default: 300, 
            label: "Iframe Height (px)", 
            min: 100, 
            max: 600 
        },
        fontSize: { 
            type: "number", 
            default: 14, 
            label: "Font Size (px)", 
            min: 8, 
            max: 24 
        },
        sampleCheckbox: { 
            type: "checkbox", 
            default: true, 
            label: "Sample Option" 
        }
    },
    onSave: function(values) {
        // Perbarui properti instance dengan unit "px"
        dynamicConfig.shadowWidth = values.shadowWidth + "px";
        dynamicConfig.shadowHeight = values.shadowHeight + "px";
        dynamicConfig.iframeWidth = values.iframeWidth + "px";
        dynamicConfig.iframeHeight = values.iframeHeight + "px";
        dynamicConfig.fontSize = values.fontSize + "px";
        
        // Tutup dan buka ulang untuk menerapkan perubahan
        dynamicConfig.close();
        dynamicConfig.open();
        
        console.log("Configuration Updated:", {
            shadowWidth: dynamicConfig.shadowWidth,
            shadowHeight: dynamicConfig.shadowHeight,
            iframeWidth: dynamicConfig.iframeWidth,
            iframeHeight: dynamicConfig.iframeHeight,
            fontSize: dynamicConfig.fontSize,
            sampleCheckbox: values.sampleCheckbox
        });
    }
});
