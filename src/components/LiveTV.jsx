import { useEffect, useState } from 'react';
import { Play, Search, Tv, Activity, Plus, Trash2, X } from 'lucide-react';

const PREMIUM_CHANNELS = [
  {
    id: 'france24_fr',
    name: 'France 24 (Français)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/France_24_logo.svg/1200px-France_24_logo.svg.png',
    streamUrl: 'https://static.france24.com/live/F24_FR_LO_HLS/live_tv.m3u8',
    category: 'Actualités'
  },
  {
    id: 'france24_en',
    name: 'France 24 (English)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/France_24_logo.svg/1200px-France_24_logo.svg.png',
    streamUrl: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
    category: 'Actualités'
  },
  {
    id: 'euronews_fr',
    name: 'Euronews (Français)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Euronews_logo_2016.svg/1200px-Euronews_logo_2016.svg.png',
    streamUrl: 'https://euronews-euronews-french-1-fr.samsung.wurl.com/manifest/playlist.m3u8',
    category: 'Actualités'
  },
  {
    id: 'bfmtv',
    name: 'BFM TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/BFM_TV_logo_2019.svg/1200px-BFM_TV_logo_2019.svg.png',
    streamUrl: 'https://bfmtv-bfmtv-1-fr.samsung.wurl.com/manifest/playlist.m3u8',
    category: 'Actualités'
  },
  {
    id: 'redbull_tv',
    name: 'Red Bull TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Red_Bull_logo.svg/1200px-Red_Bull_logo.svg.png',
    streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    category: 'Sport'
  },
  {
    id: 'nasa_tv',
    name: 'NASA TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/1200px-NASA_logo.svg.png',
    streamUrl: 'https://ntvpublic-lh.akamaihd.net/i/NASA_NTV_1@136933/master.m3u8',
    category: 'Découverte'
  }
];

const mapCategory = (channelName, originalCategory) => {
  const name = channelName.toLowerCase();
  
  if (name.includes('sport') || name.includes('racing') || name.includes('deport') || name.includes('motors') || name.includes('brics sport')) {
    return 'Sport';
  }
  if (name.includes('news') || name.includes('noticias') || name.includes('info') || name.includes('al jazeera') || name.includes('actualité') || name.includes('journal') || name.includes('presse')) {
    return 'Actualités';
  }
  if (name.includes('music') || name.includes('musique') || name.includes('muzika') || name.includes('sing') || name.includes('hit') || name.includes('rock') || name.includes('jazz') || name.includes('classic')) {
    return 'Musique';
  }
  if (name.includes('cine') || name.includes('movie') || name.includes('film') || name.includes('brics chinese') || name.includes('comedy') || name.includes('drama') || name.includes('action')) {
    return 'Divertissement';
  }
  if (name.includes('nasa') || name.includes('discovery') || name.includes('science') || name.includes('nature') || name.includes('doc') || name.includes('history') || name.includes('découverte')) {
    return 'Découverte';
  }
  
  return originalCategory || 'Général';
};

const parseM3U = (text) => {
  const lines = text.split('\n');
  const channelsList = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/tvg-name="([^"]+)"/) || line.match(/,([^,]+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/tvg-country="([^"]+)"/);
      const idMatch = line.match(/tvg-id="([^"]+)"/);

      let channelName = 'Chaîne sans nom';
      if (nameMatch) {
        channelName = nameMatch[1] ? nameMatch[1].trim() : nameMatch[0].replace(/^,/, '').trim();
      }

      const originalCategory = groupMatch ? groupMatch[1].trim() : 'Général';
      const parsedCategory = mapCategory(channelName, originalCategory);

      currentChannel = {
        id: idMatch ? idMatch[1] : `channel_${i}`,
        name: channelName,
        logo: logoMatch ? logoMatch[1] : 'https://images.smart-iptv.net/logos/sports.png',
        category: parsedCategory,
      };
    } else if (line.startsWith('http') && currentChannel) {
      currentChannel.streamUrl = line;
      // Filter out twitch & youtube links as they won't play in our standard videojs HLS player
      if (line.includes('.m3u8') || line.includes('.m3u') || line.includes('.ts') || line.includes('/manifest/')) {
        channelsList.push(currentChannel);
      }
      currentChannel = null;
    }
  }
  return channelsList;
};

