// ActionId定義（actions.jsから）
const ActionId = {
  OEPN_URL_NEW_TAB: 1,
  OPEN_URL_CURRENT_TAB: 2,
  JUMP_URL: 3,
  EXECUTE_SCRIPT: 4,
  OPEN_URL_PRIVATE_MODE: 5,
  OPEN_CURRENT_TAB_PRIVATE_MODE: 6,
  JUMP_URL_ALL_WINDOWS: 7,
  OPEN_SHORTCUT_GROUP: 9
};

let settings;
let allShortcutKeys = [];
let allGroups = [];
let filteredResults = [];
let selectedIndex = -1;
let tagColors = {};
let currentTagFilter = '';
let isSearchMode = false; // false: ショートカットキー認識モード, true: 検索入力モード
let receivedKeys = ''; // 入力されたキーを蓄積

/**
 * タグの色を取得（デフォルトカラーを返す）
 */
function getTagColor(tag) {
  if (tagColors[tag]) {
    return tagColors[tag];
  }
  // デフォルトカラーを生成
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * URLからドメイン名を取得
 */
function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

/**
 * 検索結果をレンダリング
 */
function render(results) {
  const listElement = document.getElementById('shortcutKeys');
  listElement.innerHTML = '';

  if (!results || results.length === 0) {
    listElement.innerHTML = `
      <div class="no-results">
        <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <div class="no-results-text">見つかりませんでした</div>
        <div class="no-results-hint">別のキーワードで検索してください</div>
      </div>
    `;
    return;
  }

  results.forEach((result, index) => {
    const item = result.item || result;
    if (item.hideOnPopup) return;

    const element = createShortcutKeyElement(item, index);
    listElement.appendChild(element);
  });

  updateSelection();
}

/**
 * ショートカットキー要素を作成
 */
function createShortcutKeyElement(shortcutKey, index) {
  const itemElement = document.createElement('div');
  itemElement.className = 'shortcut-item';
  itemElement.dataset.index = index;

  // グループの場合はクラスを追加
  if (shortcutKey.isGroup) {
    itemElement.classList.add('group-shortcut-item');
  }

  // キーバッジ
  const keyHtml = shortcutKey.key
    ? `<span class="item-key">${escapeHtml(shortcutKey.key)}</span>`
    : '';

  // グループバッジ
  const groupBadgeHtml = shortcutKey.isGroup
    ? `<span class="group-badge">グループ</span>`
    : '';

  itemElement.innerHTML = `
    <div class="item-content">
      <div class="item-header">
        ${keyHtml}
        <div class="item-title">${escapeHtml(shortcutKey.title)}</div>
        ${groupBadgeHtml}
      </div>
    </div>
  `;

  itemElement.addEventListener('click', () => {
    executeShortcut(shortcutKey);
  });

  itemElement.addEventListener('mouseenter', () => {
    selectedIndex = index;
    updateSelection();
  });

  return itemElement;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 選択状態を更新
 */
function updateSelection() {
  const items = document.querySelectorAll('.shortcut-item');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      item.classList.remove('selected');
    }
  });
}

/**
 * ショートカットを実行
 */
function executeShortcut(shortcutKey) {
  // 使用回数を更新
  chrome.runtime.sendMessage({
    target: 'background-handler',
    name: MessageName.INCREMENT_USE_COUNT,
    value: shortcutKey.id
  });

  // アクションを実行
  chrome.runtime.sendMessage({
    target: 'background-handler',
    name: MessageName.CLICK_EVENT,
    value: shortcutKey
  });
  window.close();
}

/**
 * カテゴリーフィルターを表示
 */
function renderCategoryFilters() {
  const filterContainer = document.getElementById('categoryFilters');
  if (!filterContainer) return;

  // 全タグを収集
  const allTags = new Set();
  allShortcutKeys.forEach(sk => {
    if (sk.tags && Array.isArray(sk.tags)) {
      sk.tags.forEach(tag => allTags.add(tag));
    }
  });

  if (allTags.size === 0) {
    filterContainer.style.display = 'none';
    return;
  }

  filterContainer.style.display = 'flex';
  filterContainer.innerHTML = '';

  // 「すべて」ボタン
  const allButton = document.createElement('button');
  allButton.className = 'category-filter-btn' + (currentTagFilter === '' ? ' active' : '');
  allButton.textContent = 'すべて';
  allButton.addEventListener('click', () => {
    currentTagFilter = '';
    document.getElementById('searchInput').value = '';
    performSearch('');
    updateCategoryFilterButtons();
  });
  filterContainer.appendChild(allButton);

  // タグボタン
  Array.from(allTags).sort().forEach(tag => {
    const button = document.createElement('button');
    button.className = 'category-filter-btn' + (currentTagFilter === tag ? ' active' : '');
    button.textContent = tag;
    const color = getTagColor(tag);
    button.style.setProperty('--tag-color', color);
    button.addEventListener('click', () => {
      currentTagFilter = tag;
      const searchInput = document.getElementById('searchInput');
      searchInput.value = tag;
      searchInput.focus();
      performSearch(tag);
      updateCategoryFilterButtons();
    });
    filterContainer.appendChild(button);
  });
}

