import React, {useEffect, useState} from 'react';
import {ActivityIndicator, SafeAreaView, StyleSheet, Text} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {initializeDatabase} from './src/database/schema';
import ActivationScreen from './src/screens/ActivationScreen';
import {getUserProfile} from './src/services/userService';

Ionicons.loadFont();

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setReady(true))
      .catch(err => {
        setError(err?.message || 'Initialisation impossible');
        setReady(true);
      });
    getUserProfile().then(p => { if (p?.activation?.activated) setActivated(true); });
  }, []);

  if (!ready) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loading}>Preparation de la base locale...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Erreur SQLite: {error}</Text>
      </SafeAreaView>
    );
  }

  if (!activated) {
    return <ActivationScreen onActivated={() => setActivated(true)} />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  loading: {marginTop: 12, color: '#334155'},
  error: {color: '#b91c1c', fontWeight: '700', textAlign: 'center'},
});
