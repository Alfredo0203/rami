import React, { useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { goBack } from '@/lib/navigation';
import { base44 } from '@/api/base44Client';
import { FALLBACK_SECTIONS } from '@/lib/policyFallback';

const markdownComponents = {
  h3: ({ node, ...props }) => <h3 className="font-semibold text-foreground mb-1 mt-4 first:mt-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mt-1 mb-4" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mt-1 mb-4" {...props} />,
  a: ({ node, ...props }) => <a className="text-primary underline" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
};

function PolicyAccordion({ section, isMarkdown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4 bg-card text-left gap-3"
      >
        <span className="font-semibold text-foreground text-sm">{section.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-5 pt-2 bg-card border-t border-border">
          {isMarkdown ? (
            <div className="text-sm text-foreground/80 leading-relaxed">
              {section.last_updated && (
                <p className="text-xs text-muted-foreground mb-4">Última actualización: {section.last_updated}</p>
              )}
              <ReactMarkdown components={markdownComponents}>{section.content}</ReactMarkdown>
            </div>
          ) : (
            section.content
          )}
        </div>
      )}
    </div>
  );
}

export default function Policies() {
  const navigate = useNavigate();

  const { data: dbPolicies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => base44.entities.Policy.filter({ is_active: true }, 'sort_order', 50),
    retry: false,
  });

  const useDb = dbPolicies && dbPolicies.length > 0;
  const sections = useDb
    ? dbPolicies.map(p => ({
        id: p.section_id,
        title: p.title,
        content: p.content,
        last_updated: p.last_updated,
      }))
    : FALLBACK_SECTIONS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => goBack(navigate)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Políticas legales</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <p className="text-sm text-muted-foreground pb-1">
          Toca cada sección para leer los detalles completos.
        </p>
        {isLoading && !useDb ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          sections.map(section => (
            <PolicyAccordion key={section.id} section={section} isMarkdown={useDb} />
          ))
        )}
        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          © 2026 RAmi · El Salvador
        </p>
      </div>
    </div>
  );
}