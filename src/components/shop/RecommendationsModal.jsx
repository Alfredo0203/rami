import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Clock, ExternalLink, ShoppingBag, ChevronDown, Trash2 } from 'lucide-react';

const APP_LOGO_URL = 'https://lh3.googleusercontent.com/d/1XvzxcscLVC00UVnvggpG1qTLTiyQ_6d0';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';

const AGENT_NAME = 'product_recommender';
const LS_CONV_ID = 'rami_conversation_id';
const LS_LAST_CONSULTED = 'rami_last_consulted';

const INITIAL_SUGGESTIONS = [
  { label: '🔥 Más vendidos', query: 'Muéstrame los productos más vendidos' },
  { label: '🏷️ Ofertas', query: 'Muéstrame productos en oferta con descuento' },
  { label: '✨ Novedades', query: 'Muéstrame los productos más nuevos' },
  { label: '🎁 Para regalo', query: 'Busco algo para regalo' },
  { label: '🏠 Para el hogar', query: 'Busco productos para el hogar' },
  { label: '📱 Tecnología', query: 'Busco gadgets y tecnología' },
  { label: '👗 Ropa y moda', query: 'Quiero ver ropa y accesorios de moda' },
  { label: '💰 Menos de $20', query: 'Busco productos económicos menos de $20' },
];

const FOLLOWUP_POOL = [
  'Muéstrame más opciones',
  'Algo más barato',
  'Algo de mejor calidad',
  'Opciones de otra categoría',
  'Con mejor calificación',
  'Lo más popular',
  'Ver otras tallas o colores',
  'Algo para regalo',
  'Menos de $30',
  'De otra marca',
];

function getRandomFollowups(n = 5) {
  return [...FOLLOWUP_POOL].sort(() => Math.random() - 0.5).slice(0, n);
}

function parseContent(content) {
  const parts = [];
  const regex = /```products\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    try {
      const products = JSON.parse(match[1]);
      parts.push({ type: 'products', products });
    } catch {
      // skip malformed
    }
    lastIndex = match.index + match[0].length;
  }
  const remainder = content.slice(lastIndex);
  if (remainder) {
    const openBlock = remainder.indexOf('```products');
    if (openBlock !== -1) {
      const textBefore = remainder.slice(0, openBlock).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
    } else {
      parts.push({ type: 'text', content: remainder });
    }
  }
  return parts;
}

function ProductCard({ product, onNavigate }) {
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : null;

  return (
    <button
      onClick={() => onNavigate(product.id)}
      className="flex items-center gap-3 bg-background border border-border rounded-xl p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left w-full"
    >
      <div className="w-14 h-14 rounded-lg bg-muted shrink-0 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.reason}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-primary">${product.price?.toFixed(2)}</span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">-{discount}%</span>
            </>
          )}
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}

