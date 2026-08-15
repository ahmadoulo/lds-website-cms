export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-navy">Vue d'ensemble</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-navy/5">
          <div className="text-sm font-semibold text-navy/60 mb-2">Missions Actives</div>
          <div className="text-3xl font-extrabold text-navy">5</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-navy/5">
          <div className="text-sm font-semibold text-navy/60 mb-2">Actualités Publiées</div>
          <div className="text-3xl font-extrabold text-navy">12</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-navy/5">
          <div className="text-sm font-semibold text-navy/60 mb-2">Partenaires</div>
          <div className="text-3xl font-extrabold text-navy">8</div>
        </div>
      </div>
    </div>
  );
}
