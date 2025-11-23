/**
 * Módulo para subir archivos cifrados a IPFS usando Pinata
 * 
 * Este módulo se encarga exclusivamente de subir datos cifrados a IPFS
 * mediante el servicio Pinata.
 */

export interface IPFSUploadInput {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

export interface IPFSUploadResult {
  cid: string;
  size: number; // tamaño en bytes
}

/**
 * Configuración de Pinata desde variables de entorno
 * Prioridad: JWT (recomendado) > API Key + Secret Key
 */
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT?.trim() || '';
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY?.trim() || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY?.trim() || '';

/**
 * Sube un archivo JSON cifrado a IPFS usando Pinata
 * 
 * @param input - Objeto con ciphertext, iv y tag en base64
 * @returns Objeto con CID y tamaño del archivo
 */
export async function uploadToIPFS(
  input: IPFSUploadInput
): Promise<IPFSUploadResult> {
  try {
    // 1. Crear el objeto JSON con los datos cifrados
    const encryptedData = {
      ciphertext: input.ciphertext,
      iv: input.iv,
      tag: input.tag,
    };

    // 2. Convertir a JSON string
    const jsonString = JSON.stringify(encryptedData);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });

    // 3. Preparar FormData para la petición
    const formData = new FormData();
    formData.append('file', jsonBlob, 'encrypted-data.json');
    
    // Agregar opciones de Pinata
    formData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
    }));

    // 4. Configurar headers según el método de autenticación
    // Nota: No establecemos Content-Type, el navegador lo hace automáticamente para FormData
    const headers: HeadersInit = {};

    // Priorizar JWT (método recomendado y más seguro)
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      // Fallback a API Key + Secret Key (método legacy)
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
    } else {
      throw new Error(
        'Pinata credentials not configured. ' +
        'Set VITE_PINATA_JWT (recomendado) or VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY'
      );
    }

    // 5. Subir a Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // 6. Retornar CID y tamaño
    return {
      cid: result.IpfsHash || result.cid || '',
      size: result.PinSize || result.size || jsonBlob.size,
    };
  } catch (error) {
    throw new Error(
      `Error al subir a IPFS: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

