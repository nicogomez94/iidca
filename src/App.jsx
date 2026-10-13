import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
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
          {user?.role === "ADMIN" && (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => go("admin")}
            >
              Administración
            </button>
          )}
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
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-track track-one" />
      <div className="hero-track track-two" />
      <div className="hero-track track-three" />
      <div className="hero-glow" />
      <span className="hero-sport sport-top">
        <Volleyball size={30} />
      </span>
      <span className="hero-sport sport-left">
        <Waves size={31} />
      </span>
      <span className="hero-sport sport-bottom">
        <Dumbbell size={30} />
      </span>
      <div className="hero-sticker">
        <span>
          ENCONTRÁ
          <br />
          TU LUGAR
        </span>
        <ArrowDownRight size={40} strokeWidth={1.7} />
      </div>
      <div className="hero-crest">
        <img src={logo} alt="" />
      </div>
      <div className="hero-visual-caption">EL DEPORTE NOS ENCUENTRA</div>
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
              Encontrá clubes, profesionales y organizaciones deportivas cerca
              tuyo. Empezar es más fácil cuando sabés dónde ir.
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
                Crear mi perfil <ArrowRight size={18} />
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
              Personas que buscan moverse, clubes que abren sus puertas y
              organizaciones que impulsan el deporte. Cuando nos conectamos,
              ganamos todos.
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
      <div className="card-top">
        <div className="card-icon">{roleIcon(profile.category, 25)}</div>
        <span className="card-category">{categoryLabel(profile.category)}</span>
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

const mapIcon = L.divIcon({
  className: "map-marker",
  html: "<span></span>",
  iconSize: [26, 32],
  iconAnchor: [13, 28],
});

function FitMap({ profiles, location }) {
  const map = useMap();
  useEffect(() => {
    const points = profiles
      .filter(
        (profile) => profile.latitude !== null && profile.longitude !== null,
      )
      .map((profile) => [profile.latitude, profile.longitude]);
    if (location.lat && location.lng)
      points.push([Number(location.lat), Number(location.lng)]);
    if (points.length > 1)
      map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
    else if (points.length === 1) map.setView(points[0], 13);
  }, [map, profiles, location.lat, location.lng]);
  return null;
}

function DirectoryMap({ profiles, filters, onOpen }) {
  const points = profiles.filter(
    (profile) => profile.latitude !== null && profile.longitude !== null,
  );
  return (
    <div className="map-frame">
      <MapContainer
        center={[-34.6037, -58.3816]}
        zoom={12}
        scrollWheelZoom={false}
        className="directory-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMap profiles={points} location={filters} />
        {points.map((profile) => (
          <Marker
            key={profile.id}
            position={[profile.latitude, profile.longitude]}
            icon={mapIcon}
            eventHandlers={{ click: () => onOpen(profile) }}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              {profile.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-caption">
        <MapPin size={17} /> {points.length} ubicaciones en el mapa{" "}
        <span>Mapa: OpenStreetMap</span>
      </div>
    </div>
  );
}

function LocationClick({ onChoose }) {
  useMapEvents({ click: (event) => onChoose(event.latlng) });
  return null;
}

function LocationPicker({ latitude, longitude, onChoose }) {
  return (
    <div className="location-picker">
      <div>
        <strong>Ubicá tu espacio en el mapa</strong>
        <span>
          Opcional. Hacé clic en el lugar para que aparezca en las búsquedas
          cercanas.
        </span>
      </div>
      <MapContainer
        center={[-34.6037, -58.3816]}
        zoom={11}
        scrollWheelZoom={false}
        className="picker-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationClick onChoose={onChoose} />
        {latitude && longitude && (
          <Marker
            position={[Number(latitude), Number(longitude)]}
            icon={mapIcon}
          />
        )}
      </MapContainer>
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
            Los perfiles señalados como “Ejemplo” son ficticios y sirven para
            mostrar cómo funciona la plataforma.
          </p>
        </div>
      </section>
    </main>
  );
}

function DetailModal({ profile, onClose }) {
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
                href={`https://www.openstreetmap.org/?mlat=${profile.latitude}&mlon=${profile.longitude}#map=16/${profile.latitude}/${profile.longitude}`}
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
    mode === "login" ? createLoginDefaults() : createRegistrationDefaults(),
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
        body: JSON.stringify({ email: draft.email, password: draft.password }),
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
        aria-label={mode === "login" ? "Ingresar" : "Crear perfil"}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={22} />
        </button>
        {mode === "login" ? (
          <div className="auth-content">
            <div className="auth-symbol">
              <LogIn size={26} />
            </div>
            <div className="eyebrow eyebrow-blue">BIENVENIDO DE VUELTA</div>
            <h2>
              Entrá a tu <em>espacio.</em>
            </h2>
            <p>Seguimos conectando personas con oportunidades para moverse.</p>
            {testingMode && (
              <p className="test-mode-note">
                Modo de prueba: ingresá con la última cuenta ficticia que registraste.
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
                  label: "Contraseña",
                  type: "password",
                  required: true,
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
            <p className="auth-switch">
              ¿Todavía no tenés perfil?{" "}
              <button
                onClick={() => {
                  setError("");
                  onMode("register");
                }}
              >
                Sumate al club
              </button>
            </p>
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
                        label: "Contraseña (mínimo 8 caracteres)",
                        type: "password",
                        required: true,
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

function Admin({ user }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = () =>
    api("/admin/overview")
      .then(setOverview)
      .catch((issue) => setError(issue.message));
  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user]);
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
          <h2>Acceso restringido</h2>
        </div>
      </main>
    );
  const pending =
    overview?.profiles.filter((profile) => profile.status === "PENDING")
      .length || 0;
  const published =
    overview?.profiles.filter((profile) => profile.status === "PUBLISHED")
      .length || 0;
  return (
    <main className="dashboard-page admin-page">
      <div className="container dashboard-container">
        <div className="dashboard-intro">
          <div className="eyebrow eyebrow-blue">PANEL ADMINISTRATIVO</div>
          <h1>
            La comunidad, <em>de cerca.</em>
          </h1>
          <p>Revisá perfiles y mantené actualizado el directorio público.</p>
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
        <section className="dashboard-card admin-list">
          <div className="admin-list-heading">
            <h2>Perfiles de la plataforma</h2>
            <span>{overview?.profiles.length || 0} registros recientes</span>
          </div>
          {!overview ? (
            <p>Cargando perfiles...</p>
          ) : (
            overview.profiles.map((profile) => (
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
    ({
      "#explorar": "explore",
      "#mi-espacio": "profile",
      "#administracion": "admin",
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
      .catch(() => {});
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
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next, anchor) => {
    setView(next);
    const hashes = {
      explore: "explorar",
      profile: "mi-espacio",
      admin: "administracion",
    };
    if (next === "home")
      window.history.pushState(null, "", window.location.pathname);
    else window.location.hash = hashes[next];
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
      {view === "admin" && <Admin user={user} />}
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
      />
    </>
  );
}
