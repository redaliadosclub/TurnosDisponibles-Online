import { useState } from 'react';
import { BlogArticle } from '../../data/blogArticles';
import {
  X,
  Clock,
  Calendar,
  Share2,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  MessageCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

interface BlogArticleModalProps {
  article: BlogArticle | null;
  onClose: () => void;
  onOpenPricing?: () => void;
}

export function BlogArticleModal({ article, onClose, onOpenPricing }: BlogArticleModalProps) {
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!article) return null;

  const handleCopyTemplate = () => {
    if (!article.content.templateWhatsapp) return;
    navigator.clipboard.writeText(article.content.templateWhatsapp);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      id="modal-blog-article"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-900 flex-shrink-0">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Close Button */}
          <button
            id="btn-close-article-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-md transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Info Overlay */}
          <div className="absolute bottom-4 left-6 right-6 text-white space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/80 text-white backdrop-blur-md">
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5" /> {article.readTime}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5" /> {article.date}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug drop-shadow-sm">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          {/* Author info & share bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-teal-500/20"
              />
              <div>
                <p className="font-semibold text-sm text-slate-900 leading-tight">
                  {article.author.name}
                </p>
                <p className="text-xs text-slate-500">{article.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-share-article"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> ¡Enlace copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" /> Compartir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Introduction */}
          <div className="bg-teal-50/60 border-l-4 border-teal-600 p-4 rounded-r-xl text-slate-800 font-normal">
            <p>{article.content.introduction}</p>
          </div>

          {/* Key Points */}
          <div className="space-y-6 pt-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" /> Claves y Estrategias Prácticas
            </h3>

            {article.content.keyPoints.map((point, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3"
              >
                <h4 className="font-bold text-slate-900 text-base">{point.title}</h4>
                <p className="text-slate-600 leading-relaxed text-sm">{point.description}</p>
                {point.practicalTip && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-amber-900 text-xs flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-800">Consejo de Aplicación:</span>
                      <span className="italic">{point.practicalTip}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Copyable WhatsApp Template */}
          {article.content.templateWhatsapp && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Plantilla Lista para Usar en WhatsApp
                    </h4>
                    <p className="text-xs text-slate-500">
                      Copia y personaliza este mensaje en tus respuestas automáticas
                    </p>
                  </div>
                </div>
                <button
                  id="btn-copy-template"
                  onClick={handleCopyTemplate}
                  className="px-3.5 py-1.5 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedTemplate ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 hover:text-white" /> ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Plantilla
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-emerald-100 text-xs font-mono text-slate-700 leading-relaxed select-all">
                {article.content.templateWhatsapp}
              </div>
            </div>
          )}

          {/* Conclusion */}
          <div className="pt-2">
            <h4 className="font-bold text-slate-900 mb-2">Conclusión</h4>
            <p className="text-slate-600 text-sm leading-relaxed">{article.content.conclusion}</p>
          </div>

          {/* CTA Box */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-base flex items-center gap-2 justify-center sm:justify-start">
                <Sparkles className="w-4 h-4 text-teal-400" /> ¿Listo para automatizar tu negocio?
              </h4>
              <p className="text-xs text-slate-300">
                Prueba TurnosDisponibles.online gratis y comprueba cómo cambian tus resultados.
              </p>
            </div>
            <a
              href="https://wa.me/5492474478646?text=Hola,%20leí%20el%20artículo%20en%20el%20blog%20y%20quiero%20digitalizar%20mi%20agenda"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              Comenzar Ahora <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="btn-close-article-bottom"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cerrar lectura
          </button>
        </div>
      </div>
    </div>
  );
}