function MessageBubble({ message, onNavigate }) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2.5 text-sm">
          <p>{message.content}</p>
        </div>
      </div>
    );
  }
  const parts = parseContent(message.content);
  return (
    <div className="flex gap-2 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
        <img src={APP_LOGO_URL} alt="RAmi" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 max-w-[85%] space-y-2">
        {parts.map((part, i) => {
          if (part.type === 'products') {
            return (
              <div key={i} className="space-y-1.5">
                {part.products.map((p, j) => (
                  <ProductCard key={j} product={p} onNavigate={onNavigate} />
                ))}
              </div>
            );
          }
          const text = part.content?.trim();
          if (!text) return null;
          return (
            <div key={i} className="bg-card border rounded-2xl rounded-tl-none px-3.5 py-2.5 text-sm">
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-0.5 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecommendationsModal({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lastConsulted, setLastConsulted] = useState(null);
  const [followups, setFollowups] = useState(() => getRandomFollowups());
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const prevOpenRef = useRef(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Scroll al último mensaje cuando se abre o reabre el modal
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      return () => clearTimeout(t);
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setInitializing(true);
    base44.auth.me().then(u => setUser(u)).catch(() => {});

    const stored = localStorage.getItem(LS_LAST_CONSULTED);
    if (stored) setLastConsulted(new Date(stored));
    const savedConvId = localStorage.getItem(LS_CONV_ID);
    if (savedConvId) {
      base44.agents.getConversation(savedConvId)
        .then(conv => { if (conv) { setConversation(conv); setMessages(conv.messages || []); } })
        .catch(() => localStorage.removeItem(LS_CONV_ID))
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, [open]);

  const clearHistory = () => {
    localStorage.removeItem(LS_CONV_ID);
    localStorage.removeItem(LS_LAST_CONSULTED);
    setConversation(null);
    setMessages([]);
    setLastConsulted(null);
    setFollowups(getRandomFollowups());
  };

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const last = data.messages?.[data.messages.length - 1];
      if (last?.role === 'assistant' && last?.content) setLoading(false);
    });
    return unsubscribe;
  }, [conversation]);

  const sendText = async (text) => {
    if (!text.trim() || loading) return;
    setInput('');
    setFollowups(getRandomFollowups());

    if (!conversation) {
      setLoading(true);
      try {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: `Chat de ${user?.full_name || 'usuario'}` }
        });
        setConversation(conv);
        const now = new Date();
        setLastConsulted(now);
        localStorage.setItem(LS_CONV_ID, conv.id);
        localStorage.setItem(LS_LAST_CONSULTED, now.toISOString());
        await base44.agents.addMessage(conv, { role: 'user', content: text });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input.trim()); }
  };

  const visibleMessages = messages
    .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
    .slice(1);

  const chatStarted = !!conversation;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[199] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed left-0 right-0 z-[200] flex flex-col bg-background rounded-t-3xl shadow-2xl"
            style={{ bottom: 0, maxHeight: '85dvh', height: '85dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            {/* Handle + Header */}
            <div className="flex flex-col px-4 pt-3 pb-2 border-b bg-card rounded-t-3xl shrink-0">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={APP_LOGO_URL} alt="RAmi" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' class=\'text-primary\'><path d=\'M12 2L2 7l10 5 10-5-10-5z\'/><path d=\'M2 17l10 5 10-5\'/><path d=\'M2 12l10 5 10-5\'/></svg>'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">Asistente de Compras <span className="text-primary">RAmi</span></p>
                  {lastConsulted ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      Última consulta: {lastConsulted.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' })} {lastConsulted.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Recomendaciones personalizadas</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {chatStarted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearHistory}
                      className="text-muted-foreground hover:text-destructive"
                      title="Borrar historial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" onPointerDownCapture={e => e.stopPropagation()}>
              {initializing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : !chatStarted ? (
                <div className="flex flex-col pt-4 gap-4">
                  <div className="text-center px-4">
                    <p className="text-base font-semibold text-foreground">
                      ¿Qué buscas hoy{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Elige una opción o escribe tu búsqueda</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {INITIAL_SUGGESTIONS.map(s => (
                      <button
                        key={s.label}
                        onClick={() => sendText(s.query)}
                        disabled={loading}
                        className="text-left px-3 py-2.5 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-colors text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {visibleMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                  {visibleMessages.map((msg, idx) => (
                    <MessageBubble
                      key={idx}
                      message={msg}
                      onNavigate={(id) => { navigate(`/ProductDetail?id=${id}`); onClose(); }}
                    />
                  ))}
                  {loading && (
                    <div className="flex gap-2 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={APP_LOGO_URL} alt="RAmi" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground mr-1">RAmi está pensando</span>
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pt-3 border-t bg-card shrink-0 space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
              {chatStarted && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
                  {followups.map(s => (
                    <button
                      key={s}
                      onClick={() => sendText(s)}
                      disabled={loading}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-secondary text-secondary-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe lo que buscas..."
                  className="flex-1"
                  disabled={loading || initializing}
                />
                <Button onClick={() => sendText(input.trim())} disabled={!input.trim() || loading || initializing} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}