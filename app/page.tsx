"use client";
import { useState, useEffect } from "react";
import { Music, Search, Play, Pause, Heart, SkipBack, SkipForward, Volume2, Loader2 } from "lucide-react";
import YouTube from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";

const API_KEYS = [
  "AIzaSyD6-OdNvUqan2JsyPkGtDQm67VPGiyXXZk",
  "AIzaSyBrqfEYpyBc0HiMjNJcaBvSyOJM-ynha00",
  "AIzaSyCIFum0PPHPcgK5ns55D-BfGvYgT0uQLJE"
];

export default function MelodianSoul() {
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
    if (!query || typeof window === "undefined") return;

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
      if (index >= API_KEYS.length) throw new Error("API Limit Exceeded");
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query + " official music")}&type=video&videoCategoryId=10&key=${API_KEYS[index]}`
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
        localStorage.setItem(cacheKey, JSON.stringify(formatted));
        setSongs(formatted);
        if (formatted.length > 0) setCurrentSong(formatted[0]);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    searchMusic(moodKeywords[Math.floor(Math.random() * moodKeywords.length)]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying && player.getCurrentTime) {
        setCurrentTime(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full" />
        <div className="absolute -bottom-40 -right-20 w-[700px] h-[700px] bg-pink-600/10 blur-[150px] rounded-full" />
      </div>

      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl"><Music size={26} /></div>
          <h1 className="text-2xl font-black tracking-tighter">MelodianSoul</h1>
        </div>

        <div className="flex-1 max-w-xl mx-6 relative">
          <input 
            type="text" placeholder="Search your vibe..." 
            className="w-full bg-white/5 border border-white/10 px-12 py-3 rounded-2xl outline-none focus:bg-white/10 backdrop-blur-md"
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMusic(searchText)}
          />
          <Search size={20} className="absolute left-4 top-3.5 text-gray-500" />
          {loading && <Loader2 size={20} className="absolute right-4 top-3.5 text-pink-500 animate-spin" />}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-8">
          {currentSong ? (
            <div className="relative rounded-[3rem] bg-white/[0.02] border border-white/10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 backdrop-blur-3xl shadow-2xl">
              <div className="hidden">
                <YouTube 
                  videoId={currentSong.id} 
                  opts={{ playerVars: { autoplay: 1, controls: 0 } }} 
                  onReady={(e) => { setPlayer(e.target); e.target.setVolume(volume); }} 
                  onPlay={() => setIsPlaying(true)} 
                  onPause={() => setIsPlaying(false)} 
                  onEnd={() => {
                    const idx = songs.findIndex(s => s.id === currentSong.id);
                    setCurrentSong(songs[(idx + 1) % songs.length]);
                  }}
                />
              </div>
              <img src={currentSong.cover} className="w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] object-cover shadow-2xl" />
              <div className="text-center md:text-left flex-1">
                <h2 className="text-3xl md:text-5xl font-black mb-2 truncate max-w-md">{currentSong.title}</h2>
                <p className="text-xl text-gray-400 mb-8">{currentSong.artist}</p>
                <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white text-black px-12 py-4 rounded-full font-black flex items-center gap-3">
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />} {isPlaying ? "PAUSE" : "PLAY"}
                </button>
              </div>
            </div>
          ) : <div className="h-80 bg-white/5 rounded-[3rem] animate-pulse" />}
        </div>

        <div className="lg:col-span-4 bg-white/[0.04] p-8 rounded-[3rem] h-fit">
          <h3 className="text-xl font-black mb-6">Queue</h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {songs.map((song) => (
              <div key={song.id} onClick={() => setCurrentSong(song)} className="flex items-center gap-4 cursor-pointer hover:opacity-70">
                <img src={song.cover} className="w-12 h-12 rounded-lg object-cover" />
                <h4 className="font-bold text-xs truncate">{song.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>

      {currentSong && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] z-50">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] text-gray-500">
                {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
            </span>
            <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => player?.seekTo(parseFloat(e.target.value))} className="flex-1 h-1 accent-pink-500" />
            <span className="text-[10px] text-gray-500">
                {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 w-1/3">
                <img src={currentSong.cover} className="w-10 h-10 rounded-lg" />
                <h4 className="text-[10px] font-bold truncate hidden md:block">{currentSong.title}</h4>
            </div>
            <div className="flex items-center gap-6">
              <SkipBack className="cursor-pointer" onClick={() => {
                const idx = songs.findIndex(s => s.id === currentSong.id);
                setCurrentSong(songs[(idx - 1 + songs.length) % songs.length]);
              }} />
              <button onClick={() => isPlaying ? player?.pauseVideo() : player?.playVideo()} className="bg-white p-2 rounded-full text-black">
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
              </button>
              <SkipForward className="cursor-pointer" onClick={() => {
                const idx = songs.findIndex(s => s.id === currentSong.id);
                setCurrentSong(songs[(idx + 1) % songs.length]);
              }} />
            </div>
            <div className="w-1/3 flex justify-end gap-2 items-center">
              <Volume2 size={16} />
              <input type="range" min="0" max="100" value={volume} onChange={(e) => { setVolume(parseInt(e.target.value)); player?.setVolume(parseInt(e.target.value)); }} className="w-20" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
