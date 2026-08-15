import React, { useState } from 'react';
import { useMissions, useNews, usePartners, useImpactStats, useDonations, useGallery } from '../../lib/queries/publicHooks';
import { Users, GraduationCap, Hospital, Leaf, Briefcase, HeartHandshake, ArrowRight, Target } from 'lucide-react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

// --- Hero Section ---
const Hero = ({ stats }: { stats: any[] }) => (
  <section id="accueil" className="relative pt-[76px] px-6 pb-[100px] overflow-hidden">
    <div className="absolute -top-[90px] -right-[90px] w-[320px] h-[320px] rounded-full bg-[radial-gradient(circle,rgba(135,206,24,0.16),transparent_70%)]"></div>
    <div className="absolute -bottom-[40px] -left-[110px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(0,164,222,0.14),transparent_70%)]"></div>

    <div className="max-w-[1280px] mx-auto flex items-center gap-[64px] flex-wrap relative z-10">
      <div className="flex-[1_1_460px] min-w-[320px]">
        <span className="inline-block bg-[#87CE18]/15 text-[#5c9412] font-bold text-[12.5px] tracking-wider px-[18px] py-2 rounded-full mb-6 uppercase">
          Louga Développement Solidaire
        </span>
        <h1 className="text-[clamp(32px,4.6vw,52px)] leading-[1.14] font-extrabold mb-[22px] text-[#172642]">
          Solidarité et action pour un avenir meilleur à Louga
        </h1>
        <p className="text-[18.5px] leading-[1.6] text-[#172642]/70 mb-9 max-w-[520px]">
          Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.
        </p>
        <div className="flex gap-4 flex-wrap">
          <a href="#soutenir" className="bg-[#EE7900] text-white px-8 py-4 rounded-full font-bold text-[15.5px] shadow-[0_14px_28px_-10px_rgba(238,121,0,0.55)] hover:-translate-y-1 transition-transform">
            Faire un don
          </a>
          <a href="#missions" className="bg-white text-[#172642] px-8 py-4 rounded-full font-bold text-[15.5px] border-[1.5px] border-[#172642]/15 hover:border-[#172642] transition-colors">
            Découvrir nos actions
          </a>
        </div>
      </div>
      
      <div className="flex-[1_1_320px] min-w-[280px] max-w-[400px] relative">
        <div className="absolute -inset-4 bg-gradient-to-br from-[#87CE18] via-[#00A4DE] to-[#EE7900] rounded-[32px] opacity-20 rotate-3"></div>
        <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Bénévole" className="relative w-full rounded-[26px] shadow-[0_30px_60px_-20px_rgba(23,38,66,0.35)] object-cover aspect-[3/4]" />
        
        <div className="absolute -bottom-5 -left-5 bg-white px-5 py-3.5 rounded-2xl shadow-[0_16px_32px_-8px_rgba(23,38,66,0.25)] flex items-center gap-3 animate-[floatSlow_5s_ease-in-out_infinite]">
          <div className="w-10 h-10 rounded-full bg-[#87CE18] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-[15px] text-[#172642] leading-[1.2]">100% bénévole</div>
            <div className="text-[11.5px] text-[#172642]/60">Sénégal & diaspora</div>
          </div>
        </div>
      </div>
    </div>

    {/* Hero Stats */}
    {stats && stats.length > 0 && (
      <div className="max-w-[1080px] mx-auto mt-[72px] bg-white rounded-3xl shadow-[0_24px_48px_-16px_rgba(23,38,66,0.12)] p-9 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
        {stats.slice(0, 4).map((s: any) => (
          <div key={s.id} className="text-center">
            <div className="text-4xl font-extrabold text-[#172642] tabular-nums">
              <CountUp end={s.value} duration={2.5} enableScrollSpy scrollSpyOnce />
            </div>
            <div className="text-[12.5px] text-[#172642]/60 mt-1.5 font-semibold">{s.label?.fr}</div>
          </div>
        ))}
      </div>
    )}
  </section>
);

