import { useState, useEffect } from "react";
// 🟢 เปลี่ยนจาก '@/config/firebase' มาเป็นแบบเดินถอยหลังแทน
import { auth, db } from "../config/firebase"; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  User 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
// 🟢 เปลี่ยนจาก '@/types' มาเป็นแบบเดินถอยหลังแทน
import { UserProfile } from "../types"; 

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setProfile({ uid: currentUser.uid, ...userDocSnap.data() } as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      setLoading(false);
      console.error("Error signing out:", error);
    }
  };

  return { user, profile, loading, login, logout };
}