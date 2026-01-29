/**
 * URLからエイリアス候補を自動生成
 */
function generateAliasSuggestions(url, title) {
  const suggestions = [];

  if (!url && !title) return suggestions;

  // URLからドメイン名を抽出
  if (url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // wwwを除去
      const domain = hostname.replace(/^www\./, '');

      // ドメイン名（拡張子なし）
      const domainName = domain.split('.')[0];
      if (domainName && domainName.length > 1) {
        suggestions.push(domainName);
      }

      // よく知られたサービスの日本語エイリアス
      const knownServices = {
        'google': ['グーグル', 'ぐーぐる'],
        'gmail': ['ジーメール', 'メール'],
        'youtube': ['ユーチューブ', 'ゆーちゅーぶ', '動画'],
        'twitter': ['ツイッター', 'ついったー', 'X'],
        'facebook': ['フェイスブック', 'フェースブック'],
        'instagram': ['インスタグラム', 'インスタ'],
        'amazon': ['アマゾン', '通販'],
        'rakuten': ['楽天', 'らくてん'],
        'yahoo': ['ヤフー', 'やふー'],
        'github': ['ギットハブ', 'ぎっとはぶ'],
        'slack': ['スラック', 'すらっく'],
        'notion': ['ノーション', 'のーしょん'],
        'chatwork': ['チャットワーク', 'ちゃっとわーく'],
        'zoom': ['ズーム', 'ずーむ'],
        'dropbox': ['ドロップボックス'],
        'drive': ['ドライブ', 'ぐーぐるどらいぶ'],
        'docs': ['ドキュメント', 'ぐーぐるどっくす'],
        'sheets': ['スプレッドシート'],
        'calendar': ['カレンダー', 'かれんだー'],
        'netflix': ['ネットフリックス', 'ネトフリ'],
        'spotify': ['スポティファイ'],
        'line': ['ライン', 'らいん'],
        'linkedin': ['リンクトイン'],
        'reddit': ['レディット'],
        'qiita': ['キータ', 'きーた'],
        'zenn': ['ゼン', 'ぜん']
      };

      // 知られているサービスの日本語エイリアスを追加
      for (const [service, aliases] of Object.entries(knownServices)) {
        if (domain.includes(service) || (title && title.toLowerCase().includes(service))) {
          suggestions.push(...aliases);
          break;
        }
      }
    } catch (e) {
      // URL解析エラーは無視
    }
  }

  // タイトルからキーワードを抽出
  if (title) {
    // 日本語タイトルの場合、そのまま追加
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title)) {
      // 20文字以内なら候補に追加
      if (title.length <= 20) {
        suggestions.push(title);
      }
    }

    // 英語の単語を抽出（3文字以上）
    const englishWords = title.match(/[A-Za-z]{3,}/g);
    if (englishWords) {
      englishWords.slice(0, 2).forEach(word => {
        if (!suggestions.includes(word.toLowerCase())) {
          suggestions.push(word.toLowerCase());
        }
      });
    }
  }

  // 重複を除去して最大5つ返す
  return [...new Set(suggestions)].slice(0, 5);
}

class ShortcutKey {
  constructor($target, data) {
    this.$target = $target;
    this.$header = $target.find('.shortcut-header');
    this.$summary = $target.find('.shortcut-header a.summary');
    this.$detail = $target.find('.shortcut-body');

    this.$alertIcon = $target.find('.alert-icon');
    this.$duplicateMessage = $target.find('.duplicate-message');

    this.$openDetailButton = $target.find('button.open-detail');
    this.$closeDetailButton = $target.find('button.close-detail');
    this.$removeButton = $target.find('button.remove');

    this.$inputKey = $target.find('input[name="key"]');
    this.$inputHideOnPopup = $target.find('input[name="hideOnPopup"]');
    this.$inputAction = $target.find('select[name="action"]');
    this.$inputTitle = $target.find('input[name="title"]');
    this.$inputAliases = $target.find('input[name="aliases"]');
    this.$inputTags = $target.find('input[name="tags"]');
    this.$inputUrl = $target.find('input[name="url"]');
    this.$inputScript = $target.find('textarea[name="script"]');

    this.$inputUrlGroup = $target.find('.url-group');
    this.$inputScriptGroup = $target.find('.script-group');
    this.$labelScriptOptional = $target.find('.script-group .optional');

    // 既存のidを保持、なければ新規生成
    this._id = data?.id || generateUUID();
    this._sortOrder = data?.sortOrder;
    this._useCount = data?.useCount || 0;
    this._lastUsedAt = data?.lastUsedAt || null;
    this._createdAt = data?.createdAt || Date.now();
    this._hidden = data?.hidden || false;

    this._registerEvents();

    if (data) {
      this._apply(data);
    } else {
      // 新規作成時はデフォルトアクションを設定
      this.$inputAction.val(ActionId.JUMP_URL);
    }

    this._switchInputContent();
    this._applySummary();
  }

