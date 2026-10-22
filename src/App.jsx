import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  APIProvider,
  ControlPosition,
  Map as GoogleMap,
  MapControl,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  Dumbbell,
  ExternalLink,
  FileSpreadsheet,
  Heart,
  ImagePlus,
  LocateFixed,
  LockKeyhole,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Upload,
  Volleyball,
  Waves,
  X,
} from "lucide-react";
import { api } from "./api.js";
import {
  categories,
  roleDescriptions,
  roleFields,
  roleLabels,
} from "./data.js";
import {
  createLoginDefaults,
  createRegistrationDefaults,
  testingMode,
} from "./debugDefaults.js";

const logo = "/logo-iidca.png";
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const defaultFilters = {
  sport: "",
  location: "",
  category: "",
  lat: "",
  lng: "",
  radius: "",
};
const hasSearchCriteria = (filters) => Boolean(
  filters.sport?.trim() || filters.location?.trim() || filters.category ||
  (filters.lat !== "" && filters.lng !== ""),
);

function roleIcon(role, size = 22) {
  const props = { size, strokeWidth: 1.8 };
  if (role === "ATHLETE") return <Dumbbell {...props} />;
  if (role === "CLUB") return <Users {...props} />;
  if (role === "PROFESSIONAL") return <BadgeCheck {...props} />;
  if (role === "FEDERATION") return <Volleyball {...props} />;
  return <Sparkles {...props} />;
}

function categoryLabel(role) {
  return roleLabels[role] || role;
}

function Brand({ onClick, inverse = false }) {
  return (
    <button
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      onClick={onClick}
      aria-label="IIDCA Social Club, inicio"
    >
      <img src={logo} alt="" />
      <span>
        <strong>IIDCA</strong>
        <small>SOCIAL CLUB</small>
      </span>
    </button>
  );
}

