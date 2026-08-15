import React from 'react';

export const AboutPage = () => {
  return (
    <div className="py-[110px] px-6 bg-white min-h-[60vh] flex flex-col justify-center">
      <div className="max-w-[1280px] mx-auto flex gap-[72px] items-center flex-wrap">
        <div className="flex-[1_1_440px] min-w-[300px]">
          <div className="text-[#00A4DE] font-bold tracking-wider uppercase text-[13px] mb-3.5">Qui sommes-nous</div>
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-8 leading-[1.15]">L'association au service des Lougatois</h1>
          <p className="text-[17px] leading-[1.75] text-[#172642]/75 mb-6">
            <strong className="text-[#172642]">Louga Développement Solidaire (LDS)</strong> est une association à but non lucratif composée de membres résidant au Sénégal et à l'international. LDS tire sa particularité et sa richesse de l'hétérogénéité des profils de ses membres — de l'étudiant à l'ingénieur, en passant par le professeur.
          </p>
          <p className="text-[17px] leading-[1.75] text-[#172642]/75 mb-10">
            Notre objectif fondamental est de subvenir aux besoins primaires des Lougatois : de la formation professionnelle à l'accès aux soins de santé, en passant par les aides sociales, nous identifions les difficultés pour y apporter des solutions durables.
          </p>
          <div className="flex gap-4 items-start bg-[#FBF9F5] p-6 rounded-2xl border-l-4 border-[#87CE18]">
            <p className="font-lora italic text-[19px] text-[#172642] leading-[1.6]">
              Nous croyons qu'ensemble, nous pouvons construire un avenir meilleur pour tous.
            </p>
          </div>
        </div>
        <div className="flex-[1_1_380px] min-w-[300px] relative pb-10">
          <img src="https://images.unsplash.com/photo-1593113565694-c708fa0d45fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Distribution" className="w-[80%] rounded-2xl shadow-[0_24px_50px_-18px_rgba(23,38,66,0.3)] object-cover aspect-[4/3] ml-auto md:ml-0" />
          <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Louga" className="absolute bottom-0 right-[6%] w-[148px] h-[148px] rounded-full object-cover border-8 border-white shadow-[0_16px_32px_-8px_rgba(23,38,66,0.3)]" />
        </div>
      </div>
    </div>
  );
};
