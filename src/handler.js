const HandleResult = {
  CONTINUE: 'continue',
  FINISH: 'finish'
}

const MessageName = {
  STARTUP: 'startup',
  KEY_EVENT: 'key_event',
  CLICK_EVENT: 'click_event',
  INCREMENT_USE_COUNT: 'increment_use_count',
  SEARCH: 'search'
}

class Handler {
  constructor() {
    this.settings = null;
  }

  handle(message, settings) {
    this.settings = settings;

    switch (message.name) {
      case MessageName.STARTUP:
        this._startup();
        return {
          result: HandleResult.CONTINUE,
          settings: settings.data()
        };

      case MessageName.KEY_EVENT:
        return this._receiveKey(message.value, settings);

      case MessageName.CLICK_EVENT:
        this._doAction(message.value);
        return { result: HandleResult.FINISH };

      case MessageName.INCREMENT_USE_COUNT:
        // 使用回数を非同期で更新（結果は待たない）
        settings.incrementUseCount(message.value);
        return { result: HandleResult.CONTINUE };

      case MessageName.SEARCH:
        return {
          result: HandleResult.CONTINUE,
          searchResults: settings.search(message.value)
        };
    }
  }

  _startup() {
    this.receivedKeys = '';
  }

  _receiveKey(keyEvent, settings) {

    if (!keyEvent.charCode) {
      return { result: HandleResult.FINISH };
    }

    const key = String.fromCharCode(keyEvent.charCode).toUpperCase();
    this.receivedKeys += key;

    const matchShortcutKeys = settings.find(this.receivedKeys);

    if (matchShortcutKeys.length > 1) {
      return {
        result: HandleResult.CONTINUE,
        shortcutKeys: matchShortcutKeys
      };
    }

    if (matchShortcutKeys.length == 1) {
      this._doAction(matchShortcutKeys[0]);
    }

    return { result: HandleResult.FINISH };
  }

  _doAction(shortcutKey) {
    switch (shortcutKey.action) {
      case ActionId.OEPN_URL_NEW_TAB:
        this._createTab(shortcutKey.url, shortcutKey.script);
        break;

      case ActionId.OPEN_URL_CURRENT_TAB:
        this._updateTab(shortcutKey.url, shortcutKey.script);
        break;

      case ActionId.JUMP_URL:
        chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
          var matchTab = tabs.filter((tab) => {
            return tab.url.indexOf(shortcutKey.url) == 0;
          })[0];

          if (matchTab) {
            this._selectTab(matchTab.id, shortcutKey.script);
          } else {
            this._createTab(shortcutKey.url, shortcutKey.script);
          }
        });
        break;

      case ActionId.EXECUTE_SCRIPT:
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          this._executeScript(tab.id, shortcutKey.script);
        });
        break;

      case ActionId.OPEN_URL_PRIVATE_MODE:
        chrome.windows.create({ url: shortcutKey.url, incognito: true });
        break;

      case ActionId.OPEN_CURRENT_TAB_PRIVATE_MODE:
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          chrome.windows.create({ url: tab.url, incognito: true });
        });
        break;

      case ActionId.JUMP_URL_ALL_WINDOWS:

        // First, search from the current window.
        chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
          const matchTab = tabs.filter((tab) => {
            return tab.url.indexOf(shortcutKey.url) == 0;
          })[0];

          if (matchTab) {
            this._selectTab(matchTab.id, shortcutKey.script);
          } else {
            // Second, search from all windows.
            chrome.tabs.query({}, (tabs) => {
              const matchTab = tabs.filter((tab) => {
                return tab.url.indexOf(shortcutKey.url) == 0;
              })[0];

              if (matchTab) {
                chrome.windows.update(matchTab.windowId, { focused: true });
                this._selectTab(matchTab.id, shortcutKey.script);
              } else {
                this._createTab(shortcutKey.url, shortcutKey.script);
              }
            });
          }
        });
        break;

      case ActionId.OPEN_SHORTCUT_GROUP:
        // グループショートカットキーを開く
        this._openShortcutGroup(shortcutKey.groupData);
        break;

      default:
        throw new RangeError('actionId is ' + shortcutKey.action);
    }
  }

  _selectTab(tabId, script) {
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      this._executeScript(tab.id, script);
    });
  }

  _createTab(url, script) {
    chrome.tabs.create({ url: url }, (tab) => {
      setTimeout(() => {
        this._executeScript(tab.id, script);
      }, 1000);
    });
  }

  _updateTab(url, script) {
    chrome.tabs.update({ url: url }, (tab) => {
      setTimeout(() => {
        this._executeScript(tab.id, script);
      }, 1000);
    });
  }

  _executeScript(tabId, script) {
    if (script && script.trim() != '') {

      if (script.startsWith('javascript:')) {
        const scriptRemovedScheme = script.substring('javascript:'.length);
        try {
          script = decodeURIComponent(scriptRemovedScheme);
        } catch (e) {
          console.log(e);
          script = scriptRemovedScheme;
        }
      }

      chrome.userScripts.execute({ js: [{ code: script }], target: { tabId }});
    }
  }

  async _openInTabGroup(urls, groupTitle) {
    try {
      const tabIds = [];

      // 全てのタブを作成
      for (const url of urls) {
        const tab = await chrome.tabs.create({ url: url.trim(), active: false });
        tabIds.push(tab.id);
      }

      // タブをグループ化
      if (tabIds.length > 0) {
        const groupId = await chrome.tabs.group({ tabIds: tabIds });

        // グループにタイトルを設定
        await chrome.tabGroups.update(groupId, {
          title: groupTitle || 'まとめて開く',
          collapsed: false
        });

        // 最初のタブをアクティブにする
        if (tabIds.length > 0) {
          await chrome.tabs.update(tabIds[0], { active: true });
        }
      }
    } catch (error) {
      console.error('[ERROR] タブグループ作成エラー:', error);
      // エラーが発生した場合は、既にタブが開かれている可能性があるため、
      // 再度開かない
    }
  }

  _openShortcutGroup(groupData) {
    if (!groupData || !groupData.shortcutKeyIds || !this.settings) {
      console.error('グループデータが無効です');
      return;
    }

    // グループに含まれるショートカットキーのURLを取得
    const urls = [];
    const settingsData = this.settings.data();
    const allShortcutKeys = settingsData.shortcutKeys || [];

    groupData.shortcutKeyIds.forEach(id => {
      const shortcut = allShortcutKeys.find(sk => sk.id === id);
      if (shortcut && shortcut.url) {
        urls.push(shortcut.url);
      }
    });

    if (urls.length === 0) {
      console.error('グループに有効なURLがありません');
      return;
    }

    // タブグループで開くかどうか
    if (groupData.openInTabGroup) {
      this._openInTabGroup(urls, groupData.title);
    } else {
      // 通常のタブで開く
      urls.forEach((url, index) => {
        setTimeout(() => {
          chrome.tabs.create({ url: url.trim() });
        }, index * 100);
      });
    }
  }
}

