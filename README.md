# IIDCA Social Club

Aplicación responsive para acercar personas a oportunidades deportivas. Su tono y sus funciones siguen el manifiesto de IIDCA. El directorio público reúne clubes de la Ciudad de Buenos Aires y permite que una organización reclame y mantenga su ficha.

## Funciones

- Inicio con fotografías de personas practicando deporte y navegación accesible en celular y escritorio.
- Directorio con búsqueda por deporte, ubicación y categoría, vista de listado y Google Maps, geolocalización opcional y fichas con actividades, dirección, fuente y estado de verificación.
- Padrón inicial de 310 clubes reales obtenido de [Buenos Aires Data · Clubes](https://data.buenosaires.gob.ar/es_AR/dataset/clubes). La importación es repetible, registra procedencia y fecha, y evita duplicados por identificador de fuente o nombre y dirección.
- Imágenes de sedes reales para clubes destacados y fotografías del deporte correspondiente para el resto. [Créditos y licencias](public/creditos-fotos.html) se generan con `npm run build` a partir de `data/image-credits.json`.
- Registro e ingreso de deportistas, clubes, profesionales, federaciones y marcas. Los perfiles de deportistas son privados. Los perfiles públicos nuevos requieren aprobación.
- Solicitud de titularidad de una ficha por una organización registrada, con evidencia revisada por el administrador. La aprobación vincula la ficha a su cuenta y permite editarla.
- Panel administrador con acceso separado en `/admin`, gestión de solicitudes y fichas, bitácora de cambios y exportaciones privadas en Excel y PDF.
- [Presentación para clubes](public/para-clubes.html) para compartir el funcionamiento de la plataforma.

Las fichas importadas están marcadas como **Aún no verificada** hasta que IIDCA apruebe su titularidad o revise sus datos. La fuente original y las imágenes pueden cambiar; el contacto tomado del padrón queda privado hasta que la organización autorice su publicación. Las fotografías de actividades no se atribuyen a una sede particular.

## Requisitos y desarrollo

- Node.js 20.19 o superior y PostgreSQL.
- `npm ci`
- Crear la base `iidca_social_club`, copiar `.env.example` a `.env` y configurar `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
- `npm run db:deploy && npm run db:seed`
- `npm run dev` y abrir [http://127.0.0.1:5173](http://127.0.0.1:5173).

`npm run db:seed` carga el snapshot reproducible `data/clubes-caba.json`. Para actualizar el padrón desde su fuente oficial, usar `npm run db:import-clubs` y revisar el resultado. La importación conserva fichas verificadas o reclamadas y sus cambios de imagen. Los seis ejemplos ficticios de la primera versión se eliminan al sembrar datos.

Para crear un administrador fuera del modo demo, agregar temporalmente `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres) a `.env`, ejecutar `npm run admin:create` y eliminar la contraseña del archivo. El acceso administrador está en `/admin`; el botón Ingresar del menú es para los demás perfiles.

## Google Maps

Con `VITE_GOOGLE_MAPS_API_KEY` configurada, la vista mapa muestra los marcadores de todas las fichas con coordenadas y permite elegir puntos sobre el mapa. La clave necesita la API de Maps JavaScript habilitada y las restricciones de origen adecuadas. Sin clave, la app usa **Google Maps embebido**: se selecciona una ficha del directorio para verla en el mapa; al crear una ficha se pueden ingresar las coordenadas tomadas de Google Maps. Las indicaciones siempre abren Google Maps. El mapa embebido no muestra simultáneamente todos los marcadores propios.

## Producción y publicación

La instancia está en [https://149.34.224.87/](https://149.34.224.87/). En `hosting` solo usa `/var/www/sites/iidca-social-club`, el usuario `site-iidca`, la base `iidca_social_club`, el servicio `iidca-social-club.service` y el upstream `127.0.0.1:3013`. Los secretos están en `/var/www/sites/iidca-social-club/shared/app.env`, fuera del código sincronizado. nginx sirve el frontend y envía `/api` al servidor Express. La IP tiene una renovación HTTPS independiente mediante `iidca-ip-cert-renew.timer`.

El Git local tiene `origin` para [GitHub](https://github.com/nicogomez94/iidca) y `hosting` para el Git aislado del VPS. Con el árbol limpio y los cambios confirmados, `bash scripts/deploy-hosting.sh` pushea ambos remotos, sincroniza solo IIDCA, instala dependencias, aplica migraciones, compila y reinicia su servicio. La carga del padrón se ejecuta luego con `ssh hosting 'runuser -u site-iidca -- sh -c "cd /var/www/sites/iidca-social-club/app && npm run db:seed"'`.

`bash scripts/install-hosting-backup.sh` instala una copia diaria exclusiva de esta base en `shared/backups`, verifica que `pg_restore` pueda leer el archivo y conserva 14 días. Se recomienda probar una restauración en una base separada antes de depender de estas copias. Las exportaciones del administrador son adicionales a ese respaldo.

El despliegue actual usa `DEMO_MODE=true` en el servidor y `VITE_DEMO_MODE=true` en el frontend. En este modo los formularios de prueba aparecen precargados y las contraseñas no se comprueban al ingresar ni son obligatorias al registrarse. Hay dos cuentas de prueba: `test@iidca.test` y `admin@iidca.test`; el campo contraseña puede quedar vacío o tener `iidca`. La primera entra por el botón Ingresar y la segunda por `/admin`. El despliegue se controla con `DEMO_MODE=true|false bash scripts/deploy-hosting.sh`; cuando se desactiva, el servidor vuelve a exigir las contraseñas reales. **El modo demo permite que cualquiera que conozca un email existente entre a esa cuenta, incluido el administrador; usalo solo durante pruebas controladas.**

## Privacidad

Las coordenadas exactas de una ficha son opcionales. El navegador pide permiso antes de usar la geolocalización y requiere HTTPS fuera de localhost. La API pública excluye contactos importados, identificadores de cuentas, solicitudes de titularidad y bitácora. Las exportaciones privadas requieren una sesión administradora. Las fichas de deportistas nunca entran al directorio público.
