import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// DEPRECATED: Firestore imports - kept for future removal
// import { db } from '../FirebaseConfig';
// import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  createdAt: number;
  updatedAt: number;
};

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<Pick<UserProfile, 'username'>>) => Promise<void>;
  createProfile: (user: User, username: string) => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}

const PROFILE_KEY_PREFIX = 'scribit_user_profile_';

export const UserProfileProvider = ({ children, user: currentUser }: { children: ReactNode; user: User | null }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadProfile = async () => {
      try {
        // Load profile from AsyncStorage
        const profileKey = `${PROFILE_KEY_PREFIX}${currentUser.uid}`;
        const storedProfile = await AsyncStorage.getItem(profileKey);

        if (storedProfile) {
          const data = JSON.parse(storedProfile);
          if (mounted) {
            setProfile({
              uid: currentUser.uid,
              username: data.username || '',
              email: data.email || currentUser.email || '',
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt || Date.now(),
            });
          }
        } else {
          // Profile doesn't exist yet, create a default one
          const defaultProfile: UserProfile = {
            uid: currentUser.uid,
            username: currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await AsyncStorage.setItem(profileKey, JSON.stringify({
            username: defaultProfile.username,
            email: defaultProfile.email,
            createdAt: defaultProfile.createdAt,
            updatedAt: defaultProfile.updatedAt,
          }));
          if (mounted) {
            setProfile(defaultProfile);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'username'>>) => {
    if (!currentUser || !profile) return;

    try {
      const profileKey = `${PROFILE_KEY_PREFIX}${currentUser.uid}`;
      const updatedProfile = {
        ...profile,
        ...updates,
        updatedAt: Date.now(),
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(profileKey, JSON.stringify({
        username: updatedProfile.username,
        email: updatedProfile.email,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt,
      }));

      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const createProfile = async (user: User, username: string) => {
    try {
      const profileKey = `${PROFILE_KEY_PREFIX}${user.uid}`;
      const newProfile = {
        username,
        email: user.email || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(profileKey, JSON.stringify(newProfile));

      // Update local state if this is the current user
      if (user.uid === currentUser?.uid) {
        setProfile({
          uid: user.uid,
          ...newProfile,
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  };

  return (
    <UserProfileContext.Provider value={{ profile, loading, updateProfile, createProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