/**
 * カテゴリーフィルターのアクティブ状態を更新
 */
function updateCategoryFilterButtons() {
  const buttons = document.querySelectorAll('.category-filter-btn');
  buttons.forEach(btn => {
    if (btn.textContent === 'すべて') {
      btn.classList.toggle('active', currentTagFilter === '');
    } else {
      btn.classList.toggle('active', currentTagFilter === btn.textContent);
    }
  });
}

/**
 * 検索を実行
 */
function performSearch(query) {
  // グループをショートカットキー形式に変換
  const groupAsShortcuts = (allGroups || []).map(group => ({
    id: group.id,
    key: group.key,
    title: group.title,
    isGroup: true,
    action: ActionId.OPEN_SHORTCUT_GROUP,
    groupData: group,
    shortcutKeyIds: group.shortcutKeyIds,
    hidden: false,
    hideOnPopup: false
  }));

  // ショートカットキーとグループを結合
  const allItems = [...(allShortcutKeys || []), ...groupAsShortcuts];

  // シンプルな検索
  if (!query || query.trim() === '') {
    // クエリが空の場合は全件返す
    filteredResults = allItems.filter(item => !item.hidden).map(item => ({ item, score: 0 }));
  } else {
    // キーとタイトルで前方一致検索
    const normalizedQuery = query.toLowerCase().trim();
    filteredResults = allItems
      .filter(item => {
        if (item.hidden) return false;
        const key = (item.key || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const tags = (item.tags || []).map(t => t.toLowerCase());
        // キーが前方一致、タイトルに含まれる、またはタグに含まれる
        return key.startsWith(normalizedQuery) ||
               title.includes(normalizedQuery) ||
               tags.some(tag => tag.includes(normalizedQuery));
      })
      .map(item => {
        // キーが前方一致の場合はスコア高め
        const key = (item.key || '').toLowerCase();
        const score = key.startsWith(normalizedQuery) ? 100 : 50;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  selectedIndex = filteredResults.length > 0 ? 0 : -1;
  render(filteredResults);
}

/**
 * キーボードイベントを処理
 */
function handleKeyDown(e) {
  const items = document.querySelectorAll('.shortcut-item');
  const itemCount = items.length;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (itemCount > 0) {
        selectedIndex = (selectedIndex + 1) % itemCount;
        updateSelection();
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (itemCount > 0) {
        selectedIndex = selectedIndex <= 0 ? itemCount - 1 : selectedIndex - 1;
        updateSelection();
      }
      break;

    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
        const result = filteredResults[selectedIndex];
        const item = result.item || result;
        executeShortcut(item);
      }
      break;

    case 'Escape':
      window.close();
      break;

    case 'Tab':
      e.preventDefault();
      if (itemCount > 0) {
        if (e.shiftKey) {
          selectedIndex = selectedIndex <= 0 ? itemCount - 1 : selectedIndex - 1;
        } else {
          selectedIndex = (selectedIndex + 1) % itemCount;
        }
        updateSelection();
      }
      break;
  }
}

/**
 * 検索入力の処理
 */
function handleSearchInput(e) {
  const query = e.target.value;
  performSearch(query);

  // 検索結果が1つだけで、クエリが空でない場合は自動実行
  if (query && filteredResults.length === 1) {
    const result = filteredResults[0];
    const item = result.item || result;
    executeShortcut(item);
  }
}

/**
 * ショートカットキー認識モードのキー処理
 * IMEの状態に関係なく、物理キーを直接認識する
 */
function handleShortcutKeyMode(e) {
  // 検索モードの場合は何もしない
  if (isSearchMode) return;

  // 特殊キーの処理
  switch (e.key) {
    case 'Escape':
      window.close();
      return;
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Tab':
    case 'Enter':
      handleKeyDown(e);
      return;
  }

  // 修飾キーのみの場合は無視
  if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
    return;
  }

  // 物理キーからアルファベットを取得（IMEの状態に関係なく）
  let key = '';

  // e.codeから物理キーを取得（例：KeyA, KeyB, Digit1など）
  if (e.code && e.code.startsWith('Key')) {
    key = e.code.replace('Key', '').toUpperCase();
  } else if (e.code && e.code.startsWith('Digit')) {
    key = e.code.replace('Digit', '');
  } else if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
    key = e.key.toUpperCase();
  }

  if (!key) return;

  e.preventDefault();
  receivedKeys += key;

  // グループをショートカットキー形式に変換
  const groupAsShortcuts = (allGroups || []).map(group => ({
    id: group.id,
    key: group.key,
    title: group.title,
    isGroup: true,
    action: ActionId.OPEN_SHORTCUT_GROUP,
    groupData: group,
    shortcutKeyIds: group.shortcutKeyIds,
    hidden: false,
    hideOnPopup: false
  }));

  // ショートカットキーとグループを結合
  const allItems = [...(allShortcutKeys || []), ...groupAsShortcuts];

  // 前方一致で検索
  const matchItems = allItems.filter(item => {
    if (item.hidden || item.hideOnPopup) return false;
    const itemKey = (item.key || '').toUpperCase();
    return itemKey.startsWith(receivedKeys);
  });

  if (matchItems.length === 1 && matchItems[0].key.toUpperCase() === receivedKeys) {
    // 完全一致が1つだけの場合は実行
    executeShortcut(matchItems[0]);
  } else if (matchItems.length === 0) {
    // 一致するものがない場合はリセット
    receivedKeys = '';
  }
  // 複数マッチの場合は次のキー入力を待つ
}

/**
 * 検索モードに切り替え
 */
function enterSearchMode() {
  isSearchMode = true;
  receivedKeys = '';
  const searchInput = document.getElementById('searchInput');
  searchInput.placeholder = '検索...';
  document.querySelector('.search-hint').textContent = 'ESCで閉じる';
}

/**
 * ショートカットキー認識モードに切り替え
 */
function enterShortcutMode() {
  isSearchMode = false;
  receivedKeys = '';
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  searchInput.placeholder = 'クリックで検索モード';
  searchInput.blur();
  document.querySelector('.search-hint').textContent = 'キーを押す';
  performSearch('');
}

// イベントリスナーを設定
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', handleSearchInput);
searchInput.addEventListener('keydown', handleKeyDown);

// 検索窓にフォーカスが当たったら検索モードに切り替え
searchInput.addEventListener('focus', enterSearchMode);

// 検索窓からフォーカスが外れたらショートカットキーモードに切り替え
searchInput.addEventListener('blur', () => {
  // 少し遅延させて、クリックイベントが先に処理されるようにする
  setTimeout(() => {
    if (document.activeElement !== searchInput) {
      enterShortcutMode();
    }
  }, 100);
});

// ドキュメント全体でキーボードイベントをリッスン（ショートカットキー認識モード用）
document.addEventListener('keydown', handleShortcutKeyMode);

document.getElementById('add').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ target: 'background-options', name: 'add' });
  window.close();
});

