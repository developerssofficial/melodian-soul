"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, Volume2, Loader2 } from "lucide-react";
import YouTube from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";

// ---------- TypeScript Interfaces ----------
interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

interface CacheItem {
  data: Song[];
  timestamp: number;
}

const API_KEYS = [
  "AIzaSyD6-OdNvUqan2JsyPkGtDQm67VPGiyXXZk",
  "AIzaSyBrqfEYpyBc0HiMjNJcaBvSyOJM-ynha00",
  "AIzaSyCIFum0PPHPcgK5ns55D-BfGvYgT0uQLJE"
];

export default function MelodianSoul() {
  const [user, setUser] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const moodKeywords = ["Bangla Lofi Mashup", "Coke Studio Bangla", "Arijit Singh Hits"];

  // ---------- API Call with Key Rotation & Error Handling ----------
  const searchMusic = async (query: string) => {
    if (!query) return;

    // Check cache first (with timestamp)
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`cache_${query.toLowerCase()}`);
      if (cached) {
        try {
          const parsed: CacheItem = JSON.parse(cached);
          // Cache valid for 7 days
          if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
            setSongs(parsed.data);
            if (parsed.data.length > 0) {
              setCurrentSong(parsed.data[0]);
              setIsPlaying(true);   // auto-play after cache load
            }
            return;
          } else {
            localStorage.removeItem(`cache_${query.toLowerCase()}`);
          }
        } catch (e) {
          localStorage.removeItem(`cache_${query.toLowerCase()}`);
        }
      }
    }

    setLoading(true);
    const fetchDataWithRotation = async (index: number): Promise<any> => {
      if (index >= API_KEYS.length) {
        throw new Error("সবগুলো API Key-র লিমিট শেষ! পরে আবার চেষ্টা করুন।");
      }
      try {
        const enhancedQuery = `${query} official music`;
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
            enhancedQuery
          )}&type=video&videoCategoryId=10&key=${API_KEYS[index]}`
        );

        // Handle quota exceeded or forbidden
        if (response.status === 403 || response.status === 429) {
          console.log(`API Key ${index} quota exceeded, trying next...`);
          return fetchDataWithRotation(index + 1);
        }

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
      } catch (err) {
        console.error(`API Key ${index} failed:`, err);
        if (index + 1 < API_KEYS.length) return fetchDataWithRotation(index + 1);
        throw err;
      }
    };

    try {
      const data = await fetchDataWithRotation(0);
      if (data?.items) {
        const formatted: Song[] = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          cover: item.snippet.thumbnails.high.url,
        }));

        // Save to cache with timestamp
        const cacheItem: CacheItem = { data: formatted, timestamp: Date.now() };
        localStorage.setItem(`cache_${query.toLowerCase()}`, JSON.stringify(cacheItem));

        setSongs(formatted);
        if (formatted.length > 0) {
          setCurrentSong(formatted[0]);
          setIsPlaying(true);   // auto-play after fresh load
        }
      }
    } catch (err: any) {
      console.error(err.message);
      // Optionally show user a toast message
    } finally {
      setLoading(false);
    }
  };

  // ---------- Song Change Handler (Auto-play) ----------
  const handleSongChange = useCallback(
    (song: Song) => {
      setCurrentSong(song);
      setIsPlaying(true);
      if (player) {
        try {
          player.loadVideoById(song.id);
          player.playVideo();
        } catch (e) {
          console.error("Player error:", e);
        }
      }
    },
    [player]
  );

  const playNextSong = useCallback(() => {
    if (songs.length > 0 && currentSong) {
      const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
      const nextSong = songs[(currentIndex + 1) % songs.length];
      handleSongChange(nextSong);
    }
  }, [songs, currentSong, handleSongChange]);

  const playPreviousSong = useCallback(() => {
    if (songs.length > 0 && currentSong) {
      const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
      const prevSong = songs[(currentIndex - 1 + songs.length) % songs.length];
      handleSongChange(prevSong);
    }
  }, [songs, currentSong, handleSongChange]);

  // ---------- Effects ----------
  useEffect(() => {
    setMounted(true);
    // Initial random mood search
    searchMusic(moodKeywords[Math.floor(Math.random() * moodKeywords.length)]);

    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Player time update interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying) {
        try {
          setCurrentTime(player.getCurrentTime());
          setDuration(player.getDuration());
        } catch (e) {
          // Ignore errors when player is not ready
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.destroy();
        } catch (e) {}
      }
    };
  }, [player]);

  // Clean old cache entries on mount (optional)
  useEffect(() => {
    const cleanupOldCache = () => {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("cache_")) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.timestamp && now - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(key);
              }
            } catch (e) {}
          }
        }
      }
    };
    cleanupOldCache();
  }, []);

  // ** Auto-play effect: when player is ready and we have a currentSong with isPlaying=true **
  useEffect(() => {
    if (player && currentSong && isPlaying) {
      try {
        // Check if the player already has the correct video loaded
        const currentVideoId = player.getVideoData().video_id;
        if (currentVideoId !== currentSong.id) {
          player.loadVideoById(currentSong.id);
        }
        player.playVideo();
      } catch (e) {
        // If getVideoData fails (player not fully initialized), fallback to loadVideoById
        try {
          player.loadVideoById(currentSong.id);
          player.playVideo();
        } catch (err) {
          console.error("Failed to auto-play:", err);
        }
      }
    }
  }, [player, currentSong, isPlaying]);

  // Memoized values for performance
  const memoizedSongs = useMemo(() => songs, [songs]);
  const memoizedCurrentSong = useMemo(() => currentSong, [currentSong]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 50, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-purple-600 blur-[150px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, -50, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-40 -right-20 w-[700px] h-[700px] bg-pink-600 blur-[150px] rounded-full"
        />
      </div>

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl">
            <Music size={26} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">MelodianSoul</h1>
        </div>

        <div className="flex-1 max-w-xl mx-6 relative group">
          <input
            type="text"
            placeholder="Search your vibe..."
            className="w-full bg-white/5 border border-white/10 px-12 py-3 rounded-2xl outline-none focus:bg-white/10 transition-all backdrop-blur-md pr-12"
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMusic(searchText)}
          />
          <Search size={20} className="absolute left-4 top-3.5 text-gray-500" />
          {loading && <Loader2 size={20} className="absolute right-4 top-3.5 text-pink-500 animate-spin" />}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 p-1.5 pr-4 rounded-full border border-white/10">
              <img
                src={user.photoURL}
                alt="User"
                className="w-8 h-8 rounded-full border border-pink-500/50"
                onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
              />
              <button
                onClick={() => signOut(auth)}
                className="text-[10px] font-bold text-gray-400 hover:text-white uppercase"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-2.5 rounded-full text-xs font-black shadow-lg"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column - Now Playing & Playlist */}
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {memoizedCurrentSong ? (
              <motion.div
                key={memoizedCurrentSong.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative rounded-[3rem] bg-white/[0.02] border border-white/10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 backdrop-blur-3xl shadow-2xl"
              >
                {/* Hidden YouTube Player */}
                <div className="hidden">
                  <YouTube
                    videoId={memoizedCurrentSong.id}
                    opts={{
                      playerVars: {
                        autoplay: 0,
                        controls: 0,
                        rel: 0,
                        modestbranding: 1,
                      },
                    }}
                    onReady={(e) => {
                      setPlayer(e.target);
                      e.target.setVolume(volume);
                      // If we already have a current song and isPlaying true, play it immediately
                      if (currentSong && isPlaying) {
                        try {
                          e.target.loadVideoById(currentSong.id);
                          e.target.playVideo();
                        } catch (err) {
                          console.error("Error in onReady autoplay:", err);
                        }
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnd={playNextSong}
                    onStateChange={(e) => {
                      if (e.data === 1) setIsPlaying(true);
                      if (e.data === 2) setIsPlaying(false);
                    }}
                  />
                </div>

                {/* Album Art */}
                <div className="relative group">
                  <img
                    src={memoizedCurrentSong.cover}
                    alt={memoizedCurrentSong.title}
                    className="w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] object-cover border border-white/10 shadow-2xl"
                    onError={(e) => (e.currentTarget.src = "/default-album.jpg")}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[2.5rem]">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-16 h-16 bg-pink-500/40 rounded-full blur-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Song Info & Controls */}
                <div className="text-center md:text-left flex-1">
                  <div className="inline-block bg-pink-500/20 px-4 py-1 rounded-full text-[10px] font-bold text-pink-400 mb-4 uppercase tracking-widest">
                    Now Vibe
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black mb-2 leading-tight truncate max-w-md">
                    {memoizedCurrentSong.title}
                  </h2>
                  <p className="text-xl text-gray-400 mb-8 font-medium">{memoizedCurrentSong.artist}</p>
                  <button
                    onClick={() => (isPlaying ? player?.pauseVideo() : player?.playVideo())}
                    className="bg-white text-black px-12 py-4 rounded-full font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
                  >
                    {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
                    {isPlaying ? "PAUSE" : "PLAY NOW"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-80 bg-white/5 rounded-[3rem] animate-pulse" />
            )}
          </AnimatePresence>

          {/* Playlist */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
              <Music className="text-pink-500" /> Your Vibe List
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {loading
                ? [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
                : memoizedSongs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handleSongChange(song)}
                      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                        memoizedCurrentSong?.id === song.id
                          ? "bg-white/10 border border-white/10 shadow-lg"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <img
                        src={song.cover}
                        alt={song.title}
                        className="w-14 h-14 rounded-xl object-cover"
                        onError={(e) => (e.currentTarget.src = "/default-album.jpg")}
                      />
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-sm truncate">{song.title}</h4>
                        <p className="text-[10px] text-gray-500 uppercase flex items-center gap-2">
                          {song.artist}
                          {memoizedCurrentSong?.id === song.id && isPlaying && (
                            <span className="text-pink-500 font-bold">• Playing</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Right Column - Discovery Queue */}
        <div className="lg:col-span-4 bg-white/[0.04] p-8 rounded-[3rem] backdrop-blur-3xl border border-white/10 shadow-2xl h-fit">
          <h3 className="text-xl font-black mb-6">Discovery Queue</h3>
          <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {loading
              ? [...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
              : memoizedSongs.slice(1, 40).map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handleSongChange(song)}
                    className="flex items-center gap-4 cursor-pointer hover:translate-x-2 transition-transform group"
                  >
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                      onError={(e) => (e.currentTarget.src = "/default-album.jpg")}
                    />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-[12px] truncate group-hover:text-pink-400">{song.title}</h4>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Bottom Player (Fixed) */}
      {memoizedCurrentSong && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-black/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-[3rem] z-50 flex flex-col gap-2"
          style={{ bottom: "env(safe-area-inset-bottom, 1.5rem)" }}
        >
          {/* Progress Bar */}
          <div className="flex items-center gap-4 w-full px-2">
            <span className="text-[10px] text-gray-500">
              {new Date(currentTime * 1000).toISOString().substr(14, 5)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="1"
              value={currentTime}
              onChange={(e) => player?.seekTo(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-gray-500">
              {new Date(duration * 1000).toISOString().substr(14, 5)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-1/3">
              <img
                src={memoizedCurrentSong.cover}
                alt={memoizedCurrentSong.title}
                className="w-10 h-10 rounded-lg object-cover"
                onError={(e) => (e.currentTarget.src = "/default-album.jpg")}
              />
              <div className="hidden sm:block overflow-hidden">
                <h4 className="font-bold text-[10px] truncate">{memoizedCurrentSong.title}</h4>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <SkipBack
                size={22}
                className="text-gray-400 hover:text-white cursor-pointer"
                onClick={playPreviousSong}
              />
              <button
                onClick={() => (isPlaying ? player?.pauseVideo() : player?.playVideo())}
                className="bg-white text-black p-3 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl"
              >
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
              </button>
              <SkipForward
                size={22}
                className="text-gray-400 hover:text-white cursor-pointer"
                onClick={playNextSong}
              />
            </div>

            <div className="w-1/3 flex justify-end items-center gap-6">
              <div className="flex items-center gap-2 group">
                <Volume2 size={18} className="text-gray-400 group-hover:text-white" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setVolume(val);
                    player?.setVolume(val);
                  }}
                  className="w-20 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <Heart size={18} className="text-gray-500 hover:text-pink-500 cursor-pointer" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ec4899;
        }
      `}</style>
    </main>
  );
}
