# 🎵 ShoutStream Player Generator

<div align="center">
  <img width="800" height="300" alt="ShoutStream Player Generator" src="https://img.shields.io/badge/ShoutStream-Player%20Generator-blue?style=for-the-badge&logo=react&logoColor=white" />
</div>

<div align="center">
  <p><strong>Generate beautiful, shareable audio players for Shoutcast and Icecast streams</strong></p>
</div>
<img width="1103" height="648" alt="image" src="https://github.com/user-attachments/assets/5434f7b0-5ef8-4146-9717-85204f5e6528" />

<img width="1051" height="720" alt="image" src="https://github.com/user-attachments/assets/cdb47a54-076f-4397-9bbb-9acd3f24cd02" />


## ✨ Features

- 🎶 **Stream Player Generation** - Create custom audio players for any Shoutcast/Icecast stream
- 🎨 **Beautiful UI** - Modern, responsive design with dark/light theme support
- 📱 **Mobile Friendly** - Optimized for all screen sizes
- 🔗 **Easy Sharing** - Generate shareable links with URL shortening
- 📊 **Live Metadata** - Display current song and listener count
- 🎛️ **Audio Controls** - Full playback controls with volume management
- 🌐 **CORS Support** - Automatic proxy handling for cross-origin streams
- ⚡ **Fast Loading** - Optimized performance with local dependencies

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run preview
```

## 📖 How to Use

1. **Enter Stream Details:**
   - Paste your Shoutcast/Icecast stream URL
   - Optionally add a logo URL for branding

2. **Generate Player:**
   - Click "Generate" to create your custom player
   - The app will create a shareable URL with your stream

3. **Share Your Player:**
   - Use the generated link to share your stream anywhere
   - Includes WhatsApp and Telegram sharing options

### Example Usage

```bash
# Stream URL format
http://your-stream-server:8000/

# With logo
http://your-stream-server:8000/
https://example.com/logo.png
```

## 🔧 Technical Details

### Architecture
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** UnoCSS
- **Icons:** Custom SVG components

### Security Features
- ✅ **No External CDN Dependencies** - All React components bundled locally
- ✅ **CORS Handling** - Automatic proxy for cross-origin streams
- ✅ **Input Validation** - Secure URL validation and sanitization

### Recent Updates
- 🔒 **Security Enhancement** - Removed external CDN dependencies for improved security
- ⚡ **Performance** - Faster loading with bundled dependencies
- 🛠️ **Build Optimization** - Enhanced Vite configuration for production builds

## 🛠️ Development

### Project Structure
```
├── components/          # React components
│   ├── AudioPlayer.tsx # Main audio player component
│   ├── HomePage.tsx    # Landing page
│   └── icons/          # SVG icon components
├── hooks/              # Custom React hooks
├── public/             # Static assets
└── src/                # Source files
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🌟 Example Streams

Try these example streams to test the player:

- `https://alfaruq1.ssl.radioislam.my.id/` - Islamic Radio Stream
- `http://stream.example.com:8000/` - Generic Shoutcast format

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your stream URL and browser information

---

<div align="center">
  <p>Made with ❤️ for the streaming community</p>
</div>
