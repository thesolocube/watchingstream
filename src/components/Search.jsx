import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Play, Plus, Check, Search as SearchIcon, Film, Users, Tv } from 'lucide-react';
import DetailsModal from './DetailsModal';

const API_KEY = '3a0745e2332be5b37c27df6763a4218b';
const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

export default function Search({ onPlay, user, triggerToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);

  // Detail Modal state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDetails, setMediaDetails] = useState(null);

  // Sync Favorites
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => doc.data().tmdbId));
    });
    return () => unsubscribe();
  }, [user]);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=fr-FR`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Search request failed: ${res.status}`);
        const data = await res.json();
        
        // Filter out items without poster path (except actors) to keep UI clean
        const filtered = (data.results || []).filter(item => 
          item.poster_path || item.profile_path || item.backdrop_path
        );
        setResults(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 600); // 600ms debounce

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [searchQuery]);

  const isFavorite = (tmdbId) => favorites.includes(tmdbId);

  const toggleFavorite = async (e, item) => {
    e.stopPropagation();
    if (!user) return;
    const docId = `${user.uid}_${item.id}`;
    const favDocRef = doc(db, 'favorites', docId);

    try {
      if (isFavorite(item.id)) {
        await deleteDoc(favDocRef);
        if (triggerToast) triggerToast('Retiré de Ma Liste', 'info');
      } else {
        const name = item.title || item.name || item.original_title || item.original_name;
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        await setDoc(favDocRef, {
          userId: user.uid,
          tmdbId: item.id,
          title: name,
          posterPath: item.poster_path || item.profile_path,
          mediaType: mediaType,
          addedAt: new Date()
        });
        if (triggerToast) triggerToast('Ajouté à Ma Liste !', 'success');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      if (triggerToast) triggerToast('Erreur lors de la modification des favoris.', 'info');
    }
  };

  const handleOpenDetails = async (item) => {
    if (item.media_type === 'person') return; // Do not open details for actors directly (they are displayed in grids)
    const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    
    try {
      const res = await fetch(`${BASE_URL}/${mediaType}/${item.id}?api_key=${API_KEY}&language=fr-FR`);
      const details = await res.json();
      setMediaDetails(details);
      setSelectedMedia(item);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 pb-24 min-h-screen bg-[#141414] text-white select-none">
      {/* Search Header */}
      <div className="max-w-4xl mx-auto space-y-6 mb-12">
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <SearchIcon className="h-8 w-8 text-[#E50914]" />
          Recherche Multi-critères
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher des films, des séries, des acteurs..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.trim().length < 2) {
                setResults([]);
              }
            }}
            className="w-full bg-zinc-900 border-2 border-zinc-800 focus:border-[#E50914] text-white rounded-xl pl-14 pr-6 py-4 outline-none text-lg transition duration-300"
            autoFocus
          />
          <SearchIcon className="absolute left-5 top-5 h-6 w-6 text-zinc-400" />
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-10 w-10 text-[#E50914]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Search Results Grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((item) => {
            const name = item.title || item.name || item.original_title || item.original_name;
            const isActor = item.media_type === 'person';
            
            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetails(item)}
                className="bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-xl hover:shadow-[#e509141a] transition duration-300 relative group/card"
              >
                <img
                  src={`${POSTER_URL}${item.poster_path || item.profile_path}`}
                  alt={name}
                  className="w-full h-[270px] object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/180x270/141414/ffffff?text=Image+Non+Disponible";
                  }}
                />
                
                {/* Overlay details */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                  <p className="text-sm font-bold text-white leading-tight">{name}</p>
                  
                  {/* Badges based on type */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {isActor ? (
                      <span className="flex items-center gap-1 bg-teal-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                        <Users className="h-3 w-3" />
                        Acteur
                      </span>
                    ) : item.media_type === 'tv' ? (
                      <span className="flex items-center gap-1 bg-[#E50914] text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                        <Tv className="h-3 w-3" />
                        Série
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-zinc-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                        <Film className="h-3 w-3" />
                        Film
                      </span>
                    )}
                  </div>

                  {/* Actions (Only if not actor) */}
                  {!isActor && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay({
                            type: item.media_type,
                            tmdbId: item.id,
                            title: name,
                            posterPath: item.poster_path,
                            season: item.media_type === 'tv' ? 1 : null,
                            episode: item.media_type === 'tv' ? 1 : null
                          });
                        }}
                        className="p-1.5 bg-[#E50914] rounded-full text-white hover:bg-red-700 transition"
                      >
                        <Play className="h-4 w-4 fill-white" />
                      </button>
                      <button
                        onClick={(e) => toggleFavorite(e, item)}
                        className="p-1.5 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
                      >
                        {isFavorite(item.id) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results placeholder */}
      {!loading && searchQuery.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Film className="h-16 w-16 mx-auto mb-4 stroke-1" />
          <p className="text-lg font-bold">Aucun résultat pour "{searchQuery}"</p>
          <p className="text-sm mt-1">Vérifiez l'orthographe ou essayez d'autres mots-clés.</p>
        </div>
      )}

      {/* Initial state placeholder */}
      {searchQuery.trim().length < 2 && (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
          <SearchIcon className="h-16 w-16 mb-4 stroke-1 animate-pulse" />
          <p className="text-lg font-semibold">Entrez un titre de film, série ou un nom d'acteur</p>
        </div>
      )}

      {/* 3. DETAILS MODAL */}
      <DetailsModal
        key={mediaDetails?.id || selectedMedia?.id || selectedMedia?.tmdbId}
        selectedMedia={selectedMedia}
        mediaDetails={mediaDetails}
        onClose={() => {
          setSelectedMedia(null);
          setMediaDetails(null);
        }}
        onPlay={onPlay}
        isFavorite={selectedMedia && mediaDetails ? isFavorite(mediaDetails.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