export default function LiveTV({ onPlay }) {
  const [channels, setChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');
  const [loading, setLoading] = useState(true);
  
  // Custom IPTV channels from LocalStorage
  const [customChannels, setCustomChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_iptv_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch Free-TV IPTV playlist
  useEffect(() => {
    let active = true;
    const fetchIPTV = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8');
        const text = await res.text();
        if (!active) return;
        const parsed = parseM3U(text);
        setChannels(parsed);
      } catch (err) {
        console.error('Error loading Free-TV playlist:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIPTV();
    return () => {
      active = false;
    };
  }, []);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelLogo, setNewChannelLogo] = useState('');
  const [newChannelCat, setNewChannelCat] = useState('Personnel');
  const [formError, setFormError] = useState('');

  const handleAddChannel = (e) => {
    e.preventDefault();
    if (!newChannelName || !newChannelUrl) {
      setFormError('Veuillez remplir le nom et l\'URL du flux.');
      return;
    }

    if (!newChannelUrl.startsWith('http://') && !newChannelUrl.startsWith('https://')) {
      setFormError('L\'URL doit commencer par http:// ou https://');
      return;
    }

    const newChan = {
      id: `custom_${Date.now()}`,
      name: newChannelName,
      logo: newChannelLogo || 'https://images.smart-iptv.net/logos/sports.png',
      streamUrl: newChannelUrl,
      category: newChannelCat,
      isCustom: true
    };

    const updated = [...customChannels, newChan];
    setCustomChannels(updated);
    localStorage.setItem('custom_iptv_channels', JSON.stringify(updated));

    // Reset Form
    setNewChannelName('');
    setNewChannelUrl('');
    setNewChannelLogo('');
    setNewChannelCat('Personnel');
    setFormError('');
    setIsModalOpen(false);
  };

  const handleDeleteChannel = (e, id) => {
    e.stopPropagation();
    const updated = customChannels.filter(c => c.id !== id);
    setCustomChannels(updated);
    localStorage.setItem('custom_iptv_channels', JSON.stringify(updated));
  };

  // Combine Premium, parsed and Custom Channels
  const allChannels = [...PREMIUM_CHANNELS, ...channels, ...customChannels];

  // Filter channels based on search and category tabs
  const filteredChannels = allChannels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Toutes' || channel.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Get dynamic categories list (genres first, then countries alphabetically)
  const allCategories = Array.from(new Set(allChannels.map(c => c.category)));
  const contentCategories = ['Toutes', 'Actualités', 'Sport', 'Musique', 'Divertissement', 'Découverte', 'Personnel'];
  const otherCategories = allCategories.filter(cat => !contentCategories.includes(cat)).sort();
  const categories = [...contentCategories, ...otherCategories];

  return (
    <div className="p-8 pb-24 select-none min-h-screen bg-[#141414] text-white animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Tv className="h-8 w-8 text-[#E50914]" />
            Télévision en Direct
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Profitez des meilleures chaînes et ajoutez vos propres flux IPTV personnalisés.
          </p>
        </div>

        {/* Search Bar & Action Button */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 md:flex-none">
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-600 transition"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-lg transition active:scale-95 text-sm shadow-lg shadow-[#e509142f]"
            type="button"
          >
            <Plus className="h-4 w-4" />
            Ajouter une chaîne
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-zinc-900 pb-4 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-[#E50914] text-white shadow-md shadow-[#e509142f]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dynamic states: Loading vs Channels Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
          <svg className="animate-spin h-10 w-10 text-[#E50914] mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Chargement des chaînes...</span>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Tv className="h-16 w-16 mb-4 stroke-1" />
          <p className="text-lg font-bold">Aucune chaîne trouvée</p>
          <p className="text-sm">Essayez de modifier vos critères de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-fade-in">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => onPlay({
                type: 'live',
                tmdbId: channel.id,
                title: channel.name,
                posterPath: channel.logo, // Use logo for poster field
                streamUrl: channel.streamUrl
              })}
              className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/80 hover:border-[#E50914] hover:shadow-xl hover:shadow-[#e509141f] hover:bg-zinc-900 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 group relative flex flex-col justify-between"
            >
              {/* Logo / Thumbnail Box */}
              <div className="w-full aspect-video bg-zinc-950 rounded-lg flex items-center justify-center p-3 relative overflow-hidden">
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="max-w-full max-h-full object-contain filter group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.smart-iptv.net/logos/sports.png";
                  }}
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                  <Play className="h-10 w-10 text-white fill-white bg-[#E50914] rounded-full p-2" />
                </div>

                {/* Live Badge */}
                <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                  <Activity className="h-2.5 w-2.5 animate-pulse" />
                  Live
                </span>

                {/* Delete Button (Only for custom channels) */}
                {channel.isCustom && (
                  <button
                    onClick={(e) => handleDeleteChannel(e, channel.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded text-red-500 hover:text-white transition duration-200 opacity-0 group-hover:opacity-100 z-20"
                    title="Supprimer la chaîne"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Title & Info */}
              <div className="mt-4">
                <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-red-500 transition">
                  {channel.name}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-medium truncate max-w-[80px]">
                    {channel.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />
                    En Ligne
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add IPTV Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setFormError('');
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Tv className="h-6 w-6 text-[#E50914]" />
              Ajouter une chaîne IPTV
            </h3>

            {formError && (
              <div className="bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs rounded p-3 mb-4 leading-relaxed">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wide">Nom de la chaîne *</label>
                <input
                  type="text"
                  placeholder="Ex: Canal+ Sport"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 outline-none focus:border-red-600 text-sm transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wide">URL du flux (.m3u8) *</label>
                <input
                  type="text"
                  placeholder="https://ex.com/stream.m3u8"
                  value={newChannelUrl}
                  onChange={(e) => setNewChannelUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 outline-none focus:border-red-600 text-sm transition font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wide">URL du Logo (optionnel)</label>
                <input
                  type="text"
                  placeholder="https://ex.com/logo.png"
                  value={newChannelLogo}
                  onChange={(e) => setNewChannelLogo(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 outline-none focus:border-red-600 text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wide">Catégorie</label>
                <select
                  value={newChannelCat}
                  onChange={(e) => setNewChannelCat(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 outline-none focus:border-red-600 text-sm transition"
                >
                  <option value="Sport">Sport</option>
                  <option value="Actualités">Actualités</option>
                  <option value="Découverte">Découverte</option>
                  <option value="Personnel">Personnel</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError('');
                  }}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-lg transition text-sm"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
