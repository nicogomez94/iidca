# IIDCA Social Club · Etapa 1

Aplicación responsive para conectar personas con clubes, profesionales, federaciones y marcas aliadas. El piloto está enfocado en la Ciudad de Buenos Aires y sigue la misión del manifiesto de IIDCA: acercar oportunidades de práctica deportiva.

## Qué incluye

- Registro e ingreso con cinco tipos de perfil: deportista social, club, profesional, federación y marca aliada.
- Perfil personal editable. Los perfiles de deportistas no se muestran públicamente.
- Directorio público con búsqueda por deporte, ubicación y categoría.
- Fichas con actividades, información institucional, contacto autorizado y ubicación.
- Mapa interactivo con OpenStreetMap, búsqueda cercana con geolocalización y selección manual de punto para organizaciones.
- Panel administrativo básico para revisar, publicar y ocultar perfiles públicos.

Las seis fichas iniciales son ficticias, están marcadas como **Ejemplo** y se cargan solo con `npm run db:seed`. No hay chat, puntos, rankings, torneos, pagos ni funciones avanzadas de la Etapa 2.

## Requisitos

- Node.js 20.19 o superior
- PostgreSQL local

## Instalar y ejecutar

1. Instalá dependencias con `npm install`.
2. Creá una base PostgreSQL llamada `iidca_social_club`.
3. Copiá `.env.example` a `.env` y configurá `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
4. Ejecutá `npm run db:migrate` y, si querés datos de demostración, `npm run db:seed`.
5. Iniciá con `npm run dev` y abrí [http://127.0.0.1:5173](http://127.0.0.1:5173).

Para crear un administrador, agregá temporalmente `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres) a `.env`, ejecutá `npm run admin:create` y eliminá `ADMIN_PASSWORD` de `.env` después.

Para producción: `VITE_DEBUG=false npm run build`, `npm run db:deploy`, `NODE_ENV=production npm start`. El servidor Express sirve la app compilada y las rutas `/api` desde el mismo origen.

## Sitio publicado

La instancia de producción está en [https://149.34.224.87/](https://149.34.224.87/). Usa recursos propios en el VPS `hosting`: usuario `site-iidca`, base `iidca_social_club`, servicio `iidca-social-club.service` y directorio `/var/www/sites/iidca-social-club`. nginx sirve el frontend y envía `/api` al servidor Express en `127.0.0.1:3013`.

Para publicar cambios desde esta carpeta, ejecutá `bash scripts/deploy-hosting.sh`. El script copia solo este proyecto, instala dependencias, aplica las migraciones, compila y reinicia únicamente el servicio de IIDCA. El archivo de secretos del VPS está fuera de la aplicación, en `/var/www/sites/iidca-social-club/shared/app.env`, y no se sincroniza.

El certificado HTTPS de la IP tiene una renovación independiente mediante `iidca-ip-cert-renew.timer`. El directorio arranca vacío en producción; las seis fichas ficticias del entorno de desarrollo no se publican. Los perfiles públicos nuevos aparecen cuando un administrador los aprueba.

Para probar los formularios con datos ficticios precargados, abrí [https://149.34.224.87/?testing=1](https://149.34.224.87/?testing=1). El registro genera un email distinto cada vez y carga valores acordes al tipo de perfil; el ingreso reutiliza el email de la última cuenta de prueba creada en esa pestaña. Las confirmaciones de edad y publicación se marcan manualmente. Sin `?testing=1`, la versión pública muestra formularios vacíos.

## Notas de implementación

- Los perfiles públicos nuevos requieren aprobación del administrador. Las fichas de deportistas permanecen privadas.
- El contacto público solo se recoge si el titular autoriza su publicación. Identificadores legales y datos internos de registro no se incluyen en la API pública.
- La ubicación exacta en el mapa es opcional y la elige quien crea el perfil. La búsqueda por barrio funciona sin coordenadas.
- La geolocalización del navegador requiere permiso del visitante y, fuera de localhost, un sitio servido con HTTPS.
- `.env.local` contiene `VITE_DEBUG=true` para prellenar formularios con datos ficticios durante desarrollo; el build de producción debe definir `VITE_DEBUG=false`.
