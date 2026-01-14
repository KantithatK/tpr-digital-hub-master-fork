import { supabase } from './supabaseClient';

type PresencePayload = {
  user_id?: string;
  name?: string;
  role?: string;
  team_id?: string | number;
  at?: string;
};

const channels = new Map(); // teamId -> channel
const onlineByTeam = new Map(); // teamId -> Set(user_id)
const subscribers = new Map(); // teamId -> Set(callback)

function normalizeUserId(v: any) {
  if (!v && v !== 0) return null;
  return String(v);
}

function notifySubscribers(teamId: string | number) {
  const s = onlineByTeam.get(String(teamId)) || new Set();
  const subs = subscribers.get(String(teamId)) || new Set();

  for (const cb of subs) {
    try {
      cb(new Set(s));
    } catch (e) {
      console.warn('⚠️ [Presence] subscriber error', e);
    }
  }
}

function updateFromChannelState(teamId: string | number, channel: any) {
  try {
    const state = channel.presenceState ? channel.presenceState() : {};
    const set = new Set<string>();

    Object.values(state || {}).forEach((val: any) => {
      if (Array.isArray(val)) {
        val.forEach((m: any) => {
          const id = normalizeUserId(m?.user_id || m?.userId || m?.id);
          if (id) set.add(id);
        });
      } else if (val && typeof val === 'object') {
        const id = normalizeUserId(val?.user_id || val?.userId || val?.id);
        if (id) set.add(id);
      }
    });

    onlineByTeam.set(String(teamId), set);
    notifySubscribers(teamId);
  } catch (e) {
    console.warn('❌ [Presence] updateFromChannelState ล้มเหลว', e);
  }
}

export async function startTeamPresence(teamId: string | number, payload: PresencePayload) {
  if (!teamId) {
    return null;
  }

  const key =
    normalizeUserId(payload?.user_id || payload?.team_id || Math.random()) ?? undefined;

  const name = String(teamId);

  if (channels.has(name)) {
    return channels.get(name);
  }

  

  const channel = supabase.channel(`presence:team:${name}`, {
    config: { presence: { key } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    updateFromChannelState(name, channel);
  });

  channel.on('presence', { event: 'join' }, () => {
    updateFromChannelState(name, channel);
  });

  channel.on('presence', { event: 'leave' }, () => {
    updateFromChannelState(name, channel);
  });

  channel.on('system', { event: 'SUBSCRIBED' }, async () => {
    try {
      const pay = {
        user_id: normalizeUserId(payload?.user_id) ?? undefined,
        name: payload?.name || null,
        role: payload?.role || null,
        team_id: name,
        at: new Date().toISOString(),
      };

      await channel.track(pay);
      updateFromChannelState(name, channel);
    } catch (e) {
      console.warn('❌ [Presence] track ล้มเหลว', e);
    }
  });

  try {
    await channel.subscribe();
    channels.set(name, channel);
    return channel;
  } catch (e) {
    console.warn('❌ [Presence] subscribe ล้มเหลว', e);
    return channel;
  }
}

export async function stopTeamPresence(teamId: string | number) {
  const name = String(teamId);
  const channel = channels.get(name);

  if (!channel) return;

  try {
    try {
      await channel.untrack();
    } catch {}

    await supabase.removeChannel(channel);
  } catch (e) {
    console.warn('❌ [Presence] removeChannel ล้มเหลว', e);
  }

  channels.delete(name);
  onlineByTeam.delete(name);
  notifySubscribers(name);
}

export function subscribeToTeam(teamId: string | number, cb: (onlineIds: Set<string>) => void) {
  const name = String(teamId);

  if (!subscribers.has(name)) subscribers.set(name, new Set());

  subscribers.get(name)!.add(cb);

  const existing = onlineByTeam.get(name) || new Set();
  cb(new Set(existing));

  return () => {
    subscribers.get(name)?.delete(cb);
  };
}

export function getOnlineUserIds(teamId: string | number) {
  return new Set(onlineByTeam.get(String(teamId)) || []);
}

export async function fetchMyProfile() {
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    const email = session?.user?.email?.toLowerCase().trim();

    if (!email) return null;

    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en, position_id, position')
      .or(`current_address_email_1.ilike.${email},current_address_email_2.ilike.${email},current_address_email_3.ilike.${email}`)
      .limit(1);
    if (error || !data || data.length === 0) return null;

    const me = data[0];
    let teamId = null;

    if (me.position_id) {
      const { data: tps } = await supabase
        .from('tpr_project_team_positions')
        .select('team_id')
        .eq('position_id', me.position_id)
        .limit(1);

      if (tps?.length) teamId = tps[0].team_id;
    }

    const name =
      [me.first_name_th, me.last_name_th].filter(Boolean).join(' ') ||
      [me.first_name_en, me.last_name_en].filter(Boolean).join(' ') ||
      me.nickname_th ||
      me.nickname_en ||
      String(me.id);

    return { teamId, name, role: me.position || null, employeeId: String(me.id) };
  } catch (e) {
    console.warn('❌ [Presence] fetchMyProfile ล้มเหลว', e);
    return null;
  }
}

export default {
  startTeamPresence,
  stopTeamPresence,
  subscribeToTeam,
  getOnlineUserIds,
  fetchMyProfile,
};
