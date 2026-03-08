import React, { useState } from 'react';
import { View, Image, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, useTheme, Surface, IconButton } from 'react-native-paper';
import { auth } from '../FirebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/components/useAuth';
import { useUserProfile } from '@/components/UserProfileProvider';
import { useIsDark } from '@/components/ThemeContext';
import { getLogoSource } from '@/constants/images';
import AuthErrorModal from '@/components/AuthErrorModal';
import { getAuthErrorMessage } from '@/utils/authErrors';
import type { AppTheme } from '@/theme';

export default function AuthScreen() {
  const theme = useTheme<AppTheme>();
  const isDark = useIsDark();
  const logoSource = getLogoSource(isDark);
  const { loading, user } = useAuth();
  const { createProfile } = useUserProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpShowPassword, setSignUpShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthError, setShowAuthError] = useState(false);

  const signIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      setAuthError(getAuthErrorMessage(error, 'login'));
      setShowAuthError(true);
    }
  };

  const signUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
      if (signUpUsername.trim()) {
        await createProfile(userCredential.user, signUpUsername.trim());
      }
      setShowSignUp(false);
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpUsername('');
    } catch (error: unknown) {
      setAuthError(getAuthErrorMessage(error, 'signup'));
      setShowAuthError(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.logoWrap}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.headingWrap}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>Welcome Back!</Text>
        <Text variant="bodyLarge" style={[styles.subhead, { color: theme.colors.onSurfaceVariant }]}>Sign in to continue</Text>
      </View>
      <View style={styles.form}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 6 }}>Email</Text>
        <TextInput
          mode="outlined"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <Text variant="labelLarge" style={[styles.labelTop, { color: theme.colors.onSurface }]}>Password</Text>
        <TextInput
          mode="outlined"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          style={styles.input}
        />
        <Button mode="text" compact style={styles.forgotBtn} textColor={theme.colors.primary}>
          Forgot Password?
        </Button>
        <Button mode="contained" onPress={signIn} style={styles.loginBtn}>
          Login
        </Button>
        <View style={styles.signUpRow}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Don't have an account? </Text>
          <Button mode="text" compact onPress={() => setShowSignUp(true)} textColor={theme.colors.primary}>
            Sign Up
          </Button>
        </View>
      </View>

      <Modal
        visible={showSignUp}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSignUp(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} elevation={5}>
            <Image source={logoSource} style={[styles.logo, { marginBottom: 8 }]} resizeMode="contain" />
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>Create Account</Text>
            <Text variant="bodyLarge" style={[styles.subhead, { color: theme.colors.onSurfaceVariant }]}>Sign up to get started</Text>
            <Text variant="labelLarge" style={[styles.labelTop, { color: theme.colors.onSurface }]}>Email</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your email"
              value={signUpEmail}
              onChangeText={setSignUpEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text variant="labelLarge" style={[styles.labelTop, { color: theme.colors.onSurface }]}>Username</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your username"
              value={signUpUsername}
              onChangeText={setSignUpUsername}
              autoCapitalize="none"
              style={styles.input}
            />
            <Text variant="labelLarge" style={[styles.labelTop, { color: theme.colors.onSurface }]}>Password</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your password"
              value={signUpPassword}
              onChangeText={setSignUpPassword}
              secureTextEntry={!signUpShowPassword}
              autoCapitalize="none"
              right={
                <TextInput.Icon
                  icon={signUpShowPassword ? 'eye-off' : 'eye'}
                  onPress={() => setSignUpShowPassword(!signUpShowPassword)}
                />
              }
              style={styles.input}
            />
            <Button mode="contained" onPress={signUp} style={styles.loginBtn}>
              Create Account
            </Button>
            <Button mode="text" onPress={() => setShowSignUp(false)} textColor={theme.colors.primary}>
              Cancel
            </Button>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>

      <AuthErrorModal
        visible={showAuthError}
        message={authError || 'An error occurred. Please try again.'}
        onClose={() => {
          setShowAuthError(false);
          setAuthError(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 100,
    marginBottom: 8,
  },
  headingWrap: {
    alignItems: 'center',
    marginTop: 32,
  },
  subhead: {
    marginTop: 4,
  },
  form: {
    marginTop: 32,
  },
  labelTop: {
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    marginBottom: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  loginBtn: {
    marginTop: 24,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'stretch',
  },
});