// --- Association Section ---
const Association = () => (
  <section id="association" className="py-[110px] px-6 bg-white">
    <div className="max-w-[1280px] mx-auto flex gap-[72px] items-center flex-wrap">
      <div className="flex-[1_1_440px] min-w-[300px]">
        <div className="text-[#00A4DE] font-bold tracking-wider uppercase text-[13px] mb-3.5">Qui sommes-nous</div>
        <h2 className="text-[clamp(27px,3.6vw,38px)] font-extrabold mb-6 leading-[1.22]">L'association au service des Lougatois</h2>
        <p className="text-[16.5px] leading-[1.75] text-[#172642]/75 mb-5">
          <strong className="text-[#172642]">Louga Développement Solidaire (LDS)</strong> est une association à but non lucratif composée de membres résidant au Sénégal et à l'international. LDS tire sa particularité et sa richesse de l'hétérogénéité des profils de ses membres — de l'étudiant à l'ingénieur, en passant par le professeur.
        </p>
        <p className="text-[16.5px] leading-[1.75] text-[#172642]/75 mb-9">
          Notre objectif fondamental est de subvenir aux besoins primaires des Lougatois : de la formation professionnelle à l'accès aux soins de santé, en passant par les aides sociales, nous identifions les difficultés pour y apporter des solutions durables.
        </p>
        <div className="flex gap-4 items-start">
          <span className="font-lora text-[44px] text-[#87CE18] leading-[0.6]">"</span>
          <p className="font-lora italic text-[19px] text-[#172642] mt-2.5 leading-[1.5]">
            Nous croyons qu'ensemble, nous pouvons construire un avenir meilleur pour tous.
          </p>
        </div>
      </div>
      <div className="flex-[1_1_380px] min-w-[300px] relative pb-10">
        <img src="https://images.unsplash.com/photo-1593113565694-c708fa0d45fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Distribution" className="w-[80%] rounded-2xl shadow-[0_24px_50px_-18px_rgba(23,38,66,0.3)] object-cover aspect-[4/3] ml-auto md:ml-0" />
        <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Louga" className="absolute bottom-0 right-[6%] w-[148px] h-[148px] rounded-full object-cover border-8 border-white shadow-[0_16px_32px_-8px_rgba(23,38,66,0.3)]" />
      </div>
    </div>
  </section>
);

