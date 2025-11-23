# Configuración de OAuth con Privy (Google y Telegram)

Esta guía te ayudará a configurar correctamente la autenticación con Google y Telegram usando Privy.

## 📋 Requisitos Previos

1. Tener una cuenta en [Privy Dashboard](https://dashboard.privy.io)
2. Tener un App ID de Privy configurado en tu archivo `.env`
3. Tener acceso a Google Cloud Console (para Google OAuth)
4. Tener un bot de Telegram creado (para Telegram OAuth)

---

## 🔵 Configuración de Google OAuth

### Paso 1: Configurar en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google+ API" y habilítala
4. Crea credenciales OAuth 2.0:
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "OAuth client ID"
   - Selecciona "Web application"
   - Configura los **Authorized redirect URIs**:
     ```
     https://auth.privy.io/api/v1/oauth/google/callback
     http://localhost:8080 (para desarrollo)
     https://tu-dominio.com (para producción)
     ```
   - Guarda el **Client ID** y **Client Secret**

### Paso 2: Configurar en Privy Dashboard

1. Inicia sesión en [Privy Dashboard](https://dashboard.privy.io)
2. Selecciona tu aplicación
3. Ve a **Settings** > **OAuth**
4. En la sección **Google**:
   - Activa "Enable Google OAuth"
   - Ingresa tu **Google Client ID**
   - Ingresa tu **Google Client Secret**
   - Guarda los cambios

### Paso 3: Configurar Redirect URIs en Privy

1. En el mismo panel de Privy Dashboard
2. Ve a **Settings** > **OAuth** > **Redirect URIs**
3. Agrega las siguientes URIs:
   ```
   http://localhost:8080
   https://tu-dominio.com
   ```
4. Guarda los cambios

---

## 📱 Configuración de Telegram OAuth

### Paso 1: Crear un Bot de Telegram

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía el comando `/newbot`
3. Sigue las instrucciones para crear tu bot:
   - Elige un nombre para tu bot
   - Elige un username único (debe terminar en `bot`)
4. BotFather te dará un **token de acceso** - guárdalo de forma segura
5. Configura el dominio de tu bot:
   ```
   /setdomain
   ```
   - Selecciona tu bot
   - Ingresa tu dominio (ej: `tu-dominio.com` o `localhost:8080` para desarrollo)

### Paso 2: Configurar en Privy Dashboard

1. En [Privy Dashboard](https://dashboard.privy.io)
2. Selecciona tu aplicación
3. Ve a **Settings** > **OAuth**
4. En la sección **Telegram**:
   - Activa "Enable Telegram OAuth"
   - Ingresa el **Bot Token** que obtuviste de BotFather
   - Guarda los cambios

### Paso 3: Configurar Redirect URIs en Privy

1. En el mismo panel de Privy Dashboard
2. Ve a **Settings** > **OAuth** > **Redirect URIs**
3. Asegúrate de tener las siguientes URIs configuradas:
   ```
   http://localhost:8080
   https://tu-dominio.com
   ```
4. Guarda los cambios

---

## ✅ Verificación

### Verificar que la configuración funciona:

1. **Verifica tu App ID**:
   - Asegúrate de que `VITE_PRIVY_APP_ID` esté configurado en tu `.env`
   - El App ID debe comenzar con `cl` (ej: `clxxxxxxxxxxxxxxxxxxxxx`)

2. **Prueba Google OAuth**:
   - Inicia tu aplicación en desarrollo: `npm run dev`
   - Haz clic en el botón "Google" en la pantalla de login
   - Deberías ser redirigido a Google para autorizar
   - Después de autorizar, deberías regresar a tu aplicación autenticado

3. **Prueba Telegram OAuth**:
   - Haz clic en el botón "Telegram" en la pantalla de login
   - Deberías ver una ventana de Telegram para autorizar
   - Después de autorizar, deberías regresar a tu aplicación autenticado

---

## 🐛 Solución de Problemas

### Error: "OAuth provider not configured"

**Solución**: Asegúrate de haber activado y configurado el proveedor OAuth en el Privy Dashboard.

### Error: "Redirect URI mismatch"

**Solución**: 
- Verifica que los Redirect URIs en Privy Dashboard coincidan exactamente con la URL de tu aplicación
- Para desarrollo local, usa `http://localhost:8080` (sin barra final)
- Para producción, usa `https://tu-dominio.com` (sin barra final)

### Error: "Invalid client credentials" (Google)

**Solución**:
- Verifica que el Client ID y Client Secret en Privy Dashboard sean correctos
- Asegúrate de haber configurado el Redirect URI correcto en Google Cloud Console

### Telegram no abre la ventana de autorización

**Solución**:
- Verifica que el bot token sea correcto
- Asegúrate de haber configurado el dominio del bot con BotFather
- Verifica que los Redirect URIs estén configurados en Privy Dashboard

### El login funciona pero el usuario no se autentica

**Solución**:
- Verifica que el App ID en tu `.env` sea correcto
- Revisa la consola del navegador para ver errores
- Asegúrate de que los métodos de login estén habilitados en `src/config/privy.ts`:
  ```typescript
  loginMethods: ['email', 'google', 'telegram', 'apple']
  ```

---

## 📚 Recursos Adicionales

- [Documentación de Privy OAuth](https://docs.privy.io/guide/react/oauth)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Privy Dashboard](https://dashboard.privy.io)

---

## 🔒 Notas de Seguridad

1. **Nunca compartas tus credenciales** (Client Secrets, Bot Tokens) públicamente
2. **Usa variables de entorno** para almacenar credenciales sensibles
3. **Configura Redirect URIs específicos** - no uses wildcards en producción
4. **Revisa regularmente** los permisos y configuraciones en el dashboard de Privy

---

## 📝 Checklist de Configuración

- [ ] App ID de Privy configurado en `.env`
- [ ] Google OAuth configurado en Google Cloud Console
- [ ] Google Client ID y Secret configurados en Privy Dashboard
- [ ] Bot de Telegram creado con BotFather
- [ ] Bot Token configurado en Privy Dashboard
- [ ] Redirect URIs configurados en Privy Dashboard
- [ ] Redirect URIs configurados en Google Cloud Console
- [ ] Dominio del bot configurado en Telegram
- [ ] Probado login con Google en desarrollo
- [ ] Probado login con Telegram en desarrollo

