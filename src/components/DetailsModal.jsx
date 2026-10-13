import { useEffect, useState } from 'react';
import { Play, Plus, Check, X } from 'lucide-react';

const API_KEY = '3a0745e2332be5b37c27df6763a4218b';
const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

export default function DetailsModal({ selectedMedia, mediaDetails, onClose, onPlay, isFavorite, onToggleFavorite }) {
  const mediaType = selectedMedia?.mediaType || selectedMedia?.media_type || (mediaDetails?.first_air_date ? 'tv' : 'movie');
  const tmdbId = mediaDetails?.id || selectedMedia?.id || selectedMedia?.tmdbId;

  const seasons = mediaDetails?.seasons || [];
  const firstSeasonNum = seasons.length > 0 ? seasons[0].season_number : 1;

  const [selectedSeason, setSelectedSeason] = useState(firstSeasonNum);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (mediaType !== 'tv' || !tmdbId) return;

    const fetchEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const res = await fetch(`${BASE_URL}/tv/${tmdbId}/season/${selectedSeason}?api_key=${API_KEY}&language=fr-FR`);
        const data = await res.json();
        setEpisodes(data.episodes || []);
      } catch (err) {
        console.error('Error fetching episodes:', err);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [mediaType, tmdbId, selectedSeason]);

  const handleSeasonChange = (e) => {
    setSelectedSeason(parseInt(e.target.value));
  };

  if (!selectedMedia || !mediaDetails) return null;

  const title = mediaDetails.title || mediaDetails.name || selectedMedia.title || selectedMedia.name;
  const ratingPercent = Math.round(mediaDetails.vote_average * 10);
  const releaseYear = (mediaDetails.release_date || mediaDetails.first_air_date || '').substring(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 rounded-xl max-w-4xl w-full border border-zinc-800 shadow-2xl overflow-hidden relative max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center font-bold text-lg border border-zinc-700 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Banner of details */}
        <div 
          className="relative h-[40vh] bg-cover bg-center flex items-end animate-fade-in"
          style={{ backgroundImage: `url(${BACKDROP_URL}${mediaDetails.backdrop_path})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="p-8 relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg">
              {title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Meta details */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-zinc-400 items-center">
                {ratingPercent > 0 && (
                  <span className="text-green-500 font-bold">
                    {ratingPercent}% Recommandé
                  </span>
                )}
                {releaseYear && <span>{releaseYear}</span>}
                {mediaDetails.runtime && <span>{mediaDetails.runtime} min</span>}
                {mediaDetails.number_of_seasons && <span>{mediaDetails.number_of_seasons} Saisons</span>}
                <span className="border border-zinc-700 px-1.5 py-0.5 rounded text-[10px]">HD</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {mediaDetails.overview || "Aucun résumé disponible."}
              </p>
            </div>

            {/* Right col: play/favorites */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  onPlay({
                    type: mediaType,
                    tmdbId: tmdbId,
                    title: title,
                    posterPath: mediaDetails.poster_path || selectedMedia.posterPath || selectedMedia.poster_path,
                    season: mediaType === 'tv' ? selectedSeason : null,
                    episode: mediaType === 'tv' ? 1 : null
                  });
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#E50914] text-white font-bold rounded-lg hover:bg-red-700 transition"
              >
                <Play className="h-5 w-5 fill-white" />
                Lecture immédiate
              </button>

              <button
                onClick={(e) => onToggleFavorite(e, mediaDetails)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition"
              >
                {isFavorite ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    Dans Ma Liste
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Ajouter à Ma Liste
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Season Selection and Episodes if TV Show */}
          {mediaType === 'tv' && (
            <div className="space-y-4 border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Épisodes</h3>
                <select
                  value={selectedSeason}
                  onChange={handleSeasonChange}
                  className="bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-1.5 text-sm outline-none focus:border-red-600 transition"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.name || `Saison ${s.season_number}`}
                    </option>
                  ))}
                </select>
              </div>

              {loadingEpisodes ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin h-8 w-8 text-[#E50914]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => {
                        onPlay({
                          type: 'tv',
                          tmdbId: tmdbId,
                          title: `${title} : ${ep.name}`,
                          posterPath: mediaDetails.poster_path || selectedMedia.posterPath || selectedMedia.poster_path,
                          season: selectedSeason,
                          episode: ep.episode_number
                        });
                        onClose();
                      }}
                      className="flex gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-850 cursor-pointer border border-transparent hover:border-zinc-700 transition group/ep"
                    >
                      <div className="flex-none w-[120px] h-[68px] relative bg-zinc-800 rounded overflow-hidden">
                        <img
                          src={ep.still_path ? `${POSTER_URL}${ep.still_path}` : `${POSTER_URL}${mediaDetails.poster_path || selectedMedia.posterPath}`}
                          alt={ep.name}
                          className="w-full h-full object-cover group-hover/ep:scale-105 transition duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/120x68/141414/ffffff?text=Episode";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition">
                          <Play className="h-6 w-6 text-white fill-white bg-[#E50914] rounded-full p-1" />
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 text-zinc-400 rounded">
                          Ep {ep.episode_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover/ep:text-[#E50914] transition">
                          {ep.episode_number}. {ep.name}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {ep.overview || "Aucun résumé disponible pour cet épisode."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
