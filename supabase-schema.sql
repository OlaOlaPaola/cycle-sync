-- Script SQL para el schema de Supabase
-- Este script muestra la estructura de tablas que el código espera
-- Si ya tienes estas tablas, no necesitas ejecutar este script

-- Tabla de usuarios (ya existe en tu schema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    privy_user_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de versiones de datos encriptados (ya existe en tu schema)
CREATE TABLE IF NOT EXISTS user_secure_data_versions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cid VARCHAR(255) NOT NULL,
    encrypted_aes_key TEXT NOT NULL, -- JSON con {aesKey, iv, tag}
    version INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices (ya existen en tu schema)
CREATE INDEX IF NOT EXISTS idx_user_secure_data_userid 
    ON user_secure_data_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_secure_data_version 
    ON user_secure_data_versions(version);

-- NOTA IMPORTANTE:
-- El campo encrypted_aes_key almacena un JSON con la siguiente estructura:
-- {
--   "aesKey": "base64_string",
--   "iv": "base64_string",
--   "tag": "base64_string"
-- }
--
-- Esto permite almacenar todos los datos necesarios para desencriptar
-- los datos almacenados en IPFS (Pinata).
--
-- El sistema de versionado permite mantener un historial de versiones
-- de los datos encriptados del usuario.

