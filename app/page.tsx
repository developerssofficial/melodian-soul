"use client";
import { useState, useEffect, useCallback } from "react";
import { auth, googleProvider } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, Volume2, LogIn, LogOut, Loader2 } from "lucide-react";
import YouTube from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";

const API_KEYS = [
  "AIzaSyD6-OdNvUqan2JsyPkGtDQm67VPGiyXXZk",
  "AIzaSyBrqfEYpyBc0HiMjNJcaBvSyOJM-ynha00",
  "AIzaSyCIFum0PPHPcgK5ns55D-BfGvYgT0uQLJE"
];

export default function MelodianSoul() {
  const [user, setUser] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const moodKeywords = ["Bangla Lofi Mashup", "Coke Studio Bangla", "Arijit Singh Hits"];

  const searchMusic = async (query: string) => {
    if (!query) return;

    const cachedData = typeof window !== "undefined" ? localStorage.getItem(`cache_${query.toLowerCase()}`) : null;
    if (cachedData) {
      const data = JSON.parse(cachedData);
      setSongs(data);
      if (data.length > 0) setCurrentSong(data[0]);
      return; 
    }

    setLoading(true);
    const fetchDataWithRotation = async (index: number): Promise<any> => {
      if (index >= API_KEYS.length) throw new Error("সবগুলো API Key-র লিমিট শেষ!");
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
        const formatted = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          cover: item.snippet.thumbnails.high.url,
        }));
        localStorage.setItem(`cache_${query.toLowerCase()}`, JSON.stringify(formatted));
        setSongs(formatted);
        if (formatted.length > 0) setCurrentSong(formatted[0]);
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // স্টাক হওয়া বন্ধ করতে গান পরিবর্তনের হ্যান্ডলার
  const handleSongChange = useCallback((song: any) => {
    setIsPlaying(false);
    setCurrentSong(song);
    // প্লেয়ারকে নতুন গান লোড করার জন্য সামান্য সময় দেওয়া
    setTimeout(() => {
      if (player) {
        player.loadVideoById(song.id);
        player.playVideo();
      }
    }, 300);
  }, [player]);

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

  useEffect(() => {
    setMounted(true);
    searchMusic(moodKeywords[Math.floor(Math.random() * moodKeywords.length)]);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying) {
        try {
          setCurrentTime(player.getCurrentTime());
          setDuration(player.getDuration());
        } catch (e) {
          // প্লেয়ার রেডি না থাকলে এরর এড়াতে
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-purple-600 blur-[150px] rounded-full" />
        <motion.div animate={{ x: [0, -50, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 25, repeat: Infinity }} className="absolute -bottom-40 -right-20 w-[700px] h-[700px] bg-pink-600 blur-[150px] rounded-full" />
      </div>

      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl"><Music size={26} /></div>
          <h1 className="text-2xl font-black tracking-tighter">MelodianSoul</h1>
        </div>

        <div className="flex-1 max-w-xl mx-6 relative group">
          <input 
            type="text" placeholder="Search your vibe..." 
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
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-pink-500/50" />
              <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-gray-400 hover:text-white uppercase">Logout</button>
            </div>
          ) : (
            <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-2.5 rounded-full text-xs font-black shadow-lg">Login</button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {currentSong ? (
              <motion.div key={currentSong.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="relative rounded-[3rem] bg-white/[0.02] border border-white/10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 backdrop-blur-3xl shadow-2xl">
                 <div className="hidden">
                  <YouTube 
                    videoId={currentSong.id} 
                    opts={{ playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 } }} 
                    onReady={(e) => { setPlayer(e.target); e.target.setVolume(volume); }} 
                    onPlay={() => setIsPlaying(true)} 
                    onPause={() => setIsPlaying(false)} 
                    onEnd={playNextSong}
                    onStateChange={(e) => { if (e.data === 1) setIsPlaying(true); }}
                  />
                </div>
                <div className="relative group">
                  <img src={currentSong.cover} className="w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] object-cover border border-white/10 shadow-2xl" />
                  {isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[2.5rem]"><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-16 bg-pink-500/40 rounded-full blur-xl" /></div>}
                </div>
                <div className="text-center md:text-left flex-1">
                  <div className="inline-block bg-pink-500/20 px-4 py-1 rounded-full text-[10px] font-bold text-pink-400 mb-4 uppercase tracking-widest">Now Vibe</div>
                  <h2 className="text-3xl md:text-5xl font-black mb-2 leading-tight truncate max-w-md">{currentSong.title}</h2>
                  <p className="text-xl text-gray-400 mb-8 font-medium">{currentSong.artist}</p>
                  <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black px-12 py-4 rounded-full font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                    {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />} {isPlaying ? "PAUSE" : "PLAY NOW"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-80 bg-white/5 rounded-[3rem] animate-pulse" />
            )}
          </AnimatePresence>
          
          <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><Music className="text-pink-500" /> Your Vibe List</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {loading ? [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />) : 
                songs.map((song) => (
                  <div key={song.id} onClick={() => handleSongChange(song)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${currentSong?.id === song.id ? "bg-white/10 border border-white/10 shadow-lg" : "hover:bg-white/5 border border-transparent"}`}>
                    <img src={song.cover} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-sm truncate">{song.title}</h4>
                      <p className="text-[10px] text-gray-500 uppercase flex items-center gap-2">
                        {song.artist} {currentSong?.id === song.id && isPlaying && <span className="text-pink-500 font-bold">• Playing</span>}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white/[0.04] p-8 rounded-[3rem] backdrop-blur-3xl border border-white/10 shadow-2xl h-fit">
          <h3 className="text-xl font-black mb-6">Discovery Queue</h3>
          <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? [...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />) : 
               songs.slice(1, 40).map((song) => (
                <div key={song.id} onClick={() => handleSongChange(song)} className="flex items-center gap-4 cursor-pointer hover:translate-x-2 transition-transform group">
                  <img src={song.cover} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                  <div className="flex-1 overflow-hidden"><h4 className="font-bold text-[12px] truncate group-hover:text-pink-400">{song.title}</h4></div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {currentSong && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-black/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-[3rem] z-50 flex flex-col gap-2">
          <div className="flex items-center gap-4 w-full px-2">
            <span className="text-[10px] text-gray-500">{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
            <input type="range" min="0" max={duration} step="1" value={currentTime} onChange={(e) => player?.seekTo(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer" />
            <span className="text-[10px] text-gray-500">{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-1/3"><img src={currentSong.cover} className="w-10 h-10 rounded-lg" /><div className="hidden sm:block overflow-hidden"><h4 className="font-bold text-[10px] truncate">{currentSong.title}</h4></div></div>
            <div className="flex items-center gap-8">
              <SkipBack size={22} className="text-gray-400 hover:text-white cursor-pointer" onClick={playPreviousSong} />
              <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black p-3 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl">
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
              </button>
              <SkipForward size={22} className="text-gray-400 hover:text-white cursor-pointer" onClick={playNextSong} />
            </div>
            <div className="w-1/3 flex justify-end items-center gap-6">
              <div className="flex items-center gap-2 group">
                <Volume2 size={18} className="text-gray-400 group-hover:text-white" />
                <input type="range" min="0" max="100" value={volume} onChange={(e) => { setVolume(parseInt(e.target.value)); player?.setVolume(parseInt(e.target.value)); }} className="w-20 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer" />
              </div>
              <Heart size={18} className="text-gray-500 hover:text-pink-500 cursor-pointer" />
            </div>
          </div>
        </motion.div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ec4899; }
      `}</style>
    </main>
  );
}
