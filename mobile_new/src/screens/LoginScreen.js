import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Switch, TouchableOpacity, ActivityIndicator, Image, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselImages = [
    require('../../assets/jupe0.jpg'),
    require('../../assets/jupe1.jpg'),
    require('../../assets/jupe2.jpg'),
    require('../../assets/jupe4.jpg'),
    require('../../assets/jupe5.jpg'),
    require('../../assets/jupe6.jpg'),
    require('../../assets/jupe7.jpg'),
    require('../../assets/jupe8.jpg'),
    require('../../assets/jupe9.jpg'),
    require('../../assets/jupe10.jpg'),
    require('../../assets/model1.png'),
    require('../../assets/model2.png'),
    require('../../assets/model3.jpg'),
    require('../../assets/model4.jpg'),
    require('../../assets/model5.jpg'),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      let next = (carouselIndex + 1) % carouselImages.length;
      setCarouselIndex(next);
      if (carouselRef.current) {
        const width = Dimensions.get('window').width;
        carouselRef.current.scrollTo({ x: next * width, animated: true });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselIndex]);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) navigation.replace('Home');
      } catch (e) {
        // ignore
      }
    })();
  }, [navigation]);

  const showBlockedSubscriptionFlow = async (message) => {
    return new Promise((resolve) => {
      Alert.alert(
        'Abonnement expiré',
        message || 'Votre abonnement est expiré. Veuillez renouveler pour continuer.',
        [
          { text: 'Fermer', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Se réabonner', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      );
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log('attempt login to', api.defaults.baseURL + '/auth/login');
      const res = await api.post('/auth/login', { email, password });
      const response = res.data || {};
      const token = response.token || response.accessToken || response.authToken;
      if (!token) throw new Error(response.error || response.message || 'Pas de token reçu');

      // collect permissions
      let permissions = [];
      if (response.permissions && Array.isArray(response.permissions)) {
        permissions = response.permissions.map((p) => (typeof p === 'string' ? p : p.code));
      } else if (response.user && response.user.permissions && Array.isArray(response.user.permissions)) {
        permissions = response.user.permissions.map((p) => (typeof p === 'string' ? p : p.code));
      } else {
        try {
          const userId = response.id || response.user?.id;
          if (userId) {
            const permRes = await api.get(`/utilisateurs/${userId}/permissions`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (Array.isArray(permRes.data)) permissions = permRes.data.map((p) => p.code || p);
          }
        } catch (e) {
          // ignore
        }
      }

      const photoPath =
        response.photoPath || response.user?.photoPath || response.photo || response.user?.photo || null;
      // determine atelier name if provided by API
      const atelierName =
        response.atelier ||
        response.atelierName ||
        response.user?.atelier ||
        response.user?.atelierName ||
        response.user?.atelier_nom ||
        null;
      console.log('login response', response);

      const userData = {
        token,
        userId: response.id || response.user?.id,
        email: response.email || response.user?.email,
        prenom: response.prenom || response.user?.prenom,
        nom: response.nom || response.user?.nom,
        role: response.role || response.user?.role,
        atelierId: response.atelierId || response.user?.atelierId,
        atelier: atelierName, // store atelier name for display
        permissions,
        photoPath,
      };

      // if atelier missing, attempt another call
      if (!userData.atelier && userData.userId) {
        try {
          const userRes = await api.get(`/utilisateurs/${userData.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const u = userRes.data || {};
          if (u.atelier || u.atelierName || u.atelier_nom) {
            userData.atelier = u.atelier || u.atelierName || u.atelier_nom;
          }
        } catch (e) {
          console.log('failed to fetch user details', e.message);
        }
      }

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      if (remember) await AsyncStorage.setItem('authRemember', '1');
      else await AsyncStorage.removeItem('authRemember');

      if (response.subscriptionBlocked) {
        await AsyncStorage.setItem('smb_sub_blocked', '1');
        const goRenew = await showBlockedSubscriptionFlow(response.subscriptionMessage);
        if (goRenew) navigation.navigate('Abonnement');
        setLoading(false);
        return;
      }

      try {
        const subRes = await api.get('/subscription/current', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes?.data?.blocked) {
          await AsyncStorage.setItem('smb_sub_blocked', '1');
          const goRenew = await showBlockedSubscriptionFlow(subRes?.data?.message);
          if (goRenew) navigation.navigate('Abonnement');
          setLoading(false);
          return;
        } else {
          await AsyncStorage.removeItem('smb_sub_blocked');
          navigation.replace('Home');
        }
      } catch (e) {
        navigation.replace('Home');
      }
    } catch (err) {
      let text = 'Échec de connexion';
      if (err?.response?.data)
        text =
          err.response.data.error ||
          err.response.data.message ||
          JSON.stringify(err.response.data);
      else if (err?.message) text = err.message;
      if (text === 'Network Error') text = 'Impossible de se connecter au serveur';
      setError(text);
      Alert.alert('Erreur', text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <View style={styles.topContainer}>
        <View style={styles.card}>
          <Image
            source={require('../../assets/logo_ateliko.png')}
            style={styles.logo}
          />
          <Text style={styles.brand}>ATELIKO</Text>
          <Text style={styles.subtitle}>Connexion</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="ex: user@domaine.com"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Votre mot de passe"
              style={[styles.input, { flex: 1, paddingRight: 40 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.rowBetween}>
            <View style={styles.rememberRow}>
              <Switch value={remember} onValueChange={setRemember} />
              <Text style={styles.rememberText}>Se souvenir de moi</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Mot de passe oublié',
                  'Utilisez la version web pour réinitialiser le mot de passe ou contactez l’administrateur.'
                )
              }
            >
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bottomContainer}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        >
          {carouselImages.map((img, idx) => (
            <Image key={idx} source={img} style={styles.carouselImage} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  topContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  bottomContainer: {
    height: '40%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  logo: {
    width: 140,
    height: 80,
    alignSelf: 'center',
    marginBottom: 8,
    resizeMode: 'contain',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#475569',
  },
  label: { marginBottom: 6, color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  toggle: { padding: 10, marginLeft: 8 },
  toggleText: { color: '#2563eb', fontWeight: '600' },
  error: { color: '#c0392b', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { marginLeft: 8, color: '#334155' },
  link: { color: '#2563eb', fontWeight: '600' },
  btn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  carousel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  carouselImage: { width: Dimensions.get('window').width, height: '100%', resizeMode: 'cover' },
  eyeIcon: { position: 'absolute', right: 12, top: '50%', marginTop: -12 },
  eyeText: { fontSize: 20 },
});
