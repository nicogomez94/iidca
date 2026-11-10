import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const buenosAires = [-34.6037, -58.3816];

function pin(category, active) {
  const color = category === "PROFESSIONAL" ? "#e91819" : "#090c70";
  const letter = category === "PROFESSIONAL" ? "P" : "C";
  return L.divIcon({
    className: "iidca-leaflet-pin",
    html: `<span style="background:${color};border-color:${active ? "#ff9d00" : "#fff"}"><b>${letter}</b></span>`,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
  });
}

export default function LeafletMap({ points = [], selected, location, onSelect, onChoose, latitude, longitude, picker = false }) {
  const element = useRef(null);
  const map = useRef(null);
  const markers = useRef(null);
  const choose = useRef(onChoose);
  choose.current = onChoose;

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { scrollWheelZoom: false }).setView(buenosAires, 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(instance);
    markers.current = L.layerGroup().addTo(instance);
    instance.on("click", (event) => choose.current?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
    map.current = instance;
    const resize = window.setTimeout(() => instance.invalidateSize(), 100);
    return () => {
      window.clearTimeout(resize);
      instance.remove();
      map.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !markers.current) return;
    markers.current.clearLayers();
    if (picker) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (latitude != null && longitude != null && latitude !== "" && longitude !== "" && Number.isFinite(lat) && Number.isFinite(lng)) {
        L.marker([lat, lng], { icon: pin("CLUB", true) }).addTo(markers.current);
        map.current.setView([lat, lng], 14);
      }
      return;
    }
    const bounds = [];
    for (const profile of points) {
      const position = [Number(profile.latitude), Number(profile.longitude)];
      if (!position.every(Number.isFinite)) continue;
      bounds.push(position);
      L.marker(position, { icon: pin(profile.category, selected?.id === profile.id), title: profile.name })
        .on("click", () => onSelect(profile))
        .addTo(markers.current);
    }
    if (location?.lat && location?.lng) {
      L.circle([Number(location.lat), Number(location.lng)], {
        radius: Number(location.radius || 5) * 1000,
        color: "#4656cc",
        weight: 2,
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(markers.current);
    }
    if (selected) map.current.setView([Number(selected.latitude), Number(selected.longitude)], 15);
    else if (location?.lat && location?.lng) map.current.setView([Number(location.lat), Number(location.lng)], 12);
    else if (bounds.length > 1) map.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    else if (bounds.length === 1) map.current.setView(bounds[0], 14);
    else map.current.setView(buenosAires, 11);
  }, [points, selected, location?.lat, location?.lng, location?.radius, picker, latitude, longitude, onSelect]);

  return <div ref={element} className={picker ? "picker-map" : "directory-map"} role="application" aria-label={picker ? "Mapa para elegir una ubicación pública" : "Mapa de entidades deportivas"} />;
}