  _registerEvents() {
    // ヘッダー全体をクリック可能に（UX改善）
    this.$header.on('click', this._toggleDetail.bind(this));

    // ボタンのクリックイベントは伝播を止める
    this.$openDetailButton.on('click', (e) => {
      e.stopPropagation();
      this.openDetail();
    });
    this.$closeDetailButton.on('click', (e) => {
      e.stopPropagation();
      this.closeDetail();
    });
    this.$removeButton.on('click', (e) => {
      e.stopPropagation();
      this._remove();
    });

    this.$inputAction.on('change', this._switchInputContent.bind(this));
    this.$inputKey.on('keyup', this._applySummary.bind(this));
    this.$inputTitle.on('keyup', this._applySummary.bind(this));

    this.$inputKey.on('keydown', this._keydownInputKey.bind(this));
    this.$inputKey.on('keypress', this._keypressInputKey.bind(this));

    // URL/タイトル変更時にエイリアス候補を生成
    this.$inputUrl.on('blur', this._suggestAliases.bind(this));
    this.$inputTitle.on('blur', this._suggestAliases.bind(this));

    // タグ入力のサジェスト機能とプレビュー
    this.$inputTags.on('input', () => {
      this._showTagSuggestions();
      this._updateTagsPreview();
    });
    this.$inputTags.on('blur', () => {
      setTimeout(() => this._hideTagSuggestions(), 200);
    });
  }

  /**
   * 所属グループリストを更新
   */
  updateGroupsList() {
    const $groupsList = this.$target.find('.shortcut-groups-list');
    $groupsList.empty();

    if (!groupManager || groupManager.groups.length === 0) {
      $groupsList.append('<p class="help-block">グループがまだありません</p>');
      return;
    }

    groupManager.groups.forEach(group => {
      const isInGroup = group.shortcutKeyIds.includes(this._id);
      const $groupItem = $(`
        <label class="group-membership-item">
          <input type="checkbox" value="${group.id}" ${isInGroup ? 'checked' : ''}>
          <span class="group-key-badge-small">${escapeHtml(group.key)}</span>
          <span class="group-title-small">${escapeHtml(group.title)}</span>
        </label>
      `);

      $groupItem.find('input').on('change', (e) => {
        const checked = $(e.target).is(':checked');
        if (checked) {
          // グループに追加
          if (!group.shortcutKeyIds.includes(this._id)) {
            group.shortcutKeyIds.push(this._id);
            groupManager.renderGroupsList();
          }
        } else {
          // グループから削除
          group.shortcutKeyIds = group.shortcutKeyIds.filter(id => id !== this._id);
          groupManager.renderGroupsList();
        }
      });

      $groupsList.append($groupItem);
    });
  }

  _suggestAliases() {
    // エイリアスが空の場合のみ候補を生成
    if (this.$inputAliases.val().trim() !== '') return;

    const url = this.$inputUrl.val();
    const title = this.$inputTitle.val();
    const suggestions = generateAliasSuggestions(url, title);

    if (suggestions.length > 0) {
      this.$inputAliases.val(suggestions.join(', '));
    }
  }

  _showTagSuggestions() {
    if (!tagManager || tagManager.allTags.size === 0) return;

    const input = this.$inputTags.val();
    const cursorPos = this.$inputTags[0].selectionStart;

    // カーソル位置の現在のタグを取得
    const beforeCursor = input.substring(0, cursorPos);
    const lastCommaPos = beforeCursor.lastIndexOf(',');
    const currentTag = beforeCursor.substring(lastCommaPos + 1).trim().toLowerCase();

    if (currentTag.length === 0) {
      this._hideTagSuggestions();
      return;
    }

    // 既存タグから検索
    const matchingTags = Array.from(tagManager.allTags)
      .filter(tag => tag.toLowerCase().includes(currentTag))
      .slice(0, 10);

    if (matchingTags.length === 0) {
      this._hideTagSuggestions();
      return;
    }

    // サジェストを表示
    const $wrapper = this.$inputTags.closest('.tags-input-wrapper');
    const $suggestions = $wrapper.find('.tags-suggestions');

    $suggestions.empty();
    matchingTags.forEach(tag => {
      const color = tagManager.getTagColor(tag);
      const $item = $(`
        <div class="tag-suggestion-item" data-tag="${escapeHtml(tag)}">
          <span class="tag-color-dot" style="background-color: ${color};"></span>
          ${escapeHtml(tag)}
        </div>
      `);

      $item.on('click', () => {
        this._insertTag(tag);
        this._hideTagSuggestions();
      });

      $suggestions.append($item);
    });

    $suggestions.show();
  }

  _hideTagSuggestions() {
    const $wrapper = this.$inputTags.closest('.tags-input-wrapper');
    const $suggestions = $wrapper.find('.tags-suggestions');
    $suggestions.hide();
  }

  _insertTag(tag) {
    const input = this.$inputTags.val();
    const cursorPos = this.$inputTags[0].selectionStart;

    const beforeCursor = input.substring(0, cursorPos);
    const afterCursor = input.substring(cursorPos);

    const lastCommaPos = beforeCursor.lastIndexOf(',');
    const before = lastCommaPos >= 0 ? beforeCursor.substring(0, lastCommaPos + 1) + ' ' : '';

    this.$inputTags.val(before + tag + ', ' + afterCursor.trim());
    this.$inputTags.focus();
    this._updateTagsPreview();
  }

  _updateTagsPreview() {
    if (!tagManager) return;

    const input = this.$inputTags.val();
    const tags = input.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const $wrapper = this.$inputTags.closest('.col-sm-8');
    const $preview = $wrapper.find('.tags-preview');

    if (tags.length === 0) {
      $preview.empty();
      return;
    }

    $preview.empty();
    tags.forEach(tag => {
      const isExisting = tagManager.allTags.has(tag);
      const color = isExisting ? tagManager.getTagColor(tag) : '#9ca3af'; // グレー for new tags
      const $tagBadge = $(`
        <span class="tag-preview-badge" style="background-color: ${color}; color: white;">
          ${escapeHtml(tag)}
          ${isExisting ? '' : '<span style="opacity: 0.7; font-size: 0.8em;"> (新規)</span>'}
        </span>
      `);
      $preview.append($tagBadge);
    });
  }

