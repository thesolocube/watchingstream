import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Play, Trash2, List, Film, Tv } from 'lucide-react';
import DetailsModal from './DetailsModal';

const API_KEY = '3a0745e2332be5b37c27df6763a4218b';
const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

export default function MyList({ onPlay, user, triggerToast }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDetails, setMediaDetails] = useState(null);

  useEffect(() => {
    if (!user) return;

    const favQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(favQuery, (snapshot) => {
      const favList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFavorites(favList);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeFavorite = async (e, favItem) => {
    e.stopPropagation();
    if (!user) return;
    const docId = `${user.uid}_${favItem.tmdbId}`;
    try {
      await deleteDoc(doc(db, 'favorites', docId));
      if (triggerToast) triggerToast('Retiré de Ma Liste', 'info');
      if (selectedMedia && (selectedMedia.tmdbId === favItem.tmdbId)) {
        // If details modal of this item is open, sync state
        setSelectedMedia(null);
        setMediaDetails(null);
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const handleOpenDetails = async (item) => {
    const mediaType = item.mediaType || (item.first_air_date ? 'tv' : 'movie');
    const tmdbId = item.tmdbId;

    try {
      const res = await fetch(`${BASE_URL}/${mediaType}/${tmdbId}?api_key=${API_KEY}&language=fr-FR`);
      const details = await res.json();
      setMediaDetails(details);
      setSelectedMedia(item);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 pb-24 min-h-screen bg-[#141414] text-white select-none">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <List className="h-8 w-8 text-[#E50914]" />
          Ma Liste (Favoris)
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Retrouvez tous vos films et séries enregistrés en un clin d'œil.
        </p>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-10 w-10 text-[#E50914]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Favorites list */}
      {!loading && favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
          <List className="h-16 w-16 mb-4 stroke-1 animate-pulse" />
          <p className="text-lg font-bold">Votre liste est vide</p>
          <p className="text-sm mt-1">Ajoutez des films et des séries depuis l'accueil pour les retrouver ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {favorites.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenDetails(item)}
              className="bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-xl hover:shadow-[#e509141f] transition duration-300 relative group/card"
            >
              <img
                src={`${POSTER_URL}${item.posterPath}`}
                alt={item.title}
                className="w-full h-[270px] object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/180x270/141414/ffffff?text=Image+Non+Disponible";
                }}
              />
              
              {/* Overlay with options */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                <p className="text-sm font-bold text-white leading-tight truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  {item.mediaType === 'tv' ? (
                    <span className="flex items-center gap-1 bg-[#E50914] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                      <Tv className="h-2.5 w-2.5" />
                      Série
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                      <Film className="h-2.5 w-2.5" />
                      Film
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay({
                        type: item.mediaType,
                        tmdbId: item.tmdbId,
                        title: item.title,
                        posterPath: item.posterPath,
                        season: item.mediaType === 'tv' ? 1 : null,
                        episode: item.mediaType === 'tv' ? 1 : null
                      });
                    }}
                    className="p-2 bg-[#E50914] rounded-full text-white hover:bg-red-700 transition"
                  >
                    <Play className="h-4 w-4 fill-white" />
                  </button>
                  <button
                    onClick={(e) => removeFavorite(e, item)}
                    className="p-2 bg-zinc-800 rounded-full text-red-500 hover:bg-red-650/20 transition hover:border hover:border-red-500/30"
                    title="Retirer des favoris"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS MODAL */}
      <DetailsModal
        key={mediaDetails?.id || selectedMedia?.id || selectedMedia?.tmdbId}
        selectedMedia={selectedMedia}
        mediaDetails={mediaDetails}
        onClose={() => {
          setSelectedMedia(null);
          setMediaDetails(null);
        }}
        onPlay={onPlay}
        isFavorite={true}
        onToggleFavorite={(e, item) => removeFavorite(e, selectedMedia || item)}
      />
    </div>
  );
}
