// ==UserScript==
// @name           MonkeyConfig Mod
// @namespace      http://odyniec.net/
// @description    Enhanced Configuration Dialog Builder with column layout, custom styling, and Additional input types using Shadow DOM
// @version        1.9
// ==/UserScript==

/*
 * MonkeyConfig Modern Reloaded Enhanced
 * Based on version 0.1.4 by Michal Wojciechowski (odyniec.net)
 * v0.1.4 - January 2020 - David Hosier (https://github.com/david-hosier/MonkeyConfig)
 * Enhanced by Bloggerpemula - March 2025
 * Modified by Grok - March 2025: Added Shadow DOM for consistent styling across sites
 */

function MonkeyConfig(data) {
    var cfg = this,
        params,
        values = {},
        storageKey,
        displayed,
        openLayer,
        shadowRoot,
        container,
        overlay;

    function init() {
        params = data.parameters || data.params;
        data.buttons = data.buttons === undefined ? ['save', 'defaults', 'cancel'] : data.buttons;
        data.fontSize = data.fontSize || '11pt';
        data.fontColor = data.fontColor || '#000000';
        data.width = data.width || '600px';  // Default width
        data.height = data.height || 'auto'; // Default height

        if (!data.title) {
            data.title = typeof GM_getMetadata === 'function' ? GM_getMetadata('name') + ' Configuration' : 'Configuration';
        }

        var safeTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_');
        storageKey = '_MonkeyConfig_' + safeTitle + '_cfg';

        var storedValues = GM_getValue(storageKey) ? JSON.parse(GM_getValue(storageKey)) : {};

        for (var paramName in params) {
            var param = params[paramName];
            if (param.value !== undefined) {
                set(paramName, param.value);
            } else if (storedValues[paramName] !== undefined) {
                set(paramName, storedValues[paramName]);
            } else if (param.default !== undefined) {
                set(paramName, param.default);
            } else {
                set(paramName, '');
            }
        }

        if (data.menuCommand) {
            var caption = data.menuCommand !== true ? data.menuCommand : data.title;
            GM_registerMenuCommand(caption, function () { cfg.open(); });
        }

        cfg.open = open;
        cfg.close = close;
        cfg.get = get;
        cfg.set = function (name, value) { set(name, value); update(); };
    }

    function get(name) { return values[name]; }
    function set(name, value) { values[name] = value; }
    function setDefaults() {
        for (var paramName in params) {
            if (params[paramName].default !== undefined) {
                set(paramName, params[paramName].default);
            }
        }
        update();
    }

    function render() {
        var html = '<div class="__MonkeyConfig_container">' +
            '<h1>' + data.title + '</h1>' +
            '<div class="__MonkeyConfig_content">' +
            '<div class="__MonkeyConfig_top">';
        for (var paramName in params) {
            if (params[paramName].column === 'top') {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</div>' +
            '<div class="__MonkeyConfig_columns">' +
            '<div class="__MonkeyConfig_left_column">';
        for (var paramName in params) {
            if (params[paramName].column === 'left') {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</div><div class="__MonkeyConfig_right_column">';
        for (var paramName in params) {
            if (params[paramName].column === 'right') {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</div></div>' +
            '<table class="__MonkeyConfig_default">';
        for (var paramName in params) {
            if (!params[paramName].column) {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</table>' +
            '<div class="__MonkeyConfig_bottom">';
        for (var paramName in params) {
            if (params[paramName].column === 'bottom') {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</div></div><div class="__MonkeyConfig_buttons_container"><table><tr>';

        for (var i = 0; i < data.buttons.length; i++) {
            html += '<td>';
            switch (data.buttons[i]) {
                case 'cancel':
                    html += '<button type="button" id="__MonkeyConfig_button_cancel"><img src="data:image/png;base64,' + MonkeyConfig.res.icons.cancel + '" alt="Cancel"/> Cancel</button>';
                    break;
                case 'defaults':
                    html += '<button type="button" id="__MonkeyConfig_button_defaults"><img src="data:image/png;base64,' + MonkeyConfig.res.icons.arrow_undo + '" alt="Defaults"/> Set Defaults</button>';
                    break;
                case 'save':
                    html += '<button type="button" id="__MonkeyConfig_button_save"><img src="data:image/png;base64,' + MonkeyConfig.res.icons.tick + '" alt="Save"/> Save</button>';
                    break;
            }
            html += '</td>';
        }

        html += '</tr></table></div></div>';
        return html;
    }

    function update() {
        if (!displayed) return;

        for (var paramName in params) {
            var value = values[paramName];
            var elem = shadowRoot.querySelector('[name="' + paramName + '"]'); // Gunakan shadowRoot
            if (!elem) continue;
            switch (params[paramName].type) {
                case 'checkbox':
                    elem.checked = !!value;
                    break;
                case 'custom':
                    if (params[paramName].set) {
                        params[paramName].set(value, shadowRoot.querySelector('#__MonkeyConfig_parent_' + paramName));
                    }
                    break;
                case 'number':
                case 'text':
                case 'color':
                case 'textarea':
                case 'range':
                    elem.value = value;
                    break;
                case 'radio':
                    var radio = shadowRoot.querySelector('[name="' + paramName + '"][value="' + value + '"]');
                    if (radio) radio.checked = true;
                    break;
                case 'file':
                    elem.value = '';
                    break;
                case 'select':
                    if (elem.tagName.toLowerCase() === 'input' && elem.type === 'checkbox') {
                        var checkboxes = shadowRoot.querySelectorAll('input[name="' + paramName + '"]');
                        for (var i = 0; i < checkboxes.length; i++) {
                            checkboxes[i].checked = value.indexOf(checkboxes[i].value) > -1;
                        }
                    } else if (elem.multiple) {
                        var options = shadowRoot.querySelectorAll('select[name="' + paramName + '"] option');
                        for (var i = 0; i < options.length; i++) {
                            options[i].selected = value.indexOf(options[i].value) > -1;
                        }
                    } else {
                        elem.value = value;
                    }
                    break;
            }
            elem.style.fontSize = params[paramName].fontSize || data.fontSize;
            elem.style.color = params[paramName].fontColor || data.fontColor;
            var label = shadowRoot.querySelector('label[for="__MonkeyConfig_field_' + paramName + '"]');
            if (label) {
                label.style.fontSize = params[paramName].fontSize || data.fontSize;
                label.style.color = params[paramName].fontColor || data.fontColor;
                label.style.textAlign = params[paramName].labelAlign || 'left';
            }
        }
    }

    function saveClick() {
        for (var paramName in params) {
            var elem = shadowRoot.querySelector('[name="' + paramName + '"]');
            if (!elem) continue;
            switch (params[paramName].type) {
                case 'checkbox':
                    values[paramName] = elem.checked;
                    break;
                case 'custom':
                    if (params[paramName].get) {
                        values[paramName] = params[paramName].get(shadowRoot.querySelector('#__MonkeyConfig_parent_' + paramName));
                    }
                    break;
                case 'number':
                case 'text':
                case 'color':
                case 'textarea':
                case 'range':
                    values[paramName] = elem.value;
                    break;
                case 'radio':
                    var checkedRadio = shadowRoot.querySelector('[name="' + paramName + '"]:checked');
                    values[paramName] = checkedRadio ? checkedRadio.value : '';
                    break;
                case 'file':
                    values[paramName] = elem.dataset.value || values[paramName];
                    break;
                case 'select':
                    if (elem.tagName.toLowerCase() === 'input' && elem.type === 'checkbox') {
                        values[paramName] = [];
                        var inputs = shadowRoot.querySelectorAll('input[name="' + paramName + '"]');
                        for (var i = 0; i < inputs.length; i++) {
                            if (inputs[i].checked) values[paramName].push(inputs[i].value);
                        }
                    } else if (elem.multiple) {
                        values[paramName] = [];
                        var options = shadowRoot.querySelectorAll('select[name="' + paramName + '"] option');
                        for (var i = 0; i < options.length; i++) {
                            if (options[i].selected) values[paramName].push(options[i].value);
                        }
                    } else {
                        values[paramName] = elem.value;
                    }
                    break;
            }
        }

        GM_setValue(storageKey, JSON.stringify(values));
        close();
        if (data.onSave) data.onSave(values);
        location.reload();
    }

    function cancelClick() { close(); }

    function open() {
        function openDone() {
            var saveBtn = shadowRoot.querySelector('#__MonkeyConfig_button_save');
            var defaultsBtn = shadowRoot.querySelector('#__MonkeyConfig_button_defaults');
            var cancelBtn = shadowRoot.querySelector('#__MonkeyConfig_button_cancel');

            if (saveBtn) saveBtn.addEventListener('click', saveClick, false);
            if (defaultsBtn) defaultsBtn.addEventListener('click', function () { setDefaults(); }, false);
            if (cancelBtn) cancelBtn.addEventListener('click', cancelClick, false);

            displayed = true;
            update();
        }

        // Buat layer dan overlay
        var body = document.querySelector('body');
        openLayer = document.createElement('div');
        openLayer.className = '__MonkeyConfig_layer';
        overlay = document.createElement('div');
        overlay.className = '__MonkeyConfig_overlay';
        overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999;background-color:#000;opacity:0.6;';

        // Buat Shadow DOM
        shadowRoot = openLayer.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<style>' + MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, data.fontSize).replace(/__FONT_COLOR__/g, data.fontColor) + '</style>' + render();
        container = shadowRoot.querySelector('.__MonkeyConfig_container');

        // Atur posisi dan ukuran layer
        openLayer.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-height:80vh;overflow-y:auto;z-index:10000;width:' + data.width + ';height:' + data.height + ';';

        // Tambahkan ke dokumen
        body.appendChild(overlay);
        body.appendChild(openLayer);
        openDone();

        window.addEventListener('resize', function () {
            overlay.style.width = window.innerWidth + 'px';
            overlay.style.height = window.innerHeight + 'px';
        });
    }

    function close() {
        if (openLayer) { openLayer.parentNode.removeChild(openLayer); openLayer = undefined; }
        if (overlay) { overlay.parentNode.removeChild(overlay); overlay = undefined; }
        shadowRoot = undefined;
        displayed = false;
    }

    init();
}

MonkeyConfig.esc = function (string) { return string.replace(/"/g, '"'); };

MonkeyConfig.HTML = {
    '_field': function (name, options) {
        return options.type && MonkeyConfig.HTML[options.type] ? options.html ? options.html.replace(/\[FIELD\]/, MonkeyConfig.HTML[options.type](name, options)) : MonkeyConfig.HTML[options.type](name, options) : '';
    },
    '_label': function (name, options) {
        var label = options.label || name.substring(0, 1).toUpperCase() + name.substring(1).replace(/_/g, ' ');
        var styles = [];
        if (options.labelAlign) styles.push('text-align:' + options.labelAlign);
        if (options.fontSize) styles.push('font-size:' + options.fontSize);
        if (options.fontColor) styles.push('color:' + options.fontColor);
        var styleAttr = styles.length > 0 ? ' style="' + styles.join(';') + ';"' : '';
        return '<label for="__MonkeyConfig_field_' + name + '"' + styleAttr + '>' + label + '</label>';
    },
    'checkbox': function (name) { return '<input id="__MonkeyConfig_field_' + name + '" type="checkbox" name="' + name + '" />'; },
    'custom': function (name, options) { return options.html || ''; },
    'number': function (name, options) { return '<input id="__MonkeyConfig_field_' + name + '" type="number" class="__MonkeyConfig_field_number" name="' + name + '" min="' + (options.min || '') + '" max="' + (options.max || '') + '" step="' + (options.step || '1') + '" />'; },
    'text': function (name) { return '<input id="__MonkeyConfig_field_' + name + '" type="text" class="__MonkeyConfig_field_text" name="' + name + '" />'; },
    'color': function (name) { return '<input id="__MonkeyConfig_field_' + name + '" type="color" class="__MonkeyConfig_field_text" name="' + name + '" />'; },
    'textarea': function (name, options) { return '<textarea id="__MonkeyConfig_field_' + name + '" class="__MonkeyConfig_field_text" name="' + name + '" rows="' + (options.rows || 4) + '" cols="' + (options.cols || 20) + '"></textarea>'; },
    'range': function (name, options) { return '<input id="__MonkeyConfig_field_' + name + '" type="range" name="' + name + '" min="' + (options.min || 0) + '" max="' + (options.max || 100) + '" step="' + (options.step || 1) + '" />'; },
    'radio': function (name, options) {
        var html = '';
        for (var value in options.choices) {
            html += '<label><input type="radio" name="' + name + '" value="' + MonkeyConfig.esc(value) + '" /> ' + options.choices[value] + '</label><br/>';
        }
        return html;
    },
    'file': function (name, options) { return '<input id="__MonkeyConfig_field_' + name + '" type="file" name="' + name + '" accept="' + (options.accept || '*/*') + '" />'; },
    'button': function (name, options) { return '<button type="button" id="__MonkeyConfig_field_' + name + '" name="' + name + '">' + (options.label || 'Click') + '</button>'; },
    'group': function (name, options) {
        var html = '<fieldset><legend>' + (options.label || name) + '</legend>';
        for (var subName in options.params) {
            html += MonkeyConfig.formatters.tr(subName, options.params[subName]);
        }
        html += '</fieldset>';
        return html;
    },
    'select': function (name, options) {
        var choices = options.choices.constructor === Array ? options.choices.reduce(function (obj, val) { obj[val] = val; return obj; }, {}) : options.choices;
        var html = '<select id="__MonkeyConfig_field_' + name + '" class="__MonkeyConfig_field_select" name="' + name + '"' + (options.multiple ? ' multiple="multiple"' : '') + '>';
        for (var value in choices) {
            html += '<option value="' + MonkeyConfig.esc(value) + '">' + choices[value] + '</option>';
        }
        html += '</select>';
        return html;
    }
};

MonkeyConfig.formatters = {
    'tr': function (name, options) {
        var html = '<tr>';
        if (options.type === 'checkbox' || options.type === 'number' || options.type === 'text') {
            html += '<td id="__MonkeyConfig_parent_' + name + '" colspan="2" class="__MonkeyConfig_inline">' +
                MonkeyConfig.HTML._label(name, options) + ' ' + 
                MonkeyConfig.HTML._field(name, options) + 
                '</td>';
        } else if (options.type === 'group') {
            html += '<td colspan="2">' + MonkeyConfig.HTML._field(name, options) + '</td>';
        } else {
            html += '<td>' + MonkeyConfig.HTML._label(name, options) + '</td><td id="__MonkeyConfig_parent_' + name + '">' + MonkeyConfig.HTML._field(name, options) + '</td>';
        }
        html += '</tr>';
        return html;
    }
};

MonkeyConfig.res = {
    icons: {
        'arrow_undo': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIJSURBVDjLpVM9aJNRFD35GsRSoUKKzQ/B0NJJF3EQlKrVgijSCBmC4NBFKihIcXBwEZdSHVoUwUInFUEkQ1DQ4CKiFsQsTrb5xNpgaZHw2Uog5t5zn0NJNFaw0guX97hwzuPcc17IOYfNlIdNVrhxufR6xJkZjAbSQGXjNAorqixSWFDV3KPhJ+UGLtSQMPryrDscPwLnAHOEOQc6gkbUpIagGmApWIb/pZRX4fjj889nWiSQtgYyBZ1BTUEj6AjPa0P71nb0Jfqwa+futIheHrzRn2yRQCUK/lOQhApBJVQJChHfnkCqOwWEQ+iORJHckUyX5ksvAEyGNuJC+s6xCRXNHNxzKMmQ4luwgjfvZp69uvr2+IZcyJ8rjIporrxURggetnV0QET3rrPxzMNM2+n7p678jUTrCiWhphAjVHR9DlR0WkSzf4IHxg5MSF0zXZEuVKWKSlCBCostS8zeG7oV64wPqxInbw86lbVXKEQ8mkAqmUJ4SxieeVhcnANFC02C7N2h69HO2IXeWC8MDj2JnqaFNAMd8f3HKjx6+LxQRmnOz1OZaxKIaF1VISYwB9ARZoQaYY6o1WpYCVYxt+zDn/XzVBv/MOWXW5J44ubRyVgkelFpmF/4BJVfOVDlVyqLVBZI5manPjajDOdcswfG9k/3X9v3/vfZv7rFBanriIo++J/f+BMT+YWS6hXl7QAAAABJRU5ErkJggg==',
        'cancel': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0\
U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHdSURBVDjLpZNraxpBFIb3a0ggISmmNISW\
XmOboKihxpgUNGWNSpvaS6RpKL3Ry//Mh1wgf6PElaCyzq67O09nVjdVlJbSDy8Lw77PmfecMwZg\
/I/GDw3DCo8HCkZl/RlgGA0e3Yfv7+DbAfLrW+SXOvLTG+SHV/gPbuMZRnsyIDL/OASziMxkkKkU\
QTJJsLaGn8/iHz6nd+8mQv87Ahg2H9Th/BxZqxEkEgSrq/iVCvLsDK9awtvfxb2zjD2ARID+lVVl\
babTgWYTv1rFL5fBUtHbbeTJCb3EQ3ovCnRC6xAgzJtOE+ztheYIEkqbFaS3vY2zuIj77AmtYYDu\
sPy8/zuvunJkDKXM7tYWTiyGWFjAqeQnAD6+7ueNx/FLpRGAru7mcoj5ebqzszil7DggeF/DX1B\
N82rzPqrzbRayIsLhJqMPT2N83Sdy2GApwFqRN7jFPL0tF+10cDd3MTZ2AjNUkGCoyO6y9cRxfQo\
wFUbpufr1ct4ZoHg+Dg067zduTmEbq4yi/UkYidDe+kaTcP4ObJIajksPd/eyx3c+N2rvPbMDPbU\
FPZSLKzcGjKPrbJaDsu+dQO3msfZzeGY2TCvKGYQhdSYeeJjUt21dIcjXQ7U7Kv599f4j/oF55W4\
g/2e3b8AAAAASUVORK5CYII=',
        'tick': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjRuqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/26gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrEh546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8VgBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUPujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmHvwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaNZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzSCwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTkSuQmCC'
    },
    stylesheets: {
        main: `
            /* Styling dalam Shadow DOM tidak perlu !important berlebihan */
            .__MonkeyConfig_container {
                display: flex;
                flex-direction: column;
                padding: 1em;
                font-size: __FONT_SIZE__;
                color: __FONT_COLOR__;
                background: #eee linear-gradient(180deg, #f8f8f8 0, #ddd 100%);
                border-radius: 0.5em;
                box-shadow: 2px 2px 16px #000;
                max-width: 90vw;
                width: 100%;
                height: 100%;
                position: relative;
                box-sizing: border-box;
            }
            .__MonkeyConfig_container h1 {
                border-bottom: solid 1px #999;
                font-size: 120%;
                margin: 0 0 0.5em 0;
                padding: 0 0 0.3em 0;
                text-align: center;
            }
            .__MonkeyConfig_content {
                flex: 1;
                overflow-y: auto;
                max-height: 60vh;
            }
            .__MonkeyConfig_top, .__MonkeyConfig_bottom {
                margin-bottom: 1em;
            }
            .__MonkeyConfig_columns {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1em;
            }
            .__MonkeyConfig_left_column, .__MonkeyConfig_right_column {
                width: 48%;
            }
            .__MonkeyConfig_container table {
                border-spacing: 0;
                margin: 0;
                width: 100%;
            }
            .__MonkeyConfig_container td {
                border: none;
                line-height: 100%;
                padding: 0.3em;
                text-align: left;
                vertical-align: middle;
                white-space: normal;
            }
            .__MonkeyConfig_container td.__MonkeyConfig_inline {
                display: flex;
                align-items: center;
                white-space: nowrap;
            }
            .__MonkeyConfig_container td.__MonkeyConfig_inline label {
                margin-right: 0.5em;
                flex-shrink: 0;
                display: block;
            }
            .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="checkbox"] {
                flex-grow: 0;
                margin: 0 0.3em 0 0;
                display: inline-block;
                width: 16px;
                height: 16px;
            }
            .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="number"],
            .__MonkeyConfig_container td.__MonkeyConfig_inline input[type="text"] {
                flex-grow: 0;
                width: 100px;
                min-width: 50px;
            }
            .__MonkeyConfig_buttons_container {
                margin-top: 1em;
                border-top: solid 1px #999;
                padding-top: 0.6em;
                text-align: center;
            }
            .__MonkeyConfig_buttons_container table {
                width: auto;
                margin: 0 auto;
            }
            .__MonkeyConfig_buttons_container td {
                padding: 0.3em;
            }
            .__MonkeyConfig_container button {
                background: #ccc linear-gradient(180deg, #ddd 0, #ccc 45%, #bbb 50%, #aaa 100%);
                border: solid 1px;
                border-radius: 0.5em;
                box-shadow: 0 0 1px #000;
                padding: 3px 8px 3px 24px;
                white-space: nowrap;
            }
            .__MonkeyConfig_container button img {
                vertical-align: middle;
            }
            .__MonkeyConfig_container label {
                line-height: 120%;
                vertical-align: middle;
                display: inline-block;
            }
            .__MonkeyConfig_container textarea {
                vertical-align: text-top;
                width: 100%;
            }
            .__MonkeyConfig_container input[type="text"],
            .__MonkeyConfig_container input[type="number"],
            .__MonkeyConfig_container input[type="color"] {
                background: #fff;
            }
            .__MonkeyConfig_container button:hover {
                background: #d2d2d2 linear-gradient(180deg, #e2e2e2 0, #d2d2d2 45%, #c2c2c2 50%, #b2b2b2 100%);
            }
        `
    }
};
