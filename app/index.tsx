import {View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform} from 'react-native';
import React from 'react';
import {auth} from '../FirebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/components/useAuth';
import { useUserProfile } from '@/components/UserProfileProvider';
import AuthErrorModal from '@/components/AuthErrorModal';
import { getAuthErrorMessage } from '@/utils/authErrors';

const index = () => {
    const { loading, user } = useAuth();
    const { createProfile } = useUserProfile();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showSignUp, setShowSignUp] = React.useState(false);
    // Sign up form state
    const [signUpEmail, setSignUpEmail] = React.useState('');
    const [signUpPassword, setSignUpPassword] = React.useState('');
    const [signUpUsername, setSignUpUsername] = React.useState('');
    const [signUpShowPassword, setSignUpShowPassword] = React.useState(false);
    const [authError, setAuthError] = React.useState<string | null>(null);
    const [showAuthError, setShowAuthError] = React.useState(false);

    const signIn = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Navigation handled by onAuthStateChanged
        } catch (error: unknown) {
            setAuthError(getAuthErrorMessage(error, 'login'));
            setShowAuthError(true);
        }
    };

    const signUp = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
            // Save username to user profile
            if (signUpUsername.trim()) {
                await createProfile(userCredential.user, signUpUsername.trim());
            }
            setShowSignUp(false);
            setSignUpEmail('');
            setSignUpPassword('');
            setSignUpUsername('');
            // Navigation handled by onAuthStateChanged
        } catch (error: unknown) {
            setAuthError(getAuthErrorMessage(error, 'signup'));
            setShowAuthError(true);
        }
    };

    if (loading) {
        return <SafeAreaView style={styles.container}><Text>Loading...</Text></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={{alignItems: 'center', marginTop: 40}}>
                <Image source={require('../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={{alignItems: 'center', marginTop: 32}}>
                <Text style={styles.welcome}>Welcome Back!</Text>
                <Text style={styles.signInToContinue}>Sign in to continue</Text>
            </View>
            <View style={{marginTop: 32}}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Enter your email"
                        placeholderTextColor="#BDBDBD"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>
                <Text style={[styles.label, {marginTop: 16}]}>Password</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Enter your password"
                        placeholderTextColor="#BDBDBD"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        <Text style={{color: '#BDBDBD', fontSize: 18}}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.forgotPasswordBtn}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginBtn} onPress={signIn}>
                    <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>
                <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 24}}>
                    <Text style={styles.noAccountText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => setShowSignUp(true)}>
                        <Text style={styles.signUpText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Sign Up Modal */}
            <Modal
                visible={showSignUp}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSignUp(false)}
            >
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
                    <View style={styles.modalContent}>
                        <Text style={styles.welcome}>Create Account</Text>
                        <Text style={styles.signInToContinue}>Sign up to get started</Text>
                        <Text style={[styles.label, {marginTop: 24}]}>Email</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Enter your email"
                                placeholderTextColor="#BDBDBD"
                                value={signUpEmail}
                                onChangeText={setSignUpEmail}
                                style={styles.input}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                        <Text style={[styles.label, {marginTop: 16}]}>Username</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Enter your username"
                                placeholderTextColor="#BDBDBD"
                                value={signUpUsername}
                                onChangeText={setSignUpUsername}
                                style={styles.input}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text style={[styles.label, {marginTop: 16}]}>Password</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Enter your password"
                                placeholderTextColor="#BDBDBD"
                                value={signUpPassword}
                                onChangeText={setSignUpPassword}
                                style={styles.input}
                                secureTextEntry={!signUpShowPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setSignUpShowPassword(!signUpShowPassword)} style={styles.eyeButton}>
                                <Text style={{color: '#BDBDBD', fontSize: 18}}>{signUpShowPassword ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.loginBtn} onPress={signUp}>
                            <Text style={styles.loginBtnText}>Create Account</Text>
                        </TouchableOpacity>
                        <Pressable style={styles.closeModalBtn} onPress={() => setShowSignUp(false)}>
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </Pressable>
                    </View>
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
        backgroundColor: '#fff',
        paddingHorizontal: 24,
    },
    logo: {
        width: 120,
        height: 100,
        marginBottom: 8,
    },
    logoTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#222',
        marginTop: 8,
    },
    logoSubtitle: {
        fontSize: 14,
        color: '#888',
        letterSpacing: 1.2,
        marginTop: 2,
    },
    welcome: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#222',
    },
    signInToContinue: {
        fontSize: 16,
        color: '#888',
        marginTop: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        paddingHorizontal: 12,
        marginBottom: 4,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#222',
    },
    eyeButton: {
        padding: 8,
    },
    forgotPasswordBtn: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotPasswordText: {
        color: '#FF7B7B',
        fontWeight: '600',
        fontSize: 15,
    },
    loginBtn: {
        backgroundColor: '#FF7B7B',
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: '#FF7B7B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    noAccountText: {
        color: '#888',
        fontSize: 15,
    },
    signUpText: {
        color: '#FF7B7B',
        fontWeight: 'bold',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    closeModalBtn: {
        alignSelf: 'center',
        marginTop: 18,
    },
    closeModalText: {
        color: '#FF7B7B',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default index;