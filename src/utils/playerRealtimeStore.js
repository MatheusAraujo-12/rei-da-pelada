import { doc, onSnapshot } from 'firebase/firestore';

const subscriberRegistry = new Map();

const getEntry = (playerId) => subscriberRegistry.get(playerId);

export const getCachedGlobalPlayer = (playerId) => subscriberRegistry.get(playerId)?.data || null;

export const subscribeToGlobalPlayer = ({ db, playerId, onChange }) => {
  if (!db || !playerId || typeof onChange !== 'function') return () => {};

  let entry = subscriberRegistry.get(playerId);
  if (!entry) {
    const callbacks = new Set();
    const playerRef = doc(db, 'players', playerId);
    const unsubscribe = onSnapshot(playerRef, (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      const currentEntry = subscriberRegistry.get(playerId);
      if (!currentEntry) return;
      currentEntry.data = data;
      currentEntry.callbacks.forEach((callback) => {
        try { callback(data); } catch (error) { console.error('Erro em callback de playerRealtimeStore:', error); }
      });
    }, (error) => {
      console.error('Falha no listener do perfil global:', error);
    });

    entry = { callbacks, unsubscribe, data: null };
    subscriberRegistry.set(playerId, entry);
  }

  entry.callbacks.add(onChange);
  if (entry.data) {
    try { onChange(entry.data); } catch (error) { console.error('Erro em callback inicial de playerRealtimeStore:', error); }
  }

  return () => {
    const currentEntry = getEntry(playerId);
    if (!currentEntry) return;
    currentEntry.callbacks.delete(onChange);
    if (currentEntry.callbacks.size === 0) {
      currentEntry.unsubscribe();
      subscriberRegistry.delete(playerId);
    }
  };
};
