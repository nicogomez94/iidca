import { useEffect, useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleHelp,
  Compass,
  Dumbbell,
  ExternalLink,
  Heart,
  LocateFixed,
  LockKeyhole,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
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
  location: testingMode ? "Ciudad de Buenos Aires" : "",
  category: "",
  lat: "",
  lng: "",
};

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
            className={view === "explore" ? "active" : ""}
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
          <div className="mobile-nav-actions">
            {user ? (
              <>
                <button
                  onClick={() =>
                    go(user.role === "ADMIN" ? "admin" : "profile")
                  }
                >
                  Mi espacio
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
                Mi espacio
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
    ],
  );

  const locate = () => {
    setGeoError("");
    if (!navigator.geolocation)
      return setGeoError("Tu navegador no admite ubicación.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setValues((current) => ({
          ...current,
          location: "",
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        })),
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
      <img className="hero-photo-main" src="/images/sports/volleyball.jpg" alt="Personas jugando vóley en una cancha comunitaria" />
      <img className="hero-photo-small" src="/images/sports/wheelchair.jpg" alt="Mujeres jugando básquet adaptado" />
      <div className="hero-sticker"><span>EL DEPORTE<br />NOS ENCUENTRA</span><ArrowDownRight size={32} /></div>
      <div className="hero-visual-caption">Clubes reales. Personas reales. Más encuentros.</div>
    </div>
  );
}

function Home({ onSearch, onNavigate, onAuth }) {
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
            <p className="hero-photo-credit"><a href="/creditos-fotos.html">Créditos de fotografía</a></p>
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

      <section className="path-section" id="como-funciona">
        <div className="container">
          <div className="section-heading path-heading">
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
            <article className="path-card path-card-one">
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
            <article className="path-card path-card-two">
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
            <article className="path-card path-card-three">
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
          <div className="audience-copy">
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
          <div className="audience-pills">
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
    </main>
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
          {profile.verification === "VERIFIED" ? <><BadgeCheck size={15} /> Verificado</> : "Datos públicos"}
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

function FitGoogleMap({ profiles, location }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    profiles.forEach((profile) => bounds.extend({ lat: profile.latitude, lng: profile.longitude }));
    if (location.lat && location.lng) bounds.extend({ lat: Number(location.lat), lng: Number(location.lng) });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 52);
  }, [map, profiles, location.lat, location.lng]);
  return null;
}

