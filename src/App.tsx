import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import KioskPage from './pages/KioskPage';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import { isConfigured, rpc, supabase } from './lib/supabase';
import { errorMessage } from './lib/format';
import type { KioskConfig, Profile } from './lib/types';

const CONFIG_KEY = 'gareng-kiosk';
function loadConfig(): KioskConfig | null {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null'); } catch { return null; }
}
function saveConfig(c: KioskConfig | null) {
  try { if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); else localStorage.removeItem(CONFIG_KEY); } catch { /* mode privat */ }
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [config, setConfig] = useState<KioskConfig | null>(loadConfig);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    setProfile(null);
    setProfileError('');
    if (!userId) return;
    // profil, peran, izin, dan outlet diambil dari SEMAR
    rpc<Profile | null>('sys_get_my_profile')
      .then((p) => { if (!p) setProfileError('Akun ini belum terdaftar di perusahaan SEMAR mana pun.'); setProfile(p); })
      .catch((e) => setProfileError(errorMessage(e)));
  }, [userId]);

  if (!isConfigured) {
    return (
      <div className="screen"><div className="panel">
        <h1><b>GARENG</b> · belum tersambung</h1>
        <p className="k-warn">URL dan anon key Supabase SEMAR belum diisi. Lihat README bagian "Menyambungkan ke SEMAR".</p>
      </div></div>
    );
  }
  if (session === undefined) return <div className="screen"><p className="k-muted">Memuat...</p></div>;
  if (!session) return <LoginPage />;
  if (!profile) {
    return (
      <div className="screen"><div className="panel">
        {profileError ? <p className="k-warn">{profileError}</p> : <p className="k-muted">Memuat profil SEMAR...</p>}
        <button className="k-ghost" onClick={() => supabase.auth.signOut()}>Keluar akun</button>
      </div></div>
    );
  }
  if (config && profile.outlets.some((o) => o.id === config.outletId)) {
    return <KioskPage profile={profile} config={config} onExit={() => { saveConfig(null); setConfig(null); }} />;
  }
  return <SetupPage profile={profile} onStart={(c) => { saveConfig(c); setConfig(c); }} />;
}
