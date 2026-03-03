import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { onAuthStateChanged, type User, logout } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  mobile: string | null;
  gender: string | null;
  occupation: string | null;
  city: string | null;
  state: string | null;
  authProvider: string;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  adminLevel: number | null; // null = not admin; 1/2/3 = admin level
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
  isProfileComplete: false,
  adminLevel: null,
  getIdToken: async () => null,
  refreshProfile: async () => {},
});

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminLevel, setAdminLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const { toast } = useToast();

  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();

      // Check admin status — runs in parallel with profile sync, doesn't block it
      fetch('/api/admin/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => setAdminLevel(data ? data.level : null))
        .catch(() => setAdminLevel(null));

      // Always sync user profile (admins are also users — they have a profile too)
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to sync user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh profile:', error);
    }
  };

  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();
    localStorage.setItem('lastActivityTime', lastActivityRef.current.toString());

    // Only set timer if user is authenticated
    if (user) {
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await logout();
          toast({
            title: "Session Expired",
            description: "You have been logged out due to 30 minutes of inactivity.",
            variant: "destructive",
          });
        } catch (error) {
          console.error("Error during auto-logout:", error);
        }
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check for activity in other tabs (using localStorage)
    const checkActivity = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivityTime');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceActivity >= INACTIVITY_TIMEOUT && user) {
          logout().then(() => {
            toast({
              title: "Session Expired",
              description: "You have been logged out due to 30 minutes of inactivity.",
              variant: "destructive",
            });
          });
        }
      }
    }, 60000); // Check every minute

    // Initial timer setup
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      setUser(firebaseUser);

      if (firebaseUser) {
        resetInactivityTimer();
        await syncUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
        setAdminLevel(null);
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        localStorage.removeItem('lastActivityTime');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    isProfileComplete: userProfile?.isProfileComplete ?? false,
    adminLevel,
    getIdToken,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
