# YouTube Intentionality

A Chrome extension to enhance the YouTube browsing experience.

## Features

- Set intentions for your YouTube browsing session
- Maintain awareness of your viewing purpose
- Easy to clear or update intentions

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the CSS:
   ```
   npm run build:css
   ```
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the `src` directory of this project

## Development

The project structure is as follows:

```
src/
├── popup/           # Extension popup UI
├── service_worker/  # Background service worker
├── content/         # Content scripts
├── assets/          # Static assets
└── manifest.json    # Extension manifest
```

### Working with Tailwind CSS

This project uses Tailwind CSS for styling. The workflow is:

1. Edit the base Tailwind file in `src/assets/tailwind.css`
2. Run the build command to generate the output CSS:
   ```
   npm run build:css
   ```
2a. Alternatively for development, you can watch for changes:
   ```
   npm run watch:css
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.