# Post-Upgrade Steps

After this PR is merged, run these commands:

1. Clear npm cache:
```bash
npm cache clean --force
```

2. Delete node_modules and package-lock.json:
```bash
rm -rf node_modules package-lock.json
```

3. Install dependencies:
```bash
npm install --legacy-peer-deps
```

4. Clear Metro bundler cache:
```bash
npx expo start -c
```

5. Test on Expo Go (SDK 54):
- Open Expo Go on your iPhone
- Scan QR code or press `s` for tunnel mode
- App should load without TurboModule errors