function Header({ view, onNavigate, onAuth, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (page, anchor) => {
    setMenuOpen(false);
    onNavigate(page, anchor);
  };
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand onClick={() => go("home")} />
        <nav
          className={`main-nav ${menuOpen ? "is-open" : ""}`}
          aria-label="Navegación principal"
        >
          <button
            className={view === "explore" || view === "club" ? "active" : ""}
            onClick={() => go("explore")}
          >
            Explorar
          </button>
          <button onClick={() => go("home", "como-funciona")}>
            Cómo funciona
          </button>
          <button onClick={() => go("home", "proposito")}>
            Nuestro propósito
          </button>
          <button className={view === "news" || view === "article" ? "active" : ""} onClick={() => go("news")}>
            Novedades
          </button>
          <div className="mobile-nav-actions">
            {user ? (
              <>
                <button
                  onClick={() =>
                    go(user.role === "ADMIN" ? "admin" : "profile")
                  }
                >
                  {user.role === "ADMIN" ? "Panel admin" : "Mi espacio"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAuth("login");
                  }}
                >
                  Ingresar
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAuth("register");
                  }}
                >
                  Sumate al club
                </button>
              </>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button
                className="text-button account-link"
                onClick={() => go(user.role === "ADMIN" ? "admin" : "profile")}
              >
                <span className="account-avatar">
                  {(user.profile?.name || user.email)[0].toUpperCase()}
                </span>
                {user.role === "ADMIN" ? "Panel admin" : "Mi espacio"}
              </button>
              <button
                className="icon-button desktop-logout"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                onClick={onLogout}
              >
                <LogIn size={18} className="logout-icon" />
              </button>
            </>
          ) : (
            <>
              <button
                className="text-button login-link"
                onClick={() => onAuth("login")}
              >
                Ingresar
              </button>
              <button
                className="button button-primary header-join"
                onClick={() => onAuth("register")}
              >
                Sumate al club <ArrowUpRight size={18} />
              </button>
            </>
          )}
          <button
            className="icon-button mobile-menu"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchForm({ initial = defaultFilters, onSearch, compact = false }) {
  const [values, setValues] = useState(initial);
  const [geoError, setGeoError] = useState("");
  useEffect(
    () => setValues(initial),
    [
      initial.sport,
      initial.location,
      initial.category,
      initial.lat,
      initial.lng,
      initial.radius,
    ],
  );

  const locate = () => {
    setGeoError("");
    if (!navigator.geolocation)
      return setGeoError("Tu navegador no admite ubicación.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = {
          ...values,
          location: "",
          lat: String(coords.latitude),
          lng: String(coords.longitude),
          radius: "5",
        };
        setValues(next);
        onSearch(next);
      },
      () =>
        setGeoError("No pudimos usar tu ubicación. Podés escribir tu barrio."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <form
      className={`search-panel ${compact ? "search-panel-compact" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(values);
      }}
    >
      <label className="search-field">
        <span>
          <Dumbbell size={16} /> Deporte o actividad
        </span>
        <input
          value={values.sport}
          onChange={(event) =>
            setValues({ ...values, sport: event.target.value })
          }
          placeholder="Ej. fútbol, yoga, natación"
        />
      </label>
      <label className="search-field">
        <span>
          <MapPin size={16} /> Ubicación
        </span>
        <div className="location-input">
          <input
            value={values.location}
            onChange={(event) =>
              setValues({
                ...values,
                location: event.target.value,
                lat: "",
                lng: "",
                radius: "",
              })
            }
            placeholder={
              values.lat ? "Cerca de tu ubicación" : "Barrio o ciudad"
            }
          />
          <button
            type="button"
            onClick={locate}
            title="Usar mi ubicación"
            aria-label="Usar mi ubicación"
          >
            <LocateFixed size={19} />
          </button>
          {values.lat && values.lng && (
            <button
              type="button"
              onClick={() => {
                const next = { ...values, lat: "", lng: "", radius: "" };
                setValues(next);
                onSearch(next);
              }}
              title="Quitar mi ubicación"
              aria-label="Quitar mi ubicación"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </label>
      <label className="search-field">
        <span>
          <SlidersHorizontal size={16} /> Categoría
        </span>
        <select
          value={values.category}
          onChange={(event) =>
            setValues({ ...values, category: event.target.value })
          }
        >
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button button-orange search-submit" type="submit">
        <Search size={19} /> Encontrar opciones
      </button>
      {geoError && (
        <p className="search-error" role="alert">
          {geoError}
        </p>
      )}
    </form>
  );
}

function HeroGraphic() {
  return (
    <div className="hero-visual">
      <img className="hero-photo-main" src="/images/editorial/park-exercise.jpg" alt="Personas haciendo ejercicio juntas en un parque" />
      <img className="hero-photo-small" src="/images/sports/wheelchair.jpg" alt="Mujeres jugando básquet adaptado" />
      <div className="hero-sticker"><span>EL DEPORTE<br />NOS ENCUENTRA</span><ArrowDownRight size={32} /></div>
      <div className="hero-visual-caption">Tu barrio también juega.</div>
    </div>
  );
}

function Home({ onSearch, onNavigate, onAuth, articles }) {
  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -25px 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [articles]);

  return (
    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> UNA COMUNIDAD EN MOVIMIENTO
            </div>
            <h1>
              El deporte
              <br />
              tiene un lugar
              <br />
              <em>para vos.</em>
            </h1>
            <p>
              Conocé los clubes y espacios deportivos de tu barrio. Detrás de cada
              dirección hay personas, actividades y una comunidad esperando encontrarte.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary"
                onClick={() => onNavigate("explore")}
              >
                Explorar opciones <ArrowUpRight size={19} />
              </button>
              <button
                className="button button-outline"
                onClick={() => onAuth("register")}
              >
                Soy parte de un club <ArrowRight size={18} />
              </button>
            </div>
            <div className="hero-note">
              <div className="note-stars">✦ ✦ ✦</div>
              <span>
                Una propuesta abierta y gratuita
                <br />
                para encontrar tu próximo movimiento.
              </span>
            </div>
          </div>
          <HeroGraphic />
        </div>
        <div className="container hero-search-wrap">
          <div className="search-kicker">
            <Search size={17} /> ENCONTRÁ TU PRÓXIMO PASO
          </div>
          <SearchForm onSearch={onSearch} />
        </div>
      </section>

      <section className="purpose-band" id="proposito">
        <div className="container purpose-inner">
          <div className="purpose-icon">
            <Heart size={27} fill="currentColor" />
          </div>
          <p>
            IIDCA Social Club no crea deportistas:{" "}
            <strong>
              crea oportunidades para que el deporte encuentre a las personas.
            </strong>
          </p>
          <span>MANIFIESTO IIDCA</span>
        </div>
      </section>

      <section className="news-section" id="novedades" aria-labelledby="news-title">
        <div className="container">
          <div className="news-heading" data-reveal>
            <div>
              <div className="eyebrow eyebrow-blue">UN POCO DE INSPIRACIÓN</div>
              <h2 id="news-title">Historias para <em>poner el cuerpo</em> en movimiento.</h2>
            </div>
            <p>Ideas y novedades para encontrar nuevas formas de moverte cerca de casa.</p>
          </div>
          <div className="news-grid">
            {articles.slice(0, 3).map((story, index) => (
              <article className={`news-card news-card-${index + 1}`} key={story.id} data-reveal>
                <div className="news-image">
                  <img src={story.imageUrl} alt={story.imageAlt} loading="lazy" />
                </div>
                <div className="news-content">
                  <span className="news-category">{story.category}</span>
                  <h3>{story.title}</h3>
                  <p>{story.excerpt}</p>
                  <button onClick={() => onNavigate("article", story.slug)}>
                    Leer novedad <ArrowUpRight size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button className="news-all-link" onClick={() => onNavigate("news")}>Ver todas las novedades <ArrowRight size={18} /></button>
        </div>
      </section>

      <section className="path-section" id="como-funciona">
        <div className="container">
          <div className="section-heading path-heading" data-reveal>
            <div>
              <div className="eyebrow eyebrow-blue">¿POR DÓNDE EMPEZAMOS?</div>
              <h2>
                Una forma más simple
                <br />
                de <em>ponerte en movimiento.</em>
              </h2>
            </div>
            <p>
              El deporte se disfruta más cuando hay un lugar y una comunidad
              cerca. Te ayudamos a encontrarlos.
            </p>
          </div>
          <div className="path-grid">
            <article className="path-card path-card-one" data-reveal>
              <div className="path-icon">
                <Compass size={30} />
              </div>
              <span className="path-index">01</span>
              <h3>Descubrí</h3>
              <p>
                Buscá por deporte, barrio o tipo de espacio. Hay opciones para
                empezar desde cero o seguir creciendo.
              </p>
              <button onClick={() => onNavigate("explore")}>
                Explorar directorio <ArrowUpRight size={17} />
              </button>
            </article>
            <article className="path-card path-card-two" data-reveal>
              <div className="path-icon">
                <MapPin size={30} />
              </div>
              <span className="path-index">02</span>
              <h3>Elegí cerca</h3>
              <p>
                Mirá los perfiles, ubicá cada espacio en el mapa y contactá
                directamente a quien ofrece la actividad.
              </p>
              <button onClick={() => onNavigate("explore")}>
                Ver el mapa <ArrowUpRight size={17} />
              </button>
            </article>
            <article className="path-card path-card-three" data-reveal>
              <div className="path-icon">
                <Users size={30} />
              </div>
              <span className="path-index">03</span>
              <h3>Formá parte</h3>
              <p>
                Creá tu perfil gratuito y sumate a una red que fortalece a
                clubes, profesionales y deportistas sociales.
              </p>
              <button onClick={() => onAuth("register")}>
                Crear mi perfil <ArrowUpRight size={17} />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="audience-section">
        <div className="container audience-inner">
          <div className="audience-copy" data-reveal>
            <div className="eyebrow eyebrow-light">UN CLUB PARA TODOS</div>
            <h2>
              Más gente activa.
              <br />
              <em>Más clubes vivos.</em>
            </h2>
            <p>
              Los clubes de barrio son lugares para aprender, encontrarse y crecer.
              Ya podés descubrirlos en el mapa. Si representás a uno, reclamá su ficha
              y mostrá las actividades que hacen vivir tu comunidad.
            </p>
            <button
              className="button button-white"
              onClick={() => onAuth("register")}
            >
              Quiero ser parte <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="audience-pills" data-reveal>
            <span className="pill pill-one">
              <Dumbbell size={25} /> Deportistas sociales
            </span>
            <span className="pill pill-two">
              <Users size={25} /> Clubes de barrio
            </span>
            <span className="pill pill-three">
              <BadgeCheck size={25} /> Profesionales
            </span>
            <span className="pill pill-four">
              <Volleyball size={25} /> Federaciones
            </span>
            <span className="pill pill-five">
              <Sparkles size={25} /> Marcas aliadas
            </span>
          </div>
        </div>
      </section>
      <ContactSection />
    </main>
  );
}

function NewsPage({ articles, loading, error, onNavigate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState("recent");
  const availableCategories = useMemo(
    () => [...new Set(articles.map((article) => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [articles],
  );
  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return [...articles]
      .filter((article) => !category || article.category === category)
      .filter((article) => !normalizedQuery || [article.title, article.excerpt, article.category].some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery)))
      .sort((a, b) => {
        if (order === "title") return a.title.localeCompare(b.title, "es");
        return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
      });
  }, [articles, category, order, query]);
  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setOrder("recent");
  };
  return <main className="news-page">
    <section className="news-page-intro">
      <div className="container news-page-intro-inner">
        <div>
          <div className="eyebrow eyebrow-blue"><span className="eyebrow-dot" /> NOVEDADES IIDCA</div>
          <h1>Historias para seguir <em>en movimiento.</em></h1>
          <p>Ideas, experiencias y actividades para acercarte al deporte.</p>
        </div>
        <div className="news-intro-mark" aria-hidden="true"><span>IIDCA</span><strong>NOVEDADES</strong></div>
      </div>
    </section>
    <section className="container news-browser" aria-label="Todas las novedades">
      <div className="news-filter-panel">
        <label className="news-filter-search">
          <span>Buscar en novedades</span>
          <div><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, tema o palabra clave" /></div>
        </label>
        <label>
          <span>Categoría</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas las categorías</option>
            {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Ordenar por</span>
          <select value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="recent">Más recientes</option>
            <option value="title">Título A–Z</option>
          </select>
        </label>
        {(query || category || order !== "recent") && <button className="news-clear-filters" type="button" onClick={clearFilters}><X size={16} /> Limpiar</button>}
      </div>
      <div className="news-results-heading">
        <div><span>ARCHIVO DE HISTORIAS</span><h2>{visibleArticles.length} {visibleArticles.length === 1 ? "novedad" : "novedades"}</h2></div>
        <p>Noticias, ideas y experiencias de la comunidad deportiva.</p>
      </div>
      {loading && <p>Cargando novedades...</p>}
      {error && <p className="feedback error" role="alert">{error}</p>}
      {!loading && !error && !articles.length && <div className="empty-state"><h2>Pronto habrá novedades.</h2><p>Volvé a visitarnos para conocer nuevas historias.</p></div>}
      {!loading && !error && articles.length > 0 && !visibleArticles.length && <div className="empty-state"><Search size={30} /><h2>No encontramos coincidencias.</h2><p>Probá con otra palabra o quitá los filtros.</p><button className="button button-outline" onClick={clearFilters}>Ver todas</button></div>}
      <div className="news-page-grid">
        {visibleArticles.map((article) => <article className="news-list-card" key={article.id}>
          <button className="news-list-image" onClick={() => onNavigate("article", article.slug)} aria-label={`Leer ${article.title}`}><img src={article.imageUrl} alt={article.imageAlt} loading="lazy" /></button>
          <div>
            <div className="news-card-meta"><span className="news-category">{article.category}</span><time dateTime={article.publishedAt || article.createdAt}>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(article.publishedAt || article.createdAt))}</time></div>
            <h2>{article.title}</h2>
            <p>{article.excerpt}</p>
            <button className="news-read-link" onClick={() => onNavigate("article", article.slug)}>Leer novedad <ArrowUpRight size={18} /></button>
          </div>
        </article>)}
      </div>
    </section>
  </main>;
}

function NewsArticle({ article, loading, onNavigate }) {
  if (loading) return <main className="news-article-page container"><p>Cargando novedad...</p></main>;
  if (!article) return <main className="news-article-page container"><div className="empty-state"><h1>No encontramos esa novedad.</h1><button className="button button-primary" onClick={() => onNavigate("news")}>Ver novedades</button></div></main>;
  return <main className="news-article-page">
    <div className="container"><button className="news-back" onClick={() => onNavigate("news")}><ArrowLeft size={18} /> Todas las novedades</button>
      <div className="news-article-heading"><span className="news-category">{article.category}</span><h1>{article.title}</h1><p>{article.excerpt}</p></div>
      <img className="news-article-image" src={article.imageUrl} alt={article.imageAlt} />
      <div className="news-article-body">{article.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<button className="button button-primary" onClick={() => onNavigate("explore")}>Explorar opciones <ArrowUpRight size={18} /></button></div>
    </div>
  </main>;
}

function ContactSection() {
  const [values, setValues] = useState(() => testingMode ? {
    name: "Alex Prueba",
    email: "test@iidca.test",
    message: "Hola, quiero conocer más sobre IIDCA Social Club y sus actividades.",
  } : { name: "", email: "", message: "" });
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const name = values.name.trim();
    const email = values.email.trim();
    const message = values.message.trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      setState("error");
      setFeedback("Completá nombre, email válido y mensaje para enviarlo.");
      return;
    }
    setState("sending");
    setFeedback("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, company: "" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success !== true) throw new Error(data?.error || "No se pudo enviar el mensaje. Probá nuevamente.");
      setValues({ name: "", email: "", message: "" });
      setState("success");
      setFeedback("¡Gracias! Recibimos tu mensaje y te vamos a responder pronto.");
    } catch (error) {
      setState("error");
      setFeedback(error.message || "No se pudo enviar el mensaje. Probá nuevamente.");
    }
  };
  return (
    <section className="contact-section" id="contacto" aria-labelledby="contact-title">
      <div className="container contact-inner">
        <div className="contact-copy" data-reveal>
          <div className="eyebrow eyebrow-blue">HABLEMOS</div>
          <h2 id="contact-title">El próximo encuentro <em>empieza acá.</em></h2>
          <p>¿Tenés un club, una propuesta o una pregunta? Escribinos. Nos gusta conocer a quienes hacen crecer el deporte en su comunidad.</p>
          <span><Heart size={18} /> Estamos del otro lado.</span>
        </div>
        <form className="contact-form" onSubmit={submit} data-reveal>
          <div className="contact-form-grid">
            <label>Tu nombre<input type="text" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required maxLength={120} placeholder="¿Cómo te llamás?" /></label>
            <label>Tu email<input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required maxLength={200} placeholder="nombre@ejemplo.com" /></label>
          </div>
          <label>Tu mensaje<textarea value={values.message} onChange={(event) => setValues({ ...values, message: event.target.value })} required maxLength={3000} rows={5} placeholder="Contanos en qué podemos ayudarte" /></label>
          <div className="contact-form-bottom"><span>Te respondemos por email.</span><button className="button button-orange" type="submit" disabled={state === "sending"}>{state === "sending" ? "Enviando..." : "Enviar mensaje"} <ArrowUpRight size={18} /></button></div>
          {feedback && <p className={`contact-feedback ${state}`} role="status">{feedback}</p>}
        </form>
      </div>
    </section>
  );
}

function ProfileCard({ profile, onOpen }) {
  return (
    <article
      className={`directory-card role-${profile.category.toLowerCase()}`}
    >
      <div className="card-photo">
        <img src={profile.imageUrl || "/images/sports/running.jpg"} alt={profile.imageIllustrative || !profile.imageUrl ? `Actividad deportiva de ${profile.name}` : `Sede de ${profile.name}`} loading="lazy" />
      </div>
      <div className="card-top">
        <div className="card-icon">{roleIcon(profile.category, 25)}</div>
        <span className="card-category">{categoryLabel(profile.category)}</span>
        <span className={`verification-chip ${profile.verification === "VERIFIED" ? "is-verified" : ""}`}>
          {profile.verification === "VERIFIED" ? <><BadgeCheck size={15} /> Verificado</> : profile.category === "CLUB" ? "Sin verificar" : "Datos públicos"}
        </span>
      </div>
      <div className="card-body">
        <h3>{profile.name}</h3>
        <p>
          {profile.headline ||
            profile.description ||
            roleDescriptions[profile.category]}
        </p>
      </div>
      <div className="sport-tags">
        {profile.sports?.slice(0, 3).map((sport) => (
          <span key={sport}>{sport}</span>
        ))}
      </div>
      <div className="card-footer">
        <span>
          <MapPin size={15} /> {profile.neighborhood || profile.city}
          {profile.distanceKm !== null && profile.distanceKm !== undefined
            ? ` · ${profile.distanceKm} km`
            : ""}
        </span>
        <button
          onClick={() => onOpen(profile)}
          aria-label={`Ver perfil de ${profile.name}`}
        >
          <ArrowUpRight size={21} />
        </button>
      </div>
      {profile.isDemo && <span className="demo-tag">EJEMPLO</span>}
    </article>
  );
}

function FitGoogleMap({ profiles, location, focusId }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !window.google?.maps || focusId) return;
    if (profiles.length === 0 && location.lat && location.lng) {
      map.setCenter({ lat: Number(location.lat), lng: Number(location.lng) });
      map.setZoom(12);
      return;
    }
    if (profiles.length === 1) {
      map.setCenter({ lat: profiles[0].latitude, lng: profiles[0].longitude });
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    profiles.forEach((profile) => bounds.extend({ lat: profile.latitude, lng: profile.longitude }));
    if (location.lat && location.lng) bounds.extend({ lat: Number(location.lat), lng: Number(location.lng) });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 52);
  }, [map, profiles, location.lat, location.lng, focusId]);
  return null;
}

function FocusGoogleMap({ profile }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !profile) return;
    map.panTo({ lat: profile.latitude, lng: profile.longitude });
    map.setZoom(17);
  }, [map, profile]);
  return null;
}

function SelectedMapCard({ profile, onOpen, onClose }) {
  const map = useMap();
  const [container, setContainer] = useState(null);
  useEffect(() => {
    if (!map || !profile || !window.google?.maps?.OverlayView) return;
    const element = document.createElement("div");
    element.className = "map-marker-card-anchor";
    const overlay = new window.google.maps.OverlayView();
    overlay.onAdd = () => {
      overlay.getPanes().floatPane.appendChild(element);
      window.google.maps.OverlayView.preventMapHitsAndGesturesFrom(element);
      setContainer(element);
    };
    overlay.draw = () => {
      const point = overlay.getProjection().fromLatLngToDivPixel(
        new window.google.maps.LatLng(Number(profile.latitude), Number(profile.longitude)),
      );
      if (point) {
        element.style.left = `${point.x}px`;
        element.style.top = `${point.y + 12}px`;
      }
    };
    overlay.onRemove = () => {
      element.remove();
      setContainer(null);
    };
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, profile]);

  return container ? createPortal(
    <div className="map-marker-card">
      <img src={profile.imageUrl || "/images/sports/running.jpg"} alt="" />
      <div className="map-marker-card-copy">
        <span>ESTÁS VIENDO</span>
        <strong>{profile.name}</strong>
        <small>{profile.neighborhood || profile.city}</small>
        <button className="map-see-all" onClick={onClose}>Ver todos los puntos</button>
      </div>
      <button className="map-selected-detail" onClick={() => onOpen(profile)} aria-label={`Ver ficha de ${profile.name}`}>
        <ArrowUpRight size={19} />
      </button>
    </div>,
    container,
  ) : null;
}

function NearbyRadius({ filters }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !filters.lat || !filters.lng || !window.google?.maps?.Circle) return;
    const circle = new window.google.maps.Circle({
      map,
      center: { lat: Number(filters.lat), lng: Number(filters.lng) },
      radius: Number(filters.radius || 5) * 1000,
      strokeColor: "#090c70",
      strokeOpacity: 0.5,
      strokeWeight: 2,
      fillColor: "#4656cc",
      fillOpacity: 0.06,
      clickable: false,
    });
    return () => circle.setMap(null);
  }, [map, filters.lat, filters.lng, filters.radius]);
  return null;
}

function DirectoryZoomControls() {
  const map = useMap();
  const changeZoom = (step) => {
    if (!map) return;
    map.setZoom(Math.max(3, Math.min(20, (map.getZoom() || 11) + step)));
  };
  return (
    <MapControl position={ControlPosition.TOP_RIGHT}>
      <div className="map-zoom-controls" role="group" aria-label="Zoom del mapa">
        <button type="button" onClick={() => changeZoom(1)} aria-label="Acercar mapa" title="Acercar mapa">+</button>
        <button type="button" onClick={() => changeZoom(-1)} aria-label="Alejar mapa" title="Alejar mapa">−</button>
      </div>
    </MapControl>
  );
}

function normalizeMapText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const mapSports = ["Fútbol", "Básquet", "Vóley", "Natación", "Tenis", "Gimnasia"];
const mapPin = (active) => `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="58" viewBox="0 0 44 58">
    <path d="M22 2C10.4 2 2 10.6 2 22c0 14 20 33 20 33s20-19 20-33C42 10.6 33.6 2 22 2Z" fill="#090c70" stroke="${active ? "#ff9d00" : "#ffffff"}" stroke-width="3"/>
    <path d="M12 14 22 11 32 14 30 29 22 35 14 29Z" fill="#ffffff"/>
    <path d="M16 17 22 15 28 17 27 27 22 31 17 27Z" fill="#090c70"/>
    <path d="m22 17 1.1 3.1h3.3l-2.7 2 1 3.1-2.7-1.9-2.7 1.9 1-3.1-2.7-2h3.3Z" fill="#ff9d00"/>
  </svg>
`)}`;

function DirectoryMap({ profiles, filters, onOpen, onRadiusChange }) {
  const [focused, setFocused] = useState(null);
  const [mapSearch, setMapSearch] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const points = useMemo(() => profiles.filter(
    (profile) => Number.isFinite(Number(profile.latitude)) && Number.isFinite(Number(profile.longitude)) && profile.latitude !== null && profile.longitude !== null,
  ), [profiles]);
  const areas = useMemo(() => [...new Set(points.map((profile) => profile.neighborhood || profile.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [points]);
  const visiblePoints = useMemo(() => points.filter((profile) => {
    const haystack = normalizeMapText([profile.name, profile.neighborhood, profile.city, ...(profile.sports || [])].join(" "));
    return (!mapSearch || haystack.includes(normalizeMapText(mapSearch)))
      && (!selectedArea || (profile.neighborhood || profile.city) === selectedArea)
      && (!selectedSport || (profile.sports || []).some((sport) => normalizeMapText(sport).includes(normalizeMapText(selectedSport))));
  }), [points, mapSearch, selectedArea, selectedSport]);
  const selected = visiblePoints.find((profile) => profile.id === focused?.id) || null;
  const clearMapFilters = () => {
    setMapSearch("");
    setSelectedSport("");
    setSelectedArea("");
    setFocused(null);
  };
  const embedQuery = selected
    ? `${selected.latitude},${selected.longitude}`
    : filters.lat && filters.lng
      ? `${filters.lat},${filters.lng}`
      : `${mapSearch || selectedSport || "deporte"} ${selectedArea || filters.location || "Ciudad de Buenos Aires"}`;
  const embedZoom = selected ? 17 : 14;
  return (
    <div className="map-frame" aria-label="Mapa y filtros de entidades deportivas">
      <div className="map-topbar">
        <div><span className="map-topbar-kicker">EXPLORÁ EN EL MAPA</span><strong>Tu próximo lugar puede estar cerca.</strong></div>
        <span className="map-total"><MapPin size={16} /> {visiblePoints.length} ubicaciones</span>
      </div>
      <div className="map-layout">
        <div className="map-canvas">
          {googleMapsKey ? (
            <APIProvider apiKey={googleMapsKey} language="es" region="AR">
              <GoogleMap defaultCenter={{ lat: -34.6037, lng: -58.3816 }} defaultZoom={11} gestureHandling="cooperative" className="directory-map" mapTypeControl={false} streetViewControl={false} zoomControl={false} fullscreenControl>
                <DirectoryZoomControls />
                <FitGoogleMap profiles={visiblePoints} location={filters} focusId={selected?.id} />
                <FocusGoogleMap profile={selected} />
                <NearbyRadius filters={filters} />
                {visiblePoints.map((profile) => (
                  <Marker key={profile.id} position={{ lat: Number(profile.latitude), lng: Number(profile.longitude) }} icon={mapPin(selected?.id === profile.id)} zIndex={selected?.id === profile.id ? 100 : 1} title={profile.name} onClick={() => setFocused(profile)} />
                ))}
                {selected && <SelectedMapCard profile={selected} onOpen={onOpen} onClose={() => setFocused(null)} />}
              </GoogleMap>
            </APIProvider>
          ) : (
            <iframe className="directory-map" title="Google Maps: entidades deportivas" src={`https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=${embedZoom}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
          {!googleMapsKey && selected && (
            <div className="map-marker-card-anchor map-marker-card-fallback">
              <div className="map-marker-card">
                <img src={selected.imageUrl || "/images/sports/running.jpg"} alt="" />
                <div className="map-marker-card-copy"><span>ESTÁS VIENDO</span><strong>{selected.name}</strong><small>{selected.neighborhood || selected.city}</small><button className="map-see-all" onClick={() => setFocused(null)}>Ver todos los puntos</button></div>
                <button className="map-selected-detail" onClick={() => onOpen(selected)} aria-label={`Ver ficha de ${selected.name}`}><ArrowUpRight size={19} /></button>
              </div>
            </div>
          )}
        </div>
        <aside className="map-sidebar" aria-label="Filtros y resultados del mapa">
          <div className="map-filters">
            <div className="map-filters-heading"><strong>Filtrá tu búsqueda</strong><button onClick={clearMapFilters}>Limpiar</button></div>
            <label className="map-search-field"><Search size={18} /><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Club, deporte o barrio" aria-label="Buscar en el mapa" /></label>
            <label className="map-area-field"><MapPin size={18} /><select value={selectedArea} onChange={(event) => { setSelectedArea(event.target.value); setFocused(null); }} aria-label="Filtrar por barrio"><option value="">Todos los barrios</option>{areas.map((area) => <option value={area} key={area}>{area}</option>)}</select></label>
            {filters.lat && filters.lng && (
              <div className="map-radius-filters" role="group" aria-label="Radio de búsqueda">
                <span>Distancia desde vos</span>
                <div>
                  {[5, 10, 20].map((radius) => (
                    <button
                      key={radius}
                      className={Number(filters.radius || 5) === radius ? "active" : ""}
                      aria-pressed={Number(filters.radius || 5) === radius}
                      onClick={() => onRadiusChange(radius)}
                    >
                      {radius} km
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="map-sport-filters" aria-label="Filtrar por deporte"><button className={!selectedSport ? "active" : ""} aria-pressed={!selectedSport} onClick={() => { setSelectedSport(""); setFocused(null); }}>Todos</button>{mapSports.map((sport) => <button key={sport} className={selectedSport === sport ? "active" : ""} aria-pressed={selectedSport === sport} onClick={() => { setSelectedSport(sport); setFocused(null); }}>{sport}</button>)}</div>
          </div>
          <div className="map-list-heading"><strong>{visiblePoints.length} {visiblePoints.length === 1 ? "resultado" : "resultados"}</strong><span>Elegí una opción para ubicarla</span></div>
          <div className="map-results">
            {visiblePoints.length === 0 && <div className="map-no-results"><Compass size={27} /><strong>No encontramos ubicaciones con esos filtros.</strong><button onClick={clearMapFilters}>Limpiar filtros del mapa</button></div>}
            {visiblePoints.map((profile) => (
              <button key={profile.id} className={`map-result ${selected?.id === profile.id ? "selected" : ""}`} onClick={() => setFocused(profile)} aria-pressed={selected?.id === profile.id}>
                <img src={profile.imageUrl || "/images/sports/running.jpg"} alt="" loading="lazy" />
                <span><strong>{profile.name}</strong><small><MapPin size={13} />{profile.neighborhood || profile.city}{profile.distanceKm !== null && profile.distanceKm !== undefined ? ` · ${profile.distanceKm} km` : ""}</small><em>{profile.sports?.slice(0, 2).join(" · ") || categoryLabel(profile.category)}</em></span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        </aside>
      </div>
      <div className="map-caption">
        <MapPin size={17} /> {googleMapsKey ? "Los marcadores muestran todos los resultados filtrados." : "Elegí una opción del listado para ubicarla en Google Maps."}{" "}
        <span>Mapa: Google Maps</span>
      </div>
    </div>
  );
}

function LocationPicker({ latitude, longitude, onChoose }) {
  const center = latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : { lat: -34.6037, lng: -58.3816 };
  return (
    <div className="location-picker">
      <div>
        <strong>Ubicá tu espacio en el mapa</strong>
        <span>
          Opcional. Elegí una ubicación para aparecer en las búsquedas cercanas.
        </span>
      </div>
      {googleMapsKey ? (
        <APIProvider apiKey={googleMapsKey} language="es" region="AR">
          <GoogleMap center={center} zoom={latitude && longitude ? 14 : 11} gestureHandling="cooperative" className="picker-map" onClick={(event) => event.detail.latLng && onChoose(event.detail.latLng)}>
            {latitude && longitude && <Marker position={center} />}
          </GoogleMap>
        </APIProvider>
      ) : (
        <>
          <iframe className="picker-map" title="Google Maps para ubicar tu espacio" src={`https://maps.google.com/maps?q=${latitude && longitude ? `${latitude},${longitude}` : "Ciudad de Buenos Aires"}&z=12&output=embed`} loading="lazy" />
          <p className="map-coordinate-help">Abrí <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>, elegí tu sede y copiá las coordenadas.</p>
          <div className="coordinate-fields">
            <label>Latitud <input type="number" step="any" value={latitude ?? ""} onChange={(event) => onChoose({ lat: event.target.value, lng: longitude ?? "" })} /></label>
            <label>Longitud <input type="number" step="any" value={longitude ?? ""} onChange={(event) => onChoose({ lat: latitude ?? "", lng: event.target.value })} /></label>
          </div>
        </>
      )}
      {latitude && longitude && (
        <small>Ubicación seleccionada. Podés cambiarla con otro clic.</small>
      )}
    </div>
  );
}

function IdleDirectory({ onLocate, locating, geoError }) {
  return (
    <div className="map-frame map-idle" aria-label="Mapa sin resultados hasta iniciar una búsqueda">
      <div className="map-topbar">
        <div>
          <span className="map-topbar-kicker">EXPLORÁ EN EL MAPA</span>
          <strong>Tu próximo lugar puede estar cerca.</strong>
        </div>
        <button
          className="map-idle-top-action"
          type="button"
          onClick={onLocate}
          disabled={locating}
        >
          <LocateFixed size={18} />
          {locating ? "Buscando tu ubicación..." : "Encontrar cerca de mi ubicación"}
        </button>
      </div>
      <div className="map-idle-canvas">
        <div className="map-idle-grid" aria-hidden="true" />
        <div className="map-idle-content">
          <span className="map-idle-icon">
            <LocateFixed size={30} strokeWidth={1.8} />
          </span>
          <span className="map-idle-kicker">EMPEZÁ POR VOS</span>
          <h3>Encontrá deporte cerca tuyo.</h3>
          <p>Buscamos clubes, profesionales y otras entidades publicadas a 5 km de tu ubicación.</p>
          <small>Usá el botón naranja o elegí un deporte, ubicación o categoría en el buscador de arriba.</small>
          {geoError && (
            <div className="map-idle-error" role="alert">{geoError}</div>
          )}
        </div>
      </div>
      <div className="map-caption">
        <MapPin size={17} /> El mapa mostrará resultados cuando inicies una búsqueda.
      </div>
    </div>
  );
}

function Explore({ filters, onSearch, profiles, loading, error, onOpen }) {
  const [layout, setLayout] = useState("map");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const active = hasSearchCriteria(filters);
  const currentRadius = Number(filters.radius || 5);
  const expandedRadius = currentRadius < 10 ? 10 : currentRadius < 20 ? 20 : null;
  const locateNearby = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no admite ubicación. Podés buscar por barrio o ciudad arriba.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onSearch({ ...defaultFilters, lat: String(coords.latitude), lng: String(coords.longitude), radius: "5" });
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos obtener tu ubicación. Permití el acceso en el navegador o buscá por barrio o ciudad arriba.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  return (
    <main className="explore-page">
      <section className="explore-intro">
        <div className="container">
          <div className="eyebrow eyebrow-blue">
            <span className="eyebrow-dot" /> EXPLORÁ TU COMUNIDAD
          </div>
          <h1>
            Encontrá tu próximo <em>lugar.</em>
          </h1>
          <p>Explorá clubes y actividades cerca tuyo.</p>
          <SearchForm initial={filters} onSearch={onSearch} compact />
        </div>
      </section>
      <section className="directory-section">
        <div className="container">
          <div className="directory-toolbar">
            <div>
              <h2>Directorio deportivo</h2>
              <span>
                {!active
                  ? "Elegí cómo empezar a explorar"
                  : loading
                  ? "Buscando..."
                  : `${profiles.length} ${profiles.length === 1 ? "opción encontrada" : "opciones encontradas"}${filters.lat && filters.lng ? ` a ${currentRadius} km de vos` : ""}`}
              </span>
            </div>
            <div
              className="view-switch"
              role="group"
              aria-label="Vista del directorio"
            >
              <button
                className={layout === "list" ? "selected" : ""}
                onClick={() => setLayout("list")}
                aria-pressed={layout === "list"}
              >
                Listado
              </button>
              <button
                className={layout === "map" ? "selected" : ""}
                onClick={() => setLayout("map")}
                aria-pressed={layout === "map"}
              >
                Mapa
              </button>
            </div>
          </div>
          {error && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
          {active && !loading && !error && profiles.length === 0 && (
            <div className="empty-state">
              <Compass size={35} />
              <h3>Todavía no hay resultados con esos filtros.</h3>
              <p>{filters.lat && filters.lng && expandedRadius
                ? "Probá con un radio más amplio."
                : "Probá con otro deporte, barrio o categoría."}</p>
              <button
                className="button button-primary"
                onClick={() => filters.lat && filters.lng && expandedRadius
                  ? onSearch({ ...filters, radius: String(expandedRadius) })
                  : document.querySelector(".explore-intro .search-panel input")?.focus()}
              >
                {filters.lat && filters.lng && expandedRadius
                  ? `Ampliar búsqueda a ${expandedRadius} km`
                  : "Cambiar búsqueda"}
              </button>
            </div>
          )}
          {!active ? (
            <IdleDirectory onLocate={locateNearby} locating={locating} geoError={geoError} />
          ) : layout === "list" ? (
            <div className="directory-grid">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onOpen={onOpen}
                />
              ))}
            </div>
          ) : (
            <DirectoryMap
              profiles={profiles}
              filters={filters}
              onOpen={onOpen}
              onRadiusChange={(radius) => onSearch({ ...filters, radius: String(radius) })}
            />
          )}
          <p className="directory-disclaimer">
            Las fichas con “Datos públicos” provienen de un padrón abierto y todavía no fueron reclamadas por el club. Las fotografías muestran la sede o una actividad deportiva.
            Fuente: <a href="https://data.buenosaires.gob.ar/es_AR/dataset/clubes" target="_blank" rel="noopener noreferrer">Buenos Aires Data · Clubes</a>.
          </p>
        </div>
      </section>
    </main>
  );
}

function DetailModal({ profile, onClose, user, onAuth, onNavigate }) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [evidence, setEvidence] = useState(testingMode ? "Solicitud de prueba: represento a este club y quiero verificar cómo funciona la revisión de fichas en IIDCA." : "");
  const [claimMessage, setClaimMessage] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  if (!profile) return null;
  const phone = profile.phone?.replace(/[^\d+]/g, "");
  const detailLabels = {
    levels: "Niveles",
    schedule: "Días y horarios",
    facilities: "Infraestructura",
    ages: "Edades admitidas",
    profession: "Profesión",
    mode: "Modalidad",
    specialty: "Especialidad",
    education: "Formación",
    experience: "Años de experiencia",
    region: "Región",
    founded: "Año de fundación",
    socialPractice: "Práctica social",
    beginners: "Principiantes",
    sector: "Rubro",
    support: "Interés",
    supportType: "Tipo de apoyo",
  };
  const submitClaim = async (event) => {
    event.preventDefault();
    setClaimBusy(true);
    setClaimMessage("");
    try {
      await api(`/profiles/${profile.id}/claim`, { method: "POST", body: JSON.stringify({ evidence }) });
      setClaimMessage("Recibimos el reclamo. IIDCA revisará el vínculo antes de verificar la ficha.");
      setClaimOpen(false);
    } catch (issue) { setClaimMessage(issue.message); }
    finally { setClaimBusy(false); }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${profile.name}`}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={22} />
        </button>
        <div className="detail-banner">
          <img className="detail-cover" src={profile.imageUrl || "/images/sports/running.jpg"} alt={profile.imageIllustrative || !profile.imageUrl ? `Actividad deportiva de ${profile.name}` : `Sede de ${profile.name}`} />
          <div className="detail-banner-icon">
            {roleIcon(profile.category, 38)}
          </div>
          <span>
            {categoryLabel(profile.category)}
            {profile.isDemo ? " · Perfil de ejemplo" : ""}
          </span>
        </div>
        <div className="detail-content">
          <h2>{profile.name}</h2>
          <div className="detail-verification">
            {profile.verification === "VERIFIED" ? <><BadgeCheck size={18} /> Club verificado · instalaciones con fotos</> : profile.category === "CLUB" ? <><CircleHelp size={18} /> Instalaciones pendientes de completar</> : <><CircleHelp size={18} /> Información pública sin verificar</>}
          </div>
          {profile.imageSourceUrl && <p className="image-credit"><a href={profile.imageSourceUrl} target="_blank" rel="noopener noreferrer">{profile.imageCredit || "Wikimedia Commons"}</a></p>}
          <p className="detail-headline">{profile.headline}</p>
          <div className="detail-meta">
            <span>
              <MapPin size={17} />{" "}
              {profile.neighborhood ? `${profile.neighborhood}, ` : ""}
              {profile.city}
            </span>
            {profile.distanceKm !== null &&
              profile.distanceKm !== undefined && (
                <span>
                  <Navigation size={16} /> A {profile.distanceKm} km
                </span>
              )}
          </div>
          {profile.description && (
            <p className="detail-description">{profile.description}</p>
          )}
          {profile.sports?.length > 0 && (
            <>
              <h3>Deportes y actividades</h3>
              <div className="sport-tags detail-tags">
                {profile.sports.map((sport) => (
                  <span key={sport}>{sport}</span>
                ))}
              </div>
            </>
          )}
          {Object.values(profile.details || {}).some(Boolean) && (
            <div className="detail-facts">
              {Object.entries(profile.details)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key}>
                    <strong>{detailLabels[key] || key}</strong>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          )}
          {profile.address && (
            <div className="detail-info">
              <MapPin size={19} />
              <span>{profile.address}</span>
            </div>
          )}
          {profile.website && (
            <div className="detail-info">
              <ExternalLink size={19} />
              <a
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Sitio web
              </a>
            </div>
          )}
          {profile.instagram && (
            <div className="detail-info">
              <Sparkles size={19} />
              <a
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.instagram}
              </a>
            </div>
          )}
          <div className="detail-actions">
            {profile.category === "CLUB" && (
              <button className="button button-orange" onClick={() => { onClose(); onNavigate("club", profile.id); }}>
                Ver perfil completo <ArrowUpRight size={18} />
              </button>
            )}
            {profile.email && !profile.isDemo && (
              <a
                className="button button-primary"
                href={`mailto:${profile.email}`}
              >
                <Mail size={18} /> Escribir por email
              </a>
            )}
            {phone && !profile.isDemo && (
              <a
                className="button button-outline"
                href={`https://wa.me/${phone.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contactar por WhatsApp
              </a>
            )}
            {profile.latitude !== null && profile.longitude !== null && (
              <a
                className="button button-outline"
                href={`https://www.google.com/maps/search/?api=1&query=${profile.latitude}%2C${profile.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={18} /> Cómo llegar
              </a>
            )}
          </div>
          {profile.isDemo && (
            <p className="example-notice">
              Este perfil es una demostración. Los datos de contacto no están
              disponibles.
            </p>
          )}
          {profile.sourceUrl && <p className="source-note">Datos iniciales: <a href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">{profile.sourceName}</a>. Confirmá actividades y contacto con el club antes de asistir.</p>}
          {profile.sourceKey && profile.verification !== "VERIFIED" && (
            <section className="claim-panel">
              <h3>¿Representás a este club?</h3>
              <p>Reclamá la ficha para actualizar datos, publicar actividades y contar lo que sucede en tu comunidad.</p>
              <p><a href="/para-clubes.html" target="_blank" rel="noopener noreferrer">Conocé cómo funciona para los clubes ↗</a></p>
              {!user ? <button className="button button-primary" onClick={() => onAuth("register")}>Crear cuenta para reclamar</button>
                : !["CLUB", "FEDERATION"].includes(user.role) ? <p>Usá una cuenta de club u organización para solicitar la verificación.</p>
                  : !claimOpen ? <button className="button button-primary" onClick={() => setClaimOpen(true)}>Reclamar esta ficha</button>
                    : <form onSubmit={submitClaim}>
                      <label>¿Cómo comprobamos tu vínculo con el club?
                        <textarea minLength={30} maxLength={1000} required value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Contanos tu función, sitio institucional o un contacto oficial para verificarlo." />
                      </label>
                      <button className="button button-primary" disabled={claimBusy}>{claimBusy ? "Enviando..." : "Enviar a revisión"}</button>
                    </form>}
              {claimMessage && <p role="status">{claimMessage}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ClubProfilePage({ profile, loading, error, onNavigate }) {
  if (loading) return <main className="club-profile-page"><div className="container empty-state"><p>Cargando perfil del club...</p></div></main>;
  if (error || !profile || profile.category !== "CLUB") return <main className="club-profile-page"><div className="container empty-state"><Building2 size={34} /><h1>No encontramos este club.</h1><p>{error || "La ficha no está disponible."}</p><button className="button button-primary" onClick={() => onNavigate("explore")}>Volver al directorio</button></div></main>;
  const phone = profile.phone?.replace(/[^\d+]/g, "");
  const facilities = profile.facilities || [];
  const details = [
    ["Niveles", profile.details?.levels],
    ["Días y horarios", profile.details?.schedule],
    ["Edades admitidas", profile.details?.ages],
  ].filter(([, value]) => value);
  return (
    <main className="club-profile-page">
      <section className="club-profile-hero">
        <img src={profile.imageUrl || facilities[0]?.photos?.[0]?.url || "/images/sports/football.jpg"} alt={`Actividad e instalaciones de ${profile.name}`} />
        <div className="club-profile-overlay" />
        <div className="container club-profile-hero-content">
          <button className="club-profile-back" onClick={() => onNavigate("explore")}><ArrowLeft size={18} /> Volver al directorio</button>
          <div className={`club-profile-badge ${profile.verification === "VERIFIED" ? "is-verified" : ""}`}>
            {profile.verification === "VERIFIED" ? <BadgeCheck size={17} /> : <CircleHelp size={17} />}
            {profile.verification === "VERIFIED" ? "Club verificado" : "Instalaciones aún sin verificar"}
          </div>
          <h1>{profile.name}</h1>
          <p>{profile.headline || "Un espacio deportivo para encontrarse, aprender y moverse."}</p>
          <div className="club-profile-location"><MapPin size={18} /> {profile.neighborhood ? `${profile.neighborhood}, ` : ""}{profile.city}</div>
        </div>
      </section>

      <div className="container club-profile-layout">
        <div className="club-profile-main">
          <section className="club-profile-section club-profile-about">
            <div className="eyebrow eyebrow-blue">CONOCÉ EL CLUB</div>
            <h2>Un lugar para <em>hacer deporte.</em></h2>
            <p>{profile.description || "Este club forma parte del directorio deportivo de IIDCA Social Club."}</p>
            {profile.sports?.length > 0 && <div className="sport-tags club-profile-sports">{profile.sports.map((sport) => <span key={sport}>{sport}</span>)}</div>}
            {details.length > 0 && <div className="club-profile-facts">{details.map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}</div>}
          </section>

          <section className="club-profile-section" id="instalaciones">
            <div className="club-profile-section-heading">
              <div><div className="eyebrow eyebrow-blue">ESPACIOS REALES</div><h2>Instalaciones del club</h2></div>
              <p>{profile.verification === "VERIFIED" ? "Estas instalaciones fueron declaradas por el club y cuentan con registro fotográfico." : "El club todavía está completando el registro fotográfico de sus instalaciones."}</p>
            </div>
            {facilities.length ? (
              <div className="club-facilities-grid">
                {facilities.map((facility) => (
                  <article className="club-facility-card" key={facility.id}>
                    <div className="club-facility-photos">
                      {facility.photos?.length ? facility.photos.map((photo, index) => <img key={photo.id} src={photo.url} alt={`${facility.name} de ${profile.name}${index ? `, foto ${index + 1}` : ""}`} loading="lazy" />) : <div className="club-facility-placeholder"><Camera size={28} /><span>Foto pendiente</span></div>}
                    </div>
                    <div><Building2 size={19} /><h3>{facility.name}</h3>{facility.photos?.length ? <span><Check size={14} /> Con registro fotográfico</span> : <span className="is-pending"><CircleHelp size={14} /> Sin foto todavía</span>}</div>
                  </article>
                ))}
              </div>
            ) : <div className="club-facilities-empty"><Building2 size={30} /><h3>Instalaciones pendientes de declarar</h3><p>El club todavía no cargó el detalle de sus espacios.</p></div>}
          </section>

          {(profile.latitude !== null && profile.longitude !== null) && (
            <section className="club-profile-section">
              <div className="eyebrow eyebrow-blue">UBICACIÓN</div>
              <h2>Cómo llegar</h2>
              <div className="club-profile-map"><iframe title={`Mapa de ${profile.name}`} src={`https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
              {profile.address && <p className="club-profile-address"><MapPin size={17} /> {profile.address}</p>}
            </section>
          )}
        </div>

        <aside className="club-profile-sidebar">
          <div className="club-contact-card">
            <span className="club-verification-kicker">CONTACTO DEL CLUB</span>
            <h2>¿Querés conocerlo?</h2>
            <p>Consultá horarios, actividades disponibles y requisitos directamente con el club.</p>
            {profile.email && <a className="button button-primary full-width" href={`mailto:${profile.email}`}><Mail size={18} /> Escribir por email</a>}
            {phone && <a className="button button-orange full-width" href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>}
            {profile.website && <a className="club-contact-link" href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> Sitio web</a>}
            {profile.instagram && <a className="club-contact-link" href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"><Sparkles size={17} /> {profile.instagram}</a>}
          </div>
          <div className="club-trust-card"><ShieldCheck size={24} /><div><strong>¿Qué significa verificado?</strong><p>Que cada instalación declarada por el club tiene al menos una foto publicada en su ficha.</p></div></div>
        </aside>
      </div>
    </main>
  );
}

function FormField({ field, value, onChange }) {
  return (
    <label className="form-field">
      <span>
        {field.label}
        {field.required && <b> *</b>}
      </span>
      {field.type === "select" ? (
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        >
          <option value="">Elegí una opción</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          rows={3}
        />
      ) : (
        <input
          type={field.type || "text"}
          min={field.min}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
        />
      )}
    </label>
  );
}

function FacilityDeclaration({ facilities, onChange }) {
  const update = (index, value) => onChange(facilities.map((item, itemIndex) => itemIndex === index ? value : item));
  const remove = (index) => onChange(facilities.filter((_, itemIndex) => itemIndex !== index));
  return (
    <fieldset className="facility-declaration">
      <legend><Building2 size={18} /> Instalaciones del club</legend>
      <p>Declaralas por separado. Para obtener la insignia, después tendrás que subir al menos una foto de cada una.</p>
      <div className="facility-declaration-list">
        {facilities.map((facility, index) => (
          <div key={index}>
            <input
              value={facility}
              onChange={(event) => update(index, event.target.value)}
              placeholder="Ej. Cancha de fútbol, pileta o gimnasio"
              maxLength={120}
              required
            />
            <button type="button" onClick={() => remove(index)} disabled={facilities.length === 1} aria-label={`Quitar instalación ${index + 1}`}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="facility-add-button" onClick={() => onChange([...facilities, ""])} disabled={facilities.length >= 12}>
        <Plus size={16} /> Agregar otra instalación
      </button>
    </fieldset>
  );
}

function AuthModal({ mode, onClose, onSuccess, onMode }) {
  const [role, setRole] = useState("ATHLETE");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() =>
    mode === "login" || mode === "admin" ? createLoginDefaults(mode === "admin") : createRegistrationDefaults(),
  );
  const [clubFacilities, setClubFacilities] = useState([]);
  const [accepted, setAccepted] = useState(false);
  const [publicConsent, setPublicConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!mode) return null;

  const change = (name, value) =>
    setDraft((current) => ({ ...current, [name]: value }));
  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: draft.email, password: draft.password, adminPortal: mode === "admin" }),
      });
      onSuccess(data.user);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  };
  const submitRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const profile = {
        name: draft.name,
        city: draft.city,
        neighborhood: draft.neighborhood,
        sport: draft.sport,
        sports: [draft.sport, ...(draft.sports || "").split(",")]
          .map((item) => item?.trim())
          .filter(Boolean),
        headline: draft.headline,
        description: draft.description,
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
        email: role === "ATHLETE" ? null : draft.contactEmail,
        phone: role === "ATHLETE" ? null : draft.phone,
        instagram: draft.instagram,
        website: draft.website,
        facilities: role === "CLUB" ? clubFacilities : [],
        details: Object.fromEntries(
          roleFields[role].map((field) => [
            field.name,
            draft[field.name] || "",
          ]),
        ),
      };
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: draft.email,
          password: draft.password,
          role,
          acceptedTerms: accepted,
          publicConsent,
          profile,
        }),
      });
      if (testingMode) window.sessionStorage.setItem("iidcaTestEmail", draft.email);
      onSuccess(data.user);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "register" ? "Crear perfil" : mode === "admin" ? "Administración" : "Ingresar"}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={22} />
        </button>
        {mode === "login" || mode === "admin" ? (
          <div className="auth-content">
            <div className="auth-symbol">
              <LogIn size={26} />
            </div>
            <div className="eyebrow eyebrow-blue">{mode === "admin" ? "ACCESO ADMINISTRADOR" : "BIENVENIDO DE VUELTA"}</div>
            <h2>
              {mode === "admin" ? <>Panel de <em>IIDCA.</em></> : <>Entrá a tu <em>espacio.</em></>}
            </h2>
            <p>{mode === "admin" ? "Revisá fichas y solicitudes de la comunidad." : "Seguimos conectando personas con oportunidades para moverse."}</p>
            {testingMode && (
              <p className="test-mode-note">
                Modo demo: podés ingresar sin contraseña. Los datos están precargados para probar.
              </p>
            )}
            <form onSubmit={submitLogin} className="auth-form">
              <FormField
                field={{
                  name: "email",
                  label: "Email",
                  type: "email",
                  required: true,
                }}
                value={draft.email}
                onChange={(value) => change("email", value)}
              />
              <FormField
                field={{
                  name: "password",
                  label: testingMode ? "Contraseña (opcional en demo)" : "Contraseña",
                  type: "password",
                  required: !testingMode,
                }}
                value={draft.password}
                onChange={(value) => change("password", value)}
              />
              {error && (
                <div className="feedback error" role="alert">
                  {error}
                  {mode === "login" && error.includes("acceso de administración") && <button type="button" className="auth-admin-link" onClick={() => onMode("admin")}>Abrir acceso administrador <ArrowRight size={16} /></button>}
                </div>
              )}
              <button
                className="button button-primary full-width"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}{" "}
                <ArrowRight size={18} />
              </button>
            </form>
            {mode !== "admin" && <p className="auth-switch">
              ¿Todavía no tenés perfil?{" "}
              <button
                onClick={() => {
                  setError("");
                  onMode("register");
                }}
              >
                Sumate al club
              </button>
            </p>}
          </div>
        ) : (
          <div className="auth-content auth-content-register">
            <div className="register-progress">
              <span className={step >= 0 ? "done" : ""} />
              <span className={step >= 1 ? "done" : ""} />
              <span className={step >= 2 ? "done" : ""} />
            </div>
            <div className="eyebrow eyebrow-blue">
              CREÁ TU PERFIL · PASO {step + 1} DE 3
            </div>
            {step === 0 && (
              <>
                <h2>
                  Hay un lugar <em>para vos.</em>
                </h2>
                <p>Elegí cómo querés formar parte de IIDCA Social Club.</p>
                {testingMode && (
                  <p className="test-mode-note">
                    Modo de prueba: los datos son ficticios y podés editarlos antes de enviar.
                  </p>
                )}
                <div className="role-grid">
                  {Object.keys(roleDescriptions).map((item) => (
                    <button
                      key={item}
                      className={`role-option ${role === item ? "selected" : ""}`}
                      onClick={() => {
                        setRole(item);
                        if (testingMode) setDraft(createRegistrationDefaults(item));
                        setClubFacilities(item === "CLUB"
                          ? testingMode
                            ? ["Cancha de fútbol", "Salón de usos múltiples"]
                            : [""]
                          : []);
                      }}
                    >
                      <span className="role-option-icon">{roleIcon(item)}</span>
                      <strong>{roleLabels[item]}</strong>
                      <small>{roleDescriptions[item]}</small>
                      <span className="role-check">
                        {role === item && <Check size={15} />}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="button button-primary full-width"
                  onClick={() => setStep(1)}
                >
                  Continuar <ArrowRight size={18} />
                </button>
              </>
            )}
            {step === 1 && (
              <>
                <h2>
                  Contanos un poco <em>más.</em>
                </h2>
                <p>
                  Esta información ayuda a que otras personas encuentren la
                  opción adecuada.
                </p>
                <form
                  className="auth-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setStep(2);
                  }}
                >
                  <div className="form-grid">
                    <FormField
                      field={{
                        label:
                          role === "ATHLETE" || role === "PROFESSIONAL"
                            ? "Nombre y apellido"
                            : "Nombre de la organización",
                        required: true,
                      }}
                      value={draft.name}
                      onChange={(value) => change("name", value)}
                    />
                    <FormField
                      field={{
                        label: "Ciudad",
                        required: true,
                        placeholder: "Ciudad de Buenos Aires",
                      }}
                      value={draft.city}
                      onChange={(value) => change("city", value)}
                    />
                    <FormField
                      field={{ label: "Barrio o zona", placeholder: "Palermo" }}
                      value={draft.neighborhood}
                      onChange={(value) => change("neighborhood", value)}
                    />
                    <FormField
                      field={{
                        label:
                          role === "SPONSOR"
                            ? "Deporte o causa que acompañás"
                            : "Deporte principal",
                        placeholder: "Ej. fútbol",
                      }}
                      value={draft.sport}
                      onChange={(value) => change("sport", value)}
                    />
                    <FormField
                      field={{
                        label: "Otras actividades",
                        placeholder: "Separadas por comas",
                      }}
                      value={draft.sports}
                      onChange={(value) => change("sports", value)}
                    />
                    {role !== "ATHLETE" && (
                      <FormField
                        field={{ label: "Dirección o zona de atención" }}
                        value={draft.address}
                        onChange={(value) => change("address", value)}
                      />
                    )}
                    {roleFields[role].map((field) => (
                      <FormField
                        key={field.name}
                        field={field}
                        value={draft[field.name]}
                        onChange={(value) => change(field.name, value)}
                      />
                    ))}
                  </div>
                  {role === "CLUB" && (
                    <FacilityDeclaration facilities={clubFacilities.length ? clubFacilities : [""]} onChange={setClubFacilities} />
                  )}
                  {role !== "ATHLETE" && (
                    <LocationPicker
                      latitude={draft.latitude}
                      longitude={draft.longitude}
                      onChoose={({ lat, lng }) =>
                        setDraft((current) => ({
                          ...current,
                          latitude: lat,
                          longitude: lng,
                        }))
                      }
                    />
                  )}
                  {role !== "ATHLETE" && (
                    <>
                      <FormField
                        field={{
                          label: "Una frase sobre tu propuesta",
                          placeholder: "Lo que querés que vean primero",
                        }}
                        value={draft.headline}
                        onChange={(value) => change("headline", value)}
                      />
                      <FormField
                        field={{
                          label: "Descripción breve",
                          type: "textarea",
                          placeholder:
                            "Contá qué hacés y a quién está dirigido",
                        }}
                        value={draft.description}
                        onChange={(value) => change("description", value)}
                      />
                    </>
                  )}
                  <div className="form-navigation">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setStep(0)}
                    >
                      <ArrowLeft size={18} /> Volver
                    </button>
                    <button className="button button-primary">
                      Continuar <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              </>
            )}
            {step === 2 && (
              <>
                <h2>
                  Ya casi <em>estás.</em>
                </h2>
                <p>
                  Creá tu acceso.{" "}
                  {role === "ATHLETE"
                    ? "Tu perfil personal será privado."
                    : "Revisaremos tu perfil antes de publicarlo en el directorio."}
                </p>
                <form className="auth-form" onSubmit={submitRegister}>
                  <div className="form-grid">
                    <FormField
                      field={{
                        label: "Email de acceso",
                        type: "email",
                        required: true,
                      }}
                      value={draft.email}
                      onChange={(value) => change("email", value)}
                    />
                    <FormField
                      field={{
                        label: testingMode ? "Contraseña (opcional en demo)" : "Contraseña (mínimo 8 caracteres)",
                        type: "password",
                        required: !testingMode,
                      }}
                      value={draft.password}
                      onChange={(value) => change("password", value)}
                    />
                    {role !== "ATHLETE" && (
                      <>
                        <FormField
                          field={{
                            label: "Email público de contacto",
                            type: "email",
                          }}
                          value={draft.contactEmail}
                          onChange={(value) => change("contactEmail", value)}
                        />
                        <FormField
                          field={{
                            label: "WhatsApp público (con código de país)",
                            type: "tel",
                          }}
                          value={draft.phone}
                          onChange={(value) => change("phone", value)}
                        />
                        <FormField
                          field={{ label: "Instagram" }}
                          value={draft.instagram}
                          onChange={(value) => change("instagram", value)}
                        />
                        <FormField
                          field={{ label: "Sitio web" }}
                          value={draft.website}
                          onChange={(value) => change("website", value)}
                        />
                      </>
                    )}
                  </div>
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(event) => setAccepted(event.target.checked)}
                      required
                    />{" "}
                    <span>
                      Confirmo que soy mayor de 18 años, que la información es
                      veraz y que mantendré una convivencia respetuosa.
                    </span>
                  </label>
                  {role !== "ATHLETE" && (
                    <label className="checkbox-line">
                      <input
                        type="checkbox"
                        checked={publicConsent}
                        onChange={(event) =>
                          setPublicConsent(event.target.checked)
                        }
                        required
                      />{" "}
                      <span>
                        Autorizo a IIDCA a mostrar este perfil y los datos de
                        contacto que cargué públicamente.
                      </span>
                    </label>
                  )}
                  {error && (
                    <div className="feedback error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="form-navigation">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft size={18} /> Volver
                    </button>
                    <button
                      className="button button-primary"
                      disabled={loading}
                    >
                      {loading ? "Creando perfil..." : "Activar mi perfil"}{" "}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              </>
            )}
            <p className="auth-switch">
              ¿Ya tenés cuenta?{" "}
              <button
                onClick={() => {
                  setError("");
                  onMode("login");
                }}
              >
                Ingresá acá
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FacilityManager({ profile, onChange }) {
  const [newFacility, setNewFacility] = useState("");
  const [names, setNames] = useState(() => Object.fromEntries((profile.facilities || []).map((facility) => [facility.id, facility.name])));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setNames(Object.fromEntries((profile.facilities || []).map((facility) => [facility.id, facility.name])));
  }, [profile.facilities]);
  const facilities = profile.facilities || [];
  const completed = facilities.filter((facility) => facility.photos?.length).length;
  const updateProfile = (nextProfile) => {
    onChange(nextProfile);
    setError("");
  };
  const addFacility = async (event) => {
    event.preventDefault();
    setBusy("new");
    setError("");
    try {
      const data = await api("/me/facilities", { method: "POST", body: JSON.stringify({ name: newFacility }) });
      setNewFacility("");
      updateProfile(data.profile);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const renameFacility = async (facility) => {
    if (!names[facility.id]?.trim() || names[facility.id].trim() === facility.name) return;
    setBusy(`rename-${facility.id}`);
    setError("");
    try {
      const data = await api(`/me/facilities/${facility.id}`, { method: "PATCH", body: JSON.stringify({ name: names[facility.id] }) });
      updateProfile(data.profile);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const removeFacility = async (facility) => {
    if (!window.confirm(`¿Querés eliminar “${facility.name}” y todas sus fotos?`)) return;
    setBusy(`delete-${facility.id}`);
    setError("");
    try {
      const data = await api(`/me/facilities/${facility.id}`, { method: "DELETE" });
      updateProfile(data.profile);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const uploadPhoto = async (facility, file) => {
    if (!file) return;
    setBusy(`photo-${facility.id}`);
    setError("");
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch(`/api/me/facilities/${facility.id}/photos`, { method: "POST", credentials: "same-origin", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos subir la foto.");
      updateProfile(data.profile);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const removePhoto = async (photo) => {
    if (!window.confirm("¿Querés eliminar esta foto? El club puede perder la insignia si la instalación queda sin imágenes.")) return;
    setBusy(`photo-delete-${photo.id}`);
    setError("");
    try {
      const data = await api(`/me/facility-photos/${photo.id}`, { method: "DELETE" });
      updateProfile(data.profile);
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  return (
    <section className={`dashboard-card facility-manager ${profile.verification === "VERIFIED" ? "is-verified" : ""}`}>
      <div className="facility-manager-heading">
        <div className="club-verification-icon">
          {profile.verification === "VERIFIED" ? <BadgeCheck size={30} /> : <Camera size={30} />}
        </div>
        <div>
          <span className="club-verification-kicker">VERIFICACIÓN POR INSTALACIONES</span>
          <h2>{profile.verification === "VERIFIED" ? "Club verificado" : "Fotografiá cada instalación"}</h2>
          <p>{profile.verification === "VERIFIED"
            ? "Todas las instalaciones declaradas tienen fotos y la insignia ya aparece en tu ficha."
            : "La insignia se activa automáticamente cuando cada instalación declarada tiene al menos una foto."}</p>
        </div>
        <div className="facility-progress" aria-label={`${completed} de ${facilities.length} instalaciones completas`}>
          <strong>{completed}/{facilities.length}</strong>
          <span>con fotos</span>
        </div>
      </div>
      <div className="facility-progress-track"><span style={{ width: `${facilities.length ? (completed / facilities.length) * 100 : 0}%` }} /></div>
      <div className="facility-manager-list">
        {facilities.map((facility) => (
          <article className="facility-manager-item" key={facility.id}>
            <div className="facility-manager-name">
              <Building2 size={19} />
              <input value={names[facility.id] || ""} onChange={(event) => setNames({ ...names, [facility.id]: event.target.value })} maxLength={120} aria-label={`Nombre de ${facility.name}`} />
              <button type="button" disabled={busy === `rename-${facility.id}` || (names[facility.id] || "").trim() === facility.name} onClick={() => renameFacility(facility)}>Guardar nombre</button>
              <button type="button" className="facility-delete" disabled={facilities.length === 1 || busy === `delete-${facility.id}`} onClick={() => removeFacility(facility)} aria-label={`Eliminar ${facility.name}`}><Trash2 size={17} /></button>
            </div>
            <div className="facility-photo-grid">
              {(facility.photos || []).map((photo) => (
                <div className="facility-photo" key={photo.id}>
                  <img src={photo.url} alt={`${facility.name} en ${profile.name}`} />
                  <button type="button" onClick={() => removePhoto(photo)} disabled={busy === `photo-delete-${photo.id}`} aria-label={`Eliminar foto de ${facility.name}`}><X size={15} /></button>
                </div>
              ))}
              {facility.photos?.length < 6 && (
                <label className="facility-photo-upload">
                  <Camera size={22} />
                  <span>{busy === `photo-${facility.id}` ? "Subiendo..." : facility.photos?.length ? "Otra foto" : "Subir foto"}</span>
                  <small>JPG, PNG o WebP · máx. 5 MB</small>
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy === `photo-${facility.id}`} onChange={(event) => { uploadPhoto(facility, event.target.files?.[0]); event.target.value = ""; }} />
                </label>
              )}
            </div>
            {!facility.photos?.length && <p className="facility-missing"><CircleHelp size={15} /> Falta una foto para completar esta instalación.</p>}
          </article>
        ))}
      </div>
      <form className="facility-new-form" onSubmit={addFacility}>
        <label>¿Tenés otra instalación?<input value={newFacility} onChange={(event) => setNewFacility(event.target.value)} maxLength={120} placeholder="Ej. Vestuarios renovados" required /></label>
        <button className="button button-outline" disabled={busy === "new" || facilities.length >= 12}><Plus size={17} /> Agregar instalación</button>
      </form>
      {error && <div className="feedback error" role="alert">{error}</div>}
    </section>
  );
}

function ProfilePhotoLibrary({ profile, role, onChange }) {
  const managedPhotos = profile.profilePhotos || [];
  const photos = profile.imageUrl && !managedPhotos.some((photo) => photo.url === profile.imageUrl)
    ? [{ id: "current-cover", url: profile.imageUrl, legacy: true }, ...managedPhotos]
    : managedPhotos;
  const coverIndex = Math.max(0, photos.findIndex((photo) => photo.url === profile.imageUrl));
  const [selectedIndex, setSelectedIndex] = useState(coverIndex);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(photos.length - 1, 0)));
  }, [photos.length]);
  const selected = photos[selectedIndex];
  const upload = async (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    if (managedPhotos.length + files.length > 8) {
      setError(`Podés guardar hasta 8 fotos. Te quedan ${8 - managedPhotos.length} lugares.`);
      return;
    }
    setBusy("upload");
    setError("");
    try {
      let nextProfile = profile;
      for (const file of files) {
        const body = new FormData();
        body.append("photo", file);
        const response = await fetch("/api/me/profile-photos", { method: "POST", credentials: "same-origin", body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No pudimos subir la foto.");
        nextProfile = data.profile;
        onChange(nextProfile);
      }
      const nextPhotos = nextProfile.profilePhotos || [];
      const keepsLegacyCover = nextProfile.imageUrl && !nextPhotos.some((photo) => photo.url === nextProfile.imageUrl);
      setSelectedIndex(Math.max(0, nextPhotos.length - 1 + (keepsLegacyCover ? 1 : 0)));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  };
  const chooseCover = async () => {
    if (!selected || selected.legacy || selected.url === profile.imageUrl) return;
    setBusy(`cover-${selected.id}`);
    setError("");
    try {
      const data = await api(`/me/profile-photos/${selected.id}/cover`, { method: "PATCH", body: "{}" });
      onChange(data.profile);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    if (!selected || selected.legacy || !window.confirm("¿Querés eliminar esta foto de tu perfil?")) return;
    setBusy(`delete-${selected.id}`);
    setError("");
    try {
      const data = await api(`/me/profile-photos/${selected.id}`, { method: "DELETE" });
      onChange(data.profile);
      setSelectedIndex((current) => Math.max(0, current - 1));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  };
  const move = (direction) => setSelectedIndex((current) => (current + direction + photos.length) % photos.length);
  return (
    <section className="profile-photo-library">
      <div className="profile-photo-copy">
        <span className="profile-editor-kicker">FOTOTECA DEL PERFIL</span>
        <h3>Elegí cómo querés presentarte.</h3>
        <p>{role === "ATHLETE" ? "Estas fotos quedan dentro de tu espacio privado." : "La portada seleccionada aparecerá en el directorio y en tu ficha pública."}</p>
      </div>
      <div className="profile-photo-workspace">
        <div className={`profile-photo-stage ${selected ? "has-photo" : "is-empty"}`}>
          {selected ? <img src={selected.url} alt={`Vista previa de ${profile.name}`} /> : <div><ImagePlus size={34} /><strong>Todavía no cargaste fotos</strong><span>Elegí imágenes desde tu dispositivo.</span></div>}
          {selected?.url === profile.imageUrl && <span className="profile-photo-cover-badge"><Check size={14} /> Portada actual</span>}
          {photos.length > 1 && <>
            <button type="button" className="profile-photo-arrow previous" onClick={() => move(-1)} aria-label="Foto anterior"><ChevronLeft size={22} /></button>
            <button type="button" className="profile-photo-arrow next" onClick={() => move(1)} aria-label="Foto siguiente"><ChevronRight size={22} /></button>
          </>}
        </div>
        <div className="profile-photo-actions">
          <label className="profile-photo-upload-button">
            <Upload size={17} /> {busy === "upload" ? "Subiendo..." : photos.length ? "Agregar fotos" : "Elegir fotos"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy === "upload" || managedPhotos.length >= 8} onChange={(event) => { upload(event.target.files); event.target.value = ""; }} />
          </label>
          {selected && !selected.legacy && <button type="button" className="profile-photo-cover-button" disabled={selected.url === profile.imageUrl || Boolean(busy)} onClick={chooseCover}><Camera size={17} /> {selected.url === profile.imageUrl ? "Es la portada" : "Usar como portada"}</button>}
          {selected && !selected.legacy && <button type="button" className="profile-photo-remove-button" disabled={Boolean(busy)} onClick={remove} aria-label="Eliminar foto seleccionada"><Trash2 size={17} /></button>}
        </div>
        {photos.length > 0 && <div className="profile-photo-thumbnails" aria-label="Fotos del perfil">
          {photos.map((photo, index) => <button type="button" key={photo.id} className={`${index === selectedIndex ? "selected" : ""} ${photo.url === profile.imageUrl ? "is-cover" : ""}`} onClick={() => setSelectedIndex(index)} aria-label={`Ver foto ${index + 1}${photo.url === profile.imageUrl ? ", portada actual" : ""}`}><img src={photo.url} alt="" />{photo.url === profile.imageUrl && <Check size={12} />}</button>)}
        </div>}
        <small className="profile-photo-help">JPG, PNG o WebP · hasta 5 MB por foto · máximo 8</small>
        {error && <div className="feedback error" role="alert">{error}</div>}
      </div>
    </section>
  );
}

function ProfileEditModal({ user, profile, onClose, onSaved, onProfileChange }) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  const update = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          city: draft.city,
          neighborhood: draft.neighborhood,
          sport: draft.sport,
          sports: typeof draft.sports === "string" ? draft.sports.split(",") : draft.sports,
          headline: draft.headline,
          description: draft.description,
          address: draft.address,
          latitude: draft.latitude,
          longitude: draft.longitude,
          email: draft.email,
          phone: draft.phone,
          instagram: draft.instagram,
          website: draft.website,
        }),
      });
      onSaved(data.profile);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  };
  return createPortal(
    <div className="modal-backdrop profile-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="profile-editor-modal" role="dialog" aria-modal="true" aria-label="Editar mi perfil">
        <header className="profile-editor-header">
          <div><span className="profile-editor-kicker">TU IDENTIDAD EN IIDCA</span><h2>Editar mi perfil</h2><p>Actualizá tus datos y elegí tus fotos sin salir de esta ventana.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
        </header>
        <ProfilePhotoLibrary profile={profile} role={user.role} onChange={onProfileChange} />
        <form onSubmit={update} className="profile-editor-form">
          <div className="profile-editor-form-heading"><div><span className="profile-editor-kicker">INFORMACIÓN DEL PERFIL</span><h3>Tus datos</h3></div><p>Los campos públicos vuelven a revisión cuando guardás cambios.</p></div>
          <div className="form-grid">
            <FormField field={{ label: "Nombre", required: true }} value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            <FormField field={{ label: "Ciudad", required: true }} value={draft.city} onChange={(value) => setDraft({ ...draft, city: value })} />
            <FormField field={{ label: "Barrio o zona" }} value={draft.neighborhood} onChange={(value) => setDraft({ ...draft, neighborhood: value })} />
            <FormField field={{ label: "Deporte principal" }} value={draft.sport} onChange={(value) => setDraft({ ...draft, sport: value })} />
            <FormField field={{ label: "Deportes (separados por comas)" }} value={Array.isArray(draft.sports) ? draft.sports.join(", ") : draft.sports} onChange={(value) => setDraft({ ...draft, sports: value })} />
            {user.role !== "ATHLETE" && <>
              <FormField field={{ label: "Dirección" }} value={draft.address} onChange={(value) => setDraft({ ...draft, address: value })} />
              <FormField field={{ label: "Email público", type: "email" }} value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} />
              <FormField field={{ label: "WhatsApp público" }} value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
              <FormField field={{ label: "Instagram" }} value={draft.instagram} onChange={(value) => setDraft({ ...draft, instagram: value })} />
              <FormField field={{ label: "Sitio web" }} value={draft.website} onChange={(value) => setDraft({ ...draft, website: value })} />
            </>}
          </div>
          {user.role !== "ATHLETE" && <>
            <LocationPicker latitude={draft.latitude} longitude={draft.longitude} onChoose={({ lat, lng }) => setDraft({ ...draft, latitude: lat, longitude: lng })} />
            <FormField field={{ label: "Frase principal" }} value={draft.headline} onChange={(value) => setDraft({ ...draft, headline: value })} />
            <FormField field={{ label: "Descripción", type: "textarea" }} value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} />
          </>}
          {error && <div className="feedback error" role="alert">{error}</div>}
          <footer className="profile-editor-footer"><button type="button" className="button button-ghost" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"} <Check size={18} /></button></footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function MemberProfile({ user, onUpdate, onExplore }) {
  const profile = user.profile;
  const [edit, setEdit] = useState(false);
  const [success, setSuccess] = useState("");
  if (!profile) return null;
  return (
    <main className="dashboard-page">
      <div className="container dashboard-container">
        <div className="dashboard-intro">
          <div className="eyebrow eyebrow-blue">TU ESPACIO EN IIDCA</div>
          <h1>
            Hola, <em>{profile.name.split(" ")[0]}.</em>
          </h1>
          <p>
            Tu punto de partida para ser parte de una comunidad en movimiento.
          </p>
        </div>
        <div className="dashboard-grid">
          <section className="dashboard-card profile-summary">
            <div className="profile-summary-top">
              <div className="summary-avatar">{roleIcon(user.role, 32)}</div>
              <span
                className={`status-badge status-${profile.status.toLowerCase()}`}
              >
                {profile.status === "PUBLISHED"
                  ? "Publicado"
                  : profile.status === "PENDING"
                    ? "Pendiente de revisión"
                    : "Perfil privado"}
              </span>
            </div>
            <h2>{profile.name}</h2>
            <p>
              {roleLabels[user.role]} · {profile.city}
            </p>
            {profile.sport && (
              <div className="sport-tags">
                <span>{profile.sport}</span>
              </div>
            )}
            <div className="summary-rule" />
            <div className="summary-detail">
              <Mail size={17} /> {user.email}
            </div>
            {profile.neighborhood && (
              <div className="summary-detail">
                <MapPin size={17} /> {profile.neighborhood}
              </div>
            )}
            <button
              className="button button-outline full-width"
              onClick={() => setEdit(true)}
            >
              Editar mi perfil{" "}
              <ArrowRight size={18} />
            </button>
          </section>
          <section className="dashboard-card dashboard-next">
            <div className="next-icon">
              <Sparkles size={27} />
            </div>
            <h2>
              {user.role === "ATHLETE"
                ? "Tu próximo movimiento está cerca."
                : profile.status === "PENDING"
                  ? "Estamos revisando tu perfil."
                  : "Tu lugar en la comunidad."}
            </h2>
            <p>
              {user.role === "ATHLETE"
                ? "Explorá clubes, profesionales y federaciones. Filtrá por deporte o barrio y encontrá un espacio para empezar."
                : profile.status === "PENDING"
                  ? "El equipo de IIDCA validará la información antes de mostrarla en el directorio. Mientras tanto, podés completarla o explorar la comunidad."
                  : "Tu ficha ya se puede encontrar en el directorio deportivo."}
            </p>
            <button className="button button-orange" onClick={onExplore}>
              Explorar directorio <ArrowUpRight size={18} />
            </button>
          </section>
        </div>
        {user.role === "CLUB" && (
          <FacilityManager
            profile={profile}
            onChange={(nextProfile) => {
              onUpdate({ ...user, profile: nextProfile });
            }}
          />
        )}
        {success && (
          <div className="feedback success" role="status">
            {success}
          </div>
        )}
        {edit && <ProfileEditModal
          user={user}
          profile={profile}
          onClose={() => setEdit(false)}
          onProfileChange={(nextProfile) => onUpdate({ ...user, profile: nextProfile })}
          onSaved={(nextProfile) => {
            onUpdate({ ...user, profile: nextProfile });
            setEdit(false);
            setSuccess(user.role === "ATHLETE" ? "Tus cambios se guardaron." : "Tus cambios se guardaron. El perfil quedó pendiente de revisión.");
          }}
        />}
      </div>
    </main>
  );
}

const emptyNewsDraft = { title: "", excerpt: "", body: "", category: "", imageUrl: "/images/editorial/fitness-class.jpg", imageAlt: "", published: false };

function AdminNews() {
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const load = () => api("/admin/news").then((data) => setArticles(data.articles)).catch((issue) => setError(issue.message));
  useEffect(() => { load(); }, []);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(editing.id ? `/admin/news/${editing.id}` : "/admin/news", { method: editing.id ? "PATCH" : "POST", body: JSON.stringify(editing) });
      setEditing(null); await load();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  };
  const togglePublished = async (article) => {
    setBusy(true); setError("");
    try { await api(`/admin/news/${article.id}`, { method: "PATCH", body: JSON.stringify({ ...article, published: !article.published }) }); await load(); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    setBusy(true); setError("");
    try { await api(`/admin/news/${id}`, { method: "DELETE" }); setDeleteId(null); await load(); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  };
  return <div className="admin-news-layout">
    <div className="admin-news-toolbar"><span>{articles.length} novedades · {articles.filter((article) => article.published).length} publicadas</span><button className="button button-primary" onClick={() => setEditing({ ...emptyNewsDraft })}>Nueva novedad <ArrowRight size={17} /></button></div>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {editing && <form className="dashboard-card admin-news-form" onSubmit={save}>
      <div className="admin-list-heading"><h2>{editing.id ? "Editar novedad" : "Nueva novedad"}</h2><button type="button" className="admin-news-cancel" onClick={() => setEditing(null)}>Cancelar</button></div>
      <div className="admin-news-form-grid">
        <label className="admin-news-wide">Título<input required maxLength={140} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
        <label>Categoría<input required maxLength={55} value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} placeholder="Ej. VIDA ACTIVA" /></label>
        <label>Foto<select value={["/images/editorial/fitness-class.jpg", "/images/editorial/park-exercise.jpg", "/images/editorial/yoga-class.jpg"].includes(editing.imageUrl) ? editing.imageUrl : "custom"} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value === "custom" ? "" : event.target.value })}><option value="/images/editorial/fitness-class.jpg">Clase de gimnasia</option><option value="/images/editorial/park-exercise.jpg">Actividad en parque</option><option value="/images/editorial/yoga-class.jpg">Clase de yoga</option><option value="custom">Otra URL HTTPS</option></select></label>
        <label className="admin-news-wide">URL de la foto<input required value={editing.imageUrl} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })} placeholder="https://..." /></label>
        <label className="admin-news-wide">Descripción de la foto<input required maxLength={180} value={editing.imageAlt} onChange={(event) => setEditing({ ...editing, imageAlt: event.target.value })} /></label>
        <label className="admin-news-wide">Resumen<input required maxLength={320} value={editing.excerpt} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })} /></label>
        <label className="admin-news-wide">Contenido<textarea required rows={8} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} placeholder="Separá los párrafos con una línea en blanco." /></label>
      </div>
      <div className="admin-news-form-bottom"><label><input type="checkbox" checked={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} /> Publicar en el sitio</label><button className="button button-primary" disabled={busy}>Guardar novedad</button></div>
    </form>}
    <div className="admin-news-list">{articles.map((article) => <article className="dashboard-card admin-news-item" key={article.id}>
      <img src={article.imageUrl} alt={article.imageAlt} /><div><span className="news-category">{article.category}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className={`status-badge ${article.published ? "status-published" : "status-hidden"}`}>{article.published ? "Publicada" : "Borrador"}</span></div>
      <div className="admin-news-actions"><button disabled={busy} onClick={() => setEditing({ ...article })}>Editar</button><button disabled={busy} onClick={() => togglePublished(article)}>{article.published ? "Ocultar" : "Publicar"}</button>{deleteId === article.id ? <><button disabled={busy} onClick={() => remove(article.id)}>Confirmar eliminación</button><button onClick={() => setDeleteId(null)}>Cancelar</button></> : <button onClick={() => setDeleteId(article.id)}>Eliminar</button>}</div>
    </article>)}</div>
  </div>;
}

