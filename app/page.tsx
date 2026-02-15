"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, LogIn, LogOut } from "lucide-react";
import YouTube from "react-youtube";
import { motion } from "motion/react";

const YT_API_KEY = "AIzaSyCIFum0PPHPcgK5ns55D-BfGvYgT0uQLJE";

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
  const [mounted, setMounted] = useState(false);

  // আপনার পছন্দের ভাইবগুলো
  const moodKeywords = [
    "Bangla Lofi Mashup", "Coke Studio Bangla", "Pritom Hasan Hits", 
    "Tahsan Khan Songs", "Habib Wahid Best", "Arijit Singh Bangla"
  ];

  // ইউটিউব থেকে ৫০টি গান সার্চ করার ফাংশন
  const searchMusic = async (query: string) => {
    if (!query) return;
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&key=${YT_API_KEY}`);
      const data = await response.json();
      if (data.items) {
        const formatted = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          cover: item.snippet.thumbnails.high.url,
        }));
        setSongs(formatted);
        if (formatted.length > 0 && !currentSong) setCurrentSong(formatted[0]);
      }
    } catch (err) { console.error("Search Error:", err); }
  };

  useEffect(() => {
    setMounted(true);
    const randomMood = moodKeywords[Math.floor(Math.random() * moodKeywords.length)];
    searchMusic(randomMood);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { console.log("Login popup closed"); }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying) {
        setCurrentTime(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full" />
        <motion.div animate={{ x: [0, -50, 0] }} transition={{ duration: 25, repeat: Infinity }} className="absolute -bottom-40 -right-20 w-[700px] h-[700px] bg-pink-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Navbar (Add Song Removed, Login Added) */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg"><Music size={26} /></div>
          <h1 className="text-2xl font-black tracking-tighter">MelodianSoul</h1>
        </div>

        <div className="flex-1 max-w-xl mx-6 relative group">
          <input 
            type="text" placeholder="Search your vibe..." 
            className="w-full bg-white/5 border border-white/10 px-12 py-3 rounded-2xl outline-none focus:bg-white/10 transition-all backdrop-blur-md"
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMusic(searchText)}
          />
          <Search size={20} className="absolute left-4 top-3.5 text-gray-500" />
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 p-1.5 pr-4 rounded-full border border-white/10 backdrop-blur-md">
              <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full border border-pink-500/50" />
              <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-gray-400 hover:text-white uppercase flex items-center gap-1">Logout <LogOut size={12} /></button>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-2.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 transition-all">
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Main Content (Left) */}
        <div className="lg:col-span-8 space-y-8">
          {currentSong && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-[3rem] bg-white/[0.02] border border-white/10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 backdrop-blur-3xl shadow-2xl">
               <div className="hidden">
                <YouTube videoId={currentSong.id} opts={{ playerVars: { autoplay: 1, controls: 0 } }} 
                  onReady={(e) => { setPlayer(e.target); e.target.setVolume(volume); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} 
                />
              </div>
              <img src={currentSong.cover} className="w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] object-cover border border-white/10 shadow-2xl" />
              <div className="text-center md:text-left flex-1">
                <div className="inline-block bg-pink-500/20 px-4 py-1 rounded-full text-[10px] font-bold text-pink-400 mb-4 uppercase tracking-widest">Now Vibe</div>
                <h2 className="text-3xl md:text-5xl font-black mb-2 leading-tight">{currentSong.title}</h2>
                <p className="text-xl text-gray-400 mb-8 font-medium">{currentSong.artist}</p>
                <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black px-12 py-4 rounded-full font-black flex items-center gap-3 active:scale-95 transition-all shadow-xl">
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />} {isPlaying ? "PAUSE" : "PLAY NOW"}
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Your Vibe List (Unlimited Scrollable) */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><Music className="text-pink-500" /> Your Vibe List</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {songs.map((song) => (
                <div key={song.id} onClick={() => setCurrentSong(song)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${currentSong?.id === song.id ? "bg-white/10 border border-white/10 shadow-lg" : "hover:bg-white/5 border border-transparent"}`}>
                  <img src={song.cover} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 overflow-hidden"><h4 className="font-bold text-sm truncate">{song.title}</h4><p className="text-[10px] text-gray-500 uppercase">{song.artist}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Discovery Queue (Right) */}
        <div className="lg:col-span-4 bg-white/[0.04] p-8 rounded-[3rem] backdrop-blur-3xl border border-white/10 shadow-2xl h-fit">
          <h3 className="text-xl font-black mb-6">Discovery Queue</h3>
          <div className="space-y-5 max-h-[850px] overflow-y-auto pr-2 custom-scrollbar">
             {songs.slice(10, 50).map((song) => (
                <div key={song.id} onClick={() => setCurrentSong(song)} className="flex items-center gap-4 cursor-pointer hover:translate-x-2 transition-transform">
                  <img src={song.cover} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                  <div className="flex-1 overflow-hidden"><h4 className="font-bold text-[12px] truncate">{song.title}</h4><p className="text-[10px] text-gray-500">{song.artist}</p></div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Floating Player (Volume & Progress Added) */}
      {currentSong && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-black/60 backdrop-blur-[40px] border border-white/10 px-8 py-4 rounded-[3rem] z-50 flex flex-col gap-2 shadow-2xl">
          <div className="flex items-center gap-4 w-full">
            <span className="text-[10px] text-gray-500 font-mono">{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
            <input type="range" min="0" max={duration} step="1" value={currentTime} onChange={(e) => player?.seekTo(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer" />
            <span className="text-[10px] text-gray-500 font-mono">{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-1/3 overflow-hidden">
              <img src={currentSong.cover} className="w-12 h-12 rounded-xl" />
              <div className="hidden sm:block overflow-hidden"><h4 className="font-bold text-xs truncate">{currentSong.title}</h4><p className="text-[9px] text-pink-500 font-black uppercase">{currentSong.artist}</p></div>
            </div>
            <div className="flex items-center gap-8">
              <SkipBack size={22} className="text-gray-400 hover:text-white cursor-pointer" />
              <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black p-3.5 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl">
                {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" className="ml-1" />}
              </button>
              <SkipForward size={22} className="text-gray-400 hover:text-white cursor-pointer" />
            </div>
            <div className="w-1/3 flex justify-end items-center gap-6">
               <div className="flex items-center gap-3 group relative">
                <Volume2 size={20} className="text-gray-400 group-hover:text-white cursor-pointer" />
                <input type="range" min="0" max="100" value={volume} onChange={(e) => { setVolume(parseInt(e.target.value)); player?.setVolume(parseInt(e.target.value)); }} 
                  className="w-0 group-hover:w-24 transition-all duration-300 h-1 bg-white/10 accent-pink-500 rounded-full appearance-none cursor-pointer overflow-hidden" />
              </div>
              <Heart size={20} className="text-gray-500 hover:text-pink-500 cursor-pointer" />
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