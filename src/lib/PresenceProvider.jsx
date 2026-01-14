import * as React from 'react';
import { supabase } from './supabaseClient';
import presenceModule, { startTeamPresence, stopTeamPresence, subscribeToTeam, fetchMyProfile } from './presence';

const PresenceContext = React.createContext({ onlineUsersByTeam: {} });

export function PresenceProvider({ children }) {
  const [onlineUsersByTeam, setOnlineUsersByTeam] = React.useState({});

  React.useEffect(() => {
    let mounted = true;
    const unsubscribers = [];
    let myTeamIds = [];

    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (!profile || !profile.teamId) return;
        myTeamIds = Array.isArray(profile.teamId) ? profile.teamId : [profile.teamId];

        for (const tid of myTeamIds) {
          try {
            await startTeamPresence(tid, { user_id: profile.employeeId, name: profile.name, role: profile.role });
          } catch (e) { console.warn('startTeamPresence error', e); }

          const unsub = subscribeToTeam(tid, (set) => {
            if (!mounted) return;
            setOnlineUsersByTeam(prev => ({ ...prev, [String(tid)]: Array.from(set) }));
          });
          unsubscribers.push(unsub);
        }
      } catch (e) {
        console.warn('PresenceProvider init failed', e);
      }
    })();

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // logout: stop all team presences and clear state
        (async () => {
          try { for (const t of myTeamIds) await stopTeamPresence(t); } catch (e) { /* ignore */ }
          if (mounted) setOnlineUsersByTeam({});
        })();
      }
    });

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
      unsubscribers.forEach(u => { try { u(); } catch {} });
      (async () => { for (const t of myTeamIds) { try { await stopTeamPresence(t); } catch {} } })();
    };
  }, []);

  return <PresenceContext.Provider value={{ onlineUsersByTeam }}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return React.useContext(PresenceContext);
}

export default PresenceProvider;