function AdminImport({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadTemplate = async (format) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/import/template/${format}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("No pudimos descargar la plantilla.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `iidca-plantilla-importador.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (issue) { setError(issue.message); }
  };

  const submit = async (step) => {
    if (!file) return;
    setBusy(step);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/import/${step}?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos procesar el archivo.");
      if (step === "preview") setPreview(data);
      else {
        setSuccess(`Importación terminada: ${data.summary.create} fichas nuevas y ${data.summary.update} actualizadas.`);
        setPreview(null);
        setFile(null);
        await onImported();
      }
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };

  return (
    <div className="admin-import-layout">
      <section className="dashboard-card admin-import-intro">
        <div className="admin-import-intro-icon"><FileSpreadsheet size={29} /></div>
        <div>
          <span className="admin-import-kicker">CARGA MASIVA</span>
          <h2>Una planilla, muchos perfiles.</h2>
          <p>Subí clubes, profesionales, federaciones o marcas aliadas en un solo archivo. Primero revisamos las filas; recién se guardan cuando confirmás.</p>
        </div>
      </section>

      <div className="admin-import-grid">
        <section className="dashboard-card admin-import-panel">
          <span className="admin-import-step">1 · PREPARÁ EL ARCHIVO</span>
          <h2>Descargá la plantilla</h2>
          <p>Usá la primera fila como encabezado y completá un perfil por fila. La plantilla Excel incluye una segunda hoja con la explicación de cada columna.</p>
          <div className="admin-import-downloads">
            <button type="button" onClick={() => downloadTemplate("xlsx")}><Download size={17} /> Plantilla Excel</button>
            <button type="button" onClick={() => downloadTemplate("csv")}><Download size={17} /> Plantilla CSV</button>
          </div>
          <div className="admin-import-rules">
            <strong>Columnas obligatorias</strong>
            <code>id_externo</code><code>nombre</code><code>tipo</code><code>ciudad</code>
            <p><b>tipo:</b> CLUB, PROFESSIONAL, FEDERATION o SPONSOR. <b>estado:</b> PUBLISHED, PENDING o HIDDEN; si queda vacío, se publica.</p>
            <p>Separá varios deportes con <b>|</b>. Completá <b>latitud y longitud</b> para que aparezca en el mapa. La <b>foto_url</b> debe ser una dirección HTTPS de la foto de esa ficha.</p>
            <p><b>id_externo</b> identifica la ficha entre cargas: usá siempre el mismo valor para actualizarla. El email de la planilla es un contacto público; no crea una cuenta de acceso.</p>
          </div>
        </section>

        <section className="dashboard-card admin-import-panel">
          <span className="admin-import-step">2 · REVISÁ LOS DATOS</span>
          <h2>Subí tu archivo</h2>
          <p>Admitimos .xlsx y .csv de hasta 5 MB y 500 perfiles por carga.</p>
          <label className="admin-import-drop">
            <Upload size={30} />
            <strong>{file ? file.name : "Elegí un archivo Excel o CSV"}</strong>
            <span>{file ? `${(file.size / 1024).toFixed(1)} KB · listo para revisar` : "Hacé clic para buscarlo en tu equipo"}</span>
            <input type="file" accept=".xlsx,.csv" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setError(""); setSuccess(""); }} />
          </label>
          <button className="button button-primary admin-import-primary" type="button" disabled={!file || Boolean(busy)} onClick={() => submit("preview")}>{busy === "preview" ? "Revisando..." : "Revisar archivo"} <ArrowRight size={17} /></button>
          {error && <p className="admin-import-feedback error" role="alert">{error}</p>}
          {success && <p className="admin-import-feedback success" role="status">{success}</p>}
        </section>
      </div>

      {preview && <section className="dashboard-card admin-import-preview">
        <div className="admin-import-preview-head">
          <div><span className="admin-import-step">3 · CONFIRMÁ LA IMPORTACIÓN</span><h2>Resultado de la revisión</h2></div>
          <div className="admin-import-totals"><span><b>{preview.summary.create}</b> nuevas</span><span><b>{preview.summary.update}</b> actualizaciones</span><span><b>{preview.summary.skip}</b> omitidas</span><span className={preview.summary.error ? "has-errors" : ""}><b>{preview.summary.error}</b> con errores</span></div>
        </div>
        <div className="admin-import-table-wrap"><table className="admin-import-table"><thead><tr><th>Fila</th><th>Identificador</th><th>Perfil</th><th>Tipo</th><th>Resultado</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.line}><td>{row.line}</td><td>{row.id || "—"}</td><td>{row.name || "—"}</td><td>{row.category || "—"}</td><td><span className={`admin-import-status is-${row.action}`}>{({ create: "Nueva", update: "Actualizar", skip: "Omitir", error: "Error" })[row.action]}</span>{row.message && <small>{row.message}</small>}</td></tr>)}</tbody></table></div>
        <div className="admin-import-confirm"><p>{preview.summary.error ? "Corregí los errores en la planilla y volvé a revisarla. No se guardó ninguna fila." : "Se guardarán solo las filas nuevas o actualizables. Las fichas reclamadas o duplicadas se omiten."}</p><button className="button button-primary" type="button" disabled={Boolean(busy) || preview.summary.error > 0 || preview.summary.create + preview.summary.update === 0} onClick={() => submit("commit")}>{busy === "commit" ? "Importando..." : "Confirmar importación"}</button></div>
      </section>}
    </div>
  );
}

