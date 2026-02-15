"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, LogIn, LogOut, Volume2 } from "lucide-react";
import YouTube from "react-youtube";
import { motion } from "framer-motion";

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

  const moodKeywords = ["Bangla Lofi", "Coke Studio Bangla", "Pritom Hasan"];

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
    } catch (err) { console.error(err); }
  };

  const playNext = () => {
    const idx = songs.findIndex(s => s.id === currentSong?.id);
    if (idx !== -1) setCurrentSong(songs[(idx + 1) % songs.length]);
  };

  const playPrev = () => {
    const idx = songs.findIndex(s => s.id === currentSong?.id);
    if (idx !== -1) setCurrentSong(songs[(idx - 1 + songs.length) % songs.length]);
  };

  useEffect(() => {
    setMounted(true);
    searchMusic(moodKeywords[Math.floor(Math.random() * moodKeywords.length)]);
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

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
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 relative overflow-hidden">
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl"><Music size={24} /></div>
          <h1 className="text-xl font-bold">MelodianSoul</h1>
        </div>
        <div className="flex-1 max-w-xl mx-6 relative">
          <input type="text" placeholder="Search..." className="w-full bg-white/5 border border-white/10 px-10 py-2 rounded-xl outline-none" 
            onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMusic(searchText)} />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-500" />
        </div>
        {user ? <button onClick={() => signOut(auth)} className="text-xs bg-white/10 px-4 py-2 rounded-full">Logout</button> : 
                <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-purple-600 px-4 py-2 rounded-full text-xs font-bold">Login</button>}
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-8 space-y-8">
          {currentSong && (
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 backdrop-blur-xl">
              <div className="hidden"><YouTube videoId={currentSong.id} opts={{playerVars:{autoplay:1}}} onEnd={playNext} onReady={e => setPlayer(e.target)} onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)} /></div>
              <img src={currentSong.cover} className="w-64 h-64 rounded-2xl object-cover shadow-2xl" />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">{currentSong.title}</h2>
                <p className="text-gray-400 mb-6">{currentSong.artist}</p>
                <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black px-8 py-3 rounded-full font-bold">
                  {isPlaying ? "PAUSE" : "PLAY NOW"}
                </button>
              </div>
            </div>
          )}
          <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-6">
            <h3 className="mb-4 font-bold uppercase text-xs tracking-widest text-pink-500">Your Vibe List</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {songs.map(song => (
                <div key={song.id} onClick={() => setCurrentSong(song)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${currentSong?.id === song.id ? "bg-white/10" : "hover:bg-white/5"}`}>
                  <img src={song.cover} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="overflow-hidden"><h4 className="text-sm font-medium truncate">{song.title}</h4></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white/[0.03] p-6 rounded-[2rem] border border-white/10 h-fit">
          <h3 className="mb-4 font-bold text-sm">Discovery Queue</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {songs.slice(10, 30).map(song => (
              <div key={song.id} onClick={() => setCurrentSong(song)} className="flex items-center gap-3 cursor-pointer hover:translate-x-1 transition-transform">
                <img src={song.cover} className="w-14 h-14 rounded-xl object-cover" />
                <div className="overflow-hidden"><h4 className="text-[10px] font-bold truncate">{song.title}</h4></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {currentSong && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/80 backdrop-blur-2xl border border-white/10 p-4 rounded-full z-50">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3 w-1/4 truncate">
              <img src={currentSong.cover} className="w-10 h-10 rounded-lg" />
              <div className="hidden sm:block"><h4 className="text-[10px] font-bold truncate">{currentSong.title}</h4></div>
            </div>
            <div className="flex items-center gap-6">
              <SkipBack size={20} className="cursor-pointer" onClick={playPrev} />
              <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black p-2.5 rounded-full">
                {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" />}
              </button>
              <SkipForward size={20} className="cursor-pointer" onClick={playNext} />
            </div>
            <div className="w-1/4 flex justify-end items-center gap-4">
              <Volume2 size={18} className="text-gray-400" />
              <input type="range" min="0" max="100" value={volume} onChange={e => {setVolume(parseInt(e.target.value)); player?.setVolume(parseInt(e.target.value))}} className="w-20 h-1 accent-pink-500" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
