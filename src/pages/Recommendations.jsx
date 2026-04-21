import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const LAST_CONSULTED_KEY = 'recommendations_last_consulted';

const AGENT_NAME = 'product_recommender';

export default function Recommendations() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lastConsulted, setLastConsulted] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_CONSULTED_KEY);
    if (stored) setLastConsulted(new Date(stored));
    initChat();
  }, []);

  const initChat = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);

      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Recomendaciones para ${me?.full_name || 'usuario'}` }
      });
      setConversation(conv);

      const now = new Date();
      localStorage.setItem(LAST_CONSULTED_KEY, now.toISOString());
      setLastConsulted(now);

      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Usuario: ${me?.full_name || 'cliente'}, email: ${me?.email}. Recomiéndame productos según mi wishlist e historial de búsquedas.`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const lastMsg = data.messages?.[data.messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg?.content) {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [conversation]);

  const sendMessage = async () => {
    if (!input.trim() || !conversation || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const visibleMessages = messages.filter(
    m => m.role === 'user' || (m.role === 'assistant' && m.content)
  ).slice(1); // skip the initial auto-sent message

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card safe-area-top">
        <Link to="/Account">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">Asistente de Compras</p>
            {lastConsulted ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 shrink-0" />
                Última consulta: {lastConsulted.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })} {lastConsulted.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Recomendaciones personalizadas</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {initializing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground text-sm">Analizando tus preferencias...</p>
            </div>
          </div>
        ) : (
          <>
            {visibleMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {visibleMessages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card safe-area-bottom space-y-2">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {['Muéstrame más', 'Busco algo económico', 'Quiero ver ofertas', 'Algo para regalo'].map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-secondary text-secondary-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe lo que buscas..."
            className="flex-1"
            disabled={loading || initializing}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading || initializing}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-none'
          : 'bg-card border rounded-tl-none'
      }`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}