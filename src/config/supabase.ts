/**
 * Configuración de Supabase
 * 
 * IMPORTANTE: Necesitas configurar las siguientes variables de entorno:
 * - VITE_SUPABASE_URL: URL de tu proyecto Supabase
 * - VITE_SUPABASE_ANON_KEY: Clave anónima de Supabase
 * 
 * Puedes obtenerlas desde el dashboard de Supabase: https://supabase.com/dashboard
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL de Supabase desde variables de entorno

// Clave anónima desde variables de entorno
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

/**
 * Cliente de Supabase
 * Se crea una instancia única que se reutiliza en toda la aplicación
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Obtiene o crea el cliente de Supabase
 * 
 * @returns Cliente de Supabase configurado o null si no está configurado
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // No mostrar warning si no está configurado, es opcional
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (error) {
      console.error('Error al crear cliente de Supabase:', error);
      return null;
    }
  }

  return supabaseClient;
}

/**
 * Verifica si Supabase está configurado correctamente
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
}

