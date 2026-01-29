const DEFAULT_SHORTCUTKEYS = [
  {
    id: generateUUID(),
    key: 'GS',
    title: 'Google',
    aliases: ['グーグル', 'ぐーぐる', '検索'],
    tags: ['検索'],
    action: ActionId.OEPN_URL_NEW_TAB,
    url: 'https://www.google.com/',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 0,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateUUID(),
    key: 'GM',
    title: 'Gmail',
    aliases: ['ジーメール', 'メール', 'gmail'],
    tags: ['仕事', '連絡'],
    action: ActionId.JUMP_URL,
    url: 'https://mail.google.com/',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 1,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateUUID(),
    key: 'T',
    title: 'Twitter',
    aliases: ['ツイッター', 'ついったー', 'X'],
    tags: ['SNS'],
    action: ActionId.JUMP_URL,
    url: 'https://twitter.com/',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 2,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateUUID(),
    key: 'F',
    title: 'Facebook',
    aliases: ['フェイスブック', 'ふぇいすぶっく'],
    tags: ['SNS'],
    action: ActionId.JUMP_URL,
    url: 'https://www.facebook.com/',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 3,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateUUID(),
    key: 'Y',
    title: 'YouTube',
    aliases: ['ユーチューブ', 'ゆーちゅーぶ', '動画'],
    tags: ['動画', 'エンタメ'],
    action: ActionId.JUMP_URL,
    url: 'https://www.youtube.com/',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 4,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: generateUUID(),
    key: 'P',
    title: 'Incognito',
    aliases: ['シークレット', 'プライベート'],
    tags: [],
    action: ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE,
    url: '',
    script: '',
    hidden: false,
    hideOnPopup: false,
    sortOrder: 5,
    useCount: 0,
    lastUsedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
];

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
 * 旧形式のショートカットキーを新形式にマイグレーションする
 */
function migrateShortcutKey(oldData, index) {
  // すでに新形式の場合はそのまま返す
  if (oldData.id && oldData.aliases !== undefined) {
    return oldData;
  }

  return {
    id: oldData.id || generateUUID(),
    key: oldData.key || '',
    title: oldData.title || '',
    aliases: oldData.aliases || [],
    tags: oldData.tags || [],
    action: oldData.action,
    url: oldData.url || '',
    urls: oldData.urls || [],
    script: oldData.script || '',
    hidden: oldData.hidden || false,
    hideOnPopup: oldData.hideOnPopup || false,
    openInTabGroup: oldData.openInTabGroup || false,
    sortOrder: oldData.sortOrder !== undefined ? oldData.sortOrder : index,
    useCount: oldData.useCount || 0,
    lastUsedAt: oldData.lastUsedAt || null,
    createdAt: oldData.createdAt || Date.now(),
    updatedAt: oldData.updatedAt || Date.now()
  };
}

const DEFAULT_LIST_COLUMN_COUNT = 3;

// The name to be used when saving the shortcutkeys.
// To meet the capacity limit per item in storage.sync, it is saved in separate item.
// (shortcutKeys001, shortcutKeys002, ..., shortcutKeys100)
const SHORTCUT_KEYS_STORED_NAMES = [...Array(100)].map((_, i) => `shortcutKeys${String(i + 1).padStart(3, '0')}`);

class Settings {

  /** @type {ShortcutKeyData[]} */
  _shortcutKeys;
  /** @type {ShortcutGroupData[]} */
  _shortcutGroups;
  /** @type {number} */
  _listColumnCount;
  /** @type {string} */
  _categoryFilterPosition;
  /** @type {boolean} */
  _synced;
  /** @type {Object<string, string>} */
  _tagColors;

  /**
   * @typedef {{
   *   id: string;
   *   key: string;
   *   title: string;
   *   aliases: string[];
   *   tags: string[];
   *   action: number;
   *   url?: string;
   *   urls?: string[];
   *   script?: string;
   *   hidden: boolean;
   *   hideOnPopup: boolean;
   *   openInTabGroup?: boolean;
   *   sortOrder: number;
   *   useCount: number;
   *   lastUsedAt: number|null;
   *   createdAt: number;
   *   updatedAt: number;
   * }} ShortcutKeyData
   */

  /**
   * @typedef {{
   *   id: string;
   *   key: string;
   *   title: string;
   *   shortcutKeyIds: string[];
   *   openInTabGroup: boolean;
   *   createdAt: number;
   *   updatedAt: number;
   * }} ShortcutGroupData
   */

  /**
   * @param {{
   *   shortcutKeys: ShortcutKeyData[];
   *   shortcutGroups: ShortcutGroupData[];
   *   listColumnCount: number;
   *   categoryFilterPosition: string;
   *   startupCommand: any;
   *   synced: boolean;
   *   tagColors: Object<string, string>;
   * }} initialValue
   */
  constructor(initialValue) {
    if (initialValue) {
      this._shortcutKeys = initialValue.shortcutKeys;
      this._shortcutGroups = initialValue.shortcutGroups || [];
      this._listColumnCount = initialValue.listColumnCount;
      this._categoryFilterPosition = initialValue.categoryFilterPosition || 'top';
      this._synced = initialValue.synced;
      this._tagColors = initialValue.tagColors || {};
    }
  }

  static async initialize() {

    const settings = new Settings();
    await settings._load();

    // Attempt one synchronous save to account for migration.
    await settings._save();

    return settings;
  }

  static async getCache() {

    const cache = await getLocalStorage('cache');
    if (cache == null) {
      const settings = new Settings();
      await settings._load();
      return settings;
    }

    return new Settings(cache);
  }

  data() {
    return {
      shortcutKeys: this._shortcutKeys,
      shortcutGroups: this._shortcutGroups || [],
      listColumnCount: this._listColumnCount,
      categoryFilterPosition: this._categoryFilterPosition || 'top',
      startupCommand: this._startupCommand,
      synced: this._synced,
      tagColors: this._tagColors || {}
    };
  }

  async update(settings) {
    this._shortcutKeys = settings.shortcutKeys.sort(Settings.shortcutKeyCompare);
    this._shortcutGroups = settings.shortcutGroups || [];
    this._listColumnCount = settings.listColumnCount;
    this._categoryFilterPosition = settings.categoryFilterPosition || 'top';
    this._synced = settings.synced;
    this._tagColors = settings.tagColors || {};
    await this._save();
  }

  find(key) {
    // グループショートカットキーを検索
    const groups = (this._shortcutGroups || []).filter((group) => {
      return group.key.indexOf(key) == 0;
    });

    // 完全一致したグループのメンバーIDを収集
    const exactMatchGroupMemberIds = new Set();
    groups.forEach(group => {
      // グループのキーと完全一致した場合のみ、メンバーを除外
      if (group.key === key && group.shortcutKeyIds && Array.isArray(group.shortcutKeyIds)) {
        group.shortcutKeyIds.forEach(id => exactMatchGroupMemberIds.add(id));
      }
    });

    // 通常のショートカットキーを検索
    const shortcuts = this._shortcutKeys.filter((item) => {
      // 完全一致したグループのメンバーのみ除外
      if (exactMatchGroupMemberIds.has(item.id)) {
        return false;
      }
      return item.key.indexOf(key) == 0;
    });

    // グループをショートカットキー形式に変換
    const groupShortcuts = groups.map((group) => {
      return {
        id: group.id,
        key: group.key,
        title: group.title,
        action: ActionId.OPEN_SHORTCUT_GROUP,
        groupData: group,
        isGroup: true
      };
    });

    return [...shortcuts, ...groupShortcuts];
  }

  /**
   * 検索クエリでショートカットキーを検索
   * @param {string} query - 検索クエリ
   * @returns {Array} 検索結果（スコア付き）
   */
  search(query) {
    return SearchEngine.search(query, this._shortcutKeys);
  }

  /**
   * ショートカットキーの使用回数を更新
   * @param {string} id - ショートカットキーのID
   */
  async incrementUseCount(id) {
    const item = this._shortcutKeys.find(sk => sk.id === id);
    if (item) {
      item.useCount = (item.useCount || 0) + 1;
      item.lastUsedAt = Date.now();
      item.updatedAt = Date.now();
      await this._save();
    }
  }

  async reload() {
    await this._load();
  }

  async _load() {
    let synced = await getLocalStorage('synced');

    let loaded;
    if (synced == null) {
      // first time
      loaded = await getSyncStorage();
      if (!loaded) {
        loaded = await getLocalStorage();
      }
      synced = true; // default
    } else if (synced) {
      loaded = await getSyncStorage();
    } else {
      loaded = await getLocalStorage();
    }

    loaded = loaded || {};

    let shortcutKeys = DEFAULT_SHORTCUTKEYS;
    if (loaded.settings?.shortcutKeys) {
      // Supports migration from previous version
      shortcutKeys = loaded.settings.shortcutKeys;
    } else if (loaded[SHORTCUT_KEYS_STORED_NAMES[0]]) {
      shortcutKeys = this._mergeStoredShortcutKeys(loaded);
    }
    // 新形式へのマイグレーション
    shortcutKeys = shortcutKeys.map((item, index) => migrateShortcutKey(item, index));
    this._shortcutKeys = shortcutKeys.sort(Settings.shortcutKeyCompare);

    this._shortcutGroups = loaded.settings?.shortcutGroups || [];
    this._listColumnCount = loaded.settings?.listColumnCount || DEFAULT_LIST_COLUMN_COUNT;
    this._categoryFilterPosition = loaded.settings?.categoryFilterPosition || 'top';
    this._startupCommand = (await getAllCommands())[0];
    this._synced = synced;

    // save cache
    await setLocalStorage({ cache: this.data() });
  }

  async _save() {

    // synced has locally
    await setLocalStorage({ synced: this._synced });

    const saveData = {
      settings: {
        shortcutGroups: this._shortcutGroups || [],
        listColumnCount: this._listColumnCount,
        categoryFilterPosition: this._categoryFilterPosition || 'top',
        filterOnPopup: this._filterOnPopup
      }
    };
    Object.assign(saveData, this._splitStoredShortcutKeys(this._shortcutKeys));

    // Save also to local in case saving to sync may fail
    await setLocalStorage(saveData);

    if (this._synced) {
      await setSyncStorage(saveData).then(
        async () => {
          // sync succeeded
        },
        async (err) => {
          // sync failed
          console.log('sync.save failed');
          console.log(err);
          await setLocalStorage({ synced: false });
          this._synced = false;
        }
      );
    }

    // save cache
    await setLocalStorage({ cache: this.data() });
  }

  _mergeStoredShortcutKeys(splited) {
    const mergedShortcutKeys = [];

    for (let i = 0; i < SHORTCUT_KEYS_STORED_NAMES.length; i++) {
      const shortcutKeys = splited[SHORTCUT_KEYS_STORED_NAMES[i]];
      if (shortcutKeys) {
        mergedShortcutKeys.push(...shortcutKeys);
      }
    }

    return mergedShortcutKeys;
  }

  _splitStoredShortcutKeys(merged) {

    // init
    const splitedShortcutKeys = {};
    for (let i = 0; i < SHORTCUT_KEYS_STORED_NAMES.length; i++) {
      splitedShortcutKeys[SHORTCUT_KEYS_STORED_NAMES[i]] = [];
    }

    for (let i = 0; i < merged.length; i++) {
      const itemName = SHORTCUT_KEYS_STORED_NAMES[i % SHORTCUT_KEYS_STORED_NAMES.length];
      splitedShortcutKeys[itemName].push(merged[i]);
    }

    return splitedShortcutKeys;
  }

  static shortcutKeyCompare(o1, o2) {
    if (o1.key < o2.key) return -1;
    if (o1.key > o2.key) return 1;
    return 0;
  }
}

function setSyncStorage(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(obj, () => {
      if (!chrome.runtime.lastError) {
        resolve();
      } else {
        reject(chrome.runtime.lastError);
      }
    });
  });
}

function setLocalStorage(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(obj, () => {
      if (!chrome.runtime.lastError) {
        resolve();
      } else {
        reject(chrome.runtime.lastError);
      }
    });
  });
}

function getSyncStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (item) => {
      key ? resolve(item[key]) : resolve(item);
    });
  });
}

function getLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (item) => {
      key ? resolve(item[key]) : resolve(item);
    });
  });
}

function getAllCommands() {
  return new Promise((resolve) => {
    chrome.commands.getAll((commands) => {
      resolve(commands);
    });
  });
}
