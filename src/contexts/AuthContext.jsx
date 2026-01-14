import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (currentUser) {
          setUser(currentUser);

          // try to load permissions for existing session
          const { data: userAccess } = await supabase
            .from("user_permissions_view")
            .select("permission_name")
            .eq("user_id", currentUser.id);

          const perms = userAccess ? [...new Set(userAccess.map((i) => i.permission_name))] : [];
          setPermissions(perms);
        }
        // done initializing
        setIsLoading(false);
      } catch (e) {
        // ignore errors during restore
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    user,
    setUser,
    permissions,
    setPermissions,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
