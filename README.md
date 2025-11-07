# 🛠️ Developer Tools Suite

A modern, privacy-focused collection of essential developer utilities — all running locally in your browser. No server uploads, no data tracking, just pure client-side tools.

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/sayantankhan/tools.git
cd tools

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## 🏗️ Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## 🌐 Deployment

This project is configured for GitHub Pages deployment at `/tools` path.

**Automatic Deployment:**
- Push to `main` branch triggers automatic deployment via GitHub Actions
- Visit the Actions tab to monitor deployment status

**Manual Deployment:**
- Go to Actions tab → Select "Deploy to GitHub Pages" workflow → Run workflow

**Access your site:**
```
https://yourusername.github.io/tools
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` - `5` | Switch between tools |
| `Ctrl/Cmd + Enter` | Execute primary action (e.g., prettify JSON) |
| `Esc` | Clear current tool input |
| `Ctrl/Cmd + V` | Auto-paste and process (JWT tool) |

## 🔒 Privacy & Security

All operations run **100% client-side** in your browser:
- ✅ No server uploads
- ✅ No data collection
- ✅ No external API calls (except for user-initiated API testing)
- ✅ Your sensitive data never leaves your device

**Security Notes:**
- JWT signature validation is informational only
- Never paste production secrets in browser-based tools
- API requests are subject to CORS policies

## 🎨 Design Features

- **Dark Theme**: Easy on the eyes with high-contrast design
- **Glass Morphism**: Modern frosted-glass UI elements
- **Gradient Accents**: Indigo-to-magenta gradient highlights
- **Smooth Animations**: 200-300ms transitions for polished feel
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Accessible**: ARIA labels and keyboard navigation

## 📝 Use Cases

- **Frontend Developers**: Quick JSON formatting, API testing
- **Backend Engineers**: JWT debugging, base64 operations
- **DevOps**: API endpoint verification, data encoding
- **QA Engineers**: Request/response inspection, format validation
- **Designers**: Image optimization and format conversion

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Known Limitations

- **Max File Size**: Image tool supports up to 25MB files
- **CORS**: API tool requests are subject to browser CORS policies
- **JWT Validation**: Client-side signature verification is informational only
- **Browser Compatibility**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

## 💡 Future Enhancements

- [ ] Dark/Light theme toggle
- [ ] Export tool configurations
- [ ] Regex tester tool
- [ ] Hash generator (MD5, SHA-256, etc.)
- [ ] Timestamp converter
- [ ] UUID generator
- [ ] Request collection management (API tool)
- [ ] Monaco editor integration for better code editing

## 📧 Support

Found a bug or have a feature request? Please [open an issue](https://github.com/sayantankhan/tools/issues).

---

**Made with ❤️ for developers, by developers**

*Run locally. Stay secure. Work faster.*
