/**
 * Módulo de almacenamiento seguro usando encriptación + IPFS
 * 
 * Este módulo integra la encriptación y el almacenamiento en IPFS
 * para guardar datos del usuario de forma segura.
 */

import { UserData } from '../types';
import { encryptUserData, EncryptionInput, EncryptionResult } from './encryption';
import { uploadToIPFS, IPFSUploadInput, fetchFromIPFS } from './ipfs';
import { logEncryptionData, validateEncryptionData, analyzeUserDataFields } from './debugEncryption';
import {
  saveEncryptedDataToSupabase,
  updateEncryptedDataInSupabase,
  getEncryptedDataFromSupabase,
} from './supabaseStorage';
import { isSupabaseConfigured } from '../config/supabase';
import { decryptUserData, DecryptionResult } from './decryption';

/**
 * Interfaz para el resultado del guardado seguro
 */
export interface SecureStorageResult {
  cid: string;
  size: number;
  aesKey: string; // Esta debe ser cifrada por el backend antes de guardarse
  iv: string; // IV en base64
  tag: string; // Tag de autenticación en base64
  supabaseId?: string; // ID del registro en Supabase (si se guardó)
}

/**
 * Interfaz para los metadatos que se guardan localmente o en backend
 */
export interface UserIPFSMetadata {
  userId: string;
  ipfsCid: string;
  aesKeyEncrypted?: string; // Clave AES cifrada (solo si se guarda en backend)
  size: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Guarda los datos del usuario de forma segura usando encriptación + IPFS
 * 
 * @param userId - ID del usuario (Privy User ID)
 * @param userData - Datos del usuario a guardar
 * @param aiPrompt - Prompt completo para el agente de IA
 * @returns Resultado con CID, tamaño y clave AES
 */
export async function saveUserDataSecurely(
  userId: string,
  userData: UserData,
  aiPrompt: string,
  debug: boolean = false
): Promise<SecureStorageResult> {
  try {
    // 0. Validar y mostrar datos (solo si debug está activado)
    if (debug) {
      const validation = validateEncryptionData(userData, aiPrompt);
      if (!validation.valid) {
        console.warn('⚠️ Errores de validación:', validation.errors);
      }
      analyzeUserDataFields(userData);
      logEncryptionData({ userId, userData, aiPrompt });
    }

    // 1. Encriptar los datos
    const encryptionInput: EncryptionInput = {
      userId,
      userData,
      aiPrompt,
    };

    const encrypted: EncryptionResult = await encryptUserData(encryptionInput);

    // 2. Subir a IPFS (solo datos cifrados, sin la clave)
    const ipfsInput: IPFSUploadInput = {
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag,
    };

    const ipfsResult = await uploadToIPFS(ipfsInput);

    // 3. Retornar resultado (incluyendo iv y tag para Supabase)
    return {
      cid: ipfsResult.cid,
      size: ipfsResult.size,
      aesKey: encrypted.aesKey, // ⚠️ Esta clave debe ser cifrada por el backend
      iv: encrypted.iv,
      tag: encrypted.tag,
    };
  } catch (error) {
    throw new Error(
      `Error al guardar datos de forma segura: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Guarda los metadatos del CID en localStorage (solo para desarrollo)
 * En producción, esto debe ir al backend
 * 
 * @param userId - ID del usuario
 * @param cid - CID de IPFS
 * @param size - Tamaño del archivo
 */
export function saveIPFSMetadataLocally(
  userId: string,
  cid: string,
  size: number
): void {
  try {
    const metadata: UserIPFSMetadata = {
      userId,
      ipfsCid: cid,
      size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Guardar en localStorage con clave única por usuario
    const storageKey = `ipfs-metadata-${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error al guardar metadatos de IPFS:', error);
  }
}

/**
 * Obtiene los metadatos de IPFS desde localStorage
 * 
 * @param userId - ID del usuario
 * @returns Metadatos de IPFS o null si no existen
 */
export function getIPFSMetadataLocally(userId: string): UserIPFSMetadata | null {
  try {
    const storageKey = `ipfs-metadata-${userId}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error al obtener metadatos de IPFS:', error);
    return null;
  }
}

/**
 * Función completa que guarda datos y metadatos
 * 
 * @param userId - ID del usuario
 * @param userData - Datos del usuario
 * @param aiPrompt - Prompt para IA
 * @param saveMetadata - Si true, guarda metadatos en localStorage (default: true)
 * @param saveToSupabase - Si true, guarda metadatos en Supabase (default: true)
 * @returns Resultado con CID, tamaño y datos de encriptación
 */
export async function saveUserDataComplete(
  userId: string,
  userData: UserData,
  aiPrompt: string,
  saveMetadata: boolean = true,
  saveToSupabase: boolean = true
): Promise<SecureStorageResult> {
  // 1. Guardar datos de forma segura (encriptar + subir a IPFS)
  const result = await saveUserDataSecurely(userId, userData, aiPrompt);

  // 2. Guardar metadatos localmente (si se solicita)
  if (saveMetadata) {
    saveIPFSMetadataLocally(userId, result.cid, result.size);
  }

  // 3. Guardar metadatos en Supabase (si está configurado y se solicita)
  if (saveToSupabase && isSupabaseConfigured()) {
    try {
      const supabaseResult = await updateEncryptedDataInSupabase(
        userId, // privyUserId
        result.cid,
        result.aesKey,
        result.iv,
        result.tag
      );
      return {
        ...result,
        supabaseId: supabaseResult.id.toString(),
      };
    } catch (error) {
      console.error('⚠️ Error al guardar en Supabase (continuando con localStorage):', error);
      // Continuar sin fallar si Supabase falla
    }
  }

  return result;
}

/**
 * Obtiene los metadatos de IPFS desde Supabase o localStorage
 * 
 * @param userId - ID del usuario (Privy User ID)
 * @param preferSupabase - Si true, intenta obtener de Supabase primero (default: true)
 * @returns Metadatos de IPFS o null si no existen
 */
export async function getIPFSMetadata(
  userId: string,
  preferSupabase: boolean = true
): Promise<UserIPFSMetadata | null> {
  // Intentar obtener de Supabase primero si está configurado
  if (preferSupabase && isSupabaseConfigured()) {
    try {
      const supabaseData = await getEncryptedDataFromSupabase(userId);
      if (supabaseData) {
        return {
          userId: userId,
          ipfsCid: supabaseData.cid,
          size: 0, // El schema no tiene size, usar 0 como placeholder
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener de Supabase, intentando localStorage:', error);
    }
  }

  // Fallback a localStorage
  return getIPFSMetadataLocally(userId);
}

/**
 * Interfaz para el resultado de la recuperación de datos
 */
export interface RecoveredDataResult {
  userData: UserData;
  aiPrompt: string;
  cid: string;
  version: number;
}

/**
 * Recupera y desencripta los datos del usuario desde Supabase e IPFS
 * 
 * Flujo completo:
 * 1. Obtiene metadatos de Supabase (cid, aesKey, iv, tag)
 * 2. Obtiene datos encriptados desde IPFS usando el CID
 * 3. Desencripta los datos usando los tres valores
 * 4. Retorna los datos desencriptados
 * 
 * @param privyUserId - ID del usuario (Privy User ID)
 * @returns Datos desencriptados (userData y aiPrompt) o null si no se encuentran
 */
export async function recoverUserData(
  privyUserId: string
): Promise<RecoveredDataResult | null> {
  try {
    // 1. Validar que Supabase esté configurado
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase no está configurado. No se pueden recuperar datos desde Supabase.');
      return null;
    }

    // 2. Obtener metadatos de Supabase (cid, aesKey, iv, tag)
    const metadata = await getEncryptedDataFromSupabase(privyUserId);
    
    if (!metadata) {
      console.warn('⚠️ No se encontraron metadatos en Supabase para el usuario:', privyUserId);
      return null;
    }

    console.log('📦 Metadatos obtenidos de Supabase:', {
      cid: metadata.cid,
      version: metadata.version,
      hasAesKey: !!metadata.aesKey,
      hasIv: !!metadata.iv,
      hasTag: !!metadata.tag,
    });

    // 3. Obtener datos encriptados desde IPFS usando el CID
    console.log('🌐 Obteniendo datos desde IPFS con CID:', metadata.cid);
    const ipfsData = await fetchFromIPFS(metadata.cid);
    
    console.log('✅ Datos obtenidos de IPFS:', {
      hasCiphertext: !!ipfsData.ciphertext,
      hasIv: !!ipfsData.iv,
      hasTag: !!ipfsData.tag,
    });

    // 4. Desencriptar los datos usando los tres valores
    console.log('🔓 Desencriptando datos...');
    const decryptedData: DecryptionResult = await decryptUserData({
      ciphertext: ipfsData.ciphertext, // Desde IPFS
      aesKey: metadata.aesKey,         // Desde Supabase
      iv: metadata.iv,                 // Desde Supabase
      tag: metadata.tag,               // Desde Supabase
    });

    // 5. Log de los datos recuperados
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RECOVERED DATA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User Data:', JSON.stringify(decryptedData.userData, null, 2));
    console.log('AI Prompt:', decryptedData.aiPrompt);
    console.log('CID:', metadata.cid);
    console.log('Version:', metadata.version);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 6. Retornar los datos desencriptados
    return {
      userData: decryptedData.userData as UserData,
      aiPrompt: decryptedData.aiPrompt,
      cid: metadata.cid,
      version: metadata.version,
    };
  } catch (error) {
    console.error('❌ Error al recuperar datos del usuario:', error);
    throw new Error(
      `Error al recuperar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