function Admin({ user, onAuth, onLogout, onNavigate }) {
  const sectionFromPath = () => ({ "/admin/reclamos": "reclamos", "/admin/perfiles": "perfiles", "/admin/importador": "importador", "/admin/novedades": "novedades" })[window.location.pathname] || "resumen";
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [claimPage, setClaimPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(sectionFromPath);
  const load = () =>
    api("/admin/overview")
      .then(setOverview)
      .catch((issue) => setError(issue.message));
  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user]);
  useEffect(() => {
    const onPopState = () => setActiveSection(sectionFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const decideClaim = async (id, decision) => {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/claims/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
      await load();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const decideVerification = async (id, decision) => {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/verification-requests/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
      await load();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(editing.id);
    setError("");
    try {
      await api(`/admin/profile-data/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...editing, sports: typeof editing.sports === "string" ? editing.sports.split(",").map((sport) => sport.trim()) : editing.sports }),
      });
      setEditing(null);
      await load();
    } catch (issue) { setError(issue.message); }
    finally { setBusy(""); }
  };
  const downloadExport = async (format) => {
    setError("");
    try {
      const params = new URLSearchParams(Object.entries({ q: search, status: statusFilter, category: categoryFilter, sport: sportFilter, location: locationFilter }).filter(([, value]) => value));
      const response = await fetch(`/api/admin/export/${format}?${params}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error((await response.json()).error || "No pudimos descargar el padrón.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `iidca-padron${params.size ? "-filtrado" : ""}.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (issue) { setError(issue.message); }
  };
  const setStatus = async (id, status) => {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  };
  if (user?.role !== "ADMIN")
    return (
      <main className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-brand"><img src={logo} alt="" /><span>IIDCA <small>ADMINISTRACIÓN</small></span></div>
          <LockKeyhole />
          <h2>{user ? "Acceso restringido" : "Administración IIDCA"}</h2>
          <p>{user ? `Hay una sesión abierta con ${user.email}. Ingresá con la cuenta administradora para cambiar de usuario.` : "Ingresá para gestionar los perfiles y reclamos de la comunidad."}</p>
          <button className="button button-primary" onClick={() => onAuth("admin")}>{user ? "Cambiar a administrador" : "Ingresar al panel"}</button>
          <button className="admin-login-back" onClick={() => onNavigate("home")}><ArrowLeft size={16} /> Volver al sitio</button>
        </div>
      </main>
    );
  const pending =
    overview?.profiles.filter((profile) => profile.status === "PENDING")
      .length || 0;
  const published =
    overview?.profiles.filter((profile) => profile.status === "PUBLISHED")
      .length || 0;
  const visibleProfiles = (overview?.profiles || []).filter((profile) =>
    [profile.name, profile.city, profile.neighborhood, profile.accountEmail].some((value) => (value || "").toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))
    && (!statusFilter || profile.status === statusFilter)
    && (!categoryFilter || profile.category === categoryFilter)
    && (!sportFilter || profile.sports.includes(sportFilter) || profile.sport === sportFilter)
    && (!locationFilter || `${profile.city} ${profile.neighborhood || ""}`.toLocaleLowerCase("es").includes(locationFilter.toLocaleLowerCase("es"))));
  const sports = [...new Set((overview?.profiles || []).flatMap((profile) => profile.sports || []))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(visibleProfiles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedProfiles = visibleProfiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const claims = overview?.claims || [];
  const verificationRequests = overview?.verificationRequests || [];
  const pendingReviews = claims.length + verificationRequests.length;
  const claimPageCount = Math.max(1, Math.ceil(claims.length / 5));
  const currentClaimPage = Math.min(claimPage, claimPageCount);
  const goToSection = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
    window.history.pushState(null, "", section === "resumen" ? "/admin" : `/admin/${section}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <main className="admin-shell">
      {sidebarOpen && <button className="admin-sidebar-scrim" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar-brand"><img src={logo} alt="" /><div><strong>IIDCA</strong><span>PANEL DE GESTIÓN</span></div></div>
        <div className="admin-sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="admin-sidebar-nav" aria-label="Menú de administración">
          <button className={activeSection === "resumen" ? "active" : ""} onClick={() => goToSection("resumen")}><Compass size={19} /> Resumen</button>
          <button className={activeSection === "reclamos" ? "active" : ""} onClick={() => goToSection("reclamos")}><BadgeCheck size={19} /> Verificaciones <span>{pendingReviews}</span></button>
          <button className={activeSection === "perfiles" ? "active" : ""} onClick={() => goToSection("perfiles")}><Users size={19} /> Perfiles <span>{overview?.profiles.length ?? "—"}</span></button>
          <button className={activeSection === "importador" ? "active" : ""} onClick={() => goToSection("importador")}><Upload size={19} /> Importador</button>
          <button className={activeSection === "novedades" ? "active" : ""} onClick={() => goToSection("novedades")}><Sparkles size={19} /> Novedades</button>
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-account"><span>{user.email?.slice(0, 1).toUpperCase() || "A"}</span><div><strong>Administración</strong><small>{user.email}</small></div></div>
          <button onClick={() => onNavigate("home")}><ExternalLink size={17} /> Ver sitio público</button>
          <button onClick={onLogout}><LogIn size={17} /> Cerrar sesión</button>
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar"><button className="admin-menu-toggle" aria-label="Abrir menú de administración" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><Menu size={23} /></button><span>Administración <span>/</span> IIDCA Social Club</span><span className="admin-topbar-status"><i /> Panel activo</span></div>
        <div className="admin-content">
          <div className="admin-heading"><div><span>PANEL DE GESTIÓN</span><h1>{({ resumen: "Resumen", reclamos: "Verificaciones", perfiles: "Perfiles", importador: "Importador", novedades: "Novedades" })[activeSection]}</h1><p>{({ resumen: "Una mirada rápida a la comunidad.", reclamos: "Revisá solicitudes de verificación y vinculación de clubes.", perfiles: "Administrá las fichas y descargá el padrón con filtros.", importador: "Cargá y actualizá perfiles desde una planilla.", novedades: "Creá y publicá las historias que aparecen en el sitio." })[activeSection]}</p></div><span className="admin-heading-date">{new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</span></div>
        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}
        {activeSection === "resumen" && <><div className="admin-stats">
          <div>
            <span>Usuarios registrados</span>
            <strong>{overview?.users ?? "—"}</strong>
            <Users size={25} />
          </div>
          <div>
            <span>Pendientes de revisión</span>
            <strong>{pending}</strong>
            <CircleHelp size={25} />
          </div>
          <div>
            <span>Perfiles publicados</span>
            <strong>{published}</strong>
            <ShieldCheck size={25} />
          </div>
        </div>
        <div className="admin-overview-links"><button onClick={() => goToSection("reclamos")}><BadgeCheck size={24} /><strong>Verificaciones</strong><span>{pendingReviews} solicitudes por revisar</span><ArrowRight size={18} /></button><button onClick={() => goToSection("perfiles")}><Users size={24} /><strong>Perfiles</strong><span>{overview?.profiles.length ?? "—"} fichas registradas</span><ArrowRight size={18} /></button></div></>}
        {activeSection === "perfiles" && <section className="dashboard-card admin-export-panel">
          <div className="admin-export-head">
            <h2>Descargar padrón</h2>
            <p>Elegí los perfiles que querés incluir en Excel o PDF.</p>
          </div>
          <div className="admin-filters">
            <label className="admin-search">Buscar por nombre, zona o cuenta <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ej. Club Ferro, Caballito" /></label>
            <label>Estado<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">Todos</option><option value="PENDING">Pendientes</option><option value="PUBLISHED">Publicados</option><option value="HIDDEN">Ocultos</option></select></label>
            <label>Tipo de perfil<select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="">Todos</option>{categories.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}<option value="ATHLETE">Deportistas</option></select></label>
            <label>Deporte<select value={sportFilter} onChange={(event) => { setSportFilter(event.target.value); setPage(1); }}><option value="">Todos los deportes</option>{sports.map((sport) => <option key={sport} value={sport}>{sport}</option>)}</select></label>
            <label>Ciudad o barrio<input value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setPage(1); }} placeholder="Ej. Caballito" /></label>
          </div>
          <div className="admin-export-footer"><span>{visibleProfiles.length} registros seleccionados</span><div className="admin-export-actions">
            <button className="button button-outline" disabled={!visibleProfiles.length} onClick={() => downloadExport("xlsx")}>Descargar Excel</button>
            <button className="button button-outline" disabled={!visibleProfiles.length} onClick={() => downloadExport("pdf")}>Descargar PDF</button>
          </div></div>
        </section>}
        {activeSection === "reclamos" && <div className="admin-verification-layout">
          <section className="dashboard-card admin-claims">
            <div className="admin-list-heading"><div><span className="admin-section-kicker">INSIGNIA DE CONFIANZA</span><h2>Clubes que piden verificación</h2></div><span>{verificationRequests.length} pendientes</span></div>
            {verificationRequests.length ? verificationRequests.map((request) => (
              <article className="admin-claim" key={request.id}>
                <div><strong>{request.profileName}</strong><p>Cuenta responsable: {request.applicant || "Sin cuenta informada"}</p><blockquote>Solicitud inicial. Los requisitos documentales se definirán en la próxima etapa.</blockquote></div>
                <div className="admin-row-actions"><button disabled={busy === request.id} onClick={() => decideVerification(request.id, "APPROVED")}>Otorgar insignia</button><button disabled={busy === request.id} onClick={() => decideVerification(request.id, "REJECTED")}>Rechazar</button></div>
              </article>
            )) : <p className="admin-empty">No hay solicitudes de verificación pendientes.</p>}
          </section>
          <section className="dashboard-card admin-claims">
            <div className="admin-list-heading"><div><span className="admin-section-kicker">FICHAS DEL PADRÓN</span><h2>Reclamos de vinculación</h2></div><span>{claims.length} pendientes</span></div>
            {claims.length ? claims.slice((currentClaimPage - 1) * 5, currentClaimPage * 5).map((claim) => (
              <article className="admin-claim" key={claim.id}>
                <div><strong>{claim.profileName}</strong><p>Solicita: {claim.applicantName || claim.applicant} · {claim.applicant}</p><blockquote>{claim.evidence}</blockquote></div>
                <div className="admin-row-actions"><button disabled={busy === claim.id} onClick={() => decideClaim(claim.id, "APPROVED")}>Aprobar vínculo</button><button disabled={busy === claim.id} onClick={() => decideClaim(claim.id, "REJECTED")}>Rechazar</button></div>
              </article>
            )) : <p className="admin-empty">No hay reclamos de vinculación pendientes.</p>}
            {claimPageCount > 1 && <div className="admin-pagination"><span>Página {currentClaimPage} de {claimPageCount}</span><div><button disabled={currentClaimPage === 1} onClick={() => setClaimPage(currentClaimPage - 1)}>Anterior</button><button disabled={currentClaimPage === claimPageCount} onClick={() => setClaimPage(currentClaimPage + 1)}>Siguiente</button></div></div>}
          </section>
        </div>}
        {activeSection === "perfiles" && <section className="dashboard-card admin-list">
          <div className="admin-list-heading">
            <h2>Perfiles de la plataforma</h2>
            <span>{visibleProfiles.length} de {overview?.profiles.length || 0} registros</span>
          </div>
          {!overview ? (
            <p>Cargando perfiles...</p>
          ) : !pagedProfiles.length ? (
            <p className="admin-empty">No hay perfiles con esos filtros.</p>
          ) : (
            pagedProfiles.map((profile) => (
              <div className="admin-row" key={profile.id}>
                <div className="admin-row-icon">
                  {roleIcon(profile.category, 21)}
                </div>
                <div className="admin-row-main">
                  <strong>{profile.name}</strong>
                  <span>
                    {categoryLabel(profile.category)} · {profile.city}
                    {profile.isDemo ? " · Ejemplo" : ""}
                  </span>
                  <small>{profile.verification === "VERIFIED" ? "Verificado" : profile.verification === "CLAIM_PENDING" ? "Reclamo pendiente" : "Sin verificar"} · {profile.sourceName || "Registro propio"}</small>
                  {(profile.accountEmail || profile.sourceContact?.email || profile.sourceContact?.phone) && <small>Contacto interno: {[profile.accountEmail, profile.sourceContact?.email, profile.sourceContact?.phone].filter(Boolean).join(" · ")}</small>}
                </div>
                <span
                  className={`status-badge status-${profile.status.toLowerCase()}`}
                >
                  {profile.status === "PUBLISHED"
                    ? "Publicado"
                    : profile.status === "PENDING"
                      ? "Pendiente"
                      : "Oculto"}
                </span>
                {profile.category !== "ATHLETE" && (
                  <div className="admin-row-actions">
                    <button onClick={() => setEditing({ ...profile, sports: profile.sports.join(", ") })}>Editar</button>
                    {profile.status !== "PUBLISHED" && (
                      <button
                        disabled={busy === profile.id}
                        onClick={() => setStatus(profile.id, "PUBLISHED")}
                      >
                        Publicar
                      </button>
                    )}
                    {profile.status === "PUBLISHED" && (
                      <button
                        disabled={busy === profile.id}
                        onClick={() => setStatus(profile.id, "HIDDEN")}
                      >
                        Ocultar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {overview && pageCount > 1 && <div className="admin-pagination"><span>Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visibleProfiles.length)} de {visibleProfiles.length} · página {currentPage} de {pageCount}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div></div>}
        </section>}
        {activeSection === "novedades" && <AdminNews />}
        {activeSection === "importador" && <AdminImport onImported={load} />}
        {editing && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <form className="admin-edit-modal" onSubmit={saveEdit} role="dialog" aria-modal="true" aria-label={`Editar ${editing.name}`}>
            <button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button>
            <h2>Editar ficha</h2>
            <p>Los cambios quedan registrados en la auditoría.</p>
            {[["name", "Nombre"], ["city", "Ciudad"], ["neighborhood", "Barrio"], ["address", "Dirección"], ["sports", "Deportes separados por comas"], ["website", "Sitio web"], ["imageUrl", "Foto HTTPS"]].map(([key, label]) => <label key={key}>{label}<input value={editing[key] || ""} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} /></label>)}
            <button className="button button-primary" disabled={busy === editing.id}>Guardar cambios</button>
          </form>
        </div>}
        </div>
      </div>
    </main>
  );
}

function Footer({ onNavigate, onAuth }) {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Brand inverse onClick={() => onNavigate("home")} />
          <p>Oportunidades para que el deporte encuentre a las personas.</p>
        </div>
        <div className="footer-links">
          <strong>Explorá</strong>
          <button onClick={() => onNavigate("explore")}>
            Directorio deportivo
          </button>
          <button onClick={() => onNavigate("home", "como-funciona")}>
            Cómo funciona
          </button>
          <button onClick={() => onNavigate("home", "proposito")}>
            Nuestro propósito
          </button>
          <button onClick={() => onNavigate("news")}>Novedades</button>
        </div>
        <div className="footer-links">
          <strong>Participá</strong>
          <a href="/para-clubes.html">Presentación para clubes</a>
          <button onClick={() => onNavigate("home", "contacto")}>Contacto</button>
          <button onClick={() => onAuth("register")}>Crear un perfil</button>
          <button onClick={() => onAuth("login")}>Ingresar</button>
          <span>Proyecto piloto · Ciudad de Buenos Aires</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} IIDCA Social Club</span>
        <span>Deporte para más personas.</span>
      </div>
      <div className="footer-credit">
        Hecho por{" "}
        <a
          href="https://zigodev.com.ar"
          target="_blank"
          rel="noopener noreferrer"
        >
          zigodev
        </a>
      </div>
    </footer>
  );
}

export default function App() {
  const routeFromHash = () =>
    (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) ? "admin" : window.location.pathname.startsWith("/clubes/") ? "club" : window.location.pathname.startsWith("/novedades/") ? "article" : window.location.pathname === "/novedades" ? "news" : ({
      "#explorar": "explore",
      "#mi-espacio": "profile",
    })[window.location.hash] || "home";
  const [view, setView] = useState(routeFromHash);
  const [authMode, setAuthMode] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [profiles, setProfiles] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");
  const [clubProfile, setClubProfile] = useState(null);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubError, setClubError] = useState("");

  useEffect(() => {
    api("/me")
      .then((data) => {
        setUser(data.user);
        if ((window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) && data.user.role !== "ADMIN") setAuthMode("admin");
      })
      .catch(() => {
        if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) setAuthMode("admin");
      });
  }, []);
  useEffect(() => {
    if (!hasSearchCriteria(filters)) {
      setProfiles([]);
      setDirectoryLoading(false);
      setDirectoryError("");
      return;
    }
    setDirectoryLoading(true);
    setDirectoryError("");
    setProfiles([]);
    let cancelled = false;
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== ""),
    ).toString();
    api(`/profiles${query ? `?${query}` : ""}`)
      .then((data) => { if (!cancelled) setProfiles(data.profiles); })
      .catch((issue) => { if (!cancelled) setDirectoryError(issue.message); })
      .finally(() => { if (!cancelled) setDirectoryLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);
  useEffect(() => {
    if (!["home", "news", "article"].includes(view)) return;
    setNewsLoading(true);
    api("/news").then((data) => { setArticles(data.articles); setNewsError(""); }).catch((issue) => setNewsError(issue.message)).finally(() => setNewsLoading(false));
  }, [view]);
  useEffect(() => {
    if (view !== "club") return;
    const id = decodeURIComponent(window.location.pathname.split("/")[2] || "");
    setClubLoading(true);
    setClubError("");
    setClubProfile(null);
    let cancelled = false;
    api(`/profiles/${id}`)
      .then((data) => { if (!cancelled) setClubProfile(data.profile); })
      .catch((issue) => { if (!cancelled) setClubError(issue.message); })
      .finally(() => { if (!cancelled) setClubLoading(false); });
    return () => { cancelled = true; };
  }, [view]);
  useEffect(() => {
    const onHash = () => setView(routeFromHash());
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  const navigate = (next, anchor) => {
    setView(next);
    const hashes = {
      explore: "explorar",
      profile: "mi-espacio",
    };
    window.history.pushState(null, "", next === "admin" ? "/admin" : next === "news" ? "/novedades" : next === "article" ? `/novedades/${encodeURIComponent(anchor)}` : next === "club" ? `/clubes/${encodeURIComponent(anchor)}` : next === "home" ? "/" : `/#${hashes[next]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (anchor && next === "home")
      window.setTimeout(
        () =>
          document
            .getElementById(anchor)
            ?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
  };
  const search = (next) => {
    setFilters(next);
    if (view !== "explore") navigate("explore");
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("home");
  };
  const authSuccess = (nextUser) => {
    setUser(nextUser);
    setAuthMode(null);
    if (nextUser.role === "ADMIN" && window.location.pathname.startsWith("/admin/")) {
      setView("admin");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else navigate(nextUser.role === "ADMIN" ? "admin" : "profile");
  };

  return (
    <>
      {view !== "admin" && <Header
        view={view}
        onNavigate={navigate}
        onAuth={setAuthMode}
        user={user}
        onLogout={logout}
      />}
      {view === "home" && (
        <Home onSearch={search} onNavigate={navigate} onAuth={setAuthMode} articles={articles} />
      )}
      {view === "news" && <NewsPage articles={articles} loading={newsLoading} error={newsError} onNavigate={navigate} />}
      {view === "article" && <NewsArticle article={articles.find((item) => item.slug === decodeURIComponent(window.location.pathname.split("/")[2] || ""))} loading={newsLoading} onNavigate={navigate} />}
      {view === "club" && <ClubProfilePage profile={clubProfile} loading={clubLoading} error={clubError} onNavigate={navigate} />}
      {view === "explore" && (
        <Explore
          filters={filters}
          onSearch={search}
          profiles={profiles}
          loading={directoryLoading}
          error={directoryError}
          onOpen={setSelectedProfile}
        />
      )}
      {view === "profile" &&
        (user ? (
          <MemberProfile
            user={user}
            onUpdate={setUser}
            onExplore={() => navigate("explore")}
          />
        ) : (
          <main className="container dashboard-page">
            <div className="empty-state">
              <LockKeyhole />
              <h2>Iniciá sesión para ver tu espacio.</h2>
              <button
                className="button button-primary"
                onClick={() => setAuthMode("login")}
              >
                Ingresar
              </button>
            </div>
          </main>
        ))}
      {view === "admin" && <Admin user={user} onAuth={setAuthMode} onLogout={logout} onNavigate={navigate} />}
      {view !== "admin" && <Footer onNavigate={navigate} onAuth={setAuthMode} />}
      <AuthModal
        key={authMode || "closed"}
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onMode={setAuthMode}
        onSuccess={authSuccess}
      />
      <DetailModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        user={user}
        onAuth={setAuthMode}
        onNavigate={navigate}
      />
    </>
  );
}
