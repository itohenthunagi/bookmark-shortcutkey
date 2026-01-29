# Bookmark Shortcuter

A Chrome extension that lets you quickly access your favorite websites using keyboard shortcuts. Features two modes: **Shortcut Key Mode** for instant access and **Search Mode** for flexible searching.

![Version](https://img.shields.io/badge/version-1.8.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Two Access Modes

#### 🎯 Shortcut Key Mode (Default)
- Open the popup and press keys directly - no need to worry about IME (Japanese/English input) state
- Physical keyboard keys are recognized regardless of your input method
- Perfect for quick access to frequently used sites

#### 🔍 Search Mode
- Click the search box to enter search mode
- Search in Japanese or English
- Find bookmarks by title, URL, tags, or aliases

### Flexible Actions
- **Jump to URL**: Switch to existing tab or open in new tab
- **Open in new tab**: Always open in a new tab
- **Open in current tab**: Replace current page
- **Execute script**: Run custom JavaScript
- **Incognito mode**: Open in private browsing
- **Open multiple URLs**: Open a group of URLs at once

### Organization
- 🏷️ **Tags**: Categorize your shortcuts
- 📝 **Aliases**: Add alternative names for better searchability
- 🎨 **Customizable layout**: Adjust column count and filter position
- 📦 **Import/Export**: Backup and transfer your settings

## 🚀 Quick Start

### Installation

1. Download `BookmarkShortcuter_v1.8.0.zip`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extracted folder
5. (Optional) Pin the extension to your toolbar

*Chrome Web Store listing coming soon*

### Basic Usage

1. **Press the trigger key** (Default: `Ctrl+Period` / `Command+Comma` on Mac)
2. **Choose your mode:**
   - **Shortcut Key Mode**: Just press the key (e.g., `G` for Gmail)
   - **Search Mode**: Click the search box and type

### Changing the Trigger Key

1. Go to `chrome://extensions/shortcuts`
2. Find "Bookmark Shortcuter"
3. Set your preferred key combination

## 📖 How to Use

### Adding Shortcuts

#### Method 1: From Current Page
1. Open the page you want to bookmark
2. Click the extension icon
3. Click "Add" at the bottom
4. Set a key (e.g., `GM` for Gmail)
5. Choose an action
6. Save

#### Method 2: From Settings
1. Right-click the extension icon → "Options"
2. Click "Add" button
3. Fill in the details:
   - **Key**: The shortcut key (e.g., `FB` for Facebook)
   - **Title**: Display name
   - **URL**: The website URL
   - **Action**: What happens when you press the key
   - **Tags** (optional): For categorization
   - **Aliases** (optional): Alternative search terms

#### Method 3: Right-click Menu
1. Right-click on any page
2. Select "Add to Bookmark Shortcuter"

### Using Shortcuts

**Shortcut Key Mode:**
```
1. Press Ctrl+Period (trigger key)
2. Press your shortcut key (e.g., G for Gmail)
3. Done! The page opens instantly
```

**Search Mode:**
```
1. Press Ctrl+Period (trigger key)
2. Click the search box
3. Type to search (Japanese or English)
4. Press Enter or click the result
```

## ⚙️ Settings

### General Settings

- **Column Count**: Number of columns in the popup grid (1-5)
- **Category Filter Position**: Top, Bottom, Left, or Right
- **Disable Sync**: Keep settings local instead of syncing across devices

### Actions Explained

| Action | Description |
|--------|-------------|
| Jump to URL | Switch to existing tab, or open new if not found |
| Jump to URL (All windows) | Same as above, but searches all windows |
| Open in new tab | Always open in a new tab |
| Open in current tab | Replace the current page |
| Execute script | Run JavaScript on the current page |
| Open in incognito | Open in a private browsing window |
| Open current tab in incognito | Copy current page to incognito |
| Open multiple URLs | Open a group of URLs simultaneously |

### Custom Scripts

You can execute custom JavaScript after opening a URL. For example:
```javascript
// Auto-click a button
document.querySelector('#login-button').click();
```

**Note**: Script feature requires Chrome 135+ with Manifest V3 support.

## 🔒 Privacy

- ✅ All data stored locally in your browser
- ✅ No external servers or analytics
- ✅ No personal data collection
- ✅ Open source for transparency

Read our full [Privacy Policy](https://itohenthunagi.github.io/bookmark-shortcutkey/)

## 🛠️ Advanced Features

### Sync Across Devices

Settings automatically sync via Chrome Sync (if enabled in Chrome). Disable in Options if you want device-specific shortcuts.

### Import/Export

Backup or transfer your shortcuts:
1. Open Options
2. Click "Export" to download JSON file
3. Click "Import" to restore from JSON file

### Shortcut Groups

Create groups of related shortcuts:
1. Add a new shortcut
2. Select "Open multiple URLs" action
3. Add up to 5 URLs
4. Choose whether to open in a tab group

## 🤝 Contributing

This is an open-source project. Contributions are welcome!

- **GitHub**: [https://github.com/itohenthunagi/bookmark-shortcutkey](https://github.com/itohenthunagi/bookmark-shortcutkey)
- **Issues**: [Report bugs or request features](https://github.com/itohenthunagi/bookmark-shortcutkey/issues)

## 📝 License

MIT License - See LICENSE file for details

## 📮 Support

For questions or issues:
- Open an [Issue on GitHub](https://github.com/itohenthunagi/bookmark-shortcutkey/issues)
- Check the [Privacy Policy](https://itohenthunagi.github.io/bookmark-shortcutkey/)

---

Made with ❤️ for productivity enthusiasts
