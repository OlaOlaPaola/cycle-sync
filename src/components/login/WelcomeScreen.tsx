import { useState } from 'react';
import { usePrivySafe } from '../../hooks/usePrivySafe';
import { useDemoAuth } from '../../contexts/DemoAuthContext';
import { useLoginWithOAuth } from '@privy-io/react-auth';
import { PRIVY_APP_ID } from '../../config/privy';
import styles from './WelcomeScreen.module.css';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onAlreadyHaveAccount: () => void;
  onBypass: () => void;
}

const WelcomeScreen = ({ onGetStarted, onAlreadyHaveAccount, onBypass }: WelcomeScreenProps) => {
  const { ready, authenticated } = usePrivySafe();
  const { timeRemaining } = useDemoAuth();
  const hasPrivy = PRIVY_APP_ID && PRIVY_APP_ID.trim() !== '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Usar hook específico de Privy v3 para OAuth
  const { initOAuth } = useLoginWithOAuth();
  
  const formatTime = (ms: number | null) => {
    if (!ms) return '';
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const handleGoogleLogin = async () => {
    if (!hasPrivy) {
      console.warn('⚠️ Modo demo: El login no está disponible sin Privy App ID');
      alert('Modo demo: Para usar el login, configura VITE_PRIVY_APP_ID en tu archivo .env');
      return;
    }
    
    if (!ready) {
      setError('Privy aún no está listo. Por favor, espera un momento e intenta de nuevo.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Verificar que initOAuth esté disponible
      if (!initOAuth) {
        throw new Error('OAuth no está disponible. Verifica la configuración en Privy Dashboard.');
      }
      
      // initOAuth redirige al usuario a la página de OAuth de Google
      // El flujo se completa automáticamente cuando el usuario autoriza
      await initOAuth({ provider: 'google' });
    } catch (error: any) {
      console.error('Error en login con Google:', error);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al iniciar sesión con Google.';
      
      if (error?.message) {
        if (error.message.includes('not allowed') || error.message.includes('not enabled')) {
          errorMessage = 'Login con Google no está habilitado. Por favor, configura Google OAuth en el Privy Dashboard.';
        } else if (error.message.includes('not configured')) {
          errorMessage = 'Google OAuth no está configurado. Por favor, configura las credenciales en el Privy Dashboard.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
    // Nota: No establecemos loading a false aquí porque el usuario será redirigido
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src="/cyra-logo.png" alt="Cyra Logo" className={styles.logoImage} />
        </div>
        <h1 className={styles.title}>Welcome to Cyra!</h1>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.illustration}>
          <div className={styles.illustrationBg}>
            <div className={styles.plan4herText}>
              <span className={styles.planText}>PLAN</span>
              <span className={styles.forherText}>CYRA</span>
            </div>
            <div className={styles.decorativeElements}>
              <div className={`${styles.shell} ${styles.shell1}`}></div>
              <div className={`${styles.shell} ${styles.shell2}`}></div>
              <div className={`${styles.shell} ${styles.shell3}`}></div>
            </div>
          </div>
        </div>

        <div className={styles.description}>
          <p>
            Plan your life in sync with your cycle. With AI, Cyra helps you organize tasks and routines in harmony with your hormonal cycle, so you can work, rest, and live at your best.
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            margin: '12px 0', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div className={styles.ctaButtons}>
          <button className={styles.btnPrimary} onClick={onGetStarted} disabled={loading}>
            Get Started
          </button>
          <button 
            className={styles.btnSecondary} 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span className={styles.googleIcon}>G</span>
            {loading ? 'Conectando...' : 'Already Have Account?'}
          </button>
        </div>

        {/* Botón de bypass para desarrollo */}
        <div className={styles.bypassContainer}>
          <button className={styles.bypassBtn} onClick={onBypass} title="Bypass login para desarrollo">
            🚀 Bypass Login (Dev)
          </button>
          {timeRemaining !== null && (
            <span className={styles.bypassTime}>
              Tiempo restante: {formatTime(timeRemaining)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;

