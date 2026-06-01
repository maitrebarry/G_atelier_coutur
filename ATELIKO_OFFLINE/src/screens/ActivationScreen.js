import React, {useEffect, useState} from 'react';
import {Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ToastAndroid} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {getUserProfile, setUserProfile} from '../services/userService';
import {KJUR, KEYUTIL, b64tohex} from 'jsrsasign';

const PUBLIC_KEY_PEM = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjB2cE/s51fiP7PndAyqG\nIUB5h2xLaZChupnZ0BspTiwYl/3YsGwM2Y65way2TqUHClVlTz5iPPjELY9T/MyY\nIponmAGNU2gxTgijFsDrR4QYezC3ehVbkoYSvXgMlROvq6hQn+tVr92PmwHsb8Nq\nb0rD86ccCGSncnkndjvNKvunzdAevCg/LKLTedwE9e+slunoC5jDk6kqJfdxx3va\nk7RcM6h5/WElwXK7Ebjyivuzj+sZsKj2CBwitEWbjgn3KEhzq0oAA2niIlDHzykO\n1by4iQvQ7TOoKmBSG7p+phzGjvx84QkI41a3HUyrKk6xa01HsqzIol3D3WJOR7SZ\nCwIDAQAB\n-----END PUBLIC KEY-----';

function verifySignature(payloadStr, signatureB64) {
  try {
    const sig = new KJUR.crypto.Signature({alg: 'SHA256withRSA'});
    const pub = KEYUTIL.getKey(PUBLIC_KEY_PEM);
    sig.init(pub);
    sig.updateString(payloadStr);
    return sig.verify(b64tohex(signatureB64));
  } catch (e) {
    console.error('verifySignature error', e);
    return false;
  }
}

export default function ActivationScreen({onActivated}) {
  const [deviceId, setDeviceId] = useState('');
  const [payloadText, setPayloadText] = useState('');
  const [loading, setLoading] = useState(true);

  const extractLicenseText = value => {
    const text = String(value || '').trim();
    const match = text.match(/[?&]license=([^&]+)/);
    if (!match) return text;
    try {
      return decodeURIComponent(match[1]);
    } catch (e) {
      return text;
    }
  };

  const activateLicense = async rawText => {
    const licenseText = extractLicenseText(rawText);
    let parsed = null;
    try {
      parsed = JSON.parse(licenseText);
    } catch (e) {
      Alert.alert('Erreur', 'Licence invalide (JSON)');
      return;
    }
    const {deviceId: licDeviceId, expires, signature, payload} = parsed;
    const payloadObj = payload || {deviceId: licDeviceId, expires};
    const payloadStr = JSON.stringify(payloadObj);
    const ok = verifySignature(payloadStr, signature);
    if (!ok) {
      Alert.alert('Licence invalide', 'Signature non vérifiée');
      return;
    }
    if (payloadObj.deviceId && payloadObj.deviceId !== deviceId) {
      Alert.alert('Licence non valable', 'La licence est destinée à un autre appareil');
      return;
    }
    const now = Date.now();
    if (payloadObj.expires && now > Number(payloadObj.expires)) {
      Alert.alert('Licence expirée', 'La licence est périmée');
      return;
    }
    const profile = (await getUserProfile()) || {};
    profile.activation = {activated: true, activatedAt: now, payload: payloadObj};
    profile.atelier = { name: payloadObj.atelierName || payloadObj.issuedBy || profile.atelier?.name || 'Votre atelier' };
    await setUserProfile(profile);
    Alert.alert('Succès', 'App activée avec succès');
    onActivated && onActivated();
  };

  const bypassActivation = async () => {
    const profile = (await getUserProfile()) || {};
    profile.activation = {activated: true, activatedAt: Date.now(), payload: {deviceId, expires: 9999999999999, isTest: true}};
    await setUserProfile(profile);
    Alert.alert('Mode Test', 'Application activée pour le test (Bypass)');
    onActivated && onActivated();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await DeviceInfo.getAndroidId();
        if (!mounted) return;
        setDeviceId(id || await DeviceInfo.getUniqueId());
        const profile = await getUserProfile();
        if (profile?.activation?.activated) {
          onActivated && onActivated();
          return;
        }
      } catch (e) {
        console.error('ActivationScreen init error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!deviceId) return undefined;

    const handleUrl = url => {
      if (!url || !url.startsWith('ateliko://activate')) return;
      const licenseText = extractLicenseText(url);
      setPayloadText(licenseText);
      activateLicense(licenseText);
    };

    Linking.getInitialURL().then(handleUrl).catch(e => console.error('Activation link error', e));
    const subscription = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => subscription.remove();
  }, [deviceId]);

  const tryActivate = async () => activateLicense(payloadText);

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{padding: 18}}>
        <Text style={styles.title}>Activation hors-ligne</Text>
        <Text style={styles.helper}>Device ID (donne-le à l'administrateur pour générer la licence) :</Text>
        <Text selectable style={styles.deviceId}>{deviceId}</Text>

        <Text style={[styles.helper, {marginTop: 12}]}>Colle ici le contenu JSON de la licence fournie :</Text>
        <TextInput
          value={payloadText}
          onChangeText={setPayloadText}
          multiline
          style={styles.textarea}
          placeholder='Paste license JSON here'
        />

        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          <TouchableOpacity style={styles.btn} onPress={tryActivate}>
            <Text style={styles.btnText}>Activer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#f3f4f6'}]} onPress={() => setPayloadText('')}>
            <Text style={[styles.btnText, {color: '#0d6efd'}]}>Effacer</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#10b981'}]} onPress={bypassActivation}>
              <Text style={styles.btnText}>Test (Bypass)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  title: {fontSize: 20, fontWeight: '900', marginBottom: 8},
  helper: {color: '#475569', marginBottom: 6},
  deviceId: {fontFamily: 'monospace', backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, color: '#0f172a'},
  textarea: {height: 160, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, textAlignVertical: 'top', marginBottom: 12},
  btn: {backgroundColor: '#0d6efd', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8},
  btnText: {color: '#fff', fontWeight: '900'},
});
