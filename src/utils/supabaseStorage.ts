/**
 * Módulo de almacenamiento en Supabase
 * 
 * Este módulo se encarga de guardar y recuperar metadatos de datos encriptados
 * almacenados en IPFS (Pinata) en la base de datos Supabase.
 * 
 * Trabaja con el schema existente:
 * - users: tabla de usuarios con privy_user_id
 * - user_secure_data_versions: tabla de versiones de datos encriptados
 */

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

/**
 * Interfaz para un usuario en la tabla users
 */
export interface SupabaseUser {
  id: number;
  privy_user_id: string;
  created_at?: string;
}

/**
 * Interfaz para un registro en user_secure_data_versions
 */
export interface SupabaseUserSecureDataVersion {
  id?: number;
  user_id: number;
  cid: string;
  encrypted_aes_key: string; // JSON string con {aesKey, iv, tag}
  version: number;
  created_at?: string;
}

/**
 * Estructura del objeto JSON almacenado en encrypted_aes_key
 * Incluye la clave AES, IV y tag necesarios para desencriptar
 */
export interface EncryptionKeyData {
  aesKey: string; // base64
  iv: string; // base64
  tag: string; // base64
}

/**
 * Obtiene o crea un usuario en la tabla users
 * 
 * @param privyUserId - ID del usuario de Privy
 * @returns ID del usuario en la tabla users (INT)
 */
export async function getOrCreateUser(privyUserId: string): Promise<number> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Verifica VITE_SUPABASE_ANON_KEY.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('No se pudo crear el cliente de Supabase.');
    }

    // Intentar obtener el usuario existente
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (existingUser && !selectError) {
      return existingUser.id;
    }

    // Si no existe, crear uno nuevo
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ privy_user_id: privyUserId })
      .select('id')
      .single();

    if (insertError || !newUser) {
      throw new Error(`Error al crear usuario en Supabase: ${insertError?.message || 'Unknown error'}`);
    }

    return newUser.id;
  } catch (error) {
    throw new Error(
      `Error al obtener/crear usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Obtiene la siguiente versión para un usuario
 * 
 * @param userId - ID del usuario en la tabla users (INT)
 * @returns Número de versión siguiente
 */
export async function getNextVersion(userId: number): Promise<number> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Verifica VITE_SUPABASE_ANON_KEY.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('No se pudo crear el cliente de Supabase.');
    }

    // Obtener la versión máxima actual
    const { data, error } = await supabase
      .from('user_secure_data_versions')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 significa que no hay registros, lo cual está bien
      throw new Error(`Error al obtener versión: ${error.message}`);
    }

    // Si no hay registros, empezar en versión 1
    if (!data) {
      return 1;
    }

    // Retornar la siguiente versión
    return (data.version || 0) + 1;
  } catch (error) {
    throw new Error(
      `Error al obtener versión: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Guarda los metadatos de datos encriptados en Supabase
 * Crea una nueva versión en user_secure_data_versions
 * 
 * @param privyUserId - ID del usuario de Privy
 * @param cid - CID de IPFS
 * @param aesKey - Clave AES en base64
 * @param iv - IV en base64
 * @param tag - Tag de autenticación en base64
 * @returns ID del registro creado y número de versión
 */
export async function saveEncryptedDataToSupabase(
  privyUserId: string,
  cid: string,
  aesKey: string,
  iv: string,
  tag: string
): Promise<{ id: number; version: number }> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Verifica VITE_SUPABASE_ANON_KEY.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('No se pudo crear el cliente de Supabase.');
    }

    // 1. Obtener o crear el usuario
    const userId = await getOrCreateUser(privyUserId);

    // 2. Obtener la siguiente versión
    const version = await getNextVersion(userId);

    // 3. Crear el objeto JSON con los datos de encriptación
    const encryptionKeyData: EncryptionKeyData = {
      aesKey,
      iv,
      tag,
    };
    const encryptedAesKeyJson = JSON.stringify(encryptionKeyData);

    // 4. Insertar el nuevo registro de versión
    const { data, error } = await supabase
      .from('user_secure_data_versions')
      .insert({
        user_id: userId,
        cid: cid,
        encrypted_aes_key: encryptedAesKeyJson,
        version: version,
      })
      .select('id, version')
      .single();

    if (error) {
      throw new Error(`Error al guardar en Supabase: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('No se recibió ID del registro creado en Supabase');
    }

    return { id: data.id, version: data.version };
  } catch (error) {
    throw new Error(
      `Error al guardar datos en Supabase: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Guarda o actualiza los metadatos de datos encriptados en Supabase
 * Siempre crea una nueva versión (no actualiza versiones existentes)
 * 
 * @param privyUserId - ID del usuario de Privy
 * @param cid - CID de IPFS
 * @param aesKey - Clave AES en base64
 * @param iv - IV en base64
 * @param tag - Tag en base64
 * @returns ID del registro creado y número de versión
 */
export async function updateEncryptedDataInSupabase(
  privyUserId: string,
  cid: string,
  aesKey: string,
  iv: string,
  tag: string
): Promise<{ id: number; version: number }> {
  // Con el sistema de versionado, siempre creamos una nueva versión
  return await saveEncryptedDataToSupabase(privyUserId, cid, aesKey, iv, tag);
}

/**
 * Obtiene la versión más reciente de los datos encriptados desde Supabase
 * 
 * @param privyUserId - ID del usuario de Privy
 * @returns Registro de Supabase con datos de encriptación o null si no existe
 */
export async function getEncryptedDataFromSupabase(
  privyUserId: string
): Promise<{ cid: string; aesKey: string; iv: string; tag: string; version: number } | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase no está configurado. No se pueden obtener datos desde Supabase.');
      return null;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    // 1. Obtener el ID del usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (userError || !user) {
      return null;
    }

    // 2. Obtener la versión más reciente
    const { data: versionData, error: versionError } = await supabase
      .from('user_secure_data_versions')
      .select('cid, encrypted_aes_key, version')
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (versionError) {
      if (versionError.code === 'PGRST116') {
        // No se encontró ningún registro
        return null;
      }
      throw new Error(`Error al obtener datos de Supabase: ${versionError.message}`);
    }

    if (!versionData) {
      return null;
    }

    // 3. Parsear el JSON de encrypted_aes_key
    let encryptionKeyData: EncryptionKeyData;
    try {
      encryptionKeyData = JSON.parse(versionData.encrypted_aes_key);
    } catch (parseError) {
      throw new Error('Error al parsear encrypted_aes_key desde Supabase');
    }

    return {
      cid: versionData.cid,
      aesKey: encryptionKeyData.aesKey,
      iv: encryptionKeyData.iv,
      tag: encryptionKeyData.tag,
      version: versionData.version,
    };
  } catch (error) {
    console.error('Error al obtener datos de Supabase:', error);
    return null;
  }
}

