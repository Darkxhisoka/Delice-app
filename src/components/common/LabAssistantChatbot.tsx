import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronDown,
  RefreshCw,
  ChefHat,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Minimize2,
  Maximize2,
  BookOpen,
  Wrench,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const LabAssistantChatbot: React.FC = () => {
  const { t, i18n } = useTranslation();

  const presetQuestions = [
    {
      category: t('navbar.lab', 'Flux Lab'),
      question: t('labAssistant.topic1', 'Comment traiter et valider une réquisition boutique ?'),
      icon: '📋'
    },
    {
      category: t('navbar.inventory', 'Pâtisserie'),
      question: t('labAssistant.topic2', 'Ma ganache au chocolat est tranchée, comment la rattraper ?'),
      icon: '🍫'
    },
    {
      category: t('navbar.production', 'Production'),
      question: t('labAssistant.topic3', 'Comment fonctionne la cascade de production (sous-lots) ?'),
      icon: '👨‍🍳'
    },
    {
      category: t('navbar.inventory', 'Stock'),
      question: t('labAssistant.topic4', 'Comment utiliser le scanner code-barres pour la réception ?'),
      icon: '📦'
    },
    {
      category: t('navbar.costs', 'Coût'),
      question: t('labAssistant.topic5', 'Comment est calculé le coût de revient d\'une recette ?'),
      icon: '💰'
    },
    {
      category: t('navbar.quality', 'Dépannage'),
      question: t('labAssistant.topic6', 'Pourquoi ma pâte feuilletée se rétracte à la cuisson ?'),
      icon: '🥐'
    }
  ];

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: t('labAssistant.welcomeMessage', "Bonjour et bienvenue au **Laboratoire Central de Pâtisserie le Délice** ! 👨‍🍳\n\nJe suis **Chef Émile**, votre assistant virtuel. Je suis là pour vous former aux flux de travail du laboratoire, vous expliquer le fonctionnement de la plateforme ou vous aider à résoudre un problème technique en pâtisserie.\n\nPosez-moi une question ou choisissez un sujet ci-dessous !"),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Update initial welcome message if language changes and only welcome message exists
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-1') {
        return [
          {
            id: 'welcome-1',
            role: 'assistant',
            content: t('labAssistant.welcomeMessage', "Bonjour et bienvenue au **Laboratoire Central de Pâtisserie le Délice** ! 👨‍🍳\n\nJe suis **Chef Émile**, votre assistant virtuel. Je suis là pour vous former aux flux de travail du laboratoire, vous expliquer le fonctionnement de la plateforme ou vous aider à résoudre un problème technique en pâtisserie.\n\nPosez-moi une question ou choisissez un sujet ci-dessous !"),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }
      return prev;
    });
  }, [i18n.language, t]);

  // Draggable Floating Button State & Refs
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Helper to dynamically measure mobile safe area insets (notches, home bars)
  const getSafeAreaInsets = () => {
    if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '0';
    div.style.height = '0';
    div.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    div.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    div.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
    div.style.paddingRight = 'env(safe-area-inset-right, 0px)';
    div.style.pointerEvents = 'none';
    div.style.visibility = 'hidden';
    document.body.appendChild(div);
    const cs = window.getComputedStyle(div);
    const top = parseFloat(cs.paddingTop) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    const left = parseFloat(cs.paddingLeft) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    document.body.removeChild(div);
    return { top, bottom, left, right };
  };

  // Handle window resizing to keep floating button within safe screen bounds
  useEffect(() => {
    const handleResize = () => {
      if (position && buttonRef.current) {
        const insets = getSafeAreaInsets();
        const rect = buttonRef.current.getBoundingClientRect();
        const minX = insets.left + 10;
        const minY = insets.top + 10;
        const maxX = window.innerWidth - rect.width - insets.right - 10;
        const maxY = window.innerHeight - rect.height - insets.bottom - 10;

        setPosition((prev) =>
          prev
            ? {
                x: Math.max(minX, Math.min(maxX, prev.x)),
                y: Math.max(minY, Math.min(maxY, prev.y))
              }
            : null
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Get mouse or touch coordinates
  const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    if ('clientX' in e) {
      return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
    }
    return { clientX: 0, clientY: 0 };
  };

  // Start drag gesture (Mouse or Touch)
  const handleDragStart = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    const coords = getClientCoords(e);
    dragStartRef.current = { x: coords.clientX, y: coords.clientY };
    hasDraggedRef.current = false;

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      elementStartRef.current = { x: rect.left, y: rect.top };
    } else {
      elementStartRef.current = { x: window.innerWidth - 180, y: window.innerHeight - 70 };
    }

    setIsDragging(true);
  };

  // Global window listeners while dragging to handle mouseMove/touchMove & mouseUp/touchEnd smoothly
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const coords = getClientCoords(e);
      const deltaX = coords.clientX - dragStartRef.current.x;
      const deltaY = coords.clientY - dragStartRef.current.y;

      // Distance threshold to differentiate tap/click from drag
      if (Math.hypot(deltaX, deltaY) > 4) {
        hasDraggedRef.current = true;
      }

      const insets = getSafeAreaInsets();
      const buttonWidth = buttonRef.current?.offsetWidth || 180;
      const buttonHeight = buttonRef.current?.offsetHeight || 60;

      const minX = insets.left + 10;
      const minY = insets.top + 10;
      const maxX = window.innerWidth - buttonWidth - insets.right - 10;
      const maxY = window.innerHeight - buttonHeight - insets.bottom - 10;

      const newX = Math.max(minX, Math.min(maxX, elementStartRef.current.x + deltaX));
      const newY = Math.max(minY, Math.min(maxY, elementStartRef.current.y + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);

      const insets = getSafeAreaInsets();
      const buttonWidth = buttonRef.current?.offsetWidth || 180;
      const buttonHeight = buttonRef.current?.offsetHeight || 60;

      const minXLeft = 16 + insets.left;
      const maxXRight = window.innerWidth - buttonWidth - 16 - insets.right;
      const minY = 16 + insets.top;
      const maxY = window.innerHeight - buttonHeight - 16 - insets.bottom;

      setPosition((currentPos) => {
        let x = currentPos?.x;
        let y = currentPos?.y;

        if ((x === undefined || y === undefined) && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          x = rect.left;
          y = rect.top;
        }

        if (x === undefined || y === undefined) return null;

        const centerX = x + buttonWidth / 2;
        const targetX = centerX < window.innerWidth / 2 ? minXLeft : maxXRight;
        const targetY = Math.max(minY, Math.min(maxY, y));

        return { x: targetX, y: targetY };
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging]);

  // Prevent onClick from opening the modal if user dragged the button
  const handleButtonClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      // Prepare history payload for API call
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          history: historyPayload,
          context: 'Utilisateur connecté au système Pâtisserie le Délice - Laboratoire Central'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || t('labAssistant.noResponse', "Désolé, je n'ai pas pu obtenir de réponse."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      console.error('Error fetching chat response:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: t('labAssistant.networkError', "⚠️ **Oups, petit pépin technique !** Je n'ai pas pu joindre le serveur. Vérifiez votre connexion ou contactez le chef d'atelier."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        content: t('labAssistant.resetWelcome', "Discussion réinitialisée ! En quoi puis-je vous aider sur les recettes ou le laboratoire aujourd'hui ?"),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Render basic formatting for bold, lists, and line breaks without heavy external parser
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold syntax **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 rtl:ml-0 rtl:mr-4 list-disc my-1 text-slate-800 font-medium">
            {formattedParts.slice(1)}
          </li>
        );
      }

      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-indigo-900 text-xs my-2 pb-1 border-b border-indigo-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {line.replace('### ', '')}
          </h4>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed text-start">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Draggable Floating Launcher Button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={handleButtonClick}
          style={{
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            ...(position
              ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
              : {})
          }}
          className={`fixed ${
            position
              ? ''
              : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))] rtl:right-auto rtl:left-[calc(1.25rem+env(safe-area-inset-left,0px))]'
          } z-40 bg-gradient-to-r from-indigo-600 via-indigo-700 to-amber-600 hover:from-indigo-700 hover:to-amber-700 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-3 transition-shadow duration-200 group border-2 border-white/20 cursor-grab active:cursor-grabbing ${
            isDragging ? 'scale-105 shadow-2xl opacity-95 ring-4 ring-amber-400/50' : 'hover:scale-105 active:scale-95'
          }`}
        >
          <div className="relative pointer-events-none">
            <ChefHat className="w-6 h-6 text-amber-300 animate-bounce" />
            <span className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-900 animate-ping" />
          </div>
          <span className="text-xs font-black pr-1 rtl:pr-0 rtl:pl-1 hidden sm:inline-block tracking-wide pointer-events-none">
            {t('labAssistant.launcherBadge', 'Assistant IA Lab')}
          </span>
          <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
            {t('labAssistant.chefName', 'Chef Émile')}
          </span>
        </button>
      )}

      {/* Floating Chat Window Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ${
            isExpanded
              ? 'top-[calc(1rem+env(safe-area-inset-top,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] sm:inset-10 max-w-5xl mx-auto'
              : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] sm:left-auto sm:right-6 rtl:sm:right-auto rtl:sm:left-6 sm:bottom-6 w-auto sm:w-[440px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner relative shrink-0">
                <ChefHat className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 rtl:-right-auto rtl:-left-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    {t('labAssistant.chefName', 'Chef Émile')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {t('labAssistant.modelBadge', 'Gemini 3.6 Flash')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{t('labAssistant.chefSubtitle', 'Assistant Formateur & Dépannage Pâtisserie')}</p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('labAssistant.resetHistory', 'Réinitialiser la discussion')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? t('labAssistant.minimize', 'Réduire la fenêtre') : t('labAssistant.maximize', 'Agrandir la fenêtre')}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Preset Topics Ribbon */}
          <div className="bg-slate-50 border-b border-slate-200 p-2.5 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 shrink-0 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-600" />
              {t('labAssistant.quickTopics', 'Sujets Rapides :')}
            </span>
            {presetQuestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.question)}
                disabled={loading}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 text-[11px] font-semibold whitespace-nowrap transition-all shadow-2xs flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <span>{item.icon}</span>
                <span>{item.category}</span>
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-1">
                      <ChefHat className="w-4 h-4 text-amber-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-2xs ${
                      isAssistant
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs rtl:rounded-tl-2xl rtl:rounded-tr-xs'
                        : 'bg-indigo-600 text-white rounded-tr-xs rtl:rounded-tr-2xl rtl:rounded-tl-xs font-medium'
                    }`}
                  >
                    <div className="space-y-1">{renderFormattedText(msg.content)}</div>
                    <span
                      className={`block text-[9px] mt-2 text-right rtl:text-left ${
                        isAssistant ? 'text-slate-400' : 'text-indigo-200'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Loading Thinking Indicator */}
            {loading && (
              <div className="flex gap-3 justify-start animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  <Bot className="w-4 h-4 text-amber-300" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 rounded-tl-xs rtl:rounded-tl-2xl rtl:rounded-tr-xs text-xs text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>{t('labAssistant.thinking', 'Chef Émile consulte ses fiches techniques...')}</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Form */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('labAssistant.placeholder', 'Posez votre question (ex: recette, ganache, stock, bon de réquisition...)')}
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px] text-start"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl transition-all disabled:opacity-40 shrink-0 shadow-xs flex items-center justify-center min-w-[42px] min-h-[42px] cursor-pointer"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-500" /> {t('labAssistant.poweredBy', 'Propulsé par Gemini AI Studio')}
              </span>
              <span>{t('labAssistant.version', 'Pâtisserie le Délice • V2.4')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
