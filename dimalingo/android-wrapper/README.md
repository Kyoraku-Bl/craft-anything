# DimaLingo Android wrapper

This is the apktool source for the Android 7.0+ WebView wrapper. The app loads
`https://dimalingo.vercel.app`; the offline asset is only a connection-error
page, not an offline copy of the course. WebView permission requests allow only
AUDIO_CAPTURE from this exact HTTPS origin, never camera or other resources.
Android's runtime RECORD_AUDIO permission is still required.

The previous APK's v2 digest was invalid. This release is signed with a new key,
so Android will not update an older installation signed with the previous key;
uninstalling the older app may erase its local progress. Back up and protect the
release signing key outside Git. A release signed with a different key cannot
update this release. Never commit private keys or passwords.

Build with apktool 2.9.3 and Android apksigner, using a securely retained release
key/certificate (no key material is included in this repository):

```sh
apktool b android-wrapper -o /tmp/dimalingo-unsigned.apk
apksigner sign --key /secure/path/release.pk8 --cert /secure/path/release.crt \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled false \
  --v4-signing-enabled false --out public/DimaLingo-Android.apk /tmp/dimalingo-unsigned.apk
apksigner verify --verbose --min-sdk-version 23 public/DimaLingo-Android.apk
```

The binary is signature-verified, but installation and microphone behavior must
still be tested on real Android devices and WebView versions.
