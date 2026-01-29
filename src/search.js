/**
 * 検索エンジン - 日本語対応の検索機能
 */

const SearchEngine = {
  /**
   * 入力文字列を正規化する
   * - NFKC正規化（全角/半角統一）
   * - 小文字化
   * - 前後空白除去
   * - ひらがな↔カタカナ変換（検索時に両方を考慮）
   */
  normalize(str) {
    if (!str) return '';

    // NFKC正規化（全角英数→半角、半角カナ→全角カナなど）
    let normalized = str.normalize('NFKC');

    // 小文字化
    normalized = normalized.toLowerCase();

    // 前後空白除去
    normalized = normalized.trim();

    return normalized;
  },

  /**
   * ひらがなをカタカナに変換
   */
  hiraganaToKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) + 0x60);
    });
  },

  /**
   * カタカナをひらがなに変換
   */
  katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  },

  /**
   * 文字列が別の文字列で始まるかチェック（ひらがな/カタカナ両対応）
   */
  startsWithJapanese(text, query) {
    const normalizedText = this.normalize(text);
    const normalizedQuery = this.normalize(query);

    // そのまま比較
    if (normalizedText.startsWith(normalizedQuery)) {
      return true;
    }

    // ひらがな→カタカナ変換して比較
    const katakanaQuery = this.hiraganaToKatakana(normalizedQuery);
    if (normalizedText.startsWith(katakanaQuery)) {
      return true;
    }

    // カタカナ→ひらがな変換して比較
    const hiraganaQuery = this.katakanaToHiragana(normalizedQuery);
    if (normalizedText.startsWith(hiraganaQuery)) {
      return true;
    }

    // テキスト側も変換して比較
    const katakanaText = this.hiraganaToKatakana(normalizedText);
    const hiraganaText = this.katakanaToHiragana(normalizedText);

    if (katakanaText.startsWith(normalizedQuery) ||
        katakanaText.startsWith(katakanaQuery) ||
        hiraganaText.startsWith(normalizedQuery) ||
        hiraganaText.startsWith(hiraganaQuery)) {
      return true;
    }

    return false;
  },

  /**
   * 文字列が別の文字列を含むかチェック（ひらがな/カタカナ両対応）
   */
  includesJapanese(text, query) {
    const normalizedText = this.normalize(text);
    const normalizedQuery = this.normalize(query);

    // そのまま比較
    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    // ひらがな→カタカナ変換して比較
    const katakanaQuery = this.hiraganaToKatakana(normalizedQuery);
    if (normalizedText.includes(katakanaQuery)) {
      return true;
    }

    // カタカナ→ひらがな変換して比較
    const hiraganaQuery = this.katakanaToHiragana(normalizedQuery);
    if (normalizedText.includes(hiraganaQuery)) {
      return true;
    }

    // テキスト側も変換して比較
    const katakanaText = this.hiraganaToKatakana(normalizedText);
    const hiraganaText = this.katakanaToHiragana(normalizedText);

    if (katakanaText.includes(normalizedQuery) ||
        katakanaText.includes(katakanaQuery) ||
        hiraganaText.includes(normalizedQuery) ||
        hiraganaText.includes(hiraganaQuery)) {
      return true;
    }

    return false;
  },

  /**
   * ショートカットキーを検索してスコア付きで返す
   * @param {string} query - 検索クエリ
   * @param {Array} shortcutKeys - ショートカットキーの配列
   * @returns {Array} スコア付きの検索結果（スコア降順、使用回数降順）
   */
  search(query, shortcutKeys) {
    if (!query || query.trim() === '') {
      // クエリが空の場合は全件返す（使用回数順）
      return shortcutKeys
        .filter(item => !item.hidden)
        .map(item => ({ item, score: 0 }))
        .sort((a, b) => {
          // 使用回数で降順ソート
          const useCountDiff = (b.item.useCount || 0) - (a.item.useCount || 0);
          if (useCountDiff !== 0) return useCountDiff;
          // 同じ場合はソート順で昇順
          return (a.item.sortOrder || 0) - (b.item.sortOrder || 0);
        });
    }

    const normalizedQuery = this.normalize(query);
    const results = [];

    for (const item of shortcutKeys) {
      // 非表示アイテムはスキップ
      if (item.hidden) continue;

      let score = 0;

      // 1. key完全一致 (score: 1000)
      if (item.key && this.normalize(item.key) === normalizedQuery) {
        score = Math.max(score, 1000);
      }

      // 2. key前方一致 (score: 800) - キー入力による絞り込みサポート
      if (item.key && this.normalize(item.key).startsWith(normalizedQuery)) {
        score = Math.max(score, 800);
      }

      // 3. title前方一致 (score: 500)
      if (item.title && this.startsWithJapanese(item.title, normalizedQuery)) {
        score = Math.max(score, 500);
      }

      // 4. aliases前方一致 (score: 500)
      if (item.aliases && Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
          if (this.startsWithJapanese(alias, normalizedQuery)) {
            score = Math.max(score, 500);
            break;
          }
        }
      }

      // 5. title部分一致 (score: 200)
      if (item.title && this.includesJapanese(item.title, normalizedQuery)) {
        score = Math.max(score, 200);
      }

      // 6. aliases部分一致 (score: 200)
      if (item.aliases && Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
          if (this.includesJapanese(alias, normalizedQuery)) {
            score = Math.max(score, 200);
            break;
          }
        }
      }

      // 7. tags一致 (score: 100)
      if (item.tags && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          if (this.includesJapanese(tag, normalizedQuery)) {
            score = Math.max(score, 100);
            break;
          }
        }
      }

      // 8. url一致 (score: 50)
      if (item.url && this.normalize(item.url).includes(normalizedQuery)) {
        score = Math.max(score, 50);
      }

      if (score > 0) {
        results.push({ item, score });
      }
    }

    // スコア降順、同スコアなら使用回数降順、さらに同じならソート順昇順
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const useCountDiff = (b.item.useCount || 0) - (a.item.useCount || 0);
      if (useCountDiff !== 0) return useCountDiff;
      return (a.item.sortOrder || 0) - (b.item.sortOrder || 0);
    });

    return results;
  },

  /**
   * 従来のキー前方一致検索（互換性のため）
   * @param {string} key - 検索キー
   * @param {Array} shortcutKeys - ショートカットキーの配列
   * @returns {Array} マッチしたショートカットキーの配列
   */
  findByKey(key, shortcutKeys) {
    const normalizedKey = key.toUpperCase();
    return shortcutKeys.filter(item => {
      return item.key && item.key.toUpperCase().indexOf(normalizedKey) === 0;
    });
  }
};
