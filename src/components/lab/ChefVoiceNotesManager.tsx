import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ChefHat,
  Tag,
  Clock,
  AlertTriangle,
  FileText,
  Save,
  Plus,
  Trash2,
  Flame,
  Snowflake,
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  Radio,
  ExternalLink,
  ChevronDown,
  Layers,
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import {
  getChefVoiceNotes,
  saveChefVoiceNote,
  updateChefVoiceNote,
  deleteChefVoiceNote,
  applyVoiceNoteToRecipe,
  getRecipes,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import { ChefVoiceNote, VoiceNoteCategory, ChefStation, Recipe } from '../../types';

const CATEGORY_CONFIG: Record<
  VoiceNoteCategory,
  { label: string; icon: any; color: string; badgeBg: string }
> = {
  RECIPE_MODIFICATION: {
    label: 'Modification Recette',
    icon: ChefHat,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  PRODUCTION_RUN: {
    label: 'Note de Tournée / Pousse',
    icon: Clock,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  OVEN_INCIDENT: {
    label: 'Incident Four & Cuisson',
    icon: Flame,
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  },
  RAW_MATERIAL_QUALITY: {
    label: 'Qualité Matières Premières',
    icon: AlertTriangle,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  HYGIENE_HACCP: {
    label: 'Hygiène & HACCP',
    icon: Sparkles,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  GENERAL: {
    label: 'Note Générale Labo',
    icon: FileText,
    color: 'text-slate-300',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
};

const STATIONS: { id: ChefStation; label: string }[] = [
  { id: 'TOURNAGE_VIENNOISERIE', label: '🥐 Tourage & Viennoiserie' },
  { id: 'PATISSERIE_FINE', label: '🍰 Pâtisserie Fine & Tartes' },
  { id: 'ENTREMETS_GLACES', label: '🍫 Entremets & Chocolaterie' },
  { id: 'FOURS_CUISSON', label: '🔥 Fours & Cuissons' },
  { id: 'TRAITEUR_SALÉ', label: '🥪 Traiteur & Salé' },
  { id: 'LABO_CENTRAL', label: '🏢 Labo Central / Direction' }
];

const CHEF_PRESETS = [
  'Chef Hakim (Chef Exécutif)',
  'Yacine (Chef de Partie Entremets)',
  'Karim (Responsable Cuissons & Fours)',
  'Amine (Pâtissier Tourage)',
  'Sarah (Apprentie Pâtisserie)'
];

const QUICK_VOICE_SNIPPETS = [
  { label: 'Chaleur Labo + Repos', text: 'Température ambiante élevée au labo. Augmenter le temps de repos au froid de 15 minutes.' },
  { label: 'Ajustement Dosage Sucre', text: 'Réduire le sucre de 10% sur la crème pâtissière pour équilibrer l’acidité des fruits.' },
  { label: 'Four Surchauffe', text: 'Four à sole surchauffe sole inférieure. Baisser de 10°C et retourner les plaques à 15 minutes.' },
  { label: 'Lot Chocolat Dense', text: 'Le nouveau lot de chocolat Valrhona est plus dense. Augmenter le liquide de 20ml pour le glaçage.' }
];

export const ChefVoiceNotesManager: React.FC = () => {
  const [notes, setNotes] = useState<ChefVoiceNote[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [selectedChef, setSelectedChef] = useState<string>(CHEF_PRESETS[0]);
  const [selectedStation, setSelectedStation] = useState<ChefStation>('TOURNAGE_VIENNOISERIE');
  const [selectedCategory, setSelectedCategory] = useState<VoiceNoteCategory>('RECIPE_MODIFICATION');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [severity, setSeverity] = useState<'normal' | 'important' | 'critical'>('normal');
  const [language, setLanguage] = useState<'fr-FR' | 'ar-DZ' | 'en-US'>('fr-FR');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio stream visualizer & media recorder
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Filter & Search
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStation, setFilterStation] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = () => {
    setNotes(getChefVoiceNotes());
    setRecipes(getRecipes());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(loadData);
    return () => unsubscribe();
  }, []);

  // Web Audio Tone Feedback for Hands-Free Operation
  const playBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text + ' ';
          } else {
            interim += text;
          }
        }

        if (final) {
          setTranscript((prev) => {
            const formatted = formatSpokenText(final);
            return prev ? `${prev} ${formatted}` : formatted;
          });
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          notifyToast({
            type: 'error',
            title: 'Microphone Refusé',
            message: 'Veuillez autoriser l’accès au microphone dans les paramètres de votre navigateur.'
          });
          stopRecording();
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch {
            // Ignore restart exceptions
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, isRecording]);

  // Text formatting for spoken measurements & punctuation
  const formatSpokenText = (text: string): string => {
    let formatted = text
      .replace(/\bvirgule\b/gi, ',')
      .replace(/\bpoint\b/gi, '.')
      .replace(/\bnouvelle ligne\b/gi, '\n')
      .replace(/\bà la ligne\b/gi, '\n')
      .replace(/\bdegrés\b/gi, '°C')
      .replace(/\bdegré\b/gi, '°C')
      .replace(/\bgrammes\b/gi, 'g')
      .replace(/\bgramme\b/gi, 'g')
      .replace(/\bkilos\b/gi, 'kg')
      .replace(/\bkilo\b/gi, 'kg')
      .replace(/\bminutes\b/gi, 'min')
      .replace(/\bminute\b/gi, 'min')
      .replace(/\bheures\b/gi, 'h')
      .replace(/\bheure\b/gi, 'h')
      .replace(/\bpourcent\b/gi, '%')
      .replace(/\bpour cent\b/gi, '%');

    // Auto-detect recipe association if spoken
    recipes.forEach((r) => {
      if (new RegExp(`\\b${r.name}\\b`, 'i').test(text)) {
        setSelectedRecipeId(r.id);
        setSelectedCategory('RECIPE_MODIFICATION');
      }
    });

    return formatted;
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      playBeep(520, 'sine', 0.12);
      setIsRecording(true);
      setTranscript('');
      setInterimText('');
      setRecordingDuration(0);
      setAudioBlobUrl(null);
      audioChunksRef.current = [];

      // Audio Context for Decibel Level Bar
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // MediaRecorder for playback blob
      try {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioBlobUrl(url);
        };
        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
      } catch {
        // MediaRecorder optional
      }

      // Start Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already running
        }
      }

      // Duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      notifyToast({
        type: 'info',
        title: 'Microphone Activé',
        message: 'Dictée vocale active en direct. Parlez librement de vos observations ou ajustements.'
      });
    } catch (err: any) {
      setIsRecording(false);
      notifyToast({
        type: 'error',
        title: 'Erreur Microphone',
        message: err?.message || 'Impossible d’accéder au microphone.'
      });
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    playBeep(330, 'triangle', 0.18);
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }

    setAudioLevel(0);
  };

  // Save Voice Note to Central Lab Storage
  const handleSaveNote = () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      notifyToast({
        type: 'warning',
        title: 'Note Vocale Vide',
        message: 'Aucun texte dicté à enregistrer.'
      });
      return;
    }

    // Auto extract smart tags
    const detectedTags: string[] = [];
    const recipeObj = recipes.find((r) => r.id === selectedRecipeId);
    if (recipeObj) detectedTags.push(recipeObj.name);

    if (fullText.includes('°C') || /four|cuisson/i.test(fullText)) detectedTags.push('Cuisson');
    if (/beurre|farine|chocolat|sucre|vanille/i.test(fullText)) detectedTags.push('Ingrédients');
    if (/repos|pointage|chambre froide|froid/i.test(fullText)) detectedTags.push('Pousse & Froid');
    if (/tourage|pâton|feuilletage/i.test(fullText)) detectedTags.push('Tourage');
    if (/haccp|hygiène|température/i.test(fullText)) detectedTags.push('HACCP');

    const newNote = saveChefVoiceNote({
      chefName: selectedChef,
      station: selectedStation,
      category: selectedCategory,
      recipeId: selectedRecipeId || undefined,
      recipeName: recipeObj?.name || undefined,
      transcript: fullText,
      audioBlobUrl: audioBlobUrl || undefined,
      durationSeconds: recordingDuration || 15,
      tags: Array.from(new Set(detectedTags)),
      severity,
      status: selectedCategory === 'RECIPE_MODIFICATION' && selectedRecipeId ? 'PENDING_REVIEW' : 'RESOLVED'
    });

    notifyToast({
      type: 'success',
      title: 'Note Vocale Enregistrée',
      message: `Note ${newNote.noteNumber} ajoutée avec succès au registre du laboratoire central.`
    });

    // Reset Form
    setTranscript('');
    setInterimText('');
    setRecordingDuration(0);
    setAudioBlobUrl(null);
    setSelectedRecipeId('');
    setSeverity('normal');
  };

  // 1-Click: Apply Voice Note directly to the Recipe's instruction sheet
  const handleApplyToRecipe = (noteId: string) => {
    const result = applyVoiceNoteToRecipe(noteId, selectedChef);
    if (result.success) {
      notifyToast({
        type: 'success',
        title: 'Fiche Technique Mise à Jour !',
        message: `Les consignes de la recette "${result.recipeName}" ont été modifiées avec succès.`
      });
    } else {
      notifyToast({
        type: 'error',
        title: 'Erreur d’Application',
        message: 'Impossible de trouver la recette associée à cette note.'
      });
    }
  };

  // Play audio preview
  const handleTogglePlayAudio = (noteId: string, url?: string) => {
    if (!url) return;
    if (isPlayingAudio === noteId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      setIsPlayingAudio(null);
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(null);
      audio.play().catch(() => {});
      setIsPlayingAudio(noteId);
    }
  };

  // Copy transcript
  const handleCopyTranscript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    notifyToast({
      type: 'info',
      title: 'Copié dans le Presse-Papier',
      message: 'Transcription copiée avec succès.'
    });
  };

  // Filtered Notes
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = filterCategory === 'ALL' || n.category === filterCategory;
    const matchesStation = filterStation === 'ALL' || n.station === filterStation;
    const matchesStatus = filterStatus === 'ALL' || n.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      n.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.chefName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.recipeName && n.recipeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      n.noteNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStation && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Mic className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Dictée Vocale & Notes de Production
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                Hands-Free Labo
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Enregistrez vos observations, incidents de cuisson et ajustements de recettes sans toucher l'écran, les mains dans la farine ou au fournil.
            </p>
          </div>
        </div>

        {/* Language selector & quick indicators */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-400">Langue :</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="fr-FR" className="bg-slate-900 text-white">🇫🇷 Français (Labo)</option>
              <option value="ar-DZ" className="bg-slate-900 text-white">🇩🇿 Arabe (Algérie)</option>
              <option value="en-US" className="bg-slate-900 text-white">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Hands-Free Recording Studio Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hands-Free Voice Deck (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            {/* Chef Station & Identity Meta Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  👨‍🍳 Chef Intervenant
                </label>
                <select
                  value={selectedChef}
                  onChange={(e) => setSelectedChef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {CHEF_PRESETS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  📍 Poste / Station Labo
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {STATIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Recipe Association */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  📂 Type d'Observation
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  🥐 Fiche Technique / Recette
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="">-- Aucune (Note Générale) --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Giant Hands-Free Record Button & Audio Waveform */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
              {isRecording && (
                <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
              )}

              {/* Central Pulsing Microphone Button */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping" />
                )}
                <button
                  id="chef-voice-record-btn"
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 cursor-pointer active:scale-95 ${
                    isRecording
                      ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 scale-105 shadow-rose-600/40'
                      : 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-4 ring-amber-400/20 shadow-amber-400/20'
                  }`}
                  aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer la dictée vocale"}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 animate-bounce" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
              </div>

              {/* Status & Timer */}
              <div>
                <div className="text-base font-black text-white">
                  {isRecording ? 'Écoute active en direct...' : 'Toucher pour dicter les mains-libres'}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  {isRecording
                    ? `Enregistrement : ${Math.floor(recordingDuration / 60)}m ${recordingDuration % 60}s`
                    : 'Le texte transcrit s’ajustera automatiquement'}
                </div>
              </div>

              {/* Live Audio Decibel Waveform Simulation */}
              {isRecording && (
                <div className="w-full max-w-md flex items-center justify-center gap-1.5 h-8 px-4">
                  {[...Array(24)].map((_, idx) => {
                    const height = Math.max(12, Math.min(100, (audioLevel * (idx % 4 + 1)) / 2));
                    return (
                      <motion.div
                        key={idx}
                        className="w-1.5 bg-rose-500 rounded-full"
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spoken Text Live Box */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Transcription Vocale en Direct
                </label>
                {(transcript || interimText) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('');
                      setInterimText('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors"
                  >
                    Effacer le texte
                  </button>
                )}
              </div>

              <div className="min-h-[120px] max-h-[220px] overflow-y-auto w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 leading-relaxed font-sans focus-within:border-amber-400">
                {transcript || interimText ? (
                  <p>
                    <span className="text-white font-medium">{transcript}</span>
                    {interimText && (
                      <span className="text-amber-400/80 italic ml-1">{interimText}...</span>
                    )}
                  </p>
                ) : (
                  <span className="text-slate-600 italic">
                    Exemple : « Tournée croissants : chaleur labo à 26°C. Réduire pointage à 20 min et repos 45 min en chambre froide à 3°C... »
                  </span>
                )}
              </div>
            </div>

            {/* Quick Voice Template Snippets */}
            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                ⚡ Exemples & Raccourcis Rapides :
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_VOICE_SNIPPETS.map((snip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript((prev) => (prev ? `${prev} ${snip.text}` : snip.text));
                      notifyToast({
                        type: 'info',
                        title: 'Modèle Inséré',
                        message: `Extrait "${snip.label}" ajouté à la note.`
                      });
                    }}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    {snip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Priorité :</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['normal', 'important', 'critical'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold capitalize transition-all cursor-pointer ${
                      severity === sev
                        ? sev === 'critical'
                          ? 'bg-rose-600 text-white'
                          : sev === 'important'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev === 'normal' ? 'Normale' : sev === 'important' ? 'Importante' : 'Critique'}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="chef-voice-save-btn"
              type="button"
              onClick={handleSaveNote}
              disabled={isRecording || (!transcript && !interimText)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer la Note Vocale</span>
            </button>
          </div>
        </div>

        {/* Right Column: Hands-Free Voice Commands Guide & Active Handover Notes (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Hands-Free Voice Commands Cheat-Sheet Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Wand2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Commandes Vocales Automatiques</h3>
                <p className="text-xs text-slate-400">Le système formate automatiquement les mesures</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/70">
                <span className="text-slate-400">« cent quatre-vingts degrés »</span>
                <span className="font-mono font-bold text-amber-400">→ 180°C</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/70">
                <span className="text-slate-400">« deux cent cinquante grammes »</span>
                <span className="font-mono font-bold text-emerald-400">→ 250g</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/70">
                <span className="text-slate-400">« quarante-cinq minutes »</span>
                <span className="font-mono font-bold text-indigo-400">→ 45 min</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/70">
                <span className="text-slate-400">« à la ligne / nouvelle ligne »</span>
                <span className="font-mono font-bold text-purple-400">→ Saut de ligne ↵</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-2xl font-black text-white">{notes.length}</span>
              <span className="block text-xs font-bold text-slate-400 mt-1 uppercase">Notes Enregistrées</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-2xl font-black text-amber-400">
                {notes.filter((n) => n.status === 'APPLIED_TO_RECIPE').length}
              </span>
              <span className="block text-xs font-bold text-slate-400 mt-1 uppercase">Fiches Modifiées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Handover Log & Registered Notes Registry */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Journal des Notes Vocales & Passations Labo ({filteredNotes.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historique complet des consignes vocales, ajustements de fabrication et passations de quart.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par mot-clé, chef ou recette..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-64"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Toutes Catégories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Tous les Postes</option>
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes Cards List */}
        {filteredNotes.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center">
            <Mic className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-400">Aucune note vocale trouvée</div>
            <p className="text-xs text-slate-600 mt-1">
              Activez le micro pour enregistrer votre première consigne de production.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const catCfg = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.GENERAL;
              const CatIcon = catCfg.icon;

              return (
                <div
                  key={note.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition-all hover:border-slate-700 flex flex-col justify-between space-y-4 ${
                    note.severity === 'critical'
                      ? 'border-rose-500/40 shadow-rose-950/20'
                      : note.status === 'APPLIED_TO_RECIPE'
                      ? 'border-emerald-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header: Note Number, Badges & Time */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-amber-400">
                          {note.noteNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${catCfg.badgeBg}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {catCfg.label}
                        </span>
                        {note.severity === 'critical' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white animate-pulse">
                            CRITIQUE
                          </span>
                        )}
                        {note.status === 'APPLIED_TO_RECIPE' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Fiche Modifiée
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(note.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Author & Recipe info */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                      <span className="font-semibold text-slate-200">👨‍🍳 {note.chefName}</span>
                      <span>•</span>
                      <span>{note.station.replace(/_/g, ' ')}</span>
                      {note.recipeName && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <ChefHat className="w-3.5 h-3.5" />
                            {note.recipeName}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Transcript Body */}
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80">
                      « {note.transcript} »
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {note.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyTranscript(note.id, note.transcript)}
                        className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copier le texte"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[11px]">{copiedId === note.id ? 'Copié' : 'Copier'}</span>
                      </button>

                      {note.audioBlobUrl && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayAudio(note.id, note.audioBlobUrl)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {isPlayingAudio === note.id ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">Écouter l'audio</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {note.recipeId && note.status !== 'APPLIED_TO_RECIPE' && (
                        <button
                          type="button"
                          onClick={() => handleApplyToRecipe(note.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Appliquer à la Recette</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          deleteChefVoiceNote(note.id);
                          notifyToast({
                            type: 'info',
                            title: 'Note Supprimée',
                            message: `La note vocale ${note.noteNumber} a été effacée.`
                          });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Supprimer la note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