document.getElementById('options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
  window.close();
});

// 起動時の処理
chrome.runtime.sendMessage({ target: 'background-handler', name: MessageName.STARTUP }, (response) => {
  settings = response.settings;
  allShortcutKeys = settings.shortcutKeys || [];
  allGroups = settings.shortcutGroups || [];
  tagColors = settings.tagColors || {};

  // 列数を設定から適用
  const columnCount = settings.listColumnCount || 3;
  const listElement = document.getElementById('shortcutKeys');
  listElement.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;

  // カテゴリーフィルターの配置位置を適用
  const filterPosition = settings.categoryFilterPosition || 'top';
  const popupContainer = document.querySelector('.popup-container');
  const filterElement = document.getElementById('categoryFilterSection');

  // フィルターの配置位置を設定
  if (filterPosition === 'top') {
    popupContainer.classList.add('filter-top');
  } else if (filterPosition === 'bottom') {
    popupContainer.classList.add('filter-bottom');
  } else if (filterPosition === 'left') {
    popupContainer.classList.add('filter-left');
  } else if (filterPosition === 'right') {
    popupContainer.classList.add('filter-right');
  }

  // カテゴリーフィルターを表示
  renderCategoryFilters();

  // 初期表示（全件）
  performSearch('');

  // ショートカットキー認識モードで開始（検索窓にフォーカスを当てない）
  document.querySelector('.search-hint').textContent = 'キーを押す';
});
