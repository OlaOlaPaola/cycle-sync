import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivySafe } from '../hooks/usePrivySafe';
import TopHeader from '../components/TopHeader';
import BottomNav from '../components/BottomNav';
import { clearUserData } from '../utils/storage';
import { recoverUserData } from '../utils/secureStorage';
import styles from './Profile.module.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = usePrivySafe();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  // Obtener el Privy User ID
  const userId = user?.id || null;
  
  // Función auxiliar para obtener la inicial del user ID
  const getUserInitial = (): string => {
    if (!userId || typeof userId !== 'string') return 'U';
    // Tomar el primer carácter del ID y convertirlo a mayúscula
    return userId.charAt(0).toUpperCase();
  };

  // Función auxiliar para obtener un nombre de usuario del ID
  const getUsername = (): string => {
    if (!userId || typeof userId !== 'string') return 'Usuario';
    // Tomar los primeros 8 caracteres del ID para mostrar
    const shortId = userId.length > 8 ? `${userId.substring(0, 8)}...` : userId;
    return `User ${shortId}`;
  };

  const userInitial = getUserInitial();
  const username = getUsername();

  const handleLogout = async () => {
    try {
      // Limpiar datos locales
      clearUserData();
      // Hacer logout de Privy
      await logout();
      // Redirigir al login
      navigate('/');
    } catch (error) {
      console.error('Error al hacer logout:', error);
      // Aún así redirigir al login
      navigate('/');
    }
  };

  const handleRecoverData = async () => {
    if (!user?.id) {
      setRecoveryStatus('❌ No hay usuario autenticado');
      return;
    }

    setIsRecovering(true);
    setRecoveryStatus('🔄 Recuperando datos...');

    try {
      const recoveredData = await recoverUserData(user.id);
      
      if (recoveredData) {
        setRecoveryStatus('✅ Datos recuperados exitosamente. Revisa la consola para ver los detalles.');
      } else {
        setRecoveryStatus('⚠️ No se encontraron datos para recuperar.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setRecoveryStatus(`❌ Error: ${errorMessage}`);
      console.error('Error al recuperar datos:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className={styles.container}>
      <TopHeader />
      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            {userInitial}
          </div>
          <h2>{username}</h2>
          <p className={styles.email}>{userId || 'Demo Mode'}</p>
        </div>

        <div className={styles.section}>
          <h3>Settings</h3>
          <button className={styles.btn} onClick={() => navigate('/setup')}>
            Edit cycle & tasks
          </button>
        </div>

        <div className={styles.section}>
          <h3>Data Recovery</h3>
          <button 
            className={styles.btn} 
            onClick={handleRecoverData}
            disabled={isRecovering}
          >
            {isRecovering ? 'Recovering...' : 'Recover data from IPFS'}
          </button>
          {recoveryStatus && (
            <p className={styles.recoveryStatus}>{recoveryStatus}</p>
          )}
        </div>

        <div className={styles.section}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Clear data & restart
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