// --- Missions Section ---
const Missions = ({ missions, isLoading }: { missions: any[], isLoading: boolean }) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'GraduationCap': return <GraduationCap className="w-5 h-5" />;
      case 'HeartPulse': return <Hospital className="w-5 h-5" />;
      case 'TreePine': return <Leaf className="w-5 h-5" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5" />;
      case 'HandHeart': return <HeartHandshake className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getBgColor = (index: number) => {
    const colors = ['bg-[#87CE18]', 'bg-[#00A4DE]', 'bg-[#EE7900]', 'bg-[#172642]', 'bg-[#87CE18]'];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <section className="py-[110px] px-6 bg-[#F5F2EC]">
        <div className="max-w-[1280px] mx-auto animate-pulse">
           <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-16"></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-2xl"></div>)}
           </div>
        </div>
      </section>
    );
  }

  if (!missions || missions.length === 0) return null;

  return (
    <section id="missions" className="py-[110px] px-6 bg-[#F5F2EC]">
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-[640px] mx-auto text-center mb-16">
          <div className="text-[#EE7900] font-bold tracking-wider uppercase text-[13px] mb-3.5">Nos missions</div>
          <h2 className="text-[clamp(27px,3.6vw,38px)] font-extrabold mb-4">Cinq piliers d'action à Louga</h2>
          <p className="text-[16.5px] text-[#172642]/70 leading-[1.6]">Notre mission est d'améliorer les conditions de vie à Louga à travers cinq domaines d'intervention complémentaires.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {missions.map((mission: any, index: number) => (
            <div key={mission.id} className="bg-white rounded-[20px] overflow-hidden shadow-[0_12px_30px_-14px_rgba(23,38,66,0.15)] group hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-14px_rgba(23,38,66,0.22)] transition-all duration-300">
              <div className="relative aspect-[16/10] bg-gray-100">
                {mission.image ? (
                  <img src={mission.image.url} alt={mission.title?.fr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200"></div>
                )}
                <div className={`absolute -bottom-6 left-5 w-[50px] h-[50px] rounded-full text-white flex items-center justify-center shadow-lg ${getBgColor(index)}`}>
                  {getIcon(mission.icon)}
                </div>
              </div>
              <div className="pt-10 pb-7 px-6">
                <h3 className="text-[18.5px] font-extrabold text-[#172642] mb-3">{mission.title?.fr}</h3>
                <p className="text-[14.5px] leading-[1.6] text-[#172642]/70">{mission.description?.fr}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Gallery Section ---
const Gallery = ({ images, isLoading }: { images: any[], isLoading: boolean }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (isLoading) return null; // Skeleton omitted for brevity
  if (!images || images.length === 0) return null;

  const slides = images.map(img => ({ src: img.image?.url || '', title: img.title?.fr }));

  return (
    <section id="galerie" className="py-[110px] px-6 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end gap-6 mb-12 flex-wrap">
          <div>
            <div className="text-[#00A4DE] font-bold tracking-wider uppercase text-[13px] mb-3.5">Galerie</div>
            <h2 className="text-[clamp(27px,3.6vw,38px)] font-extrabold m-0">Nos actions en images</h2>
          </div>
          <p className="text-[15.5px] text-[#172642]/65 max-w-[400px] m-0">Des moments forts de nos interventions sur le terrain, à Louga.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {images.slice(0, 6).map((img, idx) => (
            <div 
              key={img.id} 
              onClick={() => { setPhotoIndex(idx); setLightboxOpen(true); }}
              className="relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] shadow-[0_8px_20px_-10px_rgba(23,38,66,0.18)] hover:shadow-[0_16px_32px_-10px_rgba(23,38,66,0.3)] transition-shadow duration-250 group"
            >
              {img.image && <img src={img.image.url} alt={img.title?.fr} className="w-full h-full object-cover" />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#172642]/85 to-transparent pt-[30px] px-3.5 pb-3">
                <span className="text-white font-semibold text-[13px]">{img.title?.fr}</span>
              </div>
              <div className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-full bg-white/90 flex items-center justify-center text-[#172642] opacity-0 group-hover:opacity-100 transition-opacity">
                +
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={photoIndex}
        slides={slides}
      />
    </section>
  );
};

// --- News Section ---
const News = ({ news, isLoading }: { news: any[], isLoading: boolean }) => {
  if (isLoading) return null;
  if (!news || news.length === 0) return null;

  return (
    <section id="actualites" className="py-[110px] px-6 bg-[#F5F2EC]">
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-[640px] mx-auto text-center mb-[60px]">
          <div className="text-[#87CE18] font-bold tracking-wider uppercase text-[13px] mb-3.5">Actualités</div>
          <h2 className="text-[clamp(27px,3.6vw,38px)] font-extrabold mb-4">Nos dernières actions</h2>
          <p className="text-[16.5px] text-[#172642]/70 leading-[1.6]">Retour sur nos événements et bilans les plus récents.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {news.slice(0, 3).map((item: any) => (
            <article key={item.id} className="bg-white rounded-[20px] overflow-hidden shadow-[0_12px_30px_-14px_rgba(23,38,66,0.14)] flex flex-col hover:-translate-y-1 transition-transform">
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
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
                <a href={`/actualites/${item.slug}`} className="font-bold text-[13.5px] text-[#EE7900] flex items-center group">
                  Lire la suite <ArrowRight className="ml-1.5 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Support Section ---
const Support = () => (
  <section id="soutenir" className="py-[110px] px-6 bg-[#FBF9F5]">
    <div className="max-w-[640px] mx-auto text-center mb-[60px]">
      <div className="text-[#EE7900] font-bold tracking-wider uppercase text-[13px] mb-3.5">Nous soutenir</div>
      <h2 className="text-[clamp(27px,3.6vw,38px)] font-extrabold mb-4">Comment nous soutenir ?</h2>
      <p className="text-[16.5px] text-[#172642]/70 leading-[1.6]">Rejoignez-nous si vous voulez agir. Votre contribution fait la différence.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1120px] mx-auto">
      <div className="bg-white rounded-[20px] p-10 shadow-[0_12px_30px_-16px_rgba(23,38,66,0.12)] flex flex-col items-center text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-[#EE7900]/10 text-[#EE7900] flex items-center justify-center text-xl font-extrabold mb-5">1</div>
        <h3 className="text-[19px] font-extrabold mb-3.5">Faire un don financier</h3>
        <p className="text-[14.5px] text-[#172642]/70 leading-[1.6] mb-5">Contribuez financièrement pour soutenir nos actions sur le terrain. Chaque franc compte.</p>
        <div className="bg-[#F5F2EC] rounded-xl py-3.5 px-4 w-full mb-4">
          <div className="text-[12px] text-[#172642]/55 mb-1.5 font-semibold">Via Orange Money / Wave</div>
          <div className="text-[17px] font-extrabold text-[#172642]">+221 77 472 33 64</div>
        </div>
      </div>
      <div className="bg-white rounded-[20px] p-10 shadow-[0_12px_30px_-16px_rgba(23,38,66,0.12)] flex flex-col items-center text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-[#00A4DE]/10 text-[#00A4DE] flex items-center justify-center text-xl font-extrabold mb-5">2</div>
        <h3 className="text-[19px] font-extrabold mb-3.5">Devenir bénévole</h3>
        <p className="text-[14.5px] text-[#172642]/70 leading-[1.6] mb-6 flex-1">Offrez un peu de votre temps et vos compétences pour accompagner nos activités sur le terrain.</p>
        <a href="#contact" className="w-full bg-[#00A4DE] text-white font-bold text-[14.5px] p-3.5 rounded-xl hover:bg-[#172642] transition-colors">Rejoindre l'équipe</a>
      </div>
      <div className="bg-white rounded-[20px] p-10 shadow-[0_12px_30px_-16px_rgba(23,38,66,0.12)] flex flex-col items-center text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-[#87CE18]/15 text-[#5c9412] flex items-center justify-center text-xl font-extrabold mb-5">3</div>
        <h3 className="text-[19px] font-extrabold mb-3.5">Fournir du matériel</h3>
        <p className="text-[14.5px] text-[#172642]/70 leading-[1.6] mb-6 flex-1">Soutenez-nous avec du matériel scolaire, médical ou autre, selon les besoins actuels de la population.</p>
        <a href="#contact" className="w-full bg-[#87CE18] text-white font-bold text-[14.5px] p-3.5 rounded-xl hover:bg-[#172642] transition-colors">Nous contacter</a>
      </div>
    </div>
  </section>
);

// --- Main Page Component ---
const Home = () => {
  const { data: missions, isLoading: isLoadingMissions } = useMissions();
  const { data: news, isLoading: isLoadingNews } = useNews();
  const { data: partners } = usePartners();
  const { data: impactStats } = useImpactStats();
  const { data: donations } = useDonations();
  const { data: gallery, isLoading: isLoadingGallery } = useGallery();

  return (
    <div>
      <Hero stats={impactStats || []} />
      <Association />
      <Missions missions={missions || []} isLoading={isLoadingMissions} />
      
      <Gallery images={gallery || []} isLoading={isLoadingGallery} />
      <News news={news || []} isLoading={isLoadingNews} />
      
      {partners && partners.length > 0 && (
        <section id="partenaires" className="py-[76px] px-6 bg-white border-y border-[#172642]/5">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="text-[#87CE18] font-bold tracking-wider uppercase text-[13px] mb-3.5">Partenaires</div>
            <h2 className="text-[clamp(23px,2.8vw,30px)] font-extrabold mb-10">Ils nous accompagnent</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              {partners.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 bg-[#F5F2EC] px-6 py-3.5 rounded-full">
                  <span className="font-bold text-[14.5px] text-[#172642]">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-[130px] px-6 text-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1542810634-71277d95dcbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" alt="CTA bg" className="absolute inset-0 w-full h-full object-cover brightness-[0.45] saturate-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#172642]/60 to-[#172642]/90"></div>
        <div className="relative z-10 max-w-[740px] mx-auto">
          <h2 className="font-lora italic text-[clamp(26px,4.2vw,42px)] text-white font-medium leading-[1.35] mb-9">
            "Ensemble, pour le développement de Louga."
          </h2>
          <a href="#soutenir" className="bg-[#EE7900] text-white px-[34px] py-4 rounded-full font-bold text-[15.5px] inline-block hover:bg-[#87CE18] transition-colors shadow-lg">
            Rejoindre le mouvement
          </a>
        </div>
      </section>
      
      <Support />
    </div>
  );
};

export default Home;
