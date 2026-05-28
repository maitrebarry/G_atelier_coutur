import {Alert, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

const IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/ateliko_images`;

async function ensureImageDir() {
  const exists = await RNFS.exists(IMAGE_DIR);
  if (!exists) {
    await RNFS.mkdir(IMAGE_DIR);
  }
}

async function requestCameraPermission() {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function extensionFrom(asset) {
  const fromName = asset?.fileName?.split('.').pop();
  if (fromName) return fromName.toLowerCase();
  if (asset?.type === 'image/png') return 'png';
  return 'jpg';
}

export async function copyImageToLocal(asset, prefix = 'photo') {
  if (!asset?.uri) return null;
  await ensureImageDir();
  const ext = extensionFrom(asset);
  const target = `${IMAGE_DIR}/${prefix}_${Date.now()}.${ext}`;
  const source = decodeURIComponent(asset.uri.replace('file://', ''));
  await RNFS.copyFile(source, target);
  return `file://${target}`;
}

export async function pickLocalImage(prefix) {
  const result = await launchImageLibrary({mediaType: 'photo', quality: 0.85, selectionLimit: 1});
  if (result.didCancel) return null;
  if (result.errorCode) {
    Alert.alert('Erreur image', result.errorMessage || 'Selection impossible');
    return null;
  }
  return copyImageToLocal(result.assets?.[0], prefix);
}

export async function takeLocalPhoto(prefix) {
  const allowed = await requestCameraPermission();
  if (!allowed) {
    Alert.alert('Permission refusee', 'Autorisez la camera pour prendre une photo.');
    return null;
  }
  const result = await launchCamera({mediaType: 'photo', quality: 0.85, saveToPhotos: false});
  if (result.didCancel) return null;
  if (result.errorCode) {
    Alert.alert('Erreur camera', result.errorMessage || 'Photo impossible');
    return null;
  }
  return copyImageToLocal(result.assets?.[0], prefix);
}

export async function removeLocalImage(uri) {
  if (!uri || !uri.startsWith('file://')) return;
  const path = uri.replace('file://', '');
  const exists = await RNFS.exists(path);
  if (exists) {
    await RNFS.unlink(path);
  }
}
