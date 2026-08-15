import React from 'react';
import { useNews } from '../../lib/queries/publicHooks';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const News = () => {
  const { data: news, isLoading } = useNews();

  return (
    <div className="py-[110px] px-6 bg-[#FBF9F5] min-h-screen">
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-[640px] mx-auto text-center mb-[60px]">
          <div className="text-[#87CE18] font-bold tracking-wider uppercase text-[13px] mb-3.5">Actualités</div>
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-4 text-[#172642]">Toutes nos actions</h1>
          <p className="text-[16.5px] text-[#172642]/70 leading-[1.6]">
            Suivez en direct l'évolution de nos projets, nos événements et nos bilans sur le terrain à Louga.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-[#172642]/60">Chargement des actualités...</div>
        ) : !news || news.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-[#172642]/10 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-[#172642] mb-2">Aucune actualité pour le moment</h3>
            <p className="text-[#172642]/60">Revenez bientôt pour découvrir nos prochaines actions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((item: any) => (
              <article key={item.id} className="bg-white rounded-[20px] overflow-hidden shadow-[0_12px_30px_-14px_rgba(23,38,66,0.14)] flex flex-col hover:-translate-y-1 transition-transform">
                <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                  {item.coverImage && <img src={item.coverImage.url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                    <span className="bg-[#00A4DE]/10 text-[#00A4DE] font-bold text-[11px] tracking-wider uppercase px-3 py-1 rounded-full">
                      {item.category?.name?.fr || 'Actualité'}
                    </span>
                    <span className="text-[12.5px] text-[#172642]/50">
                      {new Date(item.publishedAt || item.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h3 className="text-[17.5px] font-extrabold mb-3 leading-[1.32] text-[#172642]">{item.title?.fr}</h3>
                  <p className="text-[14.5px] leading-[1.6] text-[#172642]/70 mb-5 flex-1">{item.excerpt?.fr}</p>
                  <Link to={`/actualites/${item.slug}`} className="font-bold text-[13.5px] text-[#EE7900] flex items-center group">
                    Lire la suite <ArrowRight className="ml-1.5 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const NewsDetail = () => {
  return (
    <div className="py-[110px] px-6 bg-white min-h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">Article Detail</h1>
      <p>This is a scaffolded route for /actualites/:slug</p>
      <Link to="/actualites" className="text-[#00A4DE] hover:underline mt-4 inline-block">Retour aux actualités</Link>
    </div>
  );
};
