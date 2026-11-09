const expo = require('./app.json').expo;

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.split('.')[0]}`
  : undefined;
// Without Firebase, this plugin only adds the iOS callback scheme and Podfile settings.
// Android native code is autolinked, so let Android builds proceed without an iOS client ID.
const googleSignInPlugins = iosUrlScheme
  ? [['react-native-nitro-google-signin', { iosUrlScheme }]]
  : [];

module.exports = {
  ...expo,
  extra: {
    ...expo.extra,
    googleWebClientId: webClientId
  },
  plugins: [...(expo.plugins || []), ...googleSignInPlugins]
};
