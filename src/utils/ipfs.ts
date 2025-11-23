/**
 * Módulo para subir archivos cifrados a IPFS usando Pinata
 * 
 * Este módulo se encarga exclusivamente de subir datos cifrados a IPFS
 * mediante el servicio Pinata usando el SDK oficial.
 * 
 * NOTA: El import de Pinata se hace dinámicamente para evitar errores de carga.
 */

// Variable para almacenar el SDK de Pinata (se carga dinámicamente)
// Usamos 'any' para evitar que TypeScript intente resolver el módulo al evaluar el tipo
let PinataSDKClass: any = null;

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
 * Se usa JWT (método recomendado)
 */
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT?.trim() || '';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY?.trim() || '';

/**
 * Interfaz para los datos encriptados obtenidos desde IPFS
 */
export interface IPFSEncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

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
    // 1. Validar que el JWT esté configurado
    if (!PINATA_JWT) {
      throw new Error(
        'Pinata JWT not configured. Set VITE_PINATA_JWT in your environment variables.'
      );
    }

    // 2. Cargar PinataSDK dinámicamente si no está cargado
    // Usamos una cadena literal para el import para evitar análisis estático
    if (!PinataSDKClass) {
      try {
        // Import dinámico usando string literal para evitar análisis estático de Vite
        const pinataModule = await import(/* @vite-ignore */ 'pinata');
        PinataSDKClass = pinataModule.PinataSDK;
      } catch (importError) {
        throw new Error(
          `Failed to load Pinata SDK: ${importError instanceof Error ? importError.message : 'Unknown error'}. Make sure the 'pinata' package is installed.`
        );
      }
    }

    // Verificar que PinataSDK se cargó correctamente
    if (!PinataSDKClass) {
      throw new Error('Failed to load Pinata SDK');
    }

    // 3. Crear el objeto JSON con los datos cifrados
    const encryptedData = {
      ciphertext: input.ciphertext,
      iv: input.iv,
      tag: input.tag,
    };

    // 4. Convertir a JSON string y crear Blob
    const jsonString = JSON.stringify(encryptedData);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });

    // 5. Inicializar el SDK de Pinata
    const pinata = new PinataSDKClass({
      pinataJwt: PINATA_JWT,
      ...(PINATA_GATEWAY && { pinataGateway: PINATA_GATEWAY }),
    });

    // 6. Crear un File desde el Blob para el SDK
    const file = new File([jsonBlob], 'encrypted-data.json', {
      type: 'application/json',
    });

    // 7. Subir a Pinata usando el SDK (subida pública)
    const result = await pinata.upload.public.file(file);

    // 8. Retornar CID y tamaño
    return {
      cid: result.cid || '',
      size: result.size || jsonBlob.size,
    };
  } catch (error) {
    throw new Error(
      `Error al subir a IPFS: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Obtiene datos encriptados desde IPFS usando el CID
 * 
 * @param cid - Content Identifier (CID) del archivo en IPFS
 * @returns Datos encriptados (ciphertext, iv, tag)
 */
export async function fetchFromIPFS(
  cid: string
): Promise<IPFSEncryptedData> {
  try {
    // 1. Construir la URL del gateway
    // Intentar usar el gateway de Pinata si está configurado, sino usar el público
    const gatewayUrl = PINATA_GATEWAY 
      ? `${PINATA_GATEWAY.replace(/\/$/, '')}/${cid}`
      : `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    // 2. Hacer fetch del archivo desde IPFS
    const response = await fetch(gatewayUrl);
    
    if (!response.ok) {
      // Si falla con el gateway de Pinata, intentar con el gateway público de IPFS
      if (gatewayUrl.includes('pinata.cloud')) {
        const publicGatewayUrl = `https://ipfs.io/ipfs/${cid}`;
        const publicResponse = await fetch(publicGatewayUrl);
        
        if (!publicResponse.ok) {
          throw new Error(
            `Error al obtener datos de IPFS: HTTP ${publicResponse.status} - ${publicResponse.statusText}`
          );
        }
        
        const publicData = await publicResponse.json();
        return {
          ciphertext: publicData.ciphertext,
          iv: publicData.iv,
          tag: publicData.tag,
        };
      }
      
      throw new Error(
        `Error al obtener datos de IPFS: HTTP ${response.status} - ${response.statusText}`
      );
    }
    
    // 3. Parsear el JSON
    const data = await response.json();
    
    // 4. Validar que tenga los campos necesarios
    if (!data.ciphertext || !data.iv || !data.tag) {
      throw new Error(
        'Los datos obtenidos de IPFS no tienen el formato esperado (faltan ciphertext, iv o tag)'
      );
    }
    
    return {
      ciphertext: data.ciphertext,
      iv: data.iv,
      tag: data.tag,
    };
  } catch (error) {
    throw new Error(
      `Error al obtener datos de IPFS: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