  _apply(data) {
    this.$inputKey.val(data.key);
    this.$inputHideOnPopup.prop('checked', data.hideOnPopup || false);
    this.$inputAction.val(data.action);
    this.$inputTitle.val(data.title);

    // aliases と tags を設定（配列をカンマ区切り文字列に変換）
    if (data.aliases && Array.isArray(data.aliases)) {
      this.$inputAliases.val(data.aliases.join(', '));
    }
    if (data.tags && Array.isArray(data.tags)) {
      this.$inputTags.val(data.tags.join(', '));
      // タグプレビューを更新
      this._updateTagsPreview();
    }

    switch (data.action) {
      case ActionId.JUMP_URL:
      case ActionId.JUMP_URL_ALL_WINDOWS:
      case ActionId.OEPN_URL_NEW_TAB:
      case ActionId.OPEN_URL_CURRENT_TAB:
        this.$inputUrl.val(data.url);
        this.$inputScript.val(data.script);
        break;

      case ActionId.EXECUTE_SCRIPT:
        this.$inputScript.val(data.script);
        break;

      case ActionId.OPEN_URL_PRIVATE_MODE:
        this.$inputUrl.val(data.url);
        break;

      case ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE:
        break;

      default:
        if (data.action) {
          throw new RangeError('actionId is ' + data.action);
        }
    }
  }

  _toggleDetail() {
    if (this.$detail.is(':visible')) {
      this.closeDetail();
    } else {
      this.openDetail();
    }
  }

  _keydownInputKey(event) {
    if (event.keyCode == 46) { // DOM_VK_DELETE
      event.target.value = '';
      return false;
    }

    if (event.keyCode == 8) { // DOM_VK_BACK_SPACE
      event.target.value = event.target.value.slice(0, -1);
      return false;
    }
  }

  _keypressInputKey(event) {
    if (event.charCode) {
      event.target.value += String.fromCharCode(event.charCode).toUpperCase();
      return false;
    }
  }

  _switchInputContent() {
    const action = parseInt(this.$inputAction.val(), 10);

    switch (action) {
      case ActionId.JUMP_URL:
      case ActionId.JUMP_URL_ALL_WINDOWS:
      case ActionId.OEPN_URL_NEW_TAB:
      case ActionId.OPEN_URL_CURRENT_TAB:
        this.$inputUrlGroup.show();
        this.$inputScriptGroup.show();
        this.$labelScriptOptional.show();
        break;

      case ActionId.EXECUTE_SCRIPT:
        this.$inputUrlGroup.hide();
        this.$inputScriptGroup.show();
        this.$labelScriptOptional.hide();
        break;

      case ActionId.OPEN_URL_PRIVATE_MODE:
        this.$inputUrlGroup.show();
        this.$inputScriptGroup.hide();
        this.$labelScriptOptional.hide();
        break;

      case ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE:
        this.$inputUrlGroup.hide();
        this.$inputScriptGroup.hide();
        this.$labelScriptOptional.hide();
        break;

      default:
        // 新規作成時などはデフォルト表示
        this.$inputUrlGroup.show();
        this.$inputScriptGroup.show();
        this.$labelScriptOptional.show();
    }
  }

  _applySummary() {
    this.$summary.find('.key-badge').text(this.$inputKey.val());
    this.$summary.find('.title-text').text(this.$inputTitle.val() || '新しいショートカット');
  }

  _remove() {
    // UX改善：削除確認ダイアログを表示
    const title = this.$inputTitle.val() || '新しいショートカット';
    const confirmMsg = `「${title}」を削除してもよろしいですか？`;

    if (confirm(confirmMsg)) {
      this.$target.trigger('remove', this);
      this.$target.remove();
      updateEmptyState();
    }
  }

  _validateNotEmpty($input) {
    if ($input.val() == '') {
      $input.parents('.form-group').addClass('has-error');
      return false;
    }

    return true;
  }

  validate(others) {
    this.$target.find('.has-error').removeClass('has-error');
    this.$alertIcon.hide();
    this.$duplicateMessage.hide().empty();

    var hasError = false;
    if (!this._validateNotEmpty(this.$inputKey)) {
      hasError = true;
    } else {
      // Duplicate
      const key = this.$inputKey.val();
      const duplicateKeys = others
        .filter((other) => {
          return (other.key != '')
            && (key.indexOf(other.key) == 0 || other.key.indexOf(key) == 0);
        })
        .map((other) => other.key)
        .join(', ');

      if (duplicateKeys.length > 0) {
        const duplicateMsg = chrome.i18n.getMessage('duplicateKeyMessage') ||
          '他のショートカットキー({keys})と重複しています。';
        this.$duplicateMessage
          .text(duplicateMsg.replace('{keys}', duplicateKeys))
          .show();

        this.$inputKey.parents('.form-group').addClass('has-error');
        hasError = true;
      }
    }

    if (!this._validateNotEmpty(this.$inputAction)) {
      hasError = true;
    }
    if (!this._validateNotEmpty(this.$inputTitle)) {
      hasError = true;
    }

    const action = parseInt(this.$inputAction.val(), 10);
    switch (action) {
      case ActionId.JUMP_URL:
      case ActionId.JUMP_URL_ALL_WINDOWS:
      case ActionId.OEPN_URL_NEW_TAB:
      case ActionId.OPEN_URL_CURRENT_TAB:

        if (!this._validateNotEmpty(this.$inputUrl)) {
          hasError = true;
        }
        break;

      case ActionId.EXECUTE_SCRIPT:

        if (!this._validateNotEmpty(this.$inputScript)) {
          hasError = true;
        }
        break;

      case ActionId.OPEN_URL_PRIVATE_MODE:

        if (!this._validateNotEmpty(this.$inputUrl)) {
          hasError = true;
        }
        break;

      case ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE:
        break;

      default:
        // Skip validation for unknown actions
    }

    if (hasError) {
      this.$alertIcon.show();
    }
    return !hasError;
  }