/**
 * Obtiene todas las versiones de datos encriptados de un usuario desde Supabase
 * 
 * @param privyUserId - ID del usuario de Privy
 * @returns Array de versiones con datos de encriptación
 */
export async function getAllEncryptedDataFromSupabase(
  privyUserId: string
): Promise<Array<{ cid: string; aesKey: string; iv: string; tag: string; version: number; created_at?: string }>> {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase no está configurado. No se pueden obtener datos desde Supabase.');
      return [];
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    // 1. Obtener el ID del usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (userError || !user) {
      return [];
    }

    // 2. Obtener todas las versiones
    const { data: versions, error: versionsError } = await supabase
      .from('user_secure_data_versions')
      .select('cid, encrypted_aes_key, version, created_at')
      .eq('user_id', user.id)
      .order('version', { ascending: false });

    if (versionsError) {
      throw new Error(`Error al obtener datos de Supabase: ${versionsError.message}`);
    }

    if (!versions || versions.length === 0) {
      return [];
    }

    // 3. Parsear cada versión
    return versions.map((v) => {
      try {
        const encryptionKeyData: EncryptionKeyData = JSON.parse(v.encrypted_aes_key);
        return {
          cid: v.cid,
          aesKey: encryptionKeyData.aesKey,
          iv: encryptionKeyData.iv,
          tag: encryptionKeyData.tag,
          version: v.version,
          created_at: v.created_at,
        };
      } catch (parseError) {
        console.error('Error al parsear encrypted_aes_key:', parseError);
        return null;
      }
    }).filter((v): v is NonNullable<typeof v> => v !== null);
  } catch (error) {
    console.error('Error al obtener datos de Supabase:', error);
    return [];
  }
}

/**
 * Elimina una versión específica de Supabase
 * 
 * @param privyUserId - ID del usuario de Privy
 * @param versionId - ID del registro a eliminar
 */
export async function deleteEncryptedDataFromSupabase(
  privyUserId: string,
  versionId: number
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Verifica VITE_SUPABASE_ANON_KEY.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('No se pudo crear el cliente de Supabase.');
    }

    // 1. Obtener el ID del usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (userError || !user) {
      throw new Error('Usuario no encontrado');
    }

    // 2. Eliminar la versión (solo si pertenece al usuario)
    const { error } = await supabase
      .from('user_secure_data_versions')
      .delete()
      .eq('id', versionId)
      .eq('user_id', user.id); // Asegurar que solo el usuario puede eliminar sus propios datos

    if (error) {
      throw new Error(`Error al eliminar datos de Supabase: ${error.message}`);
    }
  } catch (error) {
    throw new Error(
      `Error al eliminar datos de Supabase: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

