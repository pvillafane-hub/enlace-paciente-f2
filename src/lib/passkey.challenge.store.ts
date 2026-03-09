const store = new Map<string, string>();

export const passkeyChallenges = {
  set(userId: string, challenge: string) {
    store.set(userId, challenge);
  },

  get(userId: string) {
    return store.get(userId);
  },

  delete(userId: string) {
    store.delete(userId);
  },
};
