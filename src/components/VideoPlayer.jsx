import { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ArrowLeft, SkipForward, Maximize, Minimize, Keyboard, AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function VideoPlayer({ data, onClose, user }) {
  const { type, tmdbId, title, posterPath, season: initialSeason, episode: initialEpisode, progressTime: initialProgress } = data;
  
  const [season, setSeason] = useState(initialSeason || 1);
  const [episode, setEpisode] = useState(initialEpisode || 1);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [initialResume, setInitialResume] = useState(initialProgress || 0);

  // Advanced overlays
  const [showControlsTip, setShowControlsTip] = useState(true);
  const [countdown, setCountdown] = useState(null); // countdown seconds (e.g. 10)
  const [streamError, setStreamError] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const latestProgressRef = useRef(initialProgress || 0);
  const latestDurationRef = useRef(type === 'tv' ? 2700 : 7200);

  // Screen controls
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Save progress to Firestore (useCallback)
  const saveProgressToFirestore = useCallback(async (currentTimeSec, totalDurationSec) => {
    if (!user) return;
    const docId = `${user.uid}_${tmdbId}`;
    const progressDocRef = doc(db, 'progress', docId);

    try {
      await setDoc(progressDocRef, {
        userId: user.uid,
        tmdbId: tmdbId,
        mediaType: type,
        title: title,
        posterPath: posterPath,
        season: type === 'tv' ? season : null,
        episode: type === 'tv' ? episode : null,
        progressTime: Math.round(currentTimeSec),
        duration: Math.round(totalDurationSec),
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error saving progress to Firestore:', err);
    }
  }, [user, tmdbId, type, title, posterPath, season, episode]);

  // 2. Handle next episode (useCallback)
  const handleNextEpisode = useCallback(() => {
    const nextEp = episode + 1;
    setEpisode(nextEp);
    latestProgressRef.current = 0;
    setInitialResume(0); // Reset resume for new episode
    saveProgressToFirestore(0, latestDurationRef.current);
    setCountdown(null);
  }, [episode, saveProgressToFirestore]);

  // 3. Handle auto-advance with Netflix countdown
  const startNextEpisodeCountdown = useCallback(() => {
    setCountdown(10);
  }, []);

  const cancelCountdown = () => {
    setCountdown(null);
  };

  // 4. Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error enabling fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Fullscreen hooks
  useEffect(() => {
    const enterFullscreenOnLoad = setTimeout(() => {
      if (containerRef.current && !document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      }
    }, 1000);

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);

    // Hide controls tip after 3 seconds
    const tipTimer = setTimeout(() => {
      setShowControlsTip(false);
    }, 3500);

    return () => {
      clearTimeout(enterFullscreenOnLoad);
      clearTimeout(tipTimer);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // 5. Load initial progress from Firestore
  useEffect(() => {
    const loadProgress = async () => {
      if (!user) {
        setIsProgressLoaded(true);
        return;
      }
      const docId = `${user.uid}_${tmdbId}`;
      const progressDocRef = doc(db, 'progress', docId);
      
      try {
        const snap = await getDoc(progressDocRef);
        if (snap.exists()) {
          const snapData = snap.data();
          if (snapData.progressTime) {
            latestProgressRef.current = snapData.progressTime;
            setInitialResume(snapData.progressTime); // Sync initial resume point
            if (snapData.season) setSeason(snapData.season);
            if (snapData.episode) setEpisode(snapData.episode);
          }
        }
      } catch (err) {
        console.error('Error loading progress:', err);
      } finally {
        setIsProgressLoaded(true);
      }
    };

    loadProgress();
  }, [user, tmdbId]);

  // 6. Handle auto-advance countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // Async state update to resolve React warnings
      const timer = setTimeout(() => {
        setCountdown(null);
        handleNextEpisode();
      }, 0);
      return () => clearTimeout(timer);
    }

    countdownIntervalRef.current = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(countdownIntervalRef.current);
  }, [countdown, handleNextEpisode]);

  // 7. Listen to iframe PLAYER_EVENT postMessage (VidAPI)
  const isHls = type === 'live' || (data.streamUrl && data.streamUrl.endsWith('.m3u8'));

  useEffect(() => {
    if (isHls) return; // Only listen for postMessage if using embed iframe

    const handlePlayerMessage = (e) => {
      let payload = e.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      
      if (payload?.type !== 'PLAYER_EVENT') return;
      if (!payload?.data) return;
      
      const { player_status, player_progress, player_duration } = payload.data;
      
      const current = player_progress || 0;
      const dur = player_duration || latestDurationRef.current;
      
      latestProgressRef.current = current;
      if (dur > 0) latestDurationRef.current = dur;

      if (player_status === 'playing' || player_status === 'paused' || player_status === 'seeked') {
        // Throttle Firestore writes: save on pause/seek, or every 10 seconds during playback
        if (player_status !== 'playing' || Math.abs(current - lastSavedTimeRef.current) > 10) {
          saveProgressToFirestore(current, dur);
          lastSavedTimeRef.current = current;
        }
      } else if (player_status === 'completed') {
        saveProgressToFirestore(0, dur);
        if (type === 'tv') {
          startNextEpisodeCountdown();
        }
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    
    // Attempt to save progress on window close
    const handleBeforeUnload = () => {
      if (latestProgressRef.current > 0) {
        saveProgressToFirestore(latestProgressRef.current, latestDurationRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('message', handlePlayerMessage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save progress when component unmounts
      if (latestProgressRef.current > 0) {
        saveProgressToFirestore(latestProgressRef.current, latestDurationRef.current);
      }
    };
  }, [isHls, season, episode, tmdbId, type, title, posterPath, saveProgressToFirestore, startNextEpisodeCountdown]);

  // 8. Initialize Live TV Player (HLS video.js) with error recovery
  const initHlsPlayer = useCallback(() => {
    if (!videoRef.current) return;

    // Dispose any existing player instance before creating a new one
    if (playerInstanceRef.current) {
      playerInstanceRef.current.dispose();
      playerInstanceRef.current = null;
    }

    setStreamError(false);

    const options = {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{
        src: data.streamUrl || 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fr.m3u8',
        type: 'application/x-mpegURL'
      }]
    };

    const player = videojs(videoRef.current, options);

    player.on('error', () => {
      console.error('HLS stream loading failed.');
      setStreamError(true);
    });

    playerInstanceRef.current = player;
  }, [data.streamUrl]);

  useEffect(() => {
    if (isHls) {
      initHlsPlayer();
    }
    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.dispose();
        playerInstanceRef.current = null;
      }
    };
  }, [isHls, initHlsPlayer]);

  // 9. Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (isHls && playerInstanceRef.current) {
          if (playerInstanceRef.current.paused()) {
            playerInstanceRef.current.play();
          } else {
            playerInstanceRef.current.pause();
          }
        }
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowRight' && isHls && playerInstanceRef.current) {
        playerInstanceRef.current.currentTime(playerInstanceRef.current.currentTime() + 10);
      } else if (e.key === 'ArrowLeft' && isHls && playerInstanceRef.current) {
        playerInstanceRef.current.currentTime(playerInstanceRef.current.currentTime() - 10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHls]);

  // Build target URL for VidAPI Player
  const baseIframeUrl = type === 'tv'
    ? `https://vaplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`
    : `https://vaplayer.ru/embed/movie/${tmdbId}`;

  const queryParams = new URLSearchParams({
    primaryColor: '#e50914',
    autoplay: '1',
    api: '1'
  });

  if (initialResume > 0) {
    queryParams.set('t', initialResume.toString());
  }

  const iframeUrl = `${baseIframeUrl}?${queryParams.toString()}`;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center select-none text-white font-sans animate-fade-in"
    >
      {/* Top Floating Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent z-40 transition-opacity duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 bg-zinc-800/80 hover:bg-[#E50914] rounded-full hover:scale-110 active:scale-95 transition-all text-white backdrop-blur border border-zinc-700/50"
            type="button"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h3 className="font-extrabold text-lg tracking-wide drop-shadow">
              {title}
            </h3>
            {type === 'tv' && (
              <p className="text-xs text-zinc-400 font-bold drop-shadow">
                Saison {season}, Épisode {episode}
              </p>
            )}
            {type === 'live' && (
              <p className="text-xs text-[#E50914] font-bold drop-shadow animate-pulse">
                TV EN DIRECT
              </p>
            )}
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          {type === 'tv' && (
            <button
              onClick={handleNextEpisode}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-[#e509143f] text-sm"
              type="button"
            >
              <SkipForward className="h-4 w-4" />
              Épisode Suivant
            </button>
          )}
          <button 
            onClick={toggleFullscreen}
            className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-white transition backdrop-blur border border-zinc-700/50"
            title="Plein Écran (Touche F)"
            type="button"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="w-full h-full flex justify-center items-center">
        {isHls ? (
          streamError ? (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 border border-zinc-850 rounded-2xl max-w-md text-center space-y-5 shadow-2xl relative z-30 animate-fade-in">
              <AlertTriangle className="h-16 w-16 text-yellow-500 animate-bounce" />
              <div>
                <h3 className="text-lg font-bold text-white">Impossible de charger le flux direct</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Le flux de diffusion de cette chaîne TV est actuellement indisponible ou nécessite un protocole réseau différent.
                </p>
              </div>
              <div className="flex gap-4 w-full pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-bold transition text-sm"
                  type="button"
                >
                  Retour
                </button>
                <button
                  onClick={initHlsPlayer}
                  className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm"
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </button>
              </div>
            </div>
          ) : (
            <div data-vjs-player className="w-full h-full relative">
              <video 
                ref={videoRef} 
                className="video-js vjs-default-skin vjs-big-play-centered" 
                playsInline
              />
            </div>
          )
        ) : (
          !isProgressLoaded ? (
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-10 w-10 text-[#E50914]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Chargement de la progression...</span>
            </div>
          ) : (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0 animate-fade-in"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              title="tafaraj m3a atlas"
            />
          )
        )}
      </div>

      {/* Keyboard Controls Launch Overlay */}
      {showControlsTip && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none transition-all duration-500 ease-in-out opacity-100">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 max-w-sm flex flex-col items-center gap-4 text-center shadow-2xl backdrop-blur-md">
            <Keyboard className="h-12 w-12 text-[#E50914]" />
            <h4 className="font-extrabold text-white text-lg">Contrôles du Lecteur</h4>
            <div className="space-y-2.5 text-sm text-zinc-300 text-left w-full mt-2">
              <div className="flex justify-between items-center bg-zinc-950 px-4 py-2 rounded-lg">
                <span>Lecture / Pause</span>
                <span className="bg-zinc-800 text-xs px-2 py-1 rounded font-mono font-bold text-white">Espace</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950 px-4 py-2 rounded-lg">
                <span>Plein Écran</span>
                <span className="bg-zinc-800 text-xs px-2 py-1 rounded font-mono font-bold text-white">F</span>
              </div>
              {isHls && (
                <div className="flex justify-between items-center bg-zinc-950 px-4 py-2 rounded-lg">
                  <span>Reculer / Avancer (10s)</span>
                  <span className="bg-zinc-800 text-xs px-2 py-1 rounded font-mono font-bold text-white">←  →</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Netflix Next Episode countdown timer overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col justify-center items-center text-center space-y-6 animate-fade-in select-none">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-300">Épisode Suivant dans</h2>
          
          {/* Circular progress loader representation */}
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-zinc-800 flex items-center justify-center">
              <span className="text-4xl font-black text-white">{countdown}</span>
            </div>
            {/* Spinning indicator glow */}
            <div className="absolute inset-0 rounded-full border-4 border-t-[#E50914] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>

          <p className="text-lg text-zinc-400 font-medium">
            Saison {season}, Épisode {episode + 1}
          </p>

          <div className="flex gap-4 pt-4">
            <button
              onClick={cancelCountdown}
              className="px-6 py-3 border-2 border-zinc-700 hover:border-white text-white font-bold rounded-lg transition-all active:scale-95 text-sm uppercase tracking-wider flex items-center gap-2"
              type="button"
            >
              <X className="h-4 w-4" />
              Annuler
            </button>
            <button
              onClick={handleNextEpisode}
              className="px-6 py-3 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 text-sm uppercase tracking-wider shadow-lg shadow-[#e509143f]"
              type="button"
            >
              Lancer maintenant
            </button>
          </div>
        </div>
      )}

      {/* Small constant controls description tip bottom-left */}
      <div className="absolute bottom-4 left-6 text-zinc-500 text-[10px] pointer-events-none drop-shadow opacity-50 z-40">
        Raccourcis : [Espace] Lecture/Pause (Direct)  •  [F] Plein Écran
      </div>
    </div>
  );
}