  openDetail() {
    this.$detail.show();
    this.$openDetailButton.hide();
    this.$closeDetailButton.show();
    // 所属グループリストを更新
    this.updateGroupsList();
  }

  closeDetail() {
    this.$detail.hide();
    this.$openDetailButton.show();
    this.$closeDetailButton.hide();
  }

  /**
   * カンマ区切り文字列を配列に変換（空白トリム）
   */
  _parseCommaSeparated(value) {
    if (!value || value.trim() === '') {
      return [];
    }
    return value.split(',').map(s => s.trim()).filter(s => s !== '');
  }

  data() {
    const data = {
      id: this._id,
      key: this.$inputKey.val(),
      hideOnPopup: this.$inputHideOnPopup.prop('checked') || false,
      action: parseInt(this.$inputAction.val(), 10),
      title: this.$inputTitle.val(),
      aliases: this._parseCommaSeparated(this.$inputAliases.val()),
      tags: this._parseCommaSeparated(this.$inputTags.val()),
      hidden: this._hidden,
      sortOrder: this._sortOrder,
      useCount: this._useCount,
      lastUsedAt: this._lastUsedAt,
      createdAt: this._createdAt,
      updatedAt: Date.now()
    };

    switch (data.action) {
      case ActionId.JUMP_URL:
      case ActionId.JUMP_URL_ALL_WINDOWS:
      case ActionId.OEPN_URL_NEW_TAB:
      case ActionId.OPEN_URL_CURRENT_TAB:
        data.url = this.$inputUrl.val();
        data.script = this.$inputScript.val();
        break;

      case ActionId.EXECUTE_SCRIPT:
        data.script = this.$inputScript.val();
        break;

      case ActionId.OPEN_URL_PRIVATE_MODE:
        data.url = this.$inputUrl.val();
        break;

      case ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE:
        break;

      default:
        data.url = this.$inputUrl.val();
        data.script = this.$inputScript.val();
    }

    return data;
  }
}

/**
 * UUID生成関数
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 空状態の表示を更新
 */
function updateEmptyState() {
  const hasItems = $('#shortcutKeys').children().length > 0;
  $('#emptyState').toggle(!hasItems);
}

class ShortcutKeys {
  constructor($target, $childTemplate) {
    this.$target = $target;
    this.$childTemplate = $childTemplate;
    this._shortcutKeys = [];
  }

  _removeShortcutKey(event, shortcutKey) {
    const index = this._shortcutKeys.indexOf(shortcutKey);
    if (index != -1) {
      this._shortcutKeys.splice(index, 1);
    }
  }

