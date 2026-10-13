import { useState, type FormEvent } from 'react';
import Orb from '../components/Orb';
import { supabase, toLoginEmail } from '../lib/supabase';
import { errorMessage } from '../lib/format';

/** Login staf dengan akun SEMAR yang sama (email owner atau username staf) */
export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(login), password });
      if (error) throw error;
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg === 'Invalid login credentials' ? 'Email/username atau password salah' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <form className="panel" onSubmit={submit}>
        <Orb state={busy ? 'think' : 'idle'} className="panel-orb" />
        <h1><b>GARENG</b> · SEMAR AI Cashier</h1>
        <p className="k-muted">Masuk dengan akun SEMAR untuk mengaktifkan kiosk di outlet.</p>
        {error && <div className="k-error static">{error}</div>}
        <label className="k-field">
          <span>Email atau username</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} required autoComplete="username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="email@usaha.com atau andi.pluit" />
        </label>
        <label className="k-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="k-primary" disabled={busy}>{busy ? 'Masuk...' : 'Masuk'}</button>
      </form>
    </div>
  );
}
