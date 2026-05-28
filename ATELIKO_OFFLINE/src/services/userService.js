import RNFS from 'react-native-fs';

const CONFIG_DIR = `${RNFS.DocumentDirectoryPath}/ateliko_config`;
const USER_FILE = `${CONFIG_DIR}/user.json`;

async function ensureDir() {
  const exists = await RNFS.exists(CONFIG_DIR);
  if (!exists) await RNFS.mkdir(CONFIG_DIR);
}

export async function getUserProfile() {
  try {
    const exists = await RNFS.exists(USER_FILE);
    if (!exists) return {};
    const txt = await RNFS.readFile(USER_FILE, 'utf8');
    return JSON.parse(txt || '{}');
  } catch (e) {
    console.error('getUserProfile error', e);
    return {};
  }
}

export async function setUserProfile(profile) {
  try {
    await ensureDir();
    await RNFS.writeFile(USER_FILE, JSON.stringify(profile || {}), 'utf8');
    return true;
  } catch (e) {
    console.error('setUserProfile error', e);
    return false;
  }
}

export async function setUserProfilePhoto(uri) {
  try {
    const profile = await getUserProfile();
    profile.photo = uri || null;
    await setUserProfile(profile);
    return profile;
  } catch (e) {
    console.error('setUserProfilePhoto error', e);
    return null;
  }
}

export default {getUserProfile, setUserProfile, setUserProfilePhoto};