  append(data, isOpened) {
    const $child = this.$childTemplate.clone(true);
    $child.removeAttr('id');

    // アクションセレクトを初期化
    const $actionSelect = $child.find('select[name="action"]');
    $actionSelect.empty();
    Actions.forEach((action) => {
      const actionName = chrome.i18n.getMessage('action_' + action.id) || action.name;
      const $option = $('<option>').val(action.id).text(actionName);
      $actionSelect.append($option);
    });

    const shortcutKey = new ShortcutKey($child, data);

    // ショートカットキーのインスタンスをDOM要素に保存
    $child.data('shortcutKeyInstance', shortcutKey);

    $child.on('remove', this._removeShortcutKey.bind(this));

    isOpened ? shortcutKey.openDetail() : shortcutKey.closeDetail();

    this._shortcutKeys.push(shortcutKey);
    this.$target.append($child.show());

    $child[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateEmptyState();

    // UX改善：新規追加時にキー入力欄にフォーカス
    if (!data && isOpened) {
      setTimeout(() => {
        $child.find('input[name="key"]').focus();
      }, 100);
    }
  }

  validate() {
    const shortcutKeyAndData = this._shortcutKeys.map((shortcutKey) => {
      return {
        shortcutKey: shortcutKey,
        data: shortcutKey.data()
      };
    });

    const invalidItems = this._shortcutKeys
      .filter((shortcutKey) => {
        shortcutKey.closeDetail();
        const others = shortcutKeyAndData
          .filter((x) => x.shortcutKey != shortcutKey)
          .map((x) => x.data);
        return !shortcutKey.validate(others);
      });

    // UX改善：エラーがある場合、最初のエラー項目を開いてスクロール
    if (invalidItems.length > 0) {
      invalidItems[0].openDetail();
      invalidItems[0].$target[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return invalidItems.length == 0;
  }

  data() {
    return this._shortcutKeys.map((shortcutKey, index) => {
      const d = shortcutKey.data();
      // sortOrderを現在の順番で更新
      d.sortOrder = index;
      return d;
    });
  }
}

/**
 * ツールチップ機能
 */
function initTooltips() {
  const $tooltip = $('#customTooltip');

  $(document).on('mouseenter', '.tooltip-icon', function(e) {
    const key = $(this).data('tooltip-key');
    const message = chrome.i18n.getMessage(key);

    if (message) {
      const rect = this.getBoundingClientRect();
      $tooltip.text(message)
        .css({
          top: rect.bottom + 8 + 'px',
          left: Math.max(10, rect.left - 10) + 'px'
        })
        .addClass('visible');
    }
  });

  $(document).on('mouseleave', '.tooltip-icon', function() {
    $tooltip.removeClass('visible');
  });
}

/**
 * タグ管理クラス
 */
class TagManager {
  constructor(tagColors = {}) {
    this.tagColors = tagColors;
    this.allTags = new Set();
  }

  // 全ショートカットからタグを収集
  collectAllTags(shortcutKeys) {
    this.allTags.clear();
    shortcutKeys.forEach(sk => {
      if (sk.tags && Array.isArray(sk.tags)) {
        sk.tags.forEach(tag => this.allTags.add(tag));
      }
    });
  }

  // タグの色を取得（デフォルトカラーを返す）
  getTagColor(tag) {
    return this.tagColors[tag] || this._generateDefaultColor(tag);
  }

  // タグの色を設定
  setTagColor(tag, color) {
    this.tagColors[tag] = color;
  }

  // デフォルトカラーを生成（タグ名から一貫した色を生成）
  _generateDefaultColor(tag) {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // タグ色設定UIを更新
  renderTagColorsList() {
    const $list = $('#tagColorsList');
    const $empty = $('#tagColorsEmpty');

    $list.empty();

    if (this.allTags.size === 0) {
      $empty.show();
      return;
    }

    $empty.hide();

    Array.from(this.allTags).sort().forEach(tag => {
      const color = this.getTagColor(tag);
      const $item = $(`
        <div class="tag-color-item">
          <div class="tag-preview" style="background-color: ${color}; color: white;">
            ${escapeHtml(tag)}
          </div>
          <div class="tag-color-controls">
            <input type="color" class="tag-color-picker" value="${color}" data-tag="${escapeHtml(tag)}">
            <input type="text" class="form-control tag-color-input" value="${color}" data-tag="${escapeHtml(tag)}" maxlength="7" placeholder="#3b82f6">
            <button class="btn btn-xs btn-default tag-color-reset" data-tag="${escapeHtml(tag)}" title="デフォルト色にリセット">
              <span class="glyphicon glyphicon-refresh"></span>
            </button>
          </div>
        </div>
      `);
      $list.append($item);
    });

    // カラーピッカーのイベント
    $('.tag-color-picker').on('change', (e) => {
      const tag = $(e.target).data('tag');
      const color = e.target.value;
      this.setTagColor(tag, color);
      const $item = $(e.target).closest('.tag-color-item');
      $item.find('.tag-preview').css('background-color', color);
      $item.find('.tag-color-input').val(color);
    });

    // HEX入力欄のイベント
    $('.tag-color-input').on('input', (e) => {
      const tag = $(e.target).data('tag');
      let color = e.target.value;

      // HEX形式のバリデーション
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        this.setTagColor(tag, color);
        const $item = $(e.target).closest('.tag-color-item');
        $item.find('.tag-preview').css('background-color', color);
        $item.find('.tag-color-picker').val(color);
      }
    });

    // リセットボタンのイベント
    $('.tag-color-reset').on('click', (e) => {
      const tag = $(e.target).closest('button').data('tag');
      delete this.tagColors[tag];
      const defaultColor = this._generateDefaultColor(tag);
      const $item = $(e.target).closest('.tag-color-item');
      $item.find('.tag-color-picker').val(defaultColor);
      $item.find('.tag-color-input').val(defaultColor);
      $item.find('.tag-preview').css('background-color', defaultColor);
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let tagManager;
let groupManager;

/**
 * グループ管理クラス
 */
class GroupManager {
  constructor(groups = []) {
    this.groups = groups;
  }

  // グループを追加
  addGroup(group) {
    this.groups.push(group);
    this.renderGroupsList();
  }

  // グループを削除
  removeGroup(groupId) {
    this.groups = this.groups.filter(g => g.id !== groupId);
    this.renderGroupsList();
  }

  // グループを更新
  updateGroup(groupId, updatedGroup) {
    const index = this.groups.findIndex(g => g.id === groupId);
    if (index !== -1) {
      this.groups[index] = { ...this.groups[index], ...updatedGroup };
      this.renderGroupsList();
    }
  }

  // グループリストを表示
  renderGroupsList() {
    const $list = $('#shortcutGroups');
    const $empty = $('#groupsEmptyState');

    $list.empty();

    if (this.groups.length === 0) {
      $empty.show();
      return;
    }

    $empty.hide();

    this.groups.forEach(group => {
      const $groupItem = this.createGroupItem(group);
      $list.append($groupItem);
    });

    // 各ショートカットキーの所属グループリストも更新
    $('.shortcut-item').each(function() {
      const shortcutKey = $(this).data('shortcutKeyInstance');
      if (shortcutKey && shortcutKey.updateGroupsList) {
        shortcutKey.updateGroupsList();
      }
    });
  }

  // グループアイテムを作成
  createGroupItem(group) {
    const $item = $(`
      <div class="group-item" data-group-id="${group.id}">
        <div class="group-header">
          <span class="group-key-badge">${escapeHtml(group.key)}</span>
          <span class="group-title">${escapeHtml(group.title)}</span>
          <span class="group-count">${group.shortcutKeyIds.length}個</span>
          ${group.openInTabGroup ? '<span class="group-tab-badge">タブグループ</span>' : ''}
        </div>
        <div class="group-actions">
          <button type="button" class="btn btn-xs btn-primary edit-group">
            <span class="glyphicon glyphicon-edit"></span> 編集
          </button>
          <button type="button" class="btn btn-xs btn-danger remove-group">
            <span class="glyphicon glyphicon-trash"></span> 削除
          </button>
        </div>
      </div>
    `);

    // 編集ボタン
    $item.find('.edit-group').on('click', () => {
      this.openGroupModal(group);
    });

    // 削除ボタン
    $item.find('.remove-group').on('click', () => {
      if (confirm(`グループ「${group.title}」を削除してもよろしいですか？`)) {
        this.removeGroup(group.id);
      }
    });

    return $item;
  }

  // グループモーダルを開く
  openGroupModal(group = null) {
    const isEdit = !!group;
    const modalTitle = isEdit ? 'グループを編集' : 'グループを追加';

    // モーダルのHTML
    const modalHtml = `
      <div id="groupModal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3>${modalTitle}</h3>
            <button type="button" class="modal-close" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>グループ名</label>
              <input type="text" class="form-control" id="groupTitle" value="${group ? escapeHtml(group.title) : ''}" placeholder="例: よく使うサイト">
            </div>
            <div class="form-group">
              <label>ショートカットキー</label>
              <input type="text" class="form-control" id="groupKey" value="${group ? escapeHtml(group.key) : ''}" placeholder="例: WS">
              <p class="help-block">このグループを開くためのショートカットキーを入力してください</p>
              <span class="help-block duplicate-message" style="display:none; color: red;"></span>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="groupOpenInTabGroup" ${group && group.openInTabGroup ? 'checked' : ''}>
                タブグループで開く
              </label>
            </div>
            <div class="form-group">
              <label>含めるショートカットキー</label>
              <div id="shortcutKeysSelection" class="shortcuts-selection">
                <!-- ショートカットキー選択がここに表示されます -->
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default modal-cancel">キャンセル</button>
            <button type="button" class="btn btn-primary modal-save">保存</button>
          </div>
        </div>
      </div>
    `;

    // 既存のモーダルを削除
    $('#groupModal').remove();

    // モーダルを追加
    $('body').append(modalHtml);

    // ショートカットキー選択を表示
    this.renderShortcutKeysSelection(group ? group.shortcutKeyIds : []);

    // モーダルを表示
    $('#groupModal').fadeIn(200);

    // イベントリスナー
    $('.modal-close, .modal-cancel').on('click', () => {
      $('#groupModal').fadeOut(200, () => $('#groupModal').remove());
    });

    $('.modal-save').on('click', () => {
      this.saveGroup(group ? group.id : null);
    });

    // キー入力のバリデーション
    $('#groupKey').on('keydown', (e) => {
      if (e.keyCode === 46) { // DELETE
        e.target.value = '';
        return false;
      }
      if (e.keyCode === 8) { // BACKSPACE
        e.target.value = e.target.value.slice(0, -1);
        return false;
      }
    });

    $('#groupKey').on('keypress', (e) => {
      if (e.charCode) {
        e.target.value += String.fromCharCode(e.charCode).toUpperCase();
        return false;
      }
    });

    // ESCで閉じる
    $(document).on('keydown.groupModal', (e) => {
      if (e.key === 'Escape') {
        $('#groupModal').fadeOut(200, () => $('#groupModal').remove());
        $(document).off('keydown.groupModal');
      }
    });
  }

  // ショートカットキー選択を表示
  renderShortcutKeysSelection(selectedIds = []) {
    const $selection = $('#shortcutKeysSelection');
    $selection.empty();

    // 全ショートカットキーを取得（startupで設定されたshortcutKeysから）
    const allShortcutKeys = window.currentShortcutKeys || [];

    if (allShortcutKeys.length === 0) {
      $selection.append('<p class="help-block">ショートカットキーがまだありません</p>');
      return;
    }

    allShortcutKeys.forEach(sk => {
      const isChecked = selectedIds.includes(sk.id);
      const $checkbox = $(`
        <label class="shortcut-checkbox">
          <input type="checkbox" value="${sk.id}" ${isChecked ? 'checked' : ''}>
          <span class="shortcut-key-badge">${escapeHtml(sk.key)}</span>
          <span class="shortcut-title">${escapeHtml(sk.title)}</span>
        </label>
      `);
      $selection.append($checkbox);
    });
  }

  // グループを保存
  saveGroup(groupId = null) {
    const title = $('#groupTitle').val().trim();
    const key = $('#groupKey').val().trim();
    const openInTabGroup = $('#groupOpenInTabGroup').is(':checked');
    const shortcutKeyIds = [];

    $('#shortcutKeysSelection input:checked').each((i, el) => {
      shortcutKeyIds.push($(el).val());
    });

    // バリデーション
    if (!title) {
      alert('グループ名を入力してください');
      return;
    }

    if (!key) {
      alert('ショートカットキーを入力してください');
      return;
    }

    if (shortcutKeyIds.length === 0) {
      alert('少なくとも1つのショートカットキーを選択してください');
      return;
    }

    // 重複チェック
    const allShortcutKeys = window.currentShortcutKeys || [];
    const duplicateWithShortcut = allShortcutKeys.find(sk => {
      return sk.key && (sk.key.indexOf(key) === 0 || key.indexOf(sk.key) === 0);
    });

    if (duplicateWithShortcut) {
      $('.duplicate-message')
        .text(`ショートカットキー「${duplicateWithShortcut.key}」と重複しています`)
        .show();
      return;
    }

    // 他のグループとの重複チェック
    const duplicateWithGroup = this.groups.find(g => {
      if (groupId && g.id === groupId) return false; // 編集中のグループは除外
      return g.key && (g.key.indexOf(key) === 0 || key.indexOf(g.key) === 0);
    });

    if (duplicateWithGroup) {
      $('.duplicate-message')
        .text(`グループ「${duplicateWithGroup.title}」と重複しています`)
        .show();
      return;
    }

    const groupData = {
      id: groupId || generateUUID(),
      key,
      title,
      shortcutKeyIds,
      openInTabGroup,
      createdAt: groupId ? undefined : Date.now(),
      updatedAt: Date.now()
    };

    if (groupId) {
      this.updateGroup(groupId, groupData);
    } else {
      this.addGroup(groupData);
    }

    $('#groupModal').fadeOut(200, () => $('#groupModal').remove());
  }

  // グループデータを取得
  data() {
    return this.groups;
  }
}

function startup(settings) {
  $('#startupKey').val(settings.startupCommand.shortcut);

  const $inputColumnCount = $('#inputColumnCount');
  $inputColumnCount.val(settings.listColumnCount);

  const $inputCategoryFilterPosition = $('#inputCategoryFilterPosition');
  $inputCategoryFilterPosition.val(settings.categoryFilterPosition || 'top');

  const $inputDisabledSync = $('#inputDisabledSync');
  $inputDisabledSync.prop('checked', !settings.synced);

  const $formTemplate = $('#template');

  // タグマネージャー初期化
  tagManager = new TagManager(settings.tagColors || {});

  // グループマネージャー初期化
  groupManager = new GroupManager(settings.shortcutGroups || []);

  const shortcutKeys = new ShortcutKeys($('#shortcutKeys'), $formTemplate);
  settings.shortcutKeys
    .forEach((shortcutKey) => {
      shortcutKeys.append(shortcutKey);
    });

  // グローバルに保存（グループモーダルで使用）
  window.currentShortcutKeys = settings.shortcutKeys;

  // タグを収集して色設定UIを更新
  tagManager.collectAllTags(settings.shortcutKeys);
  tagManager.renderTagColorsList();

  // グループリストを表示
  groupManager.renderGroupsList();

  // タグ色設定のトグル機能
  $('#tagColorsToggle').on('click', () => {
    const $body = $('.tag-colors-body');
    const $icon = $('#tagColorsToggle .toggle-icon');

    if ($body.is(':visible')) {
      $body.slideUp(300);
      $icon.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
    } else {
      $body.slideDown(300);
      $icon.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
    }
  });

  updateEmptyState();

  // タグリスト更新用ヘルパー関数
  function updateTagsList() {
    const allShortcutKeys = shortcutKeys.data();
    tagManager.collectAllTags(allShortcutKeys);
    tagManager.renderTagColorsList();
  }

  // 追加ボタン
  $('#addButton, #addButtonEmpty').on('click', () => {
    shortcutKeys.append(null, true);
    // 新規追加後はタグリストは変わらないので更新不要
  });

  // グループ追加ボタン
  $('#addGroupButton').on('click', () => {
    // 現在のショートカットキーを更新
    window.currentShortcutKeys = shortcutKeys.data();
    groupManager.openGroupModal();
  });

  // 一気追加ボタン
  $('#bulkAddButton').on('click', () => {
    $('#bulkAddModal').fadeIn(200);
    $('#bulkUrlInput').focus();
  });

  // モーダルを閉じる
  function closeBulkAddModal() {
    $('#bulkAddModal').fadeOut(200);
    $('#bulkUrlInput').val('');
  }

  $('.modal-close, .modal-cancel').on('click', closeBulkAddModal);

  // オーバーレイクリックで閉じる
  $('#bulkAddModal').on('click', (e) => {
    if (e.target.id === 'bulkAddModal') {
      closeBulkAddModal();
    }
  });

  // ESCキーで閉じる
  $(document).on('keydown', (e) => {
    if (e.key === 'Escape' && $('#bulkAddModal').is(':visible')) {
      closeBulkAddModal();
    }
  });

  // 一気追加の実行
  $('#bulkAddConfirm').on('click', () => {
    const input = $('#bulkUrlInput').val().trim();
    if (!input) {
      alert('URLを入力してください。');
      return;
    }

    // URLをパース（カンマ区切りまたは改行区切り）
    const urls = input
      .split(/[,\n]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      });

    if (urls.length === 0) {
      alert('有効なURLが見つかりませんでした。');
      return;
    }

    const autoOpen = $('#bulkAutoOpen').is(':checked');
    const existingKeys = new Set(shortcutKeys.data().map(sk => sk.key));

    // 各URLに対してショートカットキーを作成
    urls.forEach((url, index) => {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      // タイトルを生成（ドメイン名から）
      const title = generateTitleFromDomain(domain);

      // ショートカットキーを生成（重複しないように）
      const key = generateUniqueKey(domain, existingKeys);
      existingKeys.add(key);

      // エイリアス候補を生成
      const aliases = generateAliasSuggestions(url, title);

      const data = {
        key: key,
        title: title,
        aliases: aliases,
        tags: [],
        action: ActionId.JUMP_URL,
        url: url,
        script: '',
        hidden: false,
        hideOnPopup: false
      };

      shortcutKeys.append(data, autoOpen && index === 0);
    });

    // タグリストを更新
    updateTagsList();

    closeBulkAddModal();

    alert(`${urls.length}件のショートカットを追加しました。`);
  });

  // ドメインからタイトルを生成
  function generateTitleFromDomain(domain) {
    // ドメインの最初の部分を取得
    const parts = domain.split('.');
    let name = parts[0];

    // 一般的なプレフィックスを削除
    name = name.replace(/^(www|app|my|go|get|use)/, '');

    // 最初の文字を大文字に
    name = name.charAt(0).toUpperCase() + name.slice(1);

    return name || domain;
  }

  // 重複しないショートカットキーを生成
  function generateUniqueKey(domain, existingKeys) {
    const parts = domain.split('.');
    let baseName = parts[0].replace(/^(www|app|my|go|get|use)/, '');

    // 2文字のキーを生成
    let key = baseName.substring(0, 2).toUpperCase();

    // 重複している場合は、3文字、4文字...と増やす
    if (existingKeys.has(key)) {
      for (let len = 3; len <= baseName.length; len++) {
        key = baseName.substring(0, len).toUpperCase();
        if (!existingKeys.has(key)) {
          break;
        }
      }
    }

    // それでも重複する場合は、数字を追加
    if (existingKeys.has(key)) {
      let num = 1;
      while (existingKeys.has(key + num)) {
        num++;
      }
      key = key + num;
    }

    return key;
  }

  // インポート
  $('#importButton').on('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.setAttribute('hidden', true);

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContents = e.target.result;

        try {
          const importShortcutKeys = JSON.parse(fileContents);
          importShortcutKeys.forEach((shortcutKey) => shortcutKeys.append(shortcutKey));
          // インポート後にタグリストを更新
          updateTagsList();
        } catch (error) {
          console.log(error);
          const errorMsg = chrome.i18n.getMessage('importError') || '無効な形式のためインポートできませんでした。';
          alert(errorMsg);
        }
      }
      reader.readAsText(file);
    }, false);

    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.remove();
  });

  // エクスポート
  $('#exportButton').on('click', () => {
    const downloadLink = document.createElement('a');
    downloadLink.download = 'shortcutkeys.json';
    downloadLink.href = URL.createObjectURL(new Blob([JSON.stringify(shortcutKeys.data(), null, 2)], { 'type': 'text/plain' }));
    downloadLink.setAttribute('hidden', true);

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  });

  // 保存処理（UX改善：関数化してキーボードショートカットからも呼び出せるように）
  function saveSettings() {
    $("#successMessage").hide();
    $("#errorMessage").hide();

    if (shortcutKeys.validate()) {
      // ローディング状態を表示
      const $saveButton = $('#saveButton');
      const originalText = $saveButton.html();
      $saveButton.prop('disabled', true).html('<span class="glyphicon glyphicon-refresh spinning"></span> 保存中...');

      const request = {
        target: 'background-settings',
        name: 'save',
        settings: {
          shortcutKeys: shortcutKeys.data(),
          shortcutGroups: groupManager ? groupManager.data() : [],
          listColumnCount: parseInt($inputColumnCount.val(), 10),
          categoryFilterPosition: $('#inputCategoryFilterPosition').val() || 'top',
          synced: !$inputDisabledSync.prop('checked'),
          tagColors: tagManager ? tagManager.tagColors : {}
        }
      };
      chrome.runtime.sendMessage(request, (settings) => {
        // ローディング状態を解除
        $saveButton.prop('disabled', false).html(originalText);

        $("#successMessage").show();

        if (request.settings.synced && !settings.synced) {
          const syncErrorMsg = chrome.i18n.getMessage('syncError') ||
            '同期ストレージへの保存に失敗したため、同期が無効になりました。';
          alert(syncErrorMsg);
          $('#inputDisabledSync').prop('checked', true);
        }

        // 保存後にタグリストを更新
        updateTagsList();

        // 3秒後に成功メッセージを非表示
        setTimeout(() => {
          $("#successMessage").fadeOut();
        }, 3000);
      });
    } else {
      $("#errorMessage").show();
    }
  }

  // 保存ボタン
  $('#saveButton').on('click', saveSettings);

  // Ctrl+S / Cmd+S で保存（UX改善：キーボードショートカット）
  $(document).on('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  });

  /* Chrome only */
  $('#shortcutsButton').on('click', () => {
    chrome.runtime.sendMessage({ target: 'background-shortcuts', name: 'open' });
    return false;
  });
  /*-------------*/

  // アラートの閉じるボタン
  $("#errorMessage, #successMessage").find('.close')
    .on('click', function() {
      $(this).closest('.alert').hide();
    });

  // メッセージリスナー
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message);
    if (message.target == 'options') {
      // 新規ショートカット追加時にエイリアス候補を自動生成
      if (message.data && message.data.url) {
        const suggestions = generateAliasSuggestions(message.data.url, message.data.title);
        if (suggestions.length > 0) {
          message.data.aliases = suggestions;
        }
      }
      shortcutKeys.append(message.data, true);
    }
  });

  // ツールチップ初期化
  initTooltips();
}

$(() => {
  chrome.runtime.sendMessage({ target: 'background-settings', name: 'load' }, startup);
});
