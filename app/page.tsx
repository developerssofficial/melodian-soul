"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { auth, googleProvider } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, Volume2, Loader2 } from "lucide-react";
import YouTube, { YouTubeProps } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";

// API Keys from Environment Variables
const API_KEYS = [
  process.env.NEXT_PUBLIC_YT_KEY_1,
  process.env.NEXT_PUBLIC_YT_KEY_2,
  process.env.NEXT_PUBLIC_YT_KEY_3
].filter(Boolean) as string[];

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

export default function MelodianSoul() {
  const [user, setUser] = useState<User | null>(null);
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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const moodKeywords = ["Bangla Lofi Mashup", "Coke Studio Bangla", "Arijit Singh Hits"];

  // Search Logic with Key Rotation
  const searchMusic = async (query: string) => {
    if (!query) return;

    const cacheKey = `cache_${query.toLowerCase()}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      setSongs(data);
      if (data.length > 0) setCurrentSong(data[0]);
      return; 
    }

    setLoading(true);
    const fetchDataWithRotation = async (index: number): Promise<any> => {
      if (index >= API_KEYS.length) throw new Error("All API Keys exceeded limit!");
      try {
        const enhancedQuery = `${query} official music`;
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(enhancedQuery)}&type=video&videoCategoryId=10&key=${API_KEYS[index]}`
        );
        if (response.status === 403) return fetchDataWithRotation(index + 1);
        if (!response.ok) throw new Error("API Error");
        return await response.json();
      } catch (err) {
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
        localStorage.setItem(cacheKey, JSON.stringify(formatted));
        setSongs(formatted);
        if (formatted.length > 0) setCurrentSong(formatted[0]);
      }
    } catch (err: any) {
      console.error("Search Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSongChange = useCallback((song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (player) {
      player.loadVideoById(song.id);
      if (hasUserInteracted) player.playVideo();
    }
  }, [player, hasUserInteracted]);

  const playNextSong = useCallback(() => {
    if (songs.length > 0) {
      const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
      const nextSong = songs[(currentIndex + 1) % songs.length];
      handleSongChange(nextSong);
    }
  }, [songs, currentSong, handleSongChange]);

  const playPreviousSong = () => {
    if (songs.length > 0) {
      const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
      const prevSong = songs[(currentIndex - 1 + songs.length) % songs.length];
      handleSongChange(prevSong);
    }
  };

  // Initial Load
  useEffect(() => {
    setMounted(true);
    searchMusic(moodKeywords[Math.floor(Math.random() * moodKeywords.length)]);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Time Tracker
  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying) {
        try {
          setCurrentTime(player.getCurrentTime());
          setDuration(player.getDuration());
        } catch (e) {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  // Interaction Listener
  useEffect(() => {
    const handleInteraction = () => setHasUserInteracted(true);
    window.addEventListener("click", handleInteraction);
    return () => window.removeEventListener("click", handleInteraction);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 30, 0], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-purple-600 blur-[120px] rounded-full" />
        <motion.div animate={{ x: [0, -30, 0], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -bottom-40 -right-20 w-[600px] h-[600px] bg-pink-600 blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <nav className="max-w-7xl mx-auto flex flex-wrap justify-between items-center mb-10 relative z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl"><Music size={24} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">MelodianSoul</h1>
        </div>

        <div className="flex-1 max-w-xl relative group order-3 md:order-2">
          <input 
            type="text" placeholder="Search your vibe..." 
            className="w-full bg-white/5 border border-white/10 px-12 py-3 rounded-2xl outline-none focus:border-pink-500/50 transition-all backdrop-blur-md"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMusic(searchText)}
          />
          <Search size={18} className="absolute left-4 top-3.5 text-gray-500" />
          {loading && <Loader2 size={18} className="absolute right-4 top-3.5 text-pink-500 animate-spin" />}
        </div>

        <div className="flex items-center gap-4 order-2 md:order-3">
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10">
              <img src={user.photoURL || ""} className="w-8 h-8 rounded-full" alt="profile" />
              <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-gray-400 hover:text-white">LOGOUT</button>
            </div>
          ) : (
            <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black px-6 py-2 rounded-full text-xs font-black hover:bg-pink-500 hover:text-white transition-colors">LOGIN</button>
          )}
        </div>
      </nav>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {currentSong ? (
              <motion.div key={currentSong.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 backdrop-blur-xl">
                 <div className="hidden">
                  <YouTube 
                    videoId={currentSong.id} 
                    opts={{ playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1 } }} 
                    onReady={(e) => { setPlayer(e.target); e.target.setVolume(volume); }} 
                    onEnd={playNextSong}
                    onStateChange={(e) => { if (e.data === 1) setIsPlaying(true); if (e.data === 2) setIsPlaying(false); }}
                  />
                </div>
                <div className="relative">
                  <img src={currentSong.cover} className="w-56 h-56 md:w-72 md:h-72 rounded-[2rem] object-cover shadow-2xl" alt="cover" />
                  {isPlaying && <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center animate-bounce"><Music size={16} /></div>}
                </div>
                <div className="text-center md:text-left flex-1 min-w-0">
                  <span className="text-pink-500 text-[10px] font-black uppercase tracking-[0.2em]">Now Playing</span>
                  <h2 className="text-2xl md:text-4xl font-black mt-2 mb-1 truncate">{currentSong.title}</h2>
                  <p className="text-gray-400 mb-6 truncate">{currentSong.artist}</p>
                  <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black px-10 py-3.5 rounded-full font-black flex items-center gap-3 mx-auto md:mx-0 hover:scale-105 transition-transform">
                    {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />} {isPlaying ? "PAUSE" : "PLAY"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-64 bg-white/5 rounded-[2.5rem] animate-pulse" />
            )}
          </AnimatePresence>
          
          {/* List Section */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6">
            <h3 className="text-lg font-black mb-4 uppercase tracking-widest">Trending Vibes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {songs.map((song) => (
                <div key={song.id} onClick={() => handleSongChange(song)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${currentSong?.id === song.id ? "bg-pink-500/10 border border-pink-500/20" : "hover:bg-white/5 border border-transparent"}`}>
                  <img src={song.cover} className="w-12 h-12 rounded-lg object-cover" alt="thumb" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{song.title}</h4>
                    <p className="text-[10px] text-gray-500 truncate">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Queue */}
        <div className="lg:col-span-4 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 h-fit">
          <h3 className="text-lg font-black mb-4 uppercase">Up Next</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {songs.slice(1).map((song) => (
              <div key={song.id} onClick={() => handleSongChange(song)} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative overflow-hidden rounded-lg w-12 h-12 flex-shrink-0">
                  <img src={song.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="thumb" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[11px] truncate group-hover:text-pink-400">{song.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Controller */}
      {currentSong && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[2rem] z-50 shadow-2xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-gray-500 w-8">{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
              <input type="range" min="0" max={duration} step="1" value={currentTime} onChange={(e) => player?.seekTo(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer" />
              <span className="text-[9px] text-gray-500 w-8">{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="hidden sm:flex items-center gap-3 w-1/4">
                <img src={currentSong.cover} className="w-10 h-10 rounded-lg shadow-lg" alt="mini" />
                <div className="truncate"><h4 className="font-bold text-[10px] truncate">{currentSong.title}</h4></div>
              </div>
              <div className="flex items-center gap-6">
                <SkipBack size={20} className="text-gray-400 hover:text-white cursor-pointer" onClick={playPreviousSong} />
                <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                  {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
                </button>
                <SkipForward size={20} className="text-gray-400 hover:text-white cursor-pointer" onClick={playNextSong} />
              </div>
              <div className="flex items-center gap-4 w-1/4 justify-end">
                <div className="hidden md:flex items-center gap-2">
                  <Volume2 size={16} className="text-gray-400" />
                  <input type="range" min="0" max="100" value={volume} onChange={(e) => { setVolume(parseInt(e.target.value)); player?.setVolume(parseInt(e.target.value)); }} className="w-16 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer" />
                </div>
                <Heart size={18} className="text-gray-500 hover:text-pink-500 cursor-pointer" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ec4899; }
      `}</style>
    </main>
  );
}
