import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '../FirebaseConfig';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        const profileRef = doc(db, 'users', currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (mounted) {
            setProfile({
              uid: currentUser.uid,
              username: data.username || '',
              email: data.email || currentUser.email || '',
              createdAt: data.createdAt?.toMillis() || Date.now(),
              updatedAt: data.updatedAt?.toMillis() || Date.now(),
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
          await setDoc(profileRef, {
            username: defaultProfile.username,
            email: defaultProfile.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
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
      const profileRef = doc(db, 'users', currentUser.uid);
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setProfile({
        ...profile,
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const createProfile = async (user: User, username: string) => {
    try {
      const profileRef = doc(db, 'users', user.uid);
      await setDoc(profileRef, {
        username,
        email: user.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local state if this is the current user
      if (user.uid === currentUser?.uid) {
        setProfile({
          uid: user.uid,
          username,
          email: user.email || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
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

