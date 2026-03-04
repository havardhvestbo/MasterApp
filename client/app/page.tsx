"use client";

import { useMemo, useState } from "react";

type ShopCategory =
  | "Skoreparasjon"
  | "Som og tilpasning"
  | "Sykkelverksted"
  | "Elektronikk"
  | "Ur og smykker"
  | "Mobler";

type RepairShop = {
  name: string;
  category: ShopCategory;
  neighborhood: string;
  address: string;
  hours: string;
  contact: string;
  tags: string[];
  description: string;
};

const shops: RepairShop[] = [
  {
    name: "Nidaros Skomakeri",
    category: "Skoreparasjon",
    neighborhood: "Midtbyen",
    address: "Munkegata 24, 7011 Trondheim",
    hours: "Man-Fre 09:00-17:30",
    contact: "+47 73 11 44 22",
    tags: ["Nye saaler", "Skinnpleie", "Glidelas"],
    description: "Tradisjonelt skoverksted for boots, sneakers og vesker med rask henting samme uke.",
  },
  {
    name: "Bakklandet Sole Studio",
    category: "Skoreparasjon",
    neighborhood: "Bakklandet",
    address: "Nedre Bakklandet 58C, 7014 Trondheim",
    hours: "Man-Lor 10:00-18:00",
    contact: "+47 73 55 93 10",
    tags: ["Haelbytte", "Utvidelse", "Veskestropp"],
    description: "Nabolagsverksted med fokus paa varsom restaurering av skinn og gode tilpasninger.",
  },
  {
    name: "Trondheim Systue",
    category: "Som og tilpasning",
    neighborhood: "Lerkendal",
    address: "Klostergata 84, 7030 Trondheim",
    hours: "Man-Fre 08:30-16:30",
    contact: "+47 73 88 20 05",
    tags: ["Opplegg", "Jakkereparasjon", "Uniform"],
    description:
      "Spesialister paa tilpasning av hverdagsklaer, pentoy og mindre syoppdrag.",
  },
  {
    name: "Ila Alteration Atelier",
    category: "Som og tilpasning",
    neighborhood: "Ila",
    address: "Mellomila 12, 7018 Trondheim",
    hours: "Tir-Lor 10:00-17:00",
    contact: "+47 45 22 09 83",
    tags: ["Kjolejustering", "Glidelas", "Dress"],
    description: "Liten systue med provingstimer og reparasjoner av mer sarte tekstiler.",
  },
  {
    name: "Fjord Cycles Service Hub",
    category: "Sykkelverksted",
    neighborhood: "Lade",
    address: "Haakon VII gate 17A, 7041 Trondheim",
    hours: "Man-Fre 10:00-18:00",
    contact: "+47 73 62 10 70",
    tags: ["Bremsejustering", "Vinterdekk", "Elsykkel"],
    description:
      "Komplett sykkelservice for pendlere, lastesykler og elektrisk feilsoking.",
  },
  {
    name: "Bybroa Bike Doctor",
    category: "Sykkelverksted",
    neighborhood: "Midtbyen",
    address: "Kongens gate 42, 7012 Trondheim",
    hours: "Man-Lor 09:30-18:30",
    contact: "+47 91 45 66 10",
    tags: ["Kjedebytte", "Hjulretting", "Ekspressfix"],
    description:
      "Drop-in sykkelreparasjon i sentrum med kort ventetid for hasteoppdrag.",
  },
  {
    name: "Nordbytek Repair",
    category: "Elektronikk",
    neighborhood: "Mollenberg",
    address: "Olav Tryggvasons gate 29, 7011 Trondheim",
    hours: "Man-Fre 09:00-18:00",
    contact: "+47 73 90 45 11",
    tags: ["Skjermbytte", "Batteri", "Sikkerhetskopi"],
    description:
      "Verksted for mobil, nettbrett og laptop med tydelige priser foer reparasjon.",
  },
  {
    name: "Ranheim Device Care",
    category: "Elektronikk",
    neighborhood: "Ranheim",
    address: "Ranheimsvegen 127, 7054 Trondheim",
    hours: "Man-Fre 10:00-17:00",
    contact: "+47 94 51 33 67",
    tags: ["Ladeport", "Vannskade", "Konsollservice"],
    description:
      "Praktiske reparasjoner for hjemmeelektronikk med fokus paa kostnadseffektive losninger.",
  },
  {
    name: "Torvet Urverk",
    category: "Ur og smykker",
    neighborhood: "Midtbyen",
    address: "Thomas Angells gate 8, 7011 Trondheim",
    hours: "Man-Fre 09:30-17:30",
    contact: "+47 73 80 12 18",
    tags: ["Urverk", "Lenkejustering", "Lodding"],
    description:
      "Presisjonsarbeid paa klokker, clasper og restaurering av eldre smykker.",
  },
  {
    name: "Byasen Furniture Fix",
    category: "Mobler",
    neighborhood: "Byasen",
    address: "Selsbakkvegen 36, 7027 Trondheim",
    hours: "Man-Fre 08:00-16:00",
    contact: "+47 73 44 88 92",
    tags: ["Omtrekking", "Treverk", "Skaphengsler"],
    description:
      "Handverksverksted for reparasjon av mobler, overflatefornying og forsterkning av konstruksjon.",
  },
];

