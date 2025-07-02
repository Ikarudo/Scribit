import { StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import EditScreenInfo from '@/components/EditScreenInfo';
import {TextInput, TouchableOpacity, Image, Modal, Pressable,} from 'react-native';
import { Text, View } from '@/components/Themed';
import {router} from 'expo-router';
import {onAuthStateChanged, signOut, User} from 'firebase/auth';
import {auth} from '@/FirebaseConfig'; 
import React from 'react';
import * as Updates from 'expo-updates';

export default function TabOneScreen() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.location.reload();
      } else {
        await Updates.reloadAsync();
      }
    } catch (error) {
      alert('Failed to sign out. Please try again.');
    }
  };

  if (loading) return <Text>Loading...</Text>;
  if (!user) return null; // Don't render anything if not authenticated

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Tab One</Text>
      <TouchableOpacity onPress={handleSignOut}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
