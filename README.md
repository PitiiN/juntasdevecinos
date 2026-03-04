# JJVV Mobile App

Aplicación móvil exclusivamente nativa (iOS y Android) para la gestión de Juntas de Vecinos (JJVV) en Chile. Creada con **Expo, React Native, NativeWind v4 (Tailwind)** y respaldada por **Supabase** (Postgres, Auth, Storage, Edge Functions).

## Características principales
- **Mobile-only**: Diseño centrado 100% en celular con alta accesibilidad (TTS, tamaños de letra grandes, alto contraste). Módulo web omitido deliberadamente.
- **Login centralizado**: Única pantalla de acceso que enruta automáticamente al "Panel Vecino" (User Tabs) o al "Panel Directiva" (Admin Tabs) basado en los roles de Supabase (`memberships.role`).
- **Completamente asíncrona**: Optimizada usando TanStack Query.
- **Notificaciones Push**: Tokens administrados vía `expo-notifications` y envíos centralizados vía *Supabase Edge Functions*.

---

## 🛠 Instalación y Configuración Local

### Prerrequisitos
- Node.js >= 18
- CLI de Supabase instalado (`npm install -g supabase-cli` o equivalente)

### Paso 1: Dependencias del Front-end
```bash
cd jjvv-mobile
npm install
# o
yarn install
```

### Paso 2: Ejecutar Base de Datos de Supabase Localmente (Opcional, para Desarrollo Activo)
Este repositorio ya incluye las migraciones necesarias (`001_init.sql`, `002_rls.sql`, `003_functions.sql`).

```bash
supabase start
```
Esto inicializará una BDD local usando Docker y aplicará todas las migraciones automáticamente. Puedes encontrar el panel en `http://localhost:54323`.

### Paso 3: Configurar Variables de Entorno (`.env`)
En la raíz de `jjvv-mobile`, haz una copia del archivo `.env.example`:
```bash
cp .env.example .env
```
Actualiza los valores de `.env` dependiendo de si usarás tu entorno Supabase Local o el Proyecto de Supabase en Producción:
```ini
EXPO_PUBLIC_SUPABASE_URL=tu-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```
*(Si usas el entorno Cloud de "JJVV Mobile" ya creado, reemplaza con las claves de ese proyecto).*

### Paso 4: Despliegue de Edge Functions (Notificaciones)
Para que el CRUD de comunicados logre enviar Notificaciones Push P2P, debes subir la _Edge Function_:
```bash
npx supabase functions deploy send_push --project-ref cuwikwegsopfxlubrvsp
```
> Asegúrate de asignar los secretos en producción si es necesario (el Auth Header y el `SUPABASE_SERVICE_ROLE_KEY` los inyecta auto Supabase en producción).

### Paso 5: Iniciar la App Móvil
Abre la aplicación con **Expo Go** en un dispositivo físico o emulador:
```bash
npm start
# Para limpiar caché:
npm start -c
```

---

## 📦 Compilación y Distribución (EAS)

Para construir la app para uso interno (testing en dispositivos físicos) usando Expo Application Services:

### Android (APK)
Útil para instalar directamente y testear Push Notifications reales.
```bash
eas build --profile preview --platform android
```

### iOS (Simulator / Testflight)
```bash
eas build --profile preview --platform ios
```

---

## ♿ Notas Críticas sobre Accesibilidad y Estilos
Todo el CSS y styling debe respetar la configuración actual de **NativeWind v4** (a través de `global.css` y `tailwind.config.js`). Recomendamos usar el contexto de Accesibilidad (vía `useAccessibility()`) si se agregan módulos complejos que requieran tamaños dinámicos adicionales.

El servicio integrado de `expo-speech` se utiliza nativamente en las pantallas de Comunicados. Asegúrate de incluir audios descriptivos para usuarios de la tercera edad.