const serviceCategories: ShopCategory[] = [
  "Skoreparasjon",
  "Som og tilpasning",
  "Sykkelverksted",
  "Elektronikk",
  "Ur og smykker",
  "Mobler",
];

const categories: Array<ShopCategory | "Alle"> = ["Alle", ...serviceCategories];
const totalNeighborhoods = new Set(shops.map((shop) => shop.neighborhood)).size;

type CategoryStyle = {
  filter: string;
  badge: string;
  tag: string;
  strip: string;
  heading: string;
};

const categoryStyles: Record<ShopCategory, CategoryStyle> = {
  Skoreparasjon: {
    filter:
      "border-[#a86f3a]/40 bg-[#a86f3a]/16 text-[#6f431d] shadow-[0_8px_18px_rgba(168,111,58,0.2)]",
    badge: "border-[#a86f3a]/30 bg-[#a86f3a]/12 text-[#6f431d]",
    tag: "bg-[#a86f3a]/12 text-[#6f431d]",
    strip: "bg-[#a86f3a]/46",
    heading: "text-[#6f431d]",
  },
  "Som og tilpasning": {
    filter:
      "border-[#8a5f79]/40 bg-[#8a5f79]/16 text-[#5f3d52] shadow-[0_8px_18px_rgba(138,95,121,0.2)]",
    badge: "border-[#8a5f79]/30 bg-[#8a5f79]/12 text-[#5f3d52]",
    tag: "bg-[#8a5f79]/12 text-[#5f3d52]",
    strip: "bg-[#8a5f79]/44",
    heading: "text-[#5f3d52]",
  },
  Sykkelverksted: {
    filter:
      "border-[#4c7a56]/40 bg-[#4c7a56]/16 text-[#2d5335] shadow-[0_8px_18px_rgba(76,122,86,0.2)]",
    badge: "border-[#4c7a56]/30 bg-[#4c7a56]/12 text-[#2d5335]",
    tag: "bg-[#4c7a56]/12 text-[#2d5335]",
    strip: "bg-[#4c7a56]/46",
    heading: "text-[#2d5335]",
  },
  Elektronikk: {
    filter:
      "border-[#55778f]/40 bg-[#55778f]/16 text-[#355063] shadow-[0_8px_18px_rgba(85,119,143,0.2)]",
    badge: "border-[#55778f]/30 bg-[#55778f]/12 text-[#355063]",
    tag: "bg-[#55778f]/12 text-[#355063]",
    strip: "bg-[#55778f]/46",
    heading: "text-[#355063]",
  },
  "Ur og smykker": {
    filter:
      "border-[#7a6a40]/40 bg-[#7a6a40]/16 text-[#5b4a23] shadow-[0_8px_18px_rgba(122,106,64,0.2)]",
    badge: "border-[#7a6a40]/30 bg-[#7a6a40]/12 text-[#5b4a23]",
    tag: "bg-[#7a6a40]/12 text-[#5b4a23]",
    strip: "bg-[#7a6a40]/46",
    heading: "text-[#5b4a23]",
  },
  Mobler: {
    filter:
      "border-[#8b5a44]/40 bg-[#8b5a44]/16 text-[#5f3728] shadow-[0_8px_18px_rgba(139,90,68,0.2)]",
    badge: "border-[#8b5a44]/30 bg-[#8b5a44]/12 text-[#5f3728]",
    tag: "bg-[#8b5a44]/12 text-[#5f3728]",
    strip: "bg-[#8b5a44]/46",
    heading: "text-[#5f3728]",
  },
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | "Alle">("Alle");

  const filteredShops = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return shops.filter((shop) => {
      const matchesCategory =
        selectedCategory === "Alle" || shop.category === selectedCategory;

      const matchesQuery =
        query.length === 0 ||
        shop.name.toLowerCase().includes(query) ||
        shop.category.toLowerCase().includes(query) ||
        shop.neighborhood.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query) ||
        shop.description.toLowerCase().includes(query) ||
        shop.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const groupedShops = useMemo(() => {
    const grouped: Partial<Record<ShopCategory, RepairShop[]>> = {};

    for (const shop of filteredShops) {
      if (!grouped[shop.category]) {
        grouped[shop.category] = [];
      }
      grouped[shop.category]?.push(shop);
    }

    return grouped;
  }, [filteredShops]);

  const activeGroups = serviceCategories.filter((category) => groupedShops[category]);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-terracotta/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-forest-green/14 blur-3xl" />
        <div className="absolute bottom-4 left-1/3 h-72 w-72 rounded-full bg-warm-tan/20 blur-3xl" />
      </div>

      <section className="relative overflow-hidden rounded-[2.25rem] border border-dark-brown/14 bg-[linear-gradient(135deg,#f8f3ea_0%,#efe2d0_46%,#e5ece0_100%)] p-6 shadow-[0_30px_80px_rgba(59,42,26,0.14)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(rgba(59,42,26,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(59,42,26,0.14)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_16%_18%,rgba(193,96,58,0.2)_0,transparent_36%),radial-gradient(circle_at_82%_30%,rgba(74,103,65,0.2)_0,transparent_38%)]" />

        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <p className="inline-flex w-fit items-center rounded-full border border-dark-brown/25 bg-off-white/80 px-4 py-1 text-xs font-semibold tracking-[0.14em] text-dark-brown/75 uppercase">
              Trondheim Reparasjonsguide
            </p>

            <h1 className="max-w-3xl text-3xl leading-tight font-semibold text-dark-brown sm:text-4xl lg:text-[3.2rem]">
              Finn lokale verksteder som fikser det du allerede eier.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-dark-brown/82 sm:text-lg">
              Fra sko og som til sykler, elektronikk og mobler. Et sted for folk i Trondheim som
              vil reparere smart i stedet for aa bytte ut.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#verksteder"
                className="rounded-full border border-forest-green bg-forest-green px-5 py-2.5 text-sm font-semibold text-off-white shadow-[0_10px_20px_rgba(74,103,65,0.28)] transition hover:bg-forest-green/90"
              >
                Utforsk verksteder
              </a>
              <a
                href="#sok"
                className="rounded-full border border-dark-brown/22 bg-white/72 px-5 py-2.5 text-sm font-semibold text-dark-brown transition hover:bg-white"
              >
                Start med filter
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.1rem] border border-dark-brown/14 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-dark-brown/70 uppercase">
                  Verksteder
                </p>
                <p className="mt-1 text-2xl font-semibold text-dark-brown">{shops.length}</p>
              </div>
              <div className="rounded-[1.1rem] border border-dark-brown/14 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-dark-brown/70 uppercase">
                  Kategorier
                </p>
                <p className="mt-1 text-2xl font-semibold text-dark-brown">{serviceCategories.length}</p>
              </div>
              <div className="rounded-[1.1rem] border border-dark-brown/14 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-dark-brown/70 uppercase">
                  Bydeler
                </p>
                <p className="mt-1 text-2xl font-semibold text-dark-brown">{totalNeighborhoods}</p>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-dark-brown/15 bg-[linear-gradient(150deg,rgba(255,255,255,0.82),rgba(247,241,231,0.92))] p-5 backdrop-blur-sm sm:p-6">
            <h2 className="text-lg font-semibold text-dark-brown">Populaert denne uka</h2>
            <p className="mt-2 text-sm leading-6 text-dark-brown/80">
              Tjenester som ofte blir bestilt i Trondheim akkurat naa.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {serviceCategories.slice(0, 4).map((category) => (
                <span
                  key={category}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${categoryStyles[category].tag}`}
                >
                  {category}
                </span>
              ))}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-dark-brown/12 bg-white/62 p-4 text-sm text-dark-brown/80">
              <p className="font-semibold text-dark-brown">Rask oversikt</p>
              <p>Midtbyen: mange drop-in verksteder</p>
              <p>Bakklandet og Ila: sterke paa klaer og sko</p>
              <p>Lade: sykkel og elektronikk med god kapasitet</p>
            </div>

            <div className="mt-4 rounded-2xl border border-dark-brown/12 bg-off-white/70 p-4 text-sm text-dark-brown/80">
              Tjenesten er laget for aa gi kort vei fra problem til reparasjon.
            </div>
          </aside>
        </div>
      </section>

      <section
        id="sok"
        className="mt-7 grid gap-5 rounded-[1.75rem] border border-dark-brown/12 bg-[linear-gradient(180deg,rgba(247,242,233,0.9),rgba(244,237,228,0.78))] p-5 shadow-[0_16px_45px_rgba(59,42,26,0.09)] sm:p-6 lg:grid-cols-[1.35fr_0.65fr]"
      >
        <div>
          <label
            htmlFor="repair-search"
            className="text-xs font-semibold tracking-[0.13em] text-dark-brown/75 uppercase"
          >
            Sok etter tjeneste, bydel, adresse eller stikkord
          </label>
          <input
            id="repair-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Proev: sko, mollenberg, glidelas, sykkel"
            className="mt-2 w-full rounded-[1.05rem] border border-dark-brown/20 bg-white/84 px-4 py-3 text-sm text-dark-brown outline-none transition focus:border-forest-green/60 focus:ring-2 focus:ring-forest-green/20 sm:text-base"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? category === "Alle"
                        ? "border-forest-green bg-forest-green text-off-white shadow-[0_8px_18px_rgba(74,103,65,0.24)]"
                        : categoryStyles[category].filter
                      : "border-dark-brown/20 bg-white/72 text-dark-brown hover:border-dark-brown/35 hover:bg-white"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[1.35rem] border border-dark-brown/12 bg-white/62 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-dark-brown">Hvorfor reparere lokalt?</h2>
          <p className="mt-2 text-sm leading-6 text-dark-brown/78">
            Lokale verksteder forlenger levetiden paa tingene dine og reduserer unodig avfall.
          </p>
          <p className="mt-4 rounded-xl border border-dark-brown/12 bg-off-white/70 px-3 py-2 text-sm text-dark-brown/80">
            Viser {filteredShops.length} resultat{filteredShops.length === 1 ? "" : "er"} fordelt
            paa {activeGroups.length} aktiv kategori{activeGroups.length === 1 ? "" : "er"}.
          </p>
        </aside>
      </section>

      <section id="verksteder" className="mt-8 space-y-9">
        {filteredShops.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-dark-brown/25 bg-off-white/66 p-8 text-center">
            <p className="text-lg font-semibold text-dark-brown">Ingen treff med valgte filtre.</p>
            <p className="mt-2 text-sm text-dark-brown/70">
              Proev et bredere sok eller bytt til en annen kategori.
            </p>
          </div>
        ) : (
          activeGroups.map((category) => (
            <div key={category} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-dark-brown/10 pb-2">
                <div>
                  <div className={`mb-2 h-1.5 w-16 rounded-full ${categoryStyles[category].strip}`} />
                  <h2 className={`text-2xl font-semibold ${categoryStyles[category].heading}`}>
                    {category}
                  </h2>
                </div>
                <p className="text-sm text-dark-brown/70">
                  {groupedShops[category]?.length ?? 0} verksted
                  {(groupedShops[category]?.length ?? 0) > 1 ? "er" : ""}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {groupedShops[category]?.map((shop, index) => {
                  const style = categoryStyles[shop.category];

                  return (
                    <article
                      key={shop.name}
                      className="animate-[riseIn_0.65s_ease-out_both] overflow-hidden rounded-[1.45rem] border border-dark-brown/12 bg-[linear-gradient(148deg,rgba(249,245,238,0.95),rgba(255,255,255,0.82))] p-5 shadow-[0_14px_34px_rgba(59,42,26,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(59,42,26,0.12)]"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <div className={`-mx-5 -mt-5 mb-4 h-1.5 ${style.strip}`} />

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-dark-brown">{shop.name}</h3>
                          <p className="mt-1 text-sm text-dark-brown/75">{shop.neighborhood}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase ${style.badge}`}
                        >
                          {shop.category}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-dark-brown/80">{shop.description}</p>

                      <div className="mt-4 rounded-xl border border-dark-brown/10 bg-white/58 p-3 text-sm text-dark-brown/82">
                        <p>
                          <span className="font-semibold text-dark-brown">Adresse:</span>{" "}
                          {shop.address}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-dark-brown">Aapningstid:</span>{" "}
                          {shop.hours}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-dark-brown">Kontakt:</span>{" "}
                          {shop.contact}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {shop.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${style.tag}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
