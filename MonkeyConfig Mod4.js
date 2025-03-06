// ==UserScript==
// @name           MonkeyConfig Mod
// @namespace      http://odyniec.net/
// @description    Enhanced Configuration Dialog Builder with column layout (top, bottom, left, right), custom styling, and additional input types
// @version        1.7
// ==/UserScript==

/*
 * MonkeyConfig Modern Reloaded Enhanced
 * Based on version 0.1.4 by Michal Wojciechowski (odyniec.net)
 * v0.1.4 - January 2020 - David Hosier (https://github.com/david-hosier/MonkeyConfig)
 * Enhanced by Bloggerpemula - March 2025
 * Additions: Column layout, font size/color customization, new input types (textarea, range, radio, file, button, group)
 * Modified: Checkbox, number, and text inputs aligned inline with labels - March 2025
 * Modified: Added text-align option for labels, reduced width of number and text fields - March 2025
 * Modified: Added per-parameter font-size and font-color customization - March 2025
 */
/*jshint multistr:true*/
function MonkeyConfig(data) {
    var cfg = this,
        params,
        values = {},
        storageKey,
        displayed,
        openLayer,
        container,
        overlay;

    function init() {
        params = data.parameters || data.params;
        data.buttons = data.buttons === undefined ? ['save', 'defaults', 'cancel'] : data.buttons;
        data.fontSize = data.fontSize || '11pt'; // Default global font size
        data.fontColor = data.fontColor || '#000000'; // Default global font color

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
            '<div class="__MonkeyConfig_content">';

        html += '<div class="__MonkeyConfig_top">';
        for (var paramName in params) {
            if (params[paramName].column === 'top') {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</div>';

        html += '<div class="__MonkeyConfig_columns">' +
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
        html += '</div></div>';

        html += '<table class="__MonkeyConfig_default">';
        for (var paramName in params) {
            if (!params[paramName].column) {
                html += MonkeyConfig.formatters.tr(paramName, params[paramName]);
            }
        }
        html += '</table>';

        html += '<div class="__MonkeyConfig_bottom">';
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
            var elem = container.querySelector('[name="' + paramName + '"]');
            if (!elem) continue;
            switch (params[paramName].type) {
                case 'checkbox':
                    elem.checked = !!value;
                    break;
                case 'custom':
                    if (params[paramName].set) {
                        params[paramName].set(value, container.querySelector('#__MonkeyConfig_parent_' + paramName));
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
                    var radio = container.querySelector('[name="' + paramName + '"][value="' + value + '"]');
                    if (radio) radio.checked = true;
                    break;
                case 'file':
                    elem.value = '';
                    break;
                case 'select':
                    if (elem.tagName.toLowerCase() === 'input' && elem.type === 'checkbox') {
                        var checkboxes = container.querySelectorAll('input[name="' + paramName + '"]');
                        for (var i = 0; i < checkboxes.length; i++) {
                            checkboxes[i].checked = value.indexOf(checkboxes[i].value) > -1;
                        }
                    } else if (elem.multiple) {
                        var options = container.querySelectorAll('select[name="' + paramName + '"] option');
                        for (var i = 0; i < options.length; i++) {
                            options[i].selected = value.indexOf(options[i].value) > -1;
                        }
                    } else {
                        elem.value = value;
                    }
                    break;
            }
            // Modifikasi: Terapkan font-size dan font-color per parameter pada elemen input
            if (params[paramName].fontSize) {
                elem.style.fontSize = params[paramName].fontSize;
            }
            if (params[paramName].fontColor) {
                elem.style.color = params[paramName].fontColor;
            }
        }
    }

    function saveClick() {
        for (var paramName in params) {
            var elem = container.querySelector('[name="' + paramName + '"]');
            if (!elem) continue;
            switch (params[paramName].type) {
                case 'checkbox':
                    values[paramName] = elem.checked;
                    break;
                case 'custom':
                    if (params[paramName].get) {
                        values[paramName] = params[paramName].get(container.querySelector('#__MonkeyConfig_parent_' + paramName));
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
                    var checkedRadio = container.querySelector('[name="' + paramName + '"]:checked');
                    values[paramName] = checkedRadio ? checkedRadio.value : '';
                    break;
                case 'file':
                    values[paramName] = elem.dataset.value || values[paramName];
                    break;
                case 'select':
                    if (elem.tagName.toLowerCase() === 'input' && elem.type === 'checkbox') {
                        values[paramName] = [];
                        var inputs = container.querySelectorAll('input[name="' + paramName + '"]');
                        for (var i = 0; i < inputs.length; i++) {
                            if (inputs[i].checked) values[paramName].push(inputs[i].value);
                        }
                    } else if (elem.multiple) {
                        values[paramName] = [];
                        var options = container.querySelectorAll('select[name="' + paramName + '"] option');
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
            var saveBtn = container.querySelector('#__MonkeyConfig_button_save');
            var defaultsBtn = container.querySelector('#__MonkeyConfig_button_defaults');
            var cancelBtn = container.querySelector('#__MonkeyConfig_button_cancel');

            if (saveBtn) saveBtn.addEventListener('click', saveClick, false);
            if (defaultsBtn) defaultsBtn.addEventListener('click', function () { setDefaults(); }, false);
            if (cancelBtn) cancelBtn.addEventListener('click', cancelClick, false);

            displayed = true;
            update();
        }

        GM_addStyle(MonkeyConfig.res.stylesheets.main.replace(/__FONT_SIZE__/g, data.fontSize).replace(/__FONT_COLOR__/g, data.fontColor));
        MonkeyConfig.styleAdded = true;

        var body = document.querySelector('body');
        openLayer = document.createElement('div');
        openLayer.className = '__MonkeyConfig_layer';
        overlay = document.createElement('div');
        overlay.className = '__MonkeyConfig_overlay';
        overlay.style.cssText = 'left:0;top:0;width:100%;height:100%;z-index:9999;';
        openLayer.innerHTML = render();
        container = openLayer.querySelector('.__MonkeyConfig_container');
        openLayer.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-height:80vh;overflow-y:auto;z-index:10000;';
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
        displayed = false;
    }

    init();
}

MonkeyConfig.esc = function (string) { return string.replace(/"/g, '&quot;'); };

MonkeyConfig.HTML = {
    '_field': function (name, options) {
        return options.type && MonkeyConfig.HTML[options.type] ? options.html ? options.html.replace(/\[FIELD\]/, MonkeyConfig.HTML[options.type](name, options)) : MonkeyConfig.HTML[options.type](name, options) : '';
    },
    '_label': function (name, options) {
        var label = options.label || name.substring(0, 1).toUpperCase() + name.substring(1).replace(/_/g, ' ');
        // Modifikasi: Tambahkan style text-align, font-size, dan font-color jika ada
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

MonkeyConfig.styleAdded = false;

MonkeyConfig.res = {
    icons: {
        'arrow_undo': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIJSURBVDjLpVM9aJNRFD35GsRSoUKKzQ/B0NJJF3EQlKrVgijSCBmC4NBFKihIcXBwEZdSHVoUwUInFUEkQ1DQ4CKiFsQsTrb5xNpgaZHw2Uog5t5zn0NJNFaw0guX97hwzuPcc17IOYfNlIdNVrhxufR6xJkZjAbSQGXjNAorqixSWFDV3KPhJ+UGLtSQMPryrDscPwLnAHOEOQc6gkbUpIagGmApWIb/pZRX4fjj889nWiSQtgYyBZ1BTUEj6AjPa0P71nb0Jfqwa+futIheHrzRn2yRQCUK/lOQhApBJVQJChHfnkCqOwWEQ+iORJHckUyX5ksvAEyGNuJC+s6xCRXNHNxzKMmQ4luwgjfvZp69uvr2+IZcyJ8rjIporrxURggetnV0QET3rrPxzMNM2+n7p678jUTrCiWhphAjVHR9DlR0WkSzf4IHxg5MSF0zXZEuVKWKSlCBCostS8zeG7oV64wPqxInbw86lbVXKEQ8mkAqmUJ4SxieeVhcnANFC02C7N2h69HO2IXeWC8MDj2JnqaFNAMd8f3HKjx6+LxQRmnOz1OZaxKIaF1VISYwB9ARZoQaYY6o1WpYCVYxt+zDn/XzVBv/MOWXW5J44ubRyVgkelFpmF/4BJVfOVDlVyqLVBZI5manPjajDOdcswfG9k/3X9v3/vfZv7rFBanriIo++J/f+BMT+YWS6hXl7QAAAABJRU5ErkJggg==',
        'cancel': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0\
U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHdSURBVDjLpZNraxpBFIb3a0ggISmmNISW\
XmOboKihxpgUNGWNSpvaS6RpKL3Ry//Mh1wgf6PElaCyzq67O09nVjdVlJbSDy8Lw77PmfecMwZg\
/I/GDw3DCo8HCkZl/RlgGA0e3Yfv7+DbAfLrW+SXOvLTG+SHV/gPbuMZRnsyIDL/OASziMxkkKkU\
QTJJsLaGn8/iHz6nd+8mQv87Ahg2H9Th/BxZqxEkEgSrq/iVCvLsDK9awtvfxb2zjD2ARID+lVVl\
babTgWYTv1rFL5fBUtHbbeTJCb3EQ3ovCnRC6xAgzJtOE+ztheYIEkqbFaS3vY2zuIj77AmtYYDu\
sPy8/zuvunJkDKXM7tYWTiyGWFjAqeQnAD6+7ueNx/FLpRGAru7mcoj5ebqzszil7DggeF/DX1nB\
N82rzPqrzbRayIsLhJqMPT2N83Sdy2GApwFqRN7jFPL0tF+10cDd3MTZ2AjNUkGCoyO6y9cRxfQo\
wFUbpufr1ct4ZoHg+Dg067zduTmEbq4yi/UkYidDe+kaTcP4ObJIajksPd/eyx3c+N2rvPbMDPbU\
FPZSLKzcGjKPrbJaDsu+dQO3msfZzeGY2TCvKGYQhdSYeeJjUt21dIcjXQ7U7Kv599f4j/oF55W4\
g/2e3b8AAAAASUVORK5CYII=',
        'tick': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAGrSURBVDjLvZPZLkNhFIV75zjvYm7VGFNCqoZUJ+roKUUpjRuqp61Wq0NKDMelGGqOxBSUIBKXWtWGZxAvobr8lWjChRgSF//dv9be+9trCwAI/vIE/26gXmviW5bqnb8yUK028qZjPfoPWEj4Ku5HBspgAz941IXZeze8N1bottSo8BTZviVWrEh546EO03EXpuJOdG63otJbjBKHkEp/Ml6yNYYzpuezWL4s5VMtT8acCMQcb5XL3eJE8VgBlR7BeMGW9Z4yT9y1CeyucuhdTGDxfftaBO7G4L+zg91UocxVmCiy51NpiP3n2treUPujL8xhOjYOzZYsQWANyRYlU4Y9Br6oHd5bDh0bCpSOixJiWx71YY09J5pM/WEbzFcDmHvwwBu2wnikg+lEj4mwBe5bC5h1OUqcwpdC60dxegRmR06TyjCF9G9z+qM2uCJmuMJmaNZaUrCSIi6X+jJIBBYtW5Cge7cd7sgoHDfDaAvKQGAlRZYc6ltJlMxX03UzlaRlBdQrzSCwksLRbOpHUSb7pcsnxCCwngvM2Rm/ugUCi84fycr4l2t8Bb6iqTxSCgNIAAAAAElFTkSuQmCC'
    },
    stylesheets: {
        main: `
            body.__MonkeyConfig_window {appearance:window !important;-moz-appearance:window !important;background:auto;font-family:sans-serif !important;height:100% !important;margin:0 !important;padding:0 !important;width:100% !important;}
            div.__MonkeyConfig_container {display:flex !important;flex-direction:column !important;font-family:sans-serif !important;padding:1em !important;font-size:__FONT_SIZE__ !important;color:__FONT_COLOR__ !important;background:#eee linear-gradient(180deg,#f8f8f8 0,#ddd 100%) !important;border-radius:0.5em !important;box-shadow:2px 2px 16px #000 !important;max-width:90vw !important;}
            body.__MonkeyConfig_window div.__MonkeyConfig_container {appearance:window !important;-moz-appearance:window !important;height:100%;width:100%;}
            div.__MonkeyConfig_container h1 {border-bottom:solid 1px #999 !important;font-family:sans-serif !important;font-size:120% !important;margin:0 0 0.5em 0 !important;padding:0 0 0.3em 0 !important;text-align:center !important;}
            div.__MonkeyConfig_content {flex:1 !important;overflow-y:auto !important;max-height:60vh !important;}
            div.__MonkeyConfig_top, div.__MonkeyConfig_bottom {margin-bottom:1em !important;}
            div.__MonkeyConfig_columns {display:flex !important;justify-content:space-between !important;margin-bottom:1em !important;}
            div.__MonkeyConfig_left_column, div.__MonkeyConfig_right_column {width:48% !important;}
            div.__MonkeyConfig_container table {border-spacing:0 !important;margin:0 !important;width:100% !important;}
            div.__MonkeyConfig_container table td {border:none !important;line-height:100% !important;padding:0.3em !important;text-align:left !important;vertical-align:middle !important;white-space:normal !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_inline {display:flex !important;align-items:center !important;white-space:nowrap !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_inline label {margin-right:0.5em !important;flex-shrink:0 !important;display:block !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="checkbox"] {flex-grow:0 !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="number"],
            div.__MonkeyConfig_container td.__MonkeyConfig_inline input[type="text"] {flex-grow:0 !important;width:100px !important;min-width:50px !important;}
            div.__MonkeyConfig_buttons_container {margin-top:1em !important;border-top:solid 1px #999 !important;padding-top:0.6em !important;text-align:center !important;}
            div.__MonkeyConfig_buttons_container table {width:auto !important;margin:0 auto !important;}
            div.__MonkeyConfig_buttons_container td {padding:0.3em !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_buttons button {appearance:button !important;-moz-appearance:button !important;background:#ccc linear-gradient(180deg,#ddd 0,#ccc 45%,#bbb 50%,#aaa 100%) !important;border-style:solid !important;border-width:1px !important;border-radius:0.5em !important;box-shadow:0 0 1px #000 !important;padding:3px 8px 3px 24px !important;white-space:nowrap !important;}
            div.__MonkeyConfig_container td.__MonkeyConfig_buttons button img {vertical-align:middle !important;}
            div.__MonkeyConfig_layer {display:table !important;position:fixed !important;}
            div.__MonkeyConfig_layer div.__MonkeyConfig_container td, 
            div.__MonkeyConfig_layer div.__MonkeyConfig_container label, 
            div.__MonkeyConfig_layer div.__MonkeyConfig_container input, 
            div.__MonkeyConfig_layer div.__MonkeyConfig_container select, 
            div.__MonkeyConfig_layer div.__MonkeyConfig_container textarea, 
            div.__MonkeyConfig_layer div.__MonkeyConfig_container button {color:__FONT_COLOR__ !important;font-family:sans-serif !important;font-size:__FONT_SIZE__ !important;line-height:100% !important;margin:0 !important;vertical-align:baseline !important;}
            div.__MonkeyConfig_container label {line-height:120% !important;vertical-align:middle !important;}
            div.__MonkeyConfig_container textarea {vertical-align:text-top !important;width:100%;}
            div.__MonkeyConfig_layer div.__MonkeyConfig_container input[type="text"] {appearance:textfield !important;-moz-appearance:textfield !important;background:#fff !important;}
            div.__MonkeyConfig_layer div.__MonkeyConfig_container td.__MonkeyConfig_buttons button:hover {background:#d2d2d2 linear-gradient(180deg,#e2e2e2 0,#d2d2d2 45%,#c2c2c2 50%,#b2b2b2 100%) !important;}
            div.__MonkeyConfig_overlay {background-color:#000 !important;opacity:0.6 !important;position:fixed !important;}
        `
    }
};