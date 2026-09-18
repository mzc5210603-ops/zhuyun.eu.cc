/* ============================================================
   工具台 TOOLBENCH
   纯前端单页应用 · 所有处理均在浏览器本地完成
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 基础工具函数 ---------------- */

  function h(tag, props, children) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else el.setAttribute(k, v);
      });
    }
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }

  function svg(useId) {
    return h('svg', null, [h('use', { href: '#i-' + useId })]);
  }

  var toastTimer = null;
  function toast(msg) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = h('div', { class: 'toast-wrap' }, [h('div', { class: 'toast' })]);
      document.body.appendChild(wrap);
    }
    wrap.firstChild.textContent = msg;
    wrap.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { wrap.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板'); }, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('已复制到剪贴板'); }
      catch (e) { toast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
  }

  function copyBtn(getText, label) {
    return h('button', {
      class: 'btn sm',
      title: label || '复制',
      onclick: function () { copyText(typeof getText === 'function' ? getText() : getText); }
    }, [svg('copy'), label || '复制']);
  }

  function badge(state, text) {
    return h('span', { class: 'badge ' + state }, text);
  }

  /* 智能数字格式化（消除浮点误差） */
  function fmtNum(n) {
    if (!isFinite(n)) return n > 0 ? '∞' : (n < 0 ? '-∞' : '错误');
    if (n === 0) return '0';
    var abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-9) return n.toExponential(8).replace(/\.?0+e/, 'e');
    var rounded = parseFloat(n.toPrecision(12));
    return rounded.toLocaleString('en-US', { maximumSignificantDigits: 14 });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ---------------- 主题 ---------------- */

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = document.getElementById('themeIcon');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeIcon.innerHTML = '';
    themeIcon.appendChild(h('use', { href: t === 'dark' ? '#i-sun' : '#i-moon' }));
    try { localStorage.setItem('tb-theme', t); } catch (e) {}
  }
  applyTheme((function () {
    try {
      var saved = localStorage.getItem('tb-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })());
  themeBtn.addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ============================================================
     工具实现
     ============================================================ */

  /* ---------- 1. JSON 格式化 ---------- */
  function toolJson(view) {
    var mode = 'pretty', indent = '2';

    var status = badge('idle', '等待输入');
    var stat = h('span', { class: 'tiny muted mono' });
    var input = h('textarea', {
      spellcheck: 'false',
      placeholder: '在此粘贴 JSON 内容，即时校验并格式化…',
      oninput: process
    });
    var output = h('div', { class: 'pane-out' });

    function countKeys(v) {
      var keys = 0, items = 0;
      (function walk(x) {
        if (Array.isArray(x)) { items++; x.forEach(walk); }
        else if (x && typeof x === 'object') {
          Object.keys(x).forEach(function (k) { keys++; walk(x[k]); });
        }
      })(v);
      return { keys: keys, items: items };
    }

    function process() {
      var raw = input.value;
      if (!raw.trim()) {
        output.className = 'pane-out';
        output.textContent = '';
        status.className = 'badge idle';
        status.textContent = '等待输入';
        stat.textContent = '';
        return;
      }
      try {
        var obj = JSON.parse(raw);
        var ind = indent === 'tab' ? '\t' : Number(indent);
        output.className = 'pane-out';
        output.textContent = mode === 'mini' ? JSON.stringify(obj) : JSON.stringify(obj, null, ind);
        status.className = 'badge ok';
        status.textContent = '格式有效';
        var info = countKeys(obj);
        var type = Array.isArray(obj) ? '数组 · ' + obj.length + ' 个元素'
          : (obj && typeof obj === 'object') ? '对象 · ' + Object.keys(obj).length + ' 个顶级键'
          : typeof obj;
        stat.textContent = type + ' · 递归 ' + info.keys + ' 个键 · ' + output.textContent.length + ' 字符';
      } catch (e) {
        output.className = 'pane-out err-text';
        output.textContent = '✕ ' + e.message;
        status.className = 'badge err';
        status.textContent = '解析失败';
        var lm = e.message.match(/line (\d+) column (\d+)/);
        var pm = e.message.match(/position (\d+)/);
        stat.textContent = lm ? ('第 ' + lm[1] + ' 行 · 第 ' + lm[2] + ' 列')
          : pm ? ('字符位置 ' + pm[1]) : '详见错误提示';
      }
    }

    var segMode = h('div', { class: 'seg' }, [
      h('button', { type: 'button', class: 'on', onclick: function () { mode = 'pretty'; sync(); process(); } }, '美化'),
      h('button', { type: 'button', onclick: function () { mode = 'mini'; sync(); process(); } }, '压缩')
    ]);
    var selIndent = h('select', {
      'aria-label': '缩进',
      onchange: function () { indent = this.value; process(); }
    }, [
      h('option', { value: '2' }, '2 空格缩进'),
      h('option', { value: '4' }, '4 空格缩进'),
      h('option', { value: 'tab' }, 'Tab 缩进')
    ]);
    function sync() {
      segMode.querySelectorAll('button').forEach(function (b, i) {
        b.classList.toggle('on', (i === 0) === (mode === 'pretty'));
      });
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [
        status, stat,
        h('span', { style: { flex: '1' } }),
        segMode, selIndent,
        h('button', { class: 'btn ghost sm', onclick: function () { input.value = sample; process(); } }, '示例'),
        h('button', { class: 'btn ghost sm', onclick: function () { input.value = ''; process(); input.focus(); } }, '清空'),
        copyBtn(function () { return output.textContent; })
      ]),
      h('div', { class: 'dual flush', style: { border: 'none', borderRadius: '0' } }, [
        h('div', { class: 'pane' }, [
          h('div', { class: 'pane-bar' }, 'INPUT · 输入'),
          input
        ]),
        h('div', { class: 'pane' }, [
          h('div', { class: 'pane-bar' }, 'OUTPUT · 结果'),
          output
        ])
      ])
    ]));

    var sample = JSON.stringify({
      name: 'toolbench', version: '1.0.0', offline: true,
      tools: ['json', 'base64', 'qrcode'], meta: { author: 'local', stars: 1024 }
    }, null, 2);
  }

  /* ---------- 2. Base64 ---------- */
  function toolBase64(view) {
    var dir = 'enc';
    var input = h('textarea', { spellcheck: 'false', placeholder: dir === 'enc' ? '输入要编码的文本（支持中文）' : '输入要解码的 Base64 字符串', oninput: run });
    var out = h('div', { class: 'pane-out' });
    var status = badge('idle', '等待输入');

    function b64Encode(s) {
      var bytes = new TextEncoder().encode(s), bin = '', CH = 0x8000;
      for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      return btoa(bin);
    }
    function b64Decode(s) {
      var bin = atob(s.replace(/\s+/g, ''));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    }

    function run() {
      var v = input.value;
      if (!v) { out.className = 'pane-out'; out.textContent = ''; status.className = 'badge idle'; status.textContent = '等待输入'; return; }
      try {
        out.className = 'pane-out';
        out.textContent = dir === 'enc' ? b64Encode(v) : b64Decode(v);
        status.className = 'badge ok';
        status.textContent = dir === 'enc' ? '编码完成' : '解码完成';
      } catch (e) {
        out.className = 'pane-out err-text';
        out.textContent = '✕ 无效的 Base64 内容，无法解码';
        status.className = 'badge err';
        status.textContent = '解码失败';
      }
    }

    var seg = h('div', { class: 'seg' }, [
      h('button', { type: 'button', class: 'on', onclick: function () { switchDir('enc'); } }, '文本 → Base64'),
      h('button', { type: 'button', onclick: function () { switchDir('dec'); } }, 'Base64 → 文本')
    ]);
    function switchDir(d) {
      dir = d;
      seg.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === (d === 'enc' ? 0 : 1)); });
      input.placeholder = d === 'enc' ? '输入要编码的文本（支持中文）' : '输入要解码的 Base64 字符串';
      input.value = out.textContent && !out.classList.contains('err-text') ? out.textContent : '';
      run();
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [seg, h('span', { style: { flex: '1' } }), status, copyBtn(function () { return out.textContent; })]),
      h('div', { class: 'dual flush', style: { border: 'none' } }, [
        h('div', { class: 'pane' }, [h('div', { class: 'pane-bar' }, 'INPUT'), input]),
        h('div', { class: 'pane' }, [h('div', { class: 'pane-bar' }, 'OUTPUT'), out])
      ])
    ]));
  }

  /* ---------- 3. URL 编解码 / 解析 ---------- */
  function toolUrl(view) {
    var tab = 'codec';

    /* 编解码面板 */
    var dir = 'enc';
    var ci = h('textarea', { spellcheck: 'false', rows: '5', placeholder: '输入要编码的文本（支持中文）', oninput: runCodec });
    var co = h('div', { class: 'copy-val', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } });
    var segDir = h('div', { class: 'seg' }, [
      h('button', { type: 'button', class: 'on', onclick: function () { setDir('enc'); } }, '编码'),
      h('button', { type: 'button', onclick: function () { setDir('dec'); } }, '解码')
    ]);
    var ciLabel = h('label', { class: 'field-label' }, '原始文本');
    function setDir(d) {
      dir = d;
      segDir.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === (d === 'enc' ? 0 : 1)); });
      ciLabel.textContent = d === 'enc' ? '原始文本' : '已编码文本';
      ci.placeholder = d === 'enc' ? '输入要编码的文本（支持中文）' : '输入要解码的 URL 编码字符串';
      if (co.textContent && !co.classList.contains('err-text')) { ci.value = co.textContent; }
      runCodec();
    }
    function runCodec() {
      var v = ci.value;
      if (!v) { co.classList.remove('err-text'); co.textContent = ''; return; }
      try {
        co.classList.remove('err-text');
        co.textContent = dir === 'enc' ? encodeURIComponent(v) : decodeURIComponent(v.replace(/\+/g, ' '));
      } catch (e) {
        co.classList.add('err-text');
        co.textContent = '✕ 包含非法的百分号编码序列';
      }
    }
    var codecPanel = h('div', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [segDir, h('span', { style: { flex: '1' } }), copyBtn(function () { return co.textContent; })]),
      h('div', { class: 'panel-body' }, [
        ciLabel,
        h('div', { class: 'mt-2' }),
        ci,
        h('label', { class: 'field-label', style: { marginTop: '14px' } }, '结果'),
        h('div', { class: 'copy-row mt-2' }, [co])
      ])
    ]);

    /* 解析面板 */
    var pInput = h('input', { type: 'text', placeholder: 'https://example.com/path?a=1&b=2#hash', oninput: runParse });
    var pOut = h('div');
    function runParse() {
      pOut.innerHTML = '';
      var raw = pInput.value.trim();
      if (!raw) { pOut.appendChild(h('div', { class: 'placeholder-box' }, '输入完整 URL 后展示协议、主机、路径与查询参数')); return; }
      var u = null;
      try { u = new URL(raw); } catch (e) {
        try { u = new URL('https://' + raw); } catch (e2) {}
      }
      if (!u) { pOut.appendChild(h('div', { class: 'alert err' }, '无法解析为有效 URL，请检查格式（需包含域名）')); return; }

      var rows = [
        ['协议 protocol', u.protocol],
        ['主机 host', u.host],
        ['端口 port', u.port || '(默认)'],
        ['路径 pathname', u.pathname],
        ['哈希 hash', u.hash || '(无)']
      ];
      pOut.appendChild(h('div', { class: 'panel mt-2' }, [
        h('table', { class: 'kv-list flush' }, rows.map(function (r) {
          return h('tr', null, [h('td', null, r[0]), h('td', null, r[1])]);
        }))
      ]));

      var params = [];
      u.searchParams.forEach(function (val, key) { params.push([key, val]); });
      var tbl = h('table', { class: 'data-table' }, [
        h('thead', null, h('tr', null, [h('th', { style: { width: '44px' } }, '#'), h('th', null, '参数名 KEY'), h('th', null, '参数值 VALUE')])),
        h('tbody', null, params.length ? params.map(function (p, i) {
          return h('tr', null, [
            h('td', { class: 'idx' }, String(i + 1)),
            h('td', { class: 'mono-cell' }, p[0]),
            h('td', { class: 'mono-cell' }, p[1])
          ]);
        }) : [h('tr', null, h('td', { colspan: '3', class: 'muted', style: { textAlign: 'center', padding: '18px' } }, '无查询参数'))])
      ]);
      pOut.appendChild(h('div', { class: 'panel mt-3' }, [
        h('div', { class: 'panel-head' }, [h('span', { class: 'panel-title' }, 'QUERY PARAMETERS')]),
        tbl
      ]));
    }
    var parsePanel = h('div', null, [
      h('div', { class: 'panel' }, [
        h('div', { class: 'panel-body' }, [
          h('label', { class: 'field-label' }, '待解析的 URL'),
          pInput
        ])
      ]),
      pOut
    ]);
    runParse();

    var segTab = h('div', { class: 'seg' }, [
      h('button', { type: 'button', class: 'on', onclick: function () { setTab('codec'); } }, '编解码'),
      h('button', { type: 'button', onclick: function () { setTab('parse'); } }, 'URL 解析')
    ]);
    function setTab(t) {
      tab = t;
      segTab.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === (t === 'codec' ? 0 : 1)); });
      codecPanel.style.display = t === 'codec' ? '' : 'none';
      parsePanel.style.display = t === 'parse' ? '' : 'none';
    }

    view.appendChild(h('div', { class: 'panel' }, [h('div', { class: 'panel-head' }, [segTab])]));
    view.appendChild(codecPanel);
    view.appendChild(parsePanel);
    runCodec();
  }

  /* ---------- 4. 时间戳 ---------- */
  function toolTime(view) {
    /* 当前时间 */
    var big = h('span', { class: 'clock-main' });
    var small = h('span', { class: 'clock-sub' });
    function tick() {
      var now = Date.now();
      big.textContent = Math.floor(now / 1000);
      small.textContent = now + ' 毫秒 · ' + new Date(now).toLocaleString('zh-CN', { hour12: false });
    }
    tick();
    var timer = setInterval(tick, 1000);

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-body' }, [
        h('div', { class: 'clock-card' }, [
          big,
          h('div', null, [
            small,
            h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, '当前 Unix 时间戳（秒）')
          ]),
          h('span', { style: { flex: '1' } }),
          copyBtn(function () { return big.textContent; }, '复制秒'),
          copyBtn(function () { return String(Date.now()); }, '复制毫秒')
        ])
      ])
    ]));

    /* 时间戳 → 日期 */
    var tsInput = h('input', { type: 'text', placeholder: '如 1726646400 或 1726646400000', oninput: convTs });
    var tsOut = h('div');
    function convTs() {
      tsOut.innerHTML = '';
      var raw = tsInput.value.trim();
      if (!raw) { tsOut.appendChild(h('div', { class: 'placeholder-box' }, '输入 10 位秒级或 13 位毫秒级时间戳（自动识别）')); return; }
      if (!/^\d+$/.test(raw)) { tsOut.appendChild(h('div', { class: 'alert err mt-2' }, '请输入纯数字时间戳')); return; }
      var ms = raw.length >= 13 ? Number(raw) : Number(raw) * 1000;
      var d = new Date(ms);
      if (isNaN(d)) { tsOut.appendChild(h('div', { class: 'alert err mt-2' }, '时间戳超出可解析范围')); return; }
      tsOut.appendChild(h('table', { class: 'kv-list mt-2' }, [
        h('tr', null, [h('td', null, '识别单位'), h('td', null, raw.length >= 13 ? '毫秒（13 位）' : '秒（10 位）')]),
        h('tr', null, [h('td', null, '本地时间'), h('td', null, d.toLocaleString('zh-CN', { hour12: false }))]),
        h('tr', null, [h('td', null, 'UTC 时间'), h('td', null, d.toUTCString())]),
        h('tr', null, [h('td', null, 'ISO 8601'), h('td', null, d.toISOString())]),
        h('tr', null, [h('td', null, '相对现在'), h('td', null, relative(ms - Date.now()))])
      ]));
    }
    view.appendChild(h('div', { class: 'panel mt-3' }, [
      h('div', { class: 'panel-head' }, [h('span', { class: 'panel-title' }, 'TIMESTAMP → DATE')]),
      h('div', { class: 'panel-body' }, [tsInput, tsOut])
    ]));
    convTs();

    /* 日期 → 时间戳 */
    var dtInput = h('input', { type: 'datetime-local', step: '1', oninput: convDt });
    var dtOut = h('div');
    function convDt() {
      dtOut.innerHTML = '';
      if (!dtInput.value) { dtOut.appendChild(h('div', { class: 'placeholder-box' }, '选择日期与时间')); return; }
      var ms = new Date(dtInput.value).getTime();
      if (isNaN(ms)) { dtOut.appendChild(h('div', { class: 'alert err mt-2' }, '日期无效')); return; }
      dtOut.appendChild(h('div', { class: 'copy-row mt-2' }, [
        h('span', { class: 'copy-val' }, '秒: ' + Math.floor(ms / 1000)),
        copyBtn(function () { return String(Math.floor(ms / 1000)); })
      ]));
      dtOut.appendChild(h('div', { class: 'copy-row mt-2' }, [
        h('span', { class: 'copy-val' }, '毫秒: ' + ms),
        copyBtn(function () { return String(ms); })
      ]));
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function nowLocal() {
      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    view.appendChild(h('div', { class: 'panel mt-3' }, [
      h('div', { class: 'panel-head' }, [
        h('span', { class: 'panel-title' }, 'DATE → TIMESTAMP'),
        h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn ghost sm', onclick: function () { dtInput.value = nowLocal(); convDt(); } }, '设为当前时间')
      ]),
      h('div', { class: 'panel-body' }, [dtInput, dtOut])
    ]));
    convDt();

    return function () { clearInterval(timer); };
  }

  function relative(diff) {
    var abs = Math.abs(diff), s;
    if (abs < 60000) s = Math.round(abs / 1000) + ' 秒';
    else if (abs < 3600000) s = Math.round(abs / 60000) + ' 分钟';
    else if (abs < 86400000) s = Math.round(abs / 3600000) + ' 小时';
    else s = Math.round(abs / 86400000) + ' 天';
    return diff >= 0 ? s + '后（未来）' : s + '前（过去）';
  }

  /* ---------- 5. 二维码 ---------- */
  function toolQR(view) {
    var text = h('textarea', { rows: '5', spellcheck: 'false', placeholder: '输入网址或文本，即时生成二维码…', oninput: debounce(draw, 240) });
    var levelSel = h('select', { onchange: draw }, [
      h('option', { value: 'L' }, '容错 L · 约 7%'),
      h('option', { value: 'M' }, '容错 M · 约 15%'),
      h('option', { value: 'Q' }, '容错 Q · 约 25%'),
      h('option', { value: 'H', selected: 'selected' }, '容错 H · 约 30%')
    ]);
    var sizeSel = h('select', { onchange: draw }, [
      h('option', { value: '256' }, '尺寸 256 × 256'),
      h('option', { value: '512', selected: 'selected' }, '尺寸 512 × 512'),
      h('option', { value: '1024' }, '尺寸 1024 × 1024')
    ]);
    var canvas = h('canvas');
    var stage = h('div', { class: 'qr-canvas-box' }, [canvas]);
    var hint = h('div', { class: 'tiny muted', style: { marginTop: '10px' } });
    var dlBtn = h('button', { class: 'btn primary', onclick: function () {
      if (!text.value.trim()) return;
      var a = document.createElement('a');
      a.download = 'qrcode.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    } }, '下载 PNG');

    function drawEmpty(msg, color) {
      canvas.width = 300; canvas.height = 300;
      var ctx0 = canvas.getContext('2d');
      ctx0.fillStyle = '#fff';
      ctx0.fillRect(0, 0, 300, 300);
      ctx0.fillStyle = color || '#9aa4af';
      ctx0.font = '13px sans-serif';
      ctx0.textAlign = 'center';
      ctx0.textBaseline = 'middle';
      ctx0.fillText(msg, 150, 150);
    }

    function draw() {
      hint.textContent = '';
      if (!text.value.trim()) { drawEmpty('等待输入内容'); return; }
      try {
        var qr = qrcode(0, levelSel.value);
        qr.addData(text.value, 'Byte');
        qr.make();
        var n = qr.getModuleCount(), margin = 4, total = n + margin * 2;
        var px = Number(sizeSel.value);
        var cell = Math.floor(px / total);
        var size = cell * total;
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';
        for (var r = 0; r < n; r++) {
          for (var c = 0; c < n; c++) {
            if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
          }
        }
        var version = (n - 17) / 4 + 1;
        hint.textContent = '版本 ' + version + ' · 模块 ' + n + ' × ' + n;
      } catch (e) {
        drawEmpty('内容过长，请缩短文本', '#c0392b');
      }
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-body' }, [
        h('div', { class: 'qr-stage' }, [
          stage,
          h('div', { style: { flex: '1', minWidth: '240px' } }, [
            h('label', { class: 'field-label' }, '内容'),
            text,
            h('div', { class: 'field-row mt-3' }, [
              h('label', { class: 'tiny muted' }, ['容错等级 ', levelSel]),
              h('label', { class: 'tiny muted' }, [sizeSel]),
              h('span', { style: { flex: '1' } }),
              dlBtn
            ]),
            hint,
            h('div', { class: 'tiny muted', style: { marginTop: '14px', lineHeight: '1.7' } },
              '容错等级越高，二维码被遮挡后仍可识别的概率越大。生成与下载均在本地完成，内容不会上传。')
          ])
        ])
      ])
    ]));
    draw();
  }

  /* ---------- 6. 颜色转换 ---------- */
  function toolColor(view) {
    var picker = h('input', { type: 'color', value: '#0f766e', oninput: function () { setHex(this.value); } });
    var hexInput = h('input', { type: 'text', value: '#0F766E', spellcheck: 'false', oninput: function () { parseUser(this.value.trim()); } });
    var swatch = h('div', { class: 'swatch-big' });
    var rows = {};
    [['HEX', 'hex'], ['RGB', 'rgb'], ['HSL', 'hsl']].forEach(function (r) {
      var val = h('span', { class: 'copy-val' });
      rows[r[1]] = val;
    });

    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h2, s, l = (max + min) / 2;
      if (max === min) { h2 = s = 0; }
      else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h2 = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h2 = (b - r) / d + 2; break;
          default: h2 = (r - g) / d + 4;
        }
        h2 *= 60;
      }
      return [Math.round(h2), Math.round(s * 100), Math.round(l * 100)];
    }
    function hslToRgb(h2, s, l) {
      s /= 100; l /= 100;
      var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h2 / 60) % 2 - 1)), m = l - c / 2;
      var p;
      if (h2 < 60) p = [c, x, 0]; else if (h2 < 120) p = [x, c, 0];
      else if (h2 < 180) p = [0, c, x]; else if (h2 < 240) p = [0, x, c];
      else if (h2 < 300) p = [x, 0, c]; else p = [c, 0, x];
      return [Math.round((p[0] + m) * 255), Math.round((p[1] + m) * 255), Math.round((p[2] + m) * 255)];
    }

    function update(r, g, b, sourceHex) {
      var hsl = rgbToHsl(r, g, b);
      var hex = '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase();
      swatch.style.background = hex;
      rows.hex.textContent = hex;
      rows.rgb.textContent = 'rgb(' + r + ', ' + g + ', ' + b + ')';
      rows.hsl.textContent = 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)';
      if (sourceHex) { hexInput.value = hex; picker.value = hex; }
      else { picker.value = hex; hexInput.value = hex; }
    }
    function setHex(v) {
      var n = parseInt(v.slice(1), 16);
      update((n >> 16) & 255, (n >> 8) & 255, n & 255, true);
    }

    function parseUser(s) {
      var m;
      if ((m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
        var x = m[1].length === 3 ? m[1].split('').map(function (c) { return c + c; }).join('') : m[1];
        var n = parseInt(x, 16);
        update((n >> 16) & 255, (n >> 8) & 255, n & 255, false);
      } else if ((m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i))) {
        update(Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3]), false);
      } else if ((m = s.match(/^hsla?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})%?\s*[, ]\s*(\d{1,3})%?/i))) {
        var rgb = hslToRgb(+m[1] % 360, Math.min(100, +m[2]), Math.min(100, +m[3]));
        update(rgb[0], rgb[1], rgb[2], false);
      }
    }

    function outRow(label, key) {
      return h('div', { class: 'copy-row' }, [
        h('span', { class: 'mono tiny muted', style: { width: '44px', flexShrink: '0' } }, label),
        rows[key],
        copyBtn(function () { return rows[key].textContent; })
      ]);
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-body' }, [
        h('div', { class: 'grid-2' }, [
          h('div', null, [
            swatch,
            h('div', { class: 'field-row mt-3' }, [picker, hexInput, h('span', { style: { flex: '1' } })])
          ]),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' } }, [
            outRow('HEX', 'hex'),
            outRow('RGB', 'rgb'),
            outRow('HSL', 'hsl'),
            h('div', { class: 'tiny muted', style: { lineHeight: '1.7' } }, '支持在输入框直接粘贴 HEX、rgb() 或 hsl() 格式自动转换。')
          ])
        ])
      ])
    ]));
    setHex('#0f766e');
  }

  /* ---------- 7. 计算器 ---------- */
  function toolCalc(view) {
    var expr = '', afterResult = false, history = [];
    var exprEl = h('div', { class: 'calc-expr' }, ' ');
    var resEl = h('div', { class: 'calc-result' }, '0');
    var histBox = h('div', { class: 'calc-hist' }, [h('div', { class: 'placeholder-box', style: { border: 'none' } }, '暂无计算记录')]);

    function safeEval(s) {
      var norm = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      if (!/^[-+*/().%\d\s]+$/.test(norm)) throw new Error('bad');
      if (!norm.trim()) throw new Error('empty');
      var v = Function('"use strict";return (' + norm + ')')();
      if (typeof v !== 'number' || isNaN(v)) throw new Error('nan');
      return v;
    }

    function render() {
      exprEl.textContent = expr || ' ';
      if (!expr) { resEl.textContent = '0'; return; }
      try {
        var v = safeEval(expr);
        resEl.textContent = fmtNum(v);
        resEl.style.color = '';
      } catch (e) {
        resEl.textContent = '…';
      }
    }

    function inputKey(k) {
      if (afterResult) {
        if (/[+\-×÷%.]/.test(k)) { /* 延续结果 */ }
        else expr = '';
        afterResult = false;
      }
      if (k === 'C') { expr = ''; }
      else if (k === '⌫') { expr = expr.slice(0, -1); }
      else if (k === '=') { equals(); return; }
      else expr += k;
      render();
    }

    function equals() {
      if (!expr) return;
      try {
        var v = safeEval(expr);
        history.unshift({ e: expr, r: fmtNum(v) });
        if (history.length > 30) history.pop();
        resEl.textContent = fmtNum(v);
        exprEl.textContent = expr + ' =';
        expr = String(typeof v === 'number' ? parseFloat(v.toPrecision(12)) : v);
        afterResult = true;
        renderHist();
      } catch (e) {
        resEl.textContent = '表达式错误';
        resEl.style.color = 'var(--danger)';
      }
    }

    function renderHist() {
      histBox.innerHTML = '';
      if (!history.length) {
        histBox.appendChild(h('div', { class: 'placeholder-box', style: { border: 'none' } }, '暂无计算记录'));
        return;
      }
      history.forEach(function (it) {
        histBox.appendChild(h('div', {
          class: 'h-item',
          title: '点击回填结果',
          onclick: function () { expr = it.r.replace(/,/g, ''); afterResult = true; render(); }
        }, [h('span', { class: 'h-e' }, it.e + ' = '), h('span', { class: 'h-r' }, it.r)]));
      });
    }

    var keys = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '+', '0', '.', '='];
    var grid = h('div', { class: 'calc-grid' }, keys.map(function (k) {
      var cls = '=+-×÷'.indexOf(k) >= 0 && k !== '=' ? ' op' : '';
      if (k === 'C' || k === '⌫' || k === '(' || k === ')') cls = ' fn';
      if (k === '=') cls = ' eq';
      return h('button', { type: 'button', class: cls.trim(), onclick: function () { inputKey(k); } }, k);
    }));

    function onKey(e) {
      var k = e.key;
      if (/^[0-9]$/.test(k) || ['+', '-', '*', '/', '.', '(', ')', '%'].indexOf(k) >= 0) {
        var map = { '*': '×', '/': '÷', '-': '−' };
        inputKey(map[k] || k);
      } else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
      else if (k === 'Backspace') { inputKey('⌫'); }
      else if (k === 'Escape') { inputKey('C'); }
    }
    document.addEventListener('keydown', onKey);

    var calcBox = h('div', { class: 'calc' }, [
      h('div', { class: 'calc-screen' }, [exprEl, resEl]),
      grid
    ]);

    view.appendChild(h('div', { class: 'calc-layout' }, [
      calcBox,
      h('div', { class: 'panel' }, [
        h('div', { class: 'panel-head' }, [
          h('span', { class: 'panel-title' }, 'HISTORY · 历史'),
          h('span', { style: { flex: '1' } }),
          h('button', { class: 'btn ghost sm', onclick: function () { history = []; renderHist(); } }, '清空')
        ]),
        histBox
      ])
    ]));

    render();
    return function () { document.removeEventListener('keydown', onKey); };
  }

  /* ---------- 8. 单位换算 ---------- */
  function toolUnit(view) {
    var CATS = [
      {
        key: 'length', label: '长度', base: 2,
        units: [
          { n: '毫米 mm', f: 0.001 }, { n: '厘米 cm', f: 0.01 }, { n: '米 m', f: 1 },
          { n: '千米 km', f: 1000 }, { n: '英寸 in', f: 0.0254 }, { n: '英尺 ft', f: 0.3048 },
          { n: '码 yd', f: 0.9144 }, { n: '英里 mi', f: 1609.344 }, { n: '海里 nmi', f: 1852 }
        ]
      },
      {
        key: 'mass', label: '质量', base: 2,
        units: [
          { n: '毫克 mg', f: 1e-6 }, { n: '克 g', f: 0.001 }, { n: '千克 kg', f: 1 },
          { n: '吨 t', f: 1000 }, { n: '斤', f: 0.5 }, { n: '磅 lb', f: 0.45359237 },
          { n: '盎司 oz', f: 0.028349523125 }
        ]
      },
      {
        key: 'area', label: '面积', base: 0,
        units: [
          { n: '平方米 m²', f: 1 }, { n: '平方千米 km²', f: 1e6 }, { n: '公顷 ha', f: 1e4 },
          { n: '亩', f: 10000 / 15 }, { n: '平方英尺 ft²', f: 0.09290304 },
          { n: '平方英里 mi²', f: 2589988.110336 }, { n: '英亩 acre', f: 4046.8564224 }
        ]
      },
      {
        key: 'volume', label: '体积 / 容积', base: 1,
        units: [
          { n: '毫升 mL', f: 0.001 }, { n: '升 L', f: 1 }, { n: '立方米 m³', f: 1000 },
          { n: '立方英寸 in³', f: 0.016387064 }, { n: '立方英尺 ft³', f: 28.316846592 },
          { n: '美制加仑 gal', f: 3.785411784 }
        ]
      },
      {
        key: 'temp', label: '温度', base: 0, temp: true,
        units: [
          { n: '摄氏度 °C' }, { n: '华氏度 °F' }, { n: '开尔文 K' }
        ]
      }
    ];

    var catSel = h('select', { onchange: rebuild }, CATS.map(function (c) { return h('option', { value: c.key }, c.label); }));
    var valInput = h('input', { type: 'text', value: '1', inputmode: 'decimal', oninput: render });
    var unitSel = h('select', { onchange: render });
    var resultBody = h('div');

    function toBase(cat, uIdx, v) {
      if (!cat.temp) return v * cat.units[uIdx].f;
      if (uIdx === 0) return v;
      if (uIdx === 1) return (v - 32) * 5 / 9;
      return v - 273.15;
    }
    function fromBase(cat, uIdx, v) {
      if (!cat.temp) return v / cat.units[uIdx].f;
      if (uIdx === 0) return v;
      if (uIdx === 1) return v * 9 / 5 + 32;
      return v + 273.15;
    }

    function rebuild() {
      var cat = CATS[catSel.selectedIndex];
      unitSel.innerHTML = '';
      cat.units.forEach(function (u, i) {
        var o = h('option', { value: String(i) }, u.n);
        if (i === cat.base) o.selected = true;
        unitSel.appendChild(o);
      });
      render();
    }

    function render() {
      var cat = CATS[catSel.selectedIndex];
      var from = Number(unitSel.value);
      var raw = valInput.value.trim();
      resultBody.innerHTML = '';
      if (raw === '' || isNaN(Number(raw))) {
        resultBody.appendChild(h('div', { class: 'placeholder-box' }, '请输入有效数值'));
        return;
      }
      var base = toBase(cat, from, Number(raw));
      var table = h('table', { class: 'unit-table' }, cat.units.map(function (u, i) {
        var v = fromBase(cat, i, base);
        return h('tr', { class: i === from ? 'base' : '' }, [
          h('td', { class: 'u-name' }, u.n),
          h('td', { class: 'u-val' }, i === from ? raw : fmtNum(parseFloat(v.toPrecision(12))))
        ]);
      }));
      resultBody.appendChild(table);
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [
        h('label', { class: 'tiny muted' }, ['类别 ', catSel]),
        h('span', { style: { flex: '1' } })
      ]),
      h('div', { class: 'panel-body' }, [
        h('div', { class: 'grid-2' }, [
          h('div', null, [h('label', { class: 'field-label' }, '数值'), valInput]),
          h('div', null, [h('label', { class: 'field-label' }, '单位'), unitSel])
        ])
      ])
    ]));
    view.appendChild(h('div', { class: 'panel flush' }, [resultBody]));
    rebuild();
  }

  /* ---------- 9. 进制转换 ---------- */
  function toolRadix(view) {
    var input = h('input', { type: 'text', spellcheck: 'false', placeholder: '输入任意进制整数，如 255 / 0xFF / 11111111', oninput: render });
    var sel = h('select', { onchange: render }, [
      h('option', { value: 'auto', selected: 'selected' }, '自动识别'),
      h('option', { value: '2' }, '二进制 (2)'),
      h('option', { value: '8' }, '八进制 (8)'),
      h('option', { value: '10' }, '十进制 (10)'),
      h('option', { value: '16' }, '十六进制 (16)')
    ]);
    var out = h('div');

    var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
    function parseBig(str, base) {
      var neg = str[0] === '-';
      if (neg) str = str.slice(1);
      var v = 0n;
      var b = BigInt(base);
      for (var i = 0; i < str.length; i++) {
        var d = DIGITS.indexOf(str[i].toLowerCase());
        if (d < 0 || d >= base) throw new Error('bad digit');
        v = v * b + BigInt(d);
      }
      return neg ? -v : v;
    }

    function render() {
      out.innerHTML = '';
      var raw = input.value.trim();
      if (!raw) { out.appendChild(h('div', { class: 'placeholder-box' }, '输入整数；自动识别支持 0x（十六进制）、0o（八进制）、0b（二进制）前缀')); return; }
      if (/\./.test(raw)) { out.appendChild(h('div', { class: 'alert err mt-2' }, '仅支持整数转换')); return; }
      var base, body2 = raw;
      if (sel.value === 'auto') {
        var m = raw.match(/^(0x|0o|0b)([\da-f]+)$/i);
        if (m) {
          base = m[1] === '0x' ? 16 : m[1] === '0o' ? 8 : 2;
          body2 = m[2];
        } else base = 10;
      } else base = Number(sel.value);

      var val;
      try { val = parseBig(body2, base); }
      catch (e) {
        out.appendChild(h('div', { class: 'alert err mt-2' }, '包含不符合 ' + base + ' 进制的字符'));
        return;
      }
      var bases = [[2, '二进制'], [8, '八进制'], [10, '十进制'], [16, '十六进制']];
      bases.forEach(function (item) {
        var str = val < 0 ? '-' + (-val).toString(item[0]) : val.toString(item[0]);
        if (item[0] === 16) str = str.toUpperCase();
        out.appendChild(h('div', { class: 'radix-row' }, [
          h('span', { class: 'radix-base' }, 'BASE ' + item[0]),
          h('span', { class: 'radix-val' }, str),
          copyBtn(str)
        ]));
      });
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-body' }, [
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 150px', gap: '12px' } }, [
          h('div', null, [h('label', { class: 'field-label' }, '输入'), input]),
          h('div', null, [h('label', { class: 'field-label' }, '进制'), sel])
        ])
      ])
    ]));
    view.appendChild(h('div', { class: 'panel' }, [h('div', { class: 'panel-body' }, out)]));
    render();
  }

  /* ---------- 10. BMI 计算器 ---------- */
  function toolBmi(view) {
    var hInput = h('input', { type: 'number', value: '170', min: '50', max: '250', step: '1', oninput: render });
    var wInput = h('input', { type: 'number', value: '65', min: '10', max: '300', step: '0.1', oninput: render });
    var numEl = h('span', { class: 'bmi-num' });
    var catEl = badge('idle', '—');
    var rangeEl = h('span', { class: 'tiny muted mono' });
    var pointer = h('div', { class: 'bmi-pointer', style: { left: '0%' } });
    var scale = h('div', { class: 'bmi-scale' }, [pointer]);
    var extra = h('div', { class: 'tiny muted', style: { lineHeight: '1.8' } });

    function classify(b) {
      if (b < 18.5) return { t: '偏瘦', cls: 'info', color: '#3d8fd1', bg: 'rgba(90,169,230,.18)' };
      if (b < 24) return { t: '正常', cls: 'ok', color: 'var(--ok)', bg: '' };
      if (b < 28) return { t: '超重', cls: 'warn', color: 'var(--warn)', bg: '' };
      return { t: '肥胖', cls: 'err', color: 'var(--danger)', bg: '' };
    }

    function render() {
      var hcm = Number(hInput.value), w = Number(wInput.value);
      scale.style.background = 'linear-gradient(to right,#5aa9e6 0 19.4%,#4caf72 19.4% 50%,#f0b429 50% 72.2%,#e15b4c 72.2% 100%)';
      if (!hcm || !w || hcm <= 0) return;
      var hm = hcm / 100;
      var b = w / (hm * hm);
      if (b <= 0 || !isFinite(b)) return;
      numEl.textContent = b.toFixed(1);
      var c = classify(b);
      catEl.className = 'badge ' + c.cls;
      catEl.textContent = c.t;
      catEl.style.color = c.color;
      catEl.style.background = c.bg;
      numEl.style.color = c.color;
      var lo = 18.5 * hm * hm, hi = 23.9 * hm * hm;
      rangeEl.textContent = '健康体重区间 ' + lo.toFixed(1) + ' – ' + hi.toFixed(1) + ' kg';
      var pos = ((b - 15) / (33 - 15)) * 100;
      pointer.style.left = Math.max(0, Math.min(100, pos)) + '%';
      var diff = w < lo ? (lo - w).toFixed(1) : w > hi ? (w - hi).toFixed(1) : '0';
      extra.innerHTML = '';
      if (w < lo) extra.appendChild(document.createTextNode('距离健康体重下限还需增重约 ' + diff + ' kg'));
      else if (w > hi) extra.appendChild(document.createTextNode('超出健康体重上限约 ' + diff + ' kg'));
      else extra.appendChild(document.createTextNode('体重处于健康范围内，请继续保持'));
    }

    view.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'panel-body' }, [
        h('div', { class: 'grid-2' }, [
          h('div', null, [
            h('label', { class: 'field-label' }, '身高（厘米）'),
            hInput,
            h('label', { class: 'field-label', style: { marginTop: '14px' } }, '体重（千克）'),
            wInput,
            h('div', { class: 'bmi-result' }, [
              numEl,
              h('div', { style: { marginTop: '6px' } }, [catEl])
            ])
          ]),
          h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 4px' } }, [
            scale,
            h('div', { class: 'bmi-scale-labels' }, ['15 偏瘦', '18.5', '24 超重', '28', '33']),
            h('div', { style: { textAlign: 'center', marginTop: '18px' } }, [rangeEl]),
            h('div', { style: { textAlign: 'center', marginTop: '6px' } }, [extra]),
            h('div', { class: 'tiny muted', style: { textAlign: 'center', marginTop: '16px', lineHeight: '1.7' } },
              '依据中国成人 BMI 判定标准（18.5–23.9 为正常），结果仅供参考，不构成医疗建议。')
          ])
        ])
      ])
    ]));
    render();
  }

  /* ============================================================
     注册表 / 路由
     ============================================================ */

  var TOOLS = [
    { id: 'json', cat: 'dev', name: 'JSON 格式化', desc: '校验、美化、压缩 JSON，定位语法错误', mount: toolJson },
    { id: 'base64', cat: 'dev', name: 'Base64 编解码', desc: 'UTF-8 安全的 Base64 文本编解码', mount: toolBase64 },
    { id: 'url', cat: 'dev', name: 'URL 编解码', desc: 'URL 编解码与链接结构、参数解析', mount: toolUrl },
    { id: 'time', cat: 'dev', name: '时间戳转换', desc: 'Unix 时间戳与日期双向转换', mount: toolTime },
    { id: 'qrcode', cat: 'dev', name: '二维码生成', desc: '本地生成二维码并导出 PNG 图片', mount: toolQR },
    { id: 'color', cat: 'dev', name: '颜色转换', desc: 'HEX / RGB / HSL 互转与取色', mount: toolColor },
    { id: 'calc', cat: 'calc', name: '计算器', desc: '支持括号与四则运算，含历史记录', mount: toolCalc },
    { id: 'unit', cat: 'calc', name: '单位换算', desc: '长度、质量、面积、体积与温度', mount: toolUnit },
    { id: 'radix', cat: 'calc', name: '进制转换', desc: '二 / 八 / 十 / 十六进制互转，支持大整数', mount: toolRadix },
    { id: 'bmi', cat: 'calc', name: 'BMI 计算器', desc: '体质指数计算与健康体重范围', mount: toolBmi }
  ];
  var CATS = { dev: '开发工具 DEVELOPER', calc: '计算换算 CALCULATOR' };

  var viewEl = document.getElementById('view');
  var navEl = document.getElementById('nav');
  var crumbEl = document.getElementById('crumb');
  var currentCleanup = null;

  function buildNav(activeId) {
    navEl.innerHTML = '';
    navEl.appendChild(h('a', {
      class: 'nav-item nav-home' + (!activeId ? ' active' : ''),
      href: '#/'
    }, [svg('grid'), '全部工具']));
    Object.keys(CATS).forEach(function (catKey) {
      navEl.appendChild(h('div', { class: 'nav-group' }, CATS[catKey]));
      TOOLS.filter(function (t) { return t.cat === catKey; }).forEach(function (t) {
        navEl.appendChild(h('a', {
          class: 'nav-item' + (activeId === t.id ? ' active' : ''),
          href: '#/' + t.id
        }, [svg(t.id), t.name]));
      });
    });
  }

  function renderHome() {
    crumbEl.innerHTML = '';
    crumbEl.appendChild(svg('grid'));
    crumbEl.appendChild(document.createTextNode('全部工具'));
    buildNav(null);

    var hero = h('div', { class: 'hero' }, [
      h('h1', { html: '在线<span class="accent">工具台</span>' }),
      h('p', null, '面向开发者的常用工具合集。所有计算均在浏览器本地完成，内容不上传、不追踪，断网可用。')
    ]);
    viewEl.appendChild(hero);

    Object.keys(CATS).forEach(function (catKey) {
      var sec = h('div', { class: 'home-section' }, [
        h('div', { class: 'section-label' }, CATS[catKey]),
        h('div', { class: 'tool-grid' }, TOOLS.filter(function (t) { return t.cat === catKey; }).map(function (t) {
          return h('a', { class: 'tool-card', href: '#/' + t.id }, [
            h('span', { class: 'tc-icon' }, [svg(t.id)]),
            h('span', null, [
              h('span', { class: 'tc-name', style: { display: 'block' } }, t.name),
              h('span', { class: 'tc-desc', style: { display: 'block' } }, t.desc)
            ])
          ]);
        }))
      ]);
      viewEl.appendChild(sec);
    });
  }

  function renderTool(id) {
    var tool = TOOLS.filter(function (t) { return t.id === id; })[0];
    if (!tool) { location.hash = '#/'; return; }
    crumbEl.innerHTML = '';
    crumbEl.appendChild(svg(tool.id));
    crumbEl.appendChild(document.createTextNode(tool.name));
    buildNav(id);

    viewEl.appendChild(h('div', { class: 'page-head container', style: { maxWidth: '1080px' } }, [
      h('h2', { class: 'page-title' }, [svg(tool.id), tool.name]),
      h('p', { class: 'page-desc' }, tool.desc)
    ]));
    var holder = h('div', { class: 'container' });
    viewEl.appendChild(holder);
    currentCleanup = tool.mount(holder) || null;
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarMask').classList.remove('show');
  }

  function route() {
    if (currentCleanup) { try { currentCleanup(); } catch (e) {} currentCleanup = null; }
    viewEl.innerHTML = '';
    var id = (location.hash || '#/').replace(/^#\/?/, '').split('/')[0];
    if (id && TOOLS.some(function (t) { return t.id === id; })) renderTool(id);
    else renderHome();
    window.scrollTo(0, 0);
    closeSidebar();
  }

  document.getElementById('menuBtn').addEventListener('click', function () {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarMask').classList.add('show');
  });
  document.getElementById('sidebarMask').addEventListener('click', closeSidebar);

  window.addEventListener('hashchange', route);
  route();
})();
