# WAJID MEDIA HUB

A mobile-first, dark-themed personal media toolbox prototype.

## Files
- `index.html`: page structure
- `style.css`: responsive dark theme
- `app.js`: social link recognition, local link history, and original-file save action
- `manifest.json`: add-to-home-screen metadata
- `sw.js`: basic app-shell caching

## Important feature limits
This is a free static, no-server prototype. It detects Facebook, YouTube, TikTok, and Instagram links, and stores checked links locally in the browser. It does **not** extract protected video streams from social platforms. Platform-specific downloading must use an allowed official method or a source the user has permission to access. The local file action saves the selected media in its original format; MP3 conversion and resolution conversion are not implemented in this version.

## Publish with GitHub Pages
1. Open repository **Settings → Pages**.
2. Under Build and deployment, choose **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`, then save.
4. Wait for GitHub Pages to publish the URL shown on that page.
5. Open the URL in Chrome on Android. Use the browser menu and choose **Add to Home screen** or **Install app** if offered.

No paid API keys, passwords, or secrets are needed for this static prototype.