/**
 * Módulo de desencriptación AES-256-GCM
 * 
 * Este módulo demuestra cómo desencriptar datos que fueron encriptados
 * y almacenados en IPFS (Pinata), usando los metadatos de Supabase.
 */

export interface DecryptionInput {
  ciphertext: string; // base64 - desde IPFS
  iv: string; // base64 - desde Supabase
  tag: string; // base64 - desde Supabase
  aesKey: string; // base64 - desde Supabase
}

export interface DecryptionResult {
  userData: Record<string, unknown>;
  aiPrompt: string;
}

/**
 * Convierte un string base64 a ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convierte un ArrayBuffer a string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

/**
 * Importa una clave AES desde un ArrayBuffer
 */
async function importAESKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // no extractable
    ['decrypt']
  );
}

/**
 * Desencripta datos usando AES-256-GCM
 * 
 * ⚠️ IMPORTANTE: Necesitas los TRES valores (aesKey, iv, tag) para desencriptar
 * 
 * @param input - Objeto con ciphertext, iv, tag y aesKey (todos en base64)
 * @returns Datos desencriptados (userData y aiPrompt)
 */
export async function decryptUserData(
  input: DecryptionInput
): Promise<DecryptionResult> {
  try {
    // 1. Convertir todos los valores de base64 a ArrayBuffer
    const keyData = base64ToArrayBuffer(input.aesKey);
    const ivData = base64ToArrayBuffer(input.iv);
    const tagData = base64ToArrayBuffer(input.tag);
    const ciphertextData = base64ToArrayBuffer(input.ciphertext);

    // 2. Combinar ciphertext y tag (GCM requiere que estén juntos)
    const combinedLength = ciphertextData.byteLength + tagData.byteLength;
    const combinedData = new Uint8Array(combinedLength);
    combinedData.set(new Uint8Array(ciphertextData), 0);
    combinedData.set(new Uint8Array(tagData), ciphertextData.byteLength);

    // 3. Importar la clave AES
    const key = await importAESKey(keyData);

    // 4. Desencriptar usando AES-256-GCM
    // ⚠️ NECESITAS iv y tag para desencriptar
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData, // ← NECESARIO
        tagLength: 128, // 128 bits = 16 bytes
      },
      key, // ← Reconstruido desde aesKey
      combinedData.buffer // ← ciphertext + tag combinados
    );

    // 5. Convertir ArrayBuffer a string JSON
    const decryptedString = arrayBufferToString(decryptedData);
    const decryptedObject = JSON.parse(decryptedString);

    return {
      userData: decryptedObject.userData,
      aiPrompt: decryptedObject.aiPrompt,
    };
  } catch (error) {
    throw new Error(
      `Error al desencriptar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Ejemplo de uso completo:
 * 
 * 1. Obtener metadatos de Supabase
 * 2. Obtener ciphertext de IPFS usando el CID
 * 3. Desencriptar con los tres valores
 * 
 * ```typescript
 * // Obtener de Supabase
 * const metadata = await getEncryptedDataFromSupabase(privyUserId);
 * 
 * // Obtener de IPFS (necesitarías implementar fetchFromIPFS)
 * const ipfsData = await fetchFromIPFS(metadata.cid);
 * 
 * // Desencriptar
 * const decrypted = await decryptUserData({
 *   ciphertext: ipfsData.ciphertext, // Desde IPFS
 *   aesKey: metadata.aesKey,         // Desde Supabase
 *   iv: metadata.iv,                 // Desde Supabase
 *   tag: metadata.tag,               // Desde Supabase
 * });
 * ```
 */

