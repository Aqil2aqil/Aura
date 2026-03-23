/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  MessageSquare, 
  Shield, 
  Activity, 
  Heart, 
  Send, 
  User, 
  Bot, 
  Volume2, 
  VolumeX,
  ChevronRight,
  Plus,
  Lock,
  History,
  Music,
  Music2
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import Markdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });



interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface HealthRecord {
  id: string;
  title: string;
  date: string;
  summary: string;
}

export default function App() {
  const [view, setView] = useState<'landing' | 'consultation' | 'locker' | 'privacy'>('landing');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Load records from local storage
  useEffect(() => {
    const savedRecords = localStorage.getItem('health_records');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);

  const saveRecord = (title: string, summary: string) => {
    const newRecord: HealthRecord = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      date: new Date().toLocaleDateString('az-AZ'),
      summary
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem('health_records', JSON.stringify(updated));
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('health_records', JSON.stringify(updated));
    setSelectedRecord(null);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages, userMsg].map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "Sən Aura adlı peşəkar, empatik və yüksək intellektual Süni İntellekt Tibbi Köməkçisisən. Məqsədin istifadəçilərə simptomlarını anlamağa kömək etmək, ümumi tibbi məsləhətlər vermək və nə vaxt peşəkar həkimə müraciət etməli olduqlarını bildirməkdir. Həmişə vurğula ki, sən süni intellektsən və real həkimi əvəz etmirsən. Cavabların qısa, dəstəkləyici və aydın olmalıdır. Markdown formatından istifadə et. Əgər istifadəçi ciddi bir təcili vəziyyət təsvir edərsə, dərhal təcili yardıma zəng etməyi tövsiyə et. Bütün cavablar Azərbaycan dilində olmalıdır.",
        }
      });

      const botContent = response.text || "Bağışlayın, bu sorğunu emal edə bilmədim.";
      const botMsg: Message = { role: 'bot', content: botContent, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      
      if (botContent.length > 300) {
        saveRecord("Məsləhət Xülasəsi", botContent);
      }
    } catch (error) {
      console.error("Gemini Error:", error instanceof Error ? error.message : "Unknown error");
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "Xəta baş verdi. Zəhmət olmasa bağlantınızı yoxlayın və ya yenidən cəhd edin.", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const speak = async (text: string) => {
    if (isSpeaking) {
      audioRef.current?.pause();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Sakit və peşəkar şəkildə de: ${text.substring(0, 500)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          audioRef.current.onended = () => setIsSpeaking(false);
        } else {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.play();
          audio.onended = () => setIsSpeaking(false);
        }
      }
    } catch (error) {
      console.error("TTS Error:", error instanceof Error ? error.message : "Unknown error");
      setIsSpeaking(false);
    }
  };

  const toggleMusic = () => {
    if (bgMusicRef.current) {
      if (isMusicPlaying) {
        bgMusicRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        const sources = [
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          "https://www.gstatic.com/voice/sounds/v1/ambient/ambient_ocean.mp3",
          "https://www.gstatic.com/voice/sounds/v1/ambient/ambient_forest.mp3",
          "https://www.gstatic.com/voice/sounds/v1/ambient/ambient_rain.mp3"
        ];
        
        let currentSourceIndex = 0;

        const tryPlay = (index: number) => {
          if (index >= sources.length) {
            console.error("All audio sources failed.");
            setIsMusicPlaying(false);
            return;
          }

          if (bgMusicRef.current) {
            // Update source and reload
            bgMusicRef.current.src = sources[index];
            bgMusicRef.current.load();
            
            const playPromise = bgMusicRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsMusicPlaying(true);
                })
                .catch(err => {
                  console.warn(`Source ${index} (${sources[index]}) failed:`, err);
                  setTimeout(() => tryPlay(index + 1), 500);
                });
            }
          }
        };

        tryPlay(currentSourceIndex);
      }
    }
  };

  return (
    <div className="min-h-screen relative font-sans selection:bg-medical-cyan/30">
      <div className="atmosphere" />
      
      {/* Background Music - Using JS-based fallback for maximum reliability */}
      <audio 
        ref={bgMusicRef} 
        loop 
        preload="auto"
        onError={() => {
          const error = bgMusicRef.current?.error;
          // Only log if we're not in the middle of switching sources
          if (isMusicPlaying) {
            console.error("Audio element error detected:", error ? `Code: ${error.code}, Message: ${error.message}` : "Unknown error");
            setIsMusicPlaying(false);
          }
        }}
      />
      
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 md:py-10 flex justify-between items-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 cursor-pointer group pointer-events-auto"
          onClick={() => setView('landing')}
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white text-black flex items-center justify-center medical-glow group-hover:scale-110 transition-transform relative overflow-hidden">
            <Stethoscope className="w-6 h-6 md:w-8 md:h-8 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white to-white/50" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl md:text-3xl tracking-tighter font-bold italic leading-none">Aura</span>
            <span className="text-[8px] uppercase tracking-[0.4em] font-bold text-white/20 mt-1">Health Intelligence</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-8 pointer-events-auto"
        >
          <div className="hidden md:flex items-center gap-12">
            {[
              { id: 'consultation', label: 'Məsləhət' },
              { id: 'locker', label: 'Arxiv' },
              { id: 'privacy', label: 'Məxfilik' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`text-[10px] uppercase tracking-[0.4em] font-bold transition-all relative py-2 ${
                  view === item.id ? 'text-white' : 'text-white/20 hover:text-white'
                }`}
              >
                {item.label}
                {view === item.id && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                  />
                )}
              </button>
            ))}
          </div>
          
          <button 
            onClick={toggleMusic}
            className={`w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] hover:bg-white/[0.1] transition-all cursor-pointer group ${isMusicPlaying ? 'text-medical-cyan' : 'text-white/40'}`}
            title="Arxa plan musiqisi"
          >
            {isMusicPlaying ? <Music className="w-5 h-5 animate-pulse" /> : <Music2 className="w-5 h-5" />}
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer group">
            <User className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
          </div>
        </motion.div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-black/40 backdrop-blur-2xl border-t border-white/[0.05] flex justify-around items-center">
        {[
          { id: 'consultation', label: 'Məsləhət', icon: MessageSquare },
          { id: 'locker', label: 'Panel', icon: Activity },
          { id: 'privacy', label: 'Məxfilik', icon: Shield }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${
              view === item.id ? 'text-blue-400' : 'text-white/30'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">{item.label}</span>
          </button>
        ))}
        <button 
          onClick={toggleMusic}
          className={`flex flex-col items-center gap-1 transition-all ${isMusicPlaying ? 'text-medical-cyan' : 'text-white/30'}`}
        >
          {isMusicPlaying ? <Music className="w-5 h-5 animate-pulse" /> : <Music2 className="w-5 h-5" />}
          <span className="text-[10px] uppercase tracking-widest font-bold">Musiqi</span>
        </button>
      </nav>

      <main className="pt-24 md:pt-32 pb-24 md:pb-12 px-4 md:px-6 max-w-7xl mx-auto min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-20 md:space-y-32"
            >
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-medical-cyan/20 blur-[100px] md:blur-[160px] rounded-full"
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-56 h-56 md:w-96 md:h-96 border border-white/[0.05] rounded-full flex items-center justify-center relative bg-white/[0.01] backdrop-blur-xl shadow-2xl"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t border-medical-cyan/30 rounded-full"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-8 border-b border-medical-purple/20 rounded-full"
                  />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Heart className="w-20 h-20 md:w-32 md:h-32 text-white medical-glow" />
                  </motion.div>
                </motion.div>
              </div>

              <div className="space-y-8 max-w-4xl">
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <h1 className="text-5xl md:text-9xl font-serif leading-[0.9] tracking-tighter text-reveal">
                    Gələcəyin <br />
                    <span className="italic">Sağlamlıq</span> <br />
                    İntellekti
                  </h1>
                </motion.div>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-white/40 text-lg md:text-2xl leading-relaxed font-light px-6 md:px-20"
                >
                  Aura ilə tibbi məsləhətləşmələri yenidən kəşf edin. 
                  Sizin şəxsi, təhlükəsiz və hər an yanınızda olan rəqəmsal həkiminiz.
                </motion.p>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col md:flex-row gap-6 w-full md:w-auto px-8 md:px-0"
              >
                <button 
                  onClick={() => setView('consultation')}
                  className="btn-primary w-full md:w-auto justify-center group"
                >
                  Məsləhətə Başla
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => setView('locker')}
                  className="btn-secondary w-full md:w-auto justify-center"
                >
                  Sağlamlıq Paneli
                </button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="flex flex-col items-center gap-4 opacity-20"
              >
                <span className="text-[10px] uppercase tracking-[0.5em] font-bold">Aşağı sürüşdürün</span>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-px h-12 bg-gradient-to-b from-white to-transparent"
                />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 w-full pt-20">
                {[
                  { icon: Shield, title: "Məxfi", desc: "Məlumatlarınız yalnız sizin cihazınızda şifrələnmiş halda saxlanılır." },
                  { icon: Activity, title: "Dəqiq", desc: "Ən son tibbi biliklərə əsaslanan yüksək dəqiqlikli analiz." },
                  { icon: Lock, title: "Təhlükəsiz", desc: "Məxfiliyiniz bizim üçün ən yüksək prioritetdir." }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.5, duration: 0.8 }}
                    className="glass-card p-10 space-y-6 text-left group hover:bg-white/[0.05]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:scale-110 transition-transform border border-white/[0.05]">
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-serif italic">{item.title}</h3>
                      <p className="text-sm text-white/30 leading-relaxed font-light">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Decorative Music Card */}
              <motion.div 
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="w-full max-w-2xl mx-auto pt-20 pb-10"
              >
                <div 
                  onClick={toggleMusic}
                  className="glass-card p-6 space-y-4 cursor-pointer hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isMusicPlaying ? 'bg-medical-cyan/20 text-medical-cyan' : 'bg-white/5 text-white/40'}`}>
                        <Music className={`w-5 h-5 ${isMusicPlaying ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 block">Atmosferik Musiqi</span>
                        <span className="text-sm font-serif italic text-white/80">Təbiət Səsləri və Ruhun Sakitliyi</span>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-medical-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMusicPlaying ? 'Dayandır' : 'Dinlə'}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'consultation' && (
            <motion.div 
              key="consultation"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -20 }}
              className="flex-1 flex flex-col glass-card overflow-hidden border-white/[0.05] shadow-2xl"
            >
              <div className="p-6 md:p-10 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01] backdrop-blur-3xl">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] relative">
                    <Bot className="text-white w-7 h-7 md:w-9 md:h-9" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-medical-cyan rounded-full border-4 border-deep-space animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-3xl font-serif italic">Aura İntellekti</h2>
                    <p className="text-[10px] md:text-xs text-medical-cyan flex items-center gap-2 font-bold tracking-widest uppercase mt-1">
                      Sistem Onlayndır
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setMessages([])}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-white/[0.05] rounded-xl md:rounded-2xl text-white/30 hover:text-white transition-all border border-white/[0.05]"
                    title="Təmizlə"
                  >
                    <History className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 md:space-y-12 scroll-smooth custom-scrollbar bg-gradient-to-b from-transparent to-white/[0.01]">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-10">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-white/10 flex items-center justify-center">
                      <MessageSquare className="w-12 h-12 md:w-16 md:h-16" />
                    </div>
                    <p className="max-w-md text-xl md:text-2xl font-serif italic">Söhbətə başlamaq üçün simptomlarınızı və ya suallarınızı yazın.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[95%] md:max-w-[80%] flex gap-4 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center shadow-2xl ${msg.role === 'user' ? 'bg-white text-black' : 'bg-white/[0.03] border border-white/[0.05]'}`}>
                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden ${
                        msg.role === 'user' 
                          ? 'bg-white text-black rounded-tr-none' 
                          : 'bg-white/[0.02] border border-white/[0.05] rounded-tl-none backdrop-blur-xl'
                      }`}>
                        {msg.role === 'bot' && <div className="absolute inset-0 shimmer opacity-5" />}
                        <div className="markdown-body relative z-10">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        <div className={`flex items-center justify-between gap-8 pt-6 border-t relative z-10 ${msg.role === 'user' ? 'border-black/5' : 'border-white/[0.05]'}`}>
                          <span className={`text-[10px] font-mono tracking-[0.2em] uppercase ${msg.role === 'user' ? 'text-black/40' : 'text-white/20'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.role === 'bot' && (
                            <button 
                              onClick={() => speak(msg.content)}
                              className="p-2 hover:bg-white/[0.05] rounded-xl transition-all active:scale-90"
                            >
                              {isSpeaking ? <VolumeX className="w-5 h-5 text-medical-cyan" /> : <Volume2 className="w-5 h-5 text-white/20 hover:text-white" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.02] border border-white/[0.05] p-6 md:p-8 rounded-[2rem] rounded-tl-none flex gap-4 items-center relative overflow-hidden backdrop-blur-xl">
                      <div className="absolute inset-0 shimmer opacity-10" />
                      <div className="flex gap-2 relative z-10">
                        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-white rounded-full" />
                        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-white rounded-full" />
                        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] ml-2 relative z-10">Aura təhlil edir</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 md:p-12 bg-white/[0.01] border-t border-white/[0.05] backdrop-blur-3xl">
                <div className="relative group max-w-5xl mx-auto">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Simptomlarınızı təsvir edin..."
                    className="w-full bg-white/[0.02] border border-white/[0.1] rounded-full py-5 md:py-7 pl-8 md:pl-12 pr-20 md:pr-24 focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-all text-lg md:text-xl placeholder:text-white/10"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2.5 top-2.5 bottom-2.5 px-6 md:px-10 bg-white text-black rounded-full hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-2xl flex items-center justify-center active:scale-95 font-bold"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex justify-center gap-10 mt-8 opacity-20">
                  <p className="text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 font-bold">
                    <Shield className="w-3 h-3" />
                    Uçdan-uca şifrələmə
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 font-bold">
                    <Activity className="w-3 h-3" />
                    Tibbi İntellekt v2.5
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'locker' && (
            <motion.div 
              key="locker"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex-1 flex flex-col space-y-16"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div className="space-y-4">
                  <motion.h2 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-5xl md:text-8xl font-serif tracking-tighter"
                  >
                    Sağlamlıq <br /> <span className="italic text-white/40">Arxiviniz</span>
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/30 text-xl md:text-2xl font-light"
                  >
                    Bütün tibbi məsləhətlər və qeydlər bir yerdə.
                  </motion.p>
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-6 py-3 bg-white/[0.03] border border-white/[0.1] text-white/60 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase backdrop-blur-xl"
                >
                  <Lock className="w-4 h-4" />
                  Lokal Yaddaş
                </motion.div>
              </div>

              <div className="bento-grid pb-20">
                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  className="bento-item border-dashed border-white/10 h-64 md:h-80 group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center group-hover:rotate-90 transition-transform duration-700 border border-white/[0.05]">
                    <Plus className="text-white w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <span className="font-serif italic text-3xl block">Yeni Qeyd</span>
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">Manual Əlavə Et</span>
                  </div>
                </motion.button>

                {records.map((record, index) => (
                  <motion.div 
                    key={record.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="bento-item h-64 md:h-80 group cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] group-hover:scale-110 transition-transform">
                        <History className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest bg-white/[0.03] px-4 py-1.5 rounded-full border border-white/[0.05]">{record.date}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-serif italic text-3xl group-hover:text-medical-cyan transition-colors line-clamp-1">{record.title}</h3>
                      <p className="text-sm text-white/30 line-clamp-2 leading-relaxed font-light">
                        {record.summary}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-colors">
                      Hesabata Bax <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}

                {records.length === 0 && (
                  <div className="col-span-full py-40 text-center space-y-8 opacity-5">
                    <Lock className="w-32 h-32 mx-auto" />
                    <p className="text-4xl font-serif italic">Arxiv boşdur</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'privacy' && (
            <motion.div 
              key="privacy"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex-1 flex flex-col space-y-20 max-w-5xl mx-auto pb-20"
            >
              <div className="text-center space-y-8">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-28 h-28 bg-white/[0.03] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-white/[0.05] shadow-2xl"
                >
                  <Shield className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-5xl md:text-8xl font-serif tracking-tighter">Məxfilik <br /> <span className="italic text-white/40">Siyasətimiz</span></h2>
                <p className="text-white/30 text-xl md:text-3xl font-light max-w-3xl mx-auto leading-relaxed">
                  Sizin məlumatlarınız sizin mülkiyyətinizdir. Biz yalnız onları qorumaq üçün buradayıq.
                </p>
              </div>

              <div className="grid gap-8">
                {[
                  { 
                    title: "Lokal Yaddaş", 
                    desc: "Bütün sağlamlıq qeydləriniz yalnız cihazınızda saxlanılır. Biz heç vaxt məlumatlarınıza daxil olmuruq.",
                    icon: Lock
                  },
                  { 
                    title: "Anonim Analiz", 
                    desc: "Süni İntellektlə söhbətlər anonimdir və heç bir modelin təlimi üçün istifadə edilmir.",
                    icon: Bot
                  },
                  { 
                    title: "Tam Nəzarət", 
                    desc: "İstədiyiniz zaman bütün qeydlərinizi silə və ya arxivləşdirə bilərsiniz. Nəzarət həmişə sizdədir.",
                    icon: Shield
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-12 flex flex-col md:flex-row gap-10 items-start md:items-center group"
                  >
                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/[0.05] group-hover:scale-110 transition-transform">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-3 flex-1">
                      <h3 className="text-3xl font-serif italic">{item.title}</h3>
                      <p className="text-white/30 leading-relaxed text-xl font-light">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-12 glass-card bg-white/[0.01] border-white/[0.05] text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer opacity-10" />
                <p className="text-xs text-white/20 relative z-10 font-bold tracking-[0.4em] uppercase">
                  Aura Health Intelligence • 2026 Təhlükəsizlik Protokolu
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Full Screen Report Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full bg-[#050505] flex flex-col relative overflow-hidden"
            >
              {/* Scanline effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
              
              <div className="p-6 md:p-12 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01] backdrop-blur-3xl sticky top-0 z-10">
                <div className="flex items-center gap-6 md:gap-10">
                  <div className="p-4 md:p-6 bg-white/[0.03] rounded-2xl md:rounded-[2rem] border border-white/[0.05]">
                    <History className="w-6 h-6 md:w-10 md:h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-6xl font-serif italic tracking-tighter line-clamp-1">{selectedRecord.title}</h2>
                    <p className="text-[10px] md:text-xs text-white/20 uppercase tracking-[0.4em] md:tracking-[0.8em] mt-2 font-bold">{selectedRecord.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <button 
                    onClick={() => deleteRecord(selectedRecord.id)}
                    className="px-6 md:px-10 py-3 md:py-4 bg-white/[0.03] text-white/40 border border-white/[0.05] rounded-full text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-95"
                  >
                    Sil
                  </button>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-[2.5rem] bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-2xl"
                  >
                    <Plus className="w-8 h-8 md:w-12 md:h-12 rotate-45" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto p-8 md:p-32">
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="markdown-body"
                  >
                    <Markdown>{selectedRecord.summary}</Markdown>
                  </motion.div>
                </div>
              </div>

              <div className="p-8 md:p-16 bg-white/[0.01] border-t border-white/[0.05] text-center backdrop-blur-3xl">
                <p className="text-[10px] text-white/10 uppercase tracking-[1em] font-bold">
                  Aura Health Intelligence • Məxfi Arxiv Sənədi
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Stats */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-4 flex justify-between items-center text-[10px] text-white/20 uppercase tracking-[0.2em]">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            System Optimal
          </div>
          <div>Latency: 24ms</div>
        </div>
        <div>© 2026 Aura Health Intelligence</div>
      </footer>
    </div>
  );
}
