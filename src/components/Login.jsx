import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { Film } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Identifiants incorrects.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Cet e-mail est déjà utilisé.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la connexion démo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center select-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url("https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-b8e0-f90706d176a9/12478906-1111-4045-8111-905479634e06/FR-fr-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg")'
      }}
    >
      {/* Top Bar Logo */}
      <div className="absolute top-0 left-0 p-8 flex items-center gap-2">
        <Film className="h-8 w-8 text-[#E50914] fill-[#E50914]" />
        <span className="text-2xl font-bold tracking-wider text-[#E50914] font-serif">TAFARAJ M3A ATLAS</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[450px] bg-black bg-opacity-75 p-16 rounded-md shadow-2xl text-white">
        <h2 className="text-3xl font-bold mb-8">{isSignUp ? "S'inscrire" : "Se connecter"}</h2>
        
        {error && (
          <div className="bg-[#e87c03] text-sm text-white rounded p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="email"
            aria-label="Adresse e-mail"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 bg-[#333] rounded px-5 outline-none text-white focus:bg-[#444] transition-colors border-b-2 border-transparent focus:border-[#E50914]"
            disabled={loading}
          />
          <input
            type="password"
            aria-label="Mot de passe"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 bg-[#333] rounded px-5 outline-none text-white focus:bg-[#444] transition-colors border-b-2 border-transparent focus:border-[#E50914]"
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#E50914] text-white font-bold rounded mt-6 hover:bg-[#b80710] active:scale-95 transition-all flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              isSignUp ? "S'inscrire" : "Se connecter"
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4 text-xs text-[#b3b3b3]">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" className="accent-[#737373]" />
            Se souvenir de moi
          </label>
          <span className="hover:underline cursor-pointer">Besoin d'aide ?</span>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full h-10 border border-[#b3b3b3] hover:border-white text-white font-semibold rounded mt-8 text-sm transition-all hover:bg-white hover:bg-opacity-10 active:scale-95"
        >
          Se connecter sans compte (Mode Démo)
        </button>

        <div className="mt-10 text-[#737373] text-sm">
          <span>{isSignUp ? "Déjà membre ?" : "Nouveau sur tafaraj m3a atlas ?"} </span>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-white hover:underline font-medium"
          >
            {isSignUp ? "Se connecter maintenant" : "S'inscrire maintenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
