import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Play, Plus, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import DetailsModal from './DetailsModal';

const API_KEY = '3a0745e2332be5b37c27df6763a4218b';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';

export default function Home({ onPlay, user, triggerToast }) {
  const [heroMovie, setHeroMovie] = useState(null);
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [animationMovies, setAnimationMovies] = useState([]);
  const [documentaryMovies, setDocumentaryMovies] = useState([]);
  const [dramaMovies, setDramaMovies] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  // Platform Providers state
  const [netflixContent, setNetflixContent] = useState([]);
  const [primeContent, setPrimeContent] = useState([]);
  const [disneyContent, setDisneyContent] = useState([]);
  
  // Firebase collections state
  const [favorites, setFavorites] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  
  // Details Modal state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDetails, setMediaDetails] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    // Fetch all independent catalog sections in parallel so the home screen
    // becomes usable without waiting for a long chain of requests.
    const fetchTMDB = async () => {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const fetchJson = async (url) => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
          return response.json();
        };

        const requests = [
          fetchJson(`${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=fr-FR`),
          fetchJson(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=fr-FR`),
          fetchJson(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=35&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_watch_providers=8&watch_region=FR&language=fr-FR&sort_by=popularity.desc`),
          fetchJson(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_watch_providers=119&watch_region=FR&language=fr-FR&sort_by=popularity.desc`),
          fetchJson(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_watch_providers=337&watch_region=FR&language=fr-FR&sort_by=popularity.desc`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=878&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=27&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=53&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=10749&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=16&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=99&language=fr-FR`),
          fetchJson(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=18&language=fr-FR`)
        ];
        const [
          dataTrend, dataPopMovie, dataPopTV, dataAction, dataComedy,
          dataNetflix, dataPrime, dataDisney, dataSciFi, dataHorror,
          dataThriller, dataRomance, dataAnimation, dataDoc, dataDrama
        ] = await Promise.all(requests);

        setTrending(dataTrend.results || []);
        if (dataTrend.results && dataTrend.results.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(10, dataTrend.results.length));
          setHeroMovie(dataTrend.results[randomIndex]);
        }
        setPopularMovies(dataPopMovie.results || []);
        setPopularTV(dataPopTV.results || []);
        setActionMovies(dataAction.results || []);
        setComedyMovies(dataComedy.results || []);
        setNetflixContent(dataNetflix.results || []);
        setPrimeContent(dataPrime.results || []);
        setDisneyContent(dataDisney.results || []);
        setSciFiMovies(dataSciFi.results || []);
        setHorrorMovies(dataHorror.results || []);
        setThrillerMovies(dataThriller.results || []);
        setRomanceMovies(dataRomance.results || []);
        setAnimationMovies(dataAnimation.results || []);
        setDocumentaryMovies(dataDoc.results || []);
        setDramaMovies(dataDrama.results || []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching TMDB data:', err);
          setCatalogError('Le catalogue est temporairement indisponible.');
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    };

    fetchTMDB();
    return () => controller.abort();
  }, []);

  // 2. Real-time Firebase Subscriptions
  useEffect(() => {
    if (!user) return;

    // Favorites
    const favQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribeFav = onSnapshot(favQuery, (snapshot) => {
      const favList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFavorites(favList);
    });

    // Continue Watching (Progress)
    const progQuery = query(collection(db, 'progress'), where('userId', '==', user.uid));
    const unsubscribeProg = onSnapshot(progQuery, (snapshot) => {
      const progList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)); // Sort by most recent
      setContinueWatching(progList);
    });

    return () => {
      unsubscribeFav();
      unsubscribeProg();
    };
  }, [user]);

  // Check if item is in favorites list
  const isFavorite = (tmdbId) => {
    return favorites.some(fav => fav.tmdbId === tmdbId);
  };

  // Toggle favorite in Firestore
  const toggleFavorite = async (e, item) => {
    e.stopPropagation();
    if (!user) return;
    const docId = `${user.uid}_${item.id || item.tmdbId}`;
    const favDocRef = doc(db, 'favorites', docId);

    try {
      if (isFavorite(item.id || item.tmdbId)) {
        await deleteDoc(favDocRef);
        if (triggerToast) triggerToast('Retiré de Ma Liste', 'info');
      } else {
        const name = item.title || item.name || item.original_title || item.original_name;
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        await setDoc(favDocRef, {
          userId: user.uid,
          tmdbId: item.id || item.tmdbId,
          title: name,
          posterPath: item.poster_path || item.posterPath,
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

  // Fetch detailed media metadata (seasons, etc.) for modal
  const handleOpenDetails = async (item) => {
    const mediaType = item.mediaType || item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const id = item.id || item.tmdbId;

    try {
      const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=fr-FR`);
      const details = await res.json();
      setMediaDetails(details);
      setSelectedMedia(item);
    } catch (err) {
      console.error(err);
    }
  };

  // MovieRow has been moved outside the Home component to comply with React standards

  return (
    <div className="pb-20 select-none">
      {catalogLoading && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-[#E50914]" />
            <span className="text-sm font-semibold">Chargement du catalogue...</span>
          </div>
        </div>
      )}
      {catalogError && !catalogLoading && (
        <div className="mx-6 mt-6 rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-center">
          <p className="font-semibold text-red-200">{catalogError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-[#E50914] px-4 py-2 text-sm font-bold hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      )}
      {/* 1. HERO BANNER */}
      {!catalogLoading && heroMovie && (
        <div 
          className="relative h-[65vh] w-full bg-cover bg-center flex items-end"
          style={{
            backgroundImage: `url(${IMAGE_URL}${heroMovie.backdrop_path})`
          }}
        >
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 banner-overlay" />

          {/* Content */}
          <div className="relative z-10 max-w-2xl px-12 pb-16 space-y-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight font-sans drop-shadow-md">
              {heroMovie.title || heroMovie.name || heroMovie.original_title || heroMovie.original_name}
            </h1>
            <p className="text-sm md:text-base text-zinc-300 line-clamp-3 leading-relaxed drop-shadow">
              {heroMovie.overview || "Aucune description disponible pour le moment."}
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => {
                  const name = heroMovie.title || heroMovie.name || heroMovie.original_title || heroMovie.original_name;
                  const mediaType = heroMovie.media_type || (heroMovie.first_air_date ? 'tv' : 'movie');
                  onPlay({
                    type: mediaType,
                    tmdbId: heroMovie.id,
                    title: name,
                    posterPath: heroMovie.poster_path,
                    season: mediaType === 'tv' ? 1 : null,
                    episode: mediaType === 'tv' ? 1 : null
                  });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded hover:bg-zinc-200 active:scale-95 transition-all text-sm shadow-lg"
              >
                <Play className="h-5 w-5 fill-black" />
                Lecture
              </button>
              <button
                onClick={() => handleOpenDetails(heroMovie)}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-700/60 text-white font-bold rounded hover:bg-zinc-700/80 active:scale-95 transition-all text-sm backdrop-blur"
              >
                <Info className="h-5 w-5" />
                Plus d'infos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATEGORIES ROWS */}
      {!catalogLoading && <div className="space-y-8 mt-6">
        {/* Continue Watching Row */}
        {continueWatching.length > 0 && (
          <div className="space-y-2 relative group px-12 select-none">
            <h2 className="text-xl font-bold text-white hover:text-red-500 cursor-pointer transition-colors duration-200">
              Reprendre la lecture
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2">
              {continueWatching.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onPlay({
                      type: item.mediaType,
                      tmdbId: item.tmdbId,
                      title: item.title,
                      posterPath: item.posterPath,
                      season: item.season,
                      episode: item.episode,
                      progressTime: item.progressTime
                    });
                  }}
                  className="flex-none w-[220px] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 hover:border-red-600 transition-all duration-300 group/watch"
                >
                  <div className="relative h-[124px]">
                    <img
                      src={`${IMAGE_URL}${item.posterPath}`} // We can use the backdrop or poster, let's use the image
                      alt={item.title}
                      className="w-full h-full object-cover group-hover/watch:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/220x124/141414/ffffff?text=Image+Non+Disponible";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/watch:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white fill-white bg-red-600 rounded-full p-2" />
                    </div>
                    {/* Progress Bar */}
                    {item.duration > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700">
                        <div 
                          className="h-full bg-red-600" 
                          style={{ width: `${Math.min(100, (item.progressTime / item.duration) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-zinc-950">
                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {item.mediaType === 'tv' ? `S${item.season} Ep${item.episode}` : 'Film'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Content Rows */}
        <MovieRow title="Tendances Actuelles" items={trending} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Les Succès Netflix" items={netflixContent} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="À l'affiche sur Prime Video" items={primeContent} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Les Incontournables Disney+" items={disneyContent} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Films Populaires" items={popularMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Séries à Succès" items={popularTV} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Action et Aventure" items={actionMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Comédies" items={comedyMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Science-Fiction" items={sciFiMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Films d'Horreur" items={horrorMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Thrillers" items={thrillerMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Romances" items={romanceMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Animation" items={animationMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Documentaires" items={documentaryMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
        <MovieRow title="Drames" items={dramaMovies} handleOpenDetails={handleOpenDetails} onPlay={onPlay} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
      </div>}

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
        isFavorite={selectedMedia && (selectedMedia.id || selectedMedia.tmdbId) ? isFavorite(selectedMedia.id || selectedMedia.tmdbId) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}

// Extracted MovieRow component declared outside of Home render to avoid re-creation issues
function MovieRow({ title, items, handleOpenDetails, onPlay, isFavorite, toggleFavorite }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2 relative group px-12 select-none">
      <h2 className="text-xl font-bold text-white hover:text-red-500 cursor-pointer transition-colors duration-200">
        {title}
      </h2>
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 w-10 bg-black/50 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-r"
          type="button"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        {/* Scroll container */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2"
        >
          {items.map((item) => {
            const name = item.title || item.name || item.original_title || item.original_name;
            return (
              <div
                key={item.id || item.tmdbId}
                onClick={() => handleOpenDetails(item)}
                className="flex-none w-[180px] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transform hover:scale-110 hover:shadow-xl hover:shadow-[#e509142f] transition-all duration-300 relative group/card"
              >
                <img
                  src={`${POSTER_URL}${item.poster_path || item.posterPath}`}
                  alt={name}
                  className="w-full h-[270px] object-cover rounded-t-lg"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/180x270/141414/ffffff?text=Image+Non+Disponible";
                  }}
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs font-bold text-white line-clamp-1">{name}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                        onPlay({
                          type: mediaType,
                          tmdbId: item.id || item.tmdbId,
                          title: name,
                          posterPath: item.poster_path || item.posterPath,
                          season: mediaType === 'tv' ? 1 : null,
                          episode: mediaType === 'tv' ? 1 : null
                        });
                      }}
                      className="p-1 bg-[#E50914] rounded-full text-white hover:bg-red-700 transition"
                      type="button"
                    >
                      <Play className="h-4 w-4 fill-white" />
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(e, item)}
                      className="p-1 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
                      type="button"
                    >
                      {isFavorite(item.id || item.tmdbId) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 w-10 bg-black/50 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-l"
          type="button"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
