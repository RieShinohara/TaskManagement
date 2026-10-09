/*
 * TaskBoard プロトタイプ（動き）
 * 要件定義書（docs/）の内容を、ブラウザで動かして確認するための使い捨ての試作。
 * データは localStorage（このブラウザの中）にだけ保存する。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'taskboard-prototype-v1';
  var COLORS = [
    ['none', '色なし'], ['red', '赤'], ['blue', '青'],
    ['green', '緑'], ['yellow', '黄'], ['gray', 'グレー']
  ];

  // ---------- 日付・文字列のヘルパー ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  // 期限の表示：「期限 10月12日」。年は、今年と違うときだけ付ける（例：期限 2027年1月15日）
  function fmtDue(s) {
    var p = s.split('-');
    var year = Number(p[0]) !== new Date().getFullYear() ? Number(p[0]) + '年' : '';
    return '期限 ' + year + Number(p[1]) + '月' + Number(p[2]) + '日';
  }
  // 期限切れ：期限日が今日より前で、完了列以外にあるカード
  function isOverdue(card, colId) { return !!card.due && card.due < ymd(new Date()) && colId !== 'done'; }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- アイコン（線画のSVG。形は、Lucide / Feather に基づく。どちらも無料で使える） ----------
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = {
    palette: svg('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/>' +
      '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
    calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    pencil: svg('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>')
  };

  // ---------- データ ----------
  // state.cols[列].cards の並び順が、そのまま画面の上からの順番になる
  function initialState() {
    return {
      cols: [
        { id: 'todo', name: 'ToDo', cards: [
          { id: uid(), title: '見積書を作成する', color: 'blue', due: addDays(2) },
          { id: uid(), title: '打ち合わせの日程を調整する', color: 'none', due: null },
          { id: uid(), title: '請求書を送る（期限切れの例）', color: 'red', due: addDays(-2) }
        ] },
        { id: 'doing', name: '作業中', cards: [
          { id: uid(), title: 'ロゴ案を3つ作る', color: 'green', due: addDays(5) }
        ] },
        { id: 'done', name: '完了', cards: [
          { id: uid(), title: '要件をヒアリングする（完了列は赤くならない）', color: 'gray', due: addDays(-5) }
        ] }
      ]
    };
  }
  function validState(o) {
    return o && Array.isArray(o.cols) && o.cols.length > 0 && o.cols.every(function (c) {
      return c && typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.cards) &&
        c.cards.every(function (k) { return k && typeof k.id === 'string' && typeof k.title === 'string'; });
    });
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { var o = JSON.parse(raw); if (validState(o)) return o; }
    } catch (e) { /* 保存先が使えない場合は、初期データで動かす */ }
    return null;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 何もしない */ }
  }

  var state = load() || initialState();
  // ui：画面の一時的な状態（保存しない）
  //   adding：追加中のカード　edit：編集中のカード　drag：ドラッグ中のカード
  var ui = { adding: null, edit: null, drag: null };

  function findCard(id) {
    for (var i = 0; i < state.cols.length; i++) {
      for (var j = 0; j < state.cols[i].cards.length; j++) {
        if (state.cols[i].cards[j].id === id) {
          return { col: state.cols[i], card: state.cols[i].cards[j], index: j };
        }
      }
    }
    return null;
  }
  function findCol(id) {
    return state.cols.filter(function (c) { return c.id === id; })[0];
  }

  // ---------- 描画 ----------
  var board = document.getElementById('board');

  function cardHtml(card, col) {
    var cls = 'card c-' + (card.color || 'none');
    if (ui.edit && ui.edit.id === card.id) {
      // 編集中：タイトルが書き換えられ、同時にメニュー（削除）が出る
      return '<div class="' + cls + ' editing" data-id="' + card.id + '">' +
        '<input class="title-input" value="' + esc(ui.edit.title) + '">' +
        '<div class="hint">Enterで確定　Escで取り消し</div>' +
        '<div class="menu"><button class="danger" data-action="ask-delete" data-id="' + card.id + '">削除</button></div>' +
        '</div>';
    }
    var due = card.due
      ? '<div><span class="due' + (isOverdue(card, col.id) ? ' overdue' : '') +
        '" data-action="due" data-id="' + card.id + '">' + fmtDue(card.due) + '</span></div>'
      : '';
    return '<div class="' + cls + '" data-id="' + card.id + '" draggable="true">' +
      '<div class="title">' + esc(card.title) + '</div>' + due +
      '<div class="actions">' +
        '<button class="icon" title="色" data-action="color" data-id="' + card.id + '">' + ICONS.palette + '</button>' +
        '<button class="icon" title="期限" data-action="due" data-id="' + card.id + '">' + ICONS.calendar + '</button>' +
        '<button class="icon" title="編集" data-action="edit" data-id="' + card.id + '">' + ICONS.pencil + '</button>' +
      '</div></div>';
  }

  function draftHtml() {
    var d = ui.adding;
    var due = d.due ? '<div><span class="due">' + fmtDue(d.due) + '</span></div>' : '';
    return '<div class="card draft c-' + d.color + '">' +
      '<input class="title-input" id="draft-input" placeholder="タイトルを入力してください" value="' + esc(d.title) + '">' +
      '<div class="hint">Enterで追加　Escで取り消し</div>' +
      due +
      '<div class="actions">' +
        '<button class="icon" title="色" data-action="draft-color">' + ICONS.palette + '</button>' +
        '<button class="icon" title="期限" data-action="draft-due">' + ICONS.calendar + '</button>' +
      '</div></div>';
  }

  function render() {
    board.innerHTML = state.cols.map(function (col) {
      var cards = col.cards.map(function (c) { return cardHtml(c, col); }).join('');
      var draft = (ui.adding && ui.adding.col === col.id) ? draftHtml() : '';
      return '<section class="column" data-col="' + col.id + '">' +
        '<div class="column-head"><h2>' + esc(col.name) + '</h2>' +
          '<div class="right">' +
            '<button class="mini" data-action="sort" data-col="' + col.id + '">期限順</button>' +
            '<button class="mini" title="カードを追加" data-action="add" data-col="' + col.id + '">＋</button>' +
          '</div></div>' +
        '<div class="cards" data-col="' + col.id + '">' + draft + cards + '</div>' +
      '</section>';
    }).join('');

    // 入力欄があれば、カーソルをそこに置く
    var input = document.getElementById('draft-input') || board.querySelector('.title-input');
    if (input) { input.focus(); var n = input.value.length; input.setSelectionRange(n, n); }
  }

  // ---------- ポップオーバー（色見本・カレンダー） ----------
  var pop = document.getElementById('pop');
  function closePop() { pop.hidden = true; pop.innerHTML = ''; pop.onclick = null; }
  function placePop(anchor) {
    var r = anchor.getBoundingClientRect();
    pop.hidden = false;
    var w = pop.offsetWidth, h = pop.offsetHeight;
    // 横：画面の右端からはみ出さない
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    // 縦：アイコンの真下に出す。下に入らないときは、上に出す。
    //     上にも入らないときは、画面の中に収まる位置までずらす（画面が小さいとき）
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) {
      if (r.top - h - 6 >= 8) top = r.top - h - 6;
      else top = Math.max(8, window.innerHeight - h - 8);
    }
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (top + window.scrollY) + 'px';
  }
  function openPalette(anchor, onPick) {
    closePop();
    pop.innerHTML = '<div class="swatches">' + COLORS.map(function (c) {
      return '<button class="swatch" data-color="' + c[0] + '" style="background:var(--c-' + c[0] + ')">' + c[1] + '</button>';
    }).join('') + '</div>';
    pop.onclick = function (e) {
      var b = e.target.closest('[data-color]');
      if (b) { onPick(b.dataset.color); closePop(); }
    };
    placePop(anchor);
  }
  // 自作のカレンダー（月の表示。常に、アイコンの近くに出る）
  var WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  function calendarHtml(year, month, selected) {
    var today = ymd(new Date());
    var start = new Date(year, month, 1 - new Date(year, month, 1).getDay()); // 表の左上（日曜日）
    var cells = '';
    for (var i = 0; i < 42; i++) { // 6週間分。月が変わっても、高さが変わらない
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var s = ymd(d);
      var cls = 'day' + (d.getMonth() !== month ? ' other' : '') + (s === today ? ' today' : '') + (s === selected ? ' selected' : '');
      cells += '<button class="' + cls + '" data-day="' + s + '">' + d.getDate() + '</button>';
    }
    return '<div class="calendar">' +
      '<div class="cal-head">' +
        '<button class="cal-nav" data-nav="prev" title="前の月">＜</button>' +
        '<div class="cal-title">' + year + '年' + (month + 1) + '月</div>' +
        '<button class="cal-nav" data-nav="next" title="次の月">＞</button>' +
      '</div>' +
      '<div class="cal-week">' + WEEKDAYS.map(function (w) { return '<div>' + w + '</div>'; }).join('') + '</div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<button class="btn cal-clear" id="cal-clear">期限を外す</button>' +
    '</div>';
  }
  function openCalendar(anchor, current, onPick) {
    closePop();
    var base = current ? new Date(current + 'T00:00:00') : new Date();
    var view = { y: base.getFullYear(), m: base.getMonth() };
    pop.innerHTML = calendarHtml(view.y, view.m, current);
    pop.onclick = function (e) {
      var nav = e.target.closest('[data-nav]');
      var day = e.target.closest('[data-day]');
      if (nav) {
        view.m += nav.dataset.nav === 'next' ? 1 : -1;
        if (view.m < 0) { view.m = 11; view.y--; }
        if (view.m > 11) { view.m = 0; view.y++; }
        pop.innerHTML = calendarHtml(view.y, view.m, current);
        e.stopPropagation(); // 作り直したボタンを、「窓の外」と誤解して閉じないように
      } else if (day) {
        onPick(day.dataset.day); closePop();
      } else if (e.target.closest('#cal-clear')) {
        onPick(null); closePop();
      }
    };
    placePop(anchor);
  }
  // 窓の外を押したら閉じる
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-action]')) closePop();
  });

  // 入力欄の外を押したとき（追加・編集とも、同じルール）
  //   追加：タイトルがあれば、カードとして確定する。空なら、入力欄が消える
  //   編集：変更を確定する。空なら、元のタイトルのまま
  // ※ 入力欄のカード、色見本・カレンダー、確認メッセージの中を押したときは、何もしない
  // ※ クリックの「最初」（capture）に処理するので、押した先のボタンも、そのまま働く
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (pop.contains(t) || overlay.contains(t)) return;
    if (ui.adding && !t.closest('.card.draft')) commitDraft();
    if (ui.edit && !t.closest('.card.editing')) commitEdit();
  }, true);

  // ---------- 確認メッセージ ----------
  var overlay = document.getElementById('overlay');
  var modal = document.getElementById('modal');
  function showModal(message, buttons) {
    modal.innerHTML = '<p>' + esc(message) + '</p><div class="row"></div>';
    var row = modal.querySelector('.row');
    buttons.forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', function () { overlay.hidden = true; if (b.onClick) b.onClick(); });
      row.appendChild(el);
    });
    overlay.hidden = false;
  }

  // ---------- カードの操作 ----------
  // 追加の確定：タイトルが空なら、カードは作らない
  function commitDraft() {
    var d = ui.adding;
    if (!d) return;
    var title = d.title.trim();
    ui.adding = null;
    if (title) {
      findCol(d.col).cards.unshift({ id: uid(), title: title, color: d.color, due: d.due }); // 列の一番上
      save();
    }
    render();
  }
  // 編集の確定：タイトルが空なら、元のタイトルのまま
  function commitEdit() {
    var e = ui.edit;
    if (!e) return;
    var title = e.title.trim();
    var f = findCard(e.id);
    if (f && title) { f.card.title = title; save(); }
    ui.edit = null;
    render();
  }
  // 移動：どの列の、何番目へでも動かせる
  function moveCard(id, toColId, idx) {
    var f = findCard(id);
    if (!f) return;
    f.col.cards.splice(f.index, 1);
    var dest = findCol(toColId);
    dest.cards.splice(Math.min(idx, dest.cards.length), 0, f.card);
  }
  // 期限順：期限の早い順。期限のないカードは末尾
  function sortByDue(col) {
    col.cards.sort(function (x, y) {
      if (!x.due && !y.due) return 0;
      if (!x.due) return 1;
      if (!y.due) return -1;
      return x.due < y.due ? -1 : x.due > y.due ? 1 : 0;
    });
  }

  board.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var a = btn.dataset.action;
    var id = btn.dataset.id;
    closePop();

    if (a === 'add') {
      ui.edit = null;
      ui.adding = { col: btn.dataset.col, title: '', color: 'none', due: null };
      render();
    } else if (a === 'sort') {
      sortByDue(findCol(btn.dataset.col));
      save(); render();
    } else if (a === 'color') {
      openPalette(btn, function (c) { var f = findCard(id); if (f) { f.card.color = c; save(); render(); } });
    } else if (a === 'due') {
      var fc = findCard(id);
      openCalendar(btn, fc ? fc.card.due : null, function (d) {
        var f = findCard(id);
        if (f) { f.card.due = d; save(); render(); }
      });
    } else if (a === 'edit') {
      var fe = findCard(id);
      ui.adding = null;
      ui.edit = { id: id, title: fe.card.title };
      render();
    } else if (a === 'ask-delete') {
      showModal('本当に削除しますか？', [
        { label: 'キャンセル' },
        { label: '削除する', cls: 'danger', onClick: function () {
          var f = findCard(id);
          if (f) f.col.cards.splice(f.index, 1);
          ui.edit = null; save(); render();
        } }
      ]);
    } else if (a === 'draft-color') {
      openPalette(btn, function (c) { ui.adding.color = c; render(); });
    } else if (a === 'draft-due') {
      openCalendar(btn, ui.adding.due, function (d) { ui.adding.due = d; render(); });
    }
  });

  // 入力中の文字を覚えておく（色や期限を選んで再描画しても、消えないように）
  board.addEventListener('input', function (e) {
    if (e.target.id === 'draft-input' && ui.adding) ui.adding.title = e.target.value;
    else if (e.target.classList.contains('title-input') && ui.edit) ui.edit.title = e.target.value;
  });

  board.addEventListener('keydown', function (e) {
    if (e.isComposing) return; // 日本語入力の変換中のEnterは、確定に使わない
    var t = e.target;
    if (t.id === 'draft-input') {
      if (e.key === 'Enter') { e.preventDefault(); commitDraft(); }
      else if (e.key === 'Escape') { ui.adding = null; render(); }
    } else if (t.classList && t.classList.contains('title-input')) {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
      else if (e.key === 'Escape') { ui.edit = null; render(); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePop();
  });

  // ---------- ドラッグ＆ドロップ ----------
  function clearLine() {
    var l = board.querySelector('.drop-line');
    if (l) l.remove();
  }
  // マウスの高さから、「何番目に入るか」を求める
  function dropIndex(list, y) {
    var els = Array.prototype.slice.call(list.querySelectorAll('.card[data-id]:not(.dragging)'));
    var idx = 0;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top + r.height / 2 < y) idx++;
    });
    return { idx: idx, els: els };
  }
  board.addEventListener('dragstart', function (e) {
    var el = e.target.closest && e.target.closest('.card[data-id]');
    if (!el || ui.edit) return;
    ui.drag = { id: el.dataset.id, over: null };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.dataset.id);
    setTimeout(function () { el.classList.add('dragging'); }, 0);
  });
  board.addEventListener('dragover', function (e) {
    var list = e.target.closest('.cards');
    if (!list || !ui.drag) return;
    e.preventDefault();
    var r = dropIndex(list, e.clientY);
    clearLine();
    var line = document.createElement('div');
    line.className = 'drop-line';
    if (r.idx < r.els.length) list.insertBefore(line, r.els[r.idx]); else list.appendChild(line);
    ui.drag.over = { col: list.dataset.col, idx: r.idx };
  });
  board.addEventListener('drop', function (e) {
    if (!ui.drag || !ui.drag.over) return;
    e.preventDefault();
    moveCard(ui.drag.id, ui.drag.over.col, ui.drag.over.idx);
    ui.drag = null;
    save(); render();
  });
  board.addEventListener('dragend', function () {
    ui.drag = null; // 列の外で離したときは、何も変えない（元の位置に戻る）
    clearLine();
    var d = board.querySelector('.dragging');
    if (d) d.classList.remove('dragging');
  });

  // ---------- バックアップ・読み込み ----------
  document.getElementById('btn-backup').addEventListener('click', function () {
    var now = new Date();
    var stamp = ymd(now).replace(/-/g, '') + '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    var data = { app: 'taskboard', version: 1, exportedAt: now.toISOString(), cols: state.cols };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taskboard-backup-' + stamp + '.json'; // ファイル名に、保存した日時が付く
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  var fileInput = document.getElementById('file-import');
  document.getElementById('btn-import').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var obj = null;
      try { obj = JSON.parse(reader.result); } catch (e) { obj = null; }
      if (!obj || obj.app !== 'taskboard' || !validState(obj)) {
        showModal('このファイルは読み込めません。', [{ label: '閉じる', cls: 'primary' }]);
        return;
      }
      showModal('現在のデータは、すべて置き換わります。よろしいですか？', [
        { label: 'キャンセル' },
        { label: '読み込む', cls: 'danger', onClick: function () {
          state = { cols: obj.cols };
          ui = { adding: null, edit: null, drag: null };
          save(); render();
        } }
      ]);
    };
    reader.readAsText(file);
  });

  render();
})();
