import { BlogArticle, BLOG_ARTICLES } from '../../data/blogArticles';
import { BookOpen, Clock, ArrowRight, Sparkles, User } from 'lucide-react';

interface PortalBlogProps {
  onSelectArticle: (article: BlogArticle) => void;
}

export function PortalBlog({ onSelectArticle }: PortalBlogProps) {
  return (
    <section id="blog" className="py-16 sm:py-24 bg-slate-900 text-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950 border border-teal-800/60 text-teal-400 text-xs font-semibold mb-3">
              <BookOpen className="w-3.5 h-3.5" /> Blog & Consejos de Gestión
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Estrategias para hacer crecer tu consultorio o estética
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl">
              Artículos prácticos sobre fidelización de pacientes, cobro de señas, automatización de WhatsApp y optimización de agendas.
            </p>
          </div>
        </div>

        {/* Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BLOG_ARTICLES.map((art) => (
            <div
              key={art.id}
              id={`card-article-${art.slug}`}
              onClick={() => onSelectArticle(art)}
              className="bg-slate-800/80 border border-slate-700/70 hover:border-teal-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              {/* Cover Image */}
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                <img
                  src={art.coverImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-teal-300 backdrop-blur-md border border-teal-500/30">
                  {art.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-teal-400" /> {art.readTime}
                    </span>
                    <span>•</span>
                    <span>{art.date}</span>
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-normal">
                    {art.excerpt}
                  </p>
                </div>

                {/* Author & Read Action */}
                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={art.author.avatar}
                      alt={art.author.name}
                      className="w-6 h-6 rounded-full object-cover border border-teal-500/30"
                    />
                    <span className="text-xs text-slate-300 font-medium truncate max-w-[110px]">
                      {art.author.name}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-teal-400 group-hover:text-teal-300 flex items-center gap-1">
                    Leer <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
