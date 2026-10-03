# AgendaPicto — Instalación

```bash
npx create-expo-app AgendaPicto --template blank-typescript
cd AgendaPicto

npx expo install expo-image-picker
npx expo install expo-file-system
npx expo install expo-sharing
npx expo install expo-print
npx expo install expo-media-library
npx expo install expo-speech
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-safe-area-context
npm install axios
```

Después copia encima los archivos de este paquete (App.tsx, app.json, tsconfig.json y la carpeta src/).

## Probar en Android

```bash
npx expo start
```

Escanear el QR con Expo Go, o compilar APK:

```bash
npx expo run:android
```

## Compilar iOS (amigo con Mac)

```bash
git clone <repo>
cd AgendaPicto
npm install
npx expo prebuild --platform ios
cd ios && pod install
```

Abrir `ios/AgendaPicto.xcworkspace` en Xcode y compilar. Los permisos de Info.plist ya están definidos en `app.json`.