function DirectoryMap({ profiles, filters, onOpen }) {
  const [focused, setFocused] = useState(null);
  const points = profiles.filter(
    (profile) => profile.latitude !== null && profile.longitude !== null,
  );
  const embedQuery = focused
    ? `${focused.latitude},${focused.longitude}`
    : filters.location || "clubes deportivos Ciudad de Buenos Aires";
  return (
    <div className="map-frame">
      {googleMapsKey ? (
        <APIProvider apiKey={googleMapsKey} language="es" region="AR">
          <GoogleMap defaultCenter={{ lat: -34.6037, lng: -58.3816 }} defaultZoom={11} gestureHandling="cooperative" className="directory-map">
            <FitGoogleMap profiles={points} location={filters} />
            {points.map((profile) => (
              <Marker key={profile.id} position={{ lat: profile.latitude, lng: profile.longitude }} title={profile.name} onClick={() => onOpen(profile)} />
            ))}
          </GoogleMap>
        </APIProvider>
      ) : (
        <div className="google-map-with-list">
          <iframe className="directory-map" title="Google Maps: clubes deportivos" src={`https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=13&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="google-map-list" aria-label="Ubicaciones del directorio">
            {points.map((profile) => (
              <button key={profile.id} className={focused?.id === profile.id ? "selected" : ""} onClick={() => setFocused(profile)}>
                <strong>{profile.name}</strong><span>{profile.neighborhood || profile.city}</span>
              </button>
            ))}
            {focused && <button className="map-view-detail" onClick={() => onOpen(focused)}>Ver ficha de {focused.name} <ArrowUpRight size={16} /></button>}
          </div>
        </div>
      )}
      <div className="map-caption">
        <MapPin size={17} /> {googleMapsKey ? `${points.length} ubicaciones en el mapa` : `${points.length} clubes en el directorio · elegí uno para verlo en Google Maps`}{" "}
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

function Explore({ filters, onSearch, profiles, loading, error, onOpen }) {
  const [layout, setLayout] = useState("list");
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
          <p>
            Opciones reales para moverte, conectar y hacer del deporte parte de
            tu vida.
          </p>
          <SearchForm initial={filters} onSearch={onSearch} compact />
        </div>
      </section>
      <section className="directory-section">
        <div className="container">
          <div className="directory-toolbar">
            <div>
              <h2>Directorio deportivo</h2>
              <span>
                {loading
                  ? "Buscando..."
                  : `${profiles.length} ${profiles.length === 1 ? "opción encontrada" : "opciones encontradas"}`}
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
          {!loading && !error && profiles.length === 0 && (
            <div className="empty-state">
              <Compass size={35} />
              <h3>Todavía no hay resultados con esos filtros.</h3>
              <p>Probá con otro deporte, barrio o categoría.</p>
              <button
                className="button button-primary"
                onClick={() => onSearch(defaultFilters)}
              >
                Ver todas las opciones
              </button>
            </div>
          )}
          {layout === "list" ? (
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

function DetailModal({ profile, onClose, user, onAuth }) {
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
            {profile.verification === "VERIFIED" ? <><BadgeCheck size={18} /> Ficha verificada por IIDCA</> : <><CircleHelp size={18} /> Información pública sin reclamar</>}
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

function AuthModal({ mode, onClose, onSuccess, onMode }) {
  const [role, setRole] = useState("ATHLETE");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() =>
    mode === "login" || mode === "admin" ? createLoginDefaults(mode === "admin") : createRegistrationDefaults(),
  );
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
        imageUrl: draft.imageUrl,
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
                        <FormField
                          field={{ label: "URL HTTPS de una foto propia o autorizada" }}
                          value={draft.imageUrl || ""}
                          onChange={(value) => change("imageUrl", value)}
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

function MemberProfile({ user, onUpdate, onExplore }) {
  const profile = user.profile;
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(profile || {});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  if (!profile) return null;
  const update = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await api("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          city: draft.city,
          neighborhood: draft.neighborhood,
          sport: draft.sport,
          sports:
            typeof draft.sports === "string"
              ? draft.sports.split(",")
              : draft.sports,
          headline: draft.headline,
          description: draft.description,
          address: draft.address,
          latitude: draft.latitude,
          longitude: draft.longitude,
          email: draft.email,
          phone: draft.phone,
          instagram: draft.instagram,
          website: draft.website,
          imageUrl: draft.imageUrl,
        }),
      });
      onUpdate({ ...user, profile: data.profile });
      setDraft(data.profile);
      setEdit(false);
      setSuccess(
        user.role === "ATHLETE"
          ? "Tus cambios se guardaron."
          : "Tus cambios se guardaron. El perfil quedó pendiente de revisión.",
      );
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  };
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
              onClick={() => setEdit(!edit)}
            >
              {edit ? "Cancelar edición" : "Editar mi perfil"}{" "}
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
        {success && (
          <div className="feedback success" role="status">
            {success}
          </div>
        )}
        {edit && (
          <section className="dashboard-card edit-panel">
            <h2>Editar datos de tu perfil</h2>
            <p>
              La información que modifiques se reflejará en tu ficha cuando esté
              publicada.
            </p>
            <form onSubmit={update} className="auth-form">
              <div className="form-grid">
                <FormField
                  field={{ label: "Nombre", required: true }}
                  value={draft.name}
                  onChange={(value) => setDraft({ ...draft, name: value })}
                />
                <FormField
                  field={{ label: "Ciudad", required: true }}
                  value={draft.city}
                  onChange={(value) => setDraft({ ...draft, city: value })}
                />
                <FormField
                  field={{ label: "Barrio o zona" }}
                  value={draft.neighborhood}
                  onChange={(value) =>
                    setDraft({ ...draft, neighborhood: value })
                  }
                />
                <FormField
                  field={{ label: "Deporte principal" }}
                  value={draft.sport}
                  onChange={(value) => setDraft({ ...draft, sport: value })}
                />
                <FormField
                  field={{ label: "Deportes (separados por comas)" }}
                  value={
                    Array.isArray(draft.sports)
                      ? draft.sports.join(", ")
                      : draft.sports
                  }
                  onChange={(value) => setDraft({ ...draft, sports: value })}
                />
                {user.role !== "ATHLETE" && (
                  <>
                    <FormField
                      field={{ label: "Dirección" }}
                      value={draft.address}
                      onChange={(value) =>
                        setDraft({ ...draft, address: value })
                      }
                    />
                    <FormField
                      field={{ label: "Email público", type: "email" }}
                      value={draft.email}
                      onChange={(value) => setDraft({ ...draft, email: value })}
                    />
                    <FormField
                      field={{ label: "WhatsApp público" }}
                      value={draft.phone}
                      onChange={(value) => setDraft({ ...draft, phone: value })}
                    />
                    <FormField
                      field={{ label: "Instagram" }}
                      value={draft.instagram}
                      onChange={(value) =>
                        setDraft({ ...draft, instagram: value })
                      }
                    />
                    <FormField
                      field={{ label: "Sitio web" }}
                      value={draft.website}
                      onChange={(value) =>
                        setDraft({ ...draft, website: value })
                      }
                    />
                    <FormField
                      field={{ label: "URL HTTPS de una foto propia o autorizada" }}
                      value={draft.imageUrl || ""}
                      onChange={(value) => setDraft({ ...draft, imageUrl: value })}
                    />
                  </>
                )}
              </div>
              {user.role !== "ATHLETE" && (
                <>
                  <LocationPicker
                    latitude={draft.latitude}
                    longitude={draft.longitude}
                    onChoose={({ lat, lng }) =>
                      setDraft({ ...draft, latitude: lat, longitude: lng })
                    }
                  />
                  <FormField
                    field={{ label: "Frase principal" }}
                    value={draft.headline}
                    onChange={(value) =>
                      setDraft({ ...draft, headline: value })
                    }
                  />
                  <FormField
                    field={{ label: "Descripción", type: "textarea" }}
                    value={draft.description}
                    onChange={(value) =>
                      setDraft({ ...draft, description: value })
                    }
                  />
                </>
              )}
              {error && (
                <div className="feedback error" role="alert">
                  {error}
                </div>
              )}
              <button className="button button-primary" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}{" "}
                <Check size={18} />
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

function Admin({ user, onAuth }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const load = () =>
    api("/admin/overview")
      .then(setOverview)
      .catch((issue) => setError(issue.message));
  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user]);
  const decideClaim = async (id, decision) => {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/claims/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
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
      const response = await fetch(`/api/admin/export/${format}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error((await response.json()).error || "No pudimos descargar el padrón.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `iidca-padron.${format}`;
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
      <main className="container dashboard-page">
        <div className="empty-state">
          <LockKeyhole />
          <h2>{user ? "Acceso restringido" : "Administración IIDCA"}</h2>
          {!user && <button className="button button-primary" onClick={() => onAuth("admin")}>Ingresar al panel</button>}
        </div>
      </main>
    );
  const pending =
    overview?.profiles.filter((profile) => profile.status === "PENDING")
      .length || 0;
  const published =
    overview?.profiles.filter((profile) => profile.status === "PUBLISHED")
      .length || 0;
  const visibleProfiles = (overview?.profiles || []).filter((profile) => `${profile.name} ${profile.city} ${profile.neighborhood || ""} ${profile.accountEmail || ""}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  return (
    <main className="dashboard-page admin-page">
      <div className="container dashboard-container">
        <div className="dashboard-intro">
          <div className="eyebrow eyebrow-blue">PANEL ADMINISTRATIVO</div>
          <h1>
            La comunidad, <em>de cerca.</em>
          </h1>
          <p>Revisá clubes, reclamaciones y datos de contacto para el trabajo de IIDCA.</p>
        </div>
        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}
        <div className="admin-stats">
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
        <section className="dashboard-card admin-tools">
          <div>
            <h2>Padrón privado</h2>
            <p>Los datos completos y las exportaciones son exclusivos para administración.</p>
          </div>
          <div className="admin-export-actions">
            <button className="button button-outline" onClick={() => downloadExport("xlsx")}>Descargar Excel</button>
            <button className="button button-outline" onClick={() => downloadExport("pdf")}>Descargar PDF</button>
          </div>
        </section>
        <section className="dashboard-card admin-claims">
          <div className="admin-list-heading"><h2>Reclamos por verificar</h2><span>{overview?.claims?.length || 0} pendientes</span></div>
          {overview?.claims?.length ? overview.claims.map((claim) => (
            <article className="admin-claim" key={claim.id}>
              <div><strong>{claim.profileName}</strong><p>Solicita: {claim.applicantName || claim.applicant} · {claim.applicant}</p><blockquote>{claim.evidence}</blockquote></div>
              <div className="admin-row-actions"><button disabled={busy === claim.id} onClick={() => decideClaim(claim.id, "APPROVED")}>Aprobar vínculo</button><button disabled={busy === claim.id} onClick={() => decideClaim(claim.id, "REJECTED")}>Rechazar</button></div>
            </article>
          )) : <p>No hay reclamos pendientes.</p>}
        </section>
        <section className="dashboard-card admin-list">
          <div className="admin-list-heading">
            <h2>Perfiles de la plataforma</h2>
            <span>{overview?.profiles.length || 0} registros</span>
          </div>
          <label className="admin-search">Buscar por nombre, zona o cuenta <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. Club Ferro, Caballito" /></label>
          {!overview ? (
            <p>Cargando perfiles...</p>
          ) : (
            visibleProfiles.map((profile) => (
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
        </section>
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
        </div>
        <div className="footer-links">
          <strong>Participá</strong>
          <a href="/para-clubes.html">Presentación para clubes</a>
          <a href="/creditos-fotos.html">Créditos de fotografía</a>
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
    window.location.pathname === "/admin" ? "admin" : ({
      "#explorar": "explore",
      "#mi-espacio": "profile",
    })[window.location.hash] || "home";
  const [view, setView] = useState(routeFromHash);
  const [authMode, setAuthMode] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [profiles, setProfiles] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    api("/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        if (window.location.pathname === "/admin") setAuthMode("admin");
      });
  }, []);
  useEffect(() => {
    setDirectoryLoading(true);
    setDirectoryError("");
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== ""),
    ).toString();
    api(`/profiles${query ? `?${query}` : ""}`)
      .then((data) => setProfiles(data.profiles))
      .catch((issue) => setDirectoryError(issue.message))
      .finally(() => setDirectoryLoading(false));
  }, [filters]);
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
    window.history.pushState(null, "", next === "admin" ? "/admin" : next === "home" ? "/" : `/#${hashes[next]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (anchor)
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
    navigate("explore");
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("home");
  };
  const authSuccess = (nextUser) => {
    setUser(nextUser);
    setAuthMode(null);
    navigate(nextUser.role === "ADMIN" ? "admin" : "profile");
  };

  return (
    <>
      <Header
        view={view}
        onNavigate={navigate}
        onAuth={setAuthMode}
        user={user}
        onLogout={logout}
      />
      {view === "home" && (
        <Home onSearch={search} onNavigate={navigate} onAuth={setAuthMode} />
      )}
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
      {view === "admin" && <Admin user={user} onAuth={setAuthMode} />}
      <Footer onNavigate={navigate} onAuth={setAuthMode} />
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
      />
    </>
  );
}
