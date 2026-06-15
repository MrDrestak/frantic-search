
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

const APP_ID = "181d9c5a-7cfd-4fc7-961e-b58799cd476e";

// Holds the initialized OneSignal instance received from the deferred callback
let _os: any = null;

export const oneSignalService = {
  isInitialized: false,

  init: async (): Promise<boolean> => {
    const hostname = window.location.hostname;
    const allowed =
      hostname === "frantic-search.vercel.app" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (!allowed) {
      console.warn(`OneSignal: skipped on domain ${hostname}`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "OneSignalSDKWorker.js",
            notifyButton: { enable: false },
            welcomeNotification: {
              title: "¡Bienvenido a Frantic Search!",
              message: "Recibirás alertas de trades, subastas y cartas de tu wishlist.",
              url: "https://frantic-search.vercel.app",
            },
          });
          _os = OneSignal;
          oneSignalService.isInitialized = true;
          console.log("OneSignal v16 initialized");
          resolve(true);
        } catch (e) {
          console.error("OneSignal init error:", e);
          resolve(false);
        }
      });
    });
  },

  login: async (userId: string): Promise<void> => {
    if (!_os || !userId) return;
    try {
      await _os.login(userId);
      console.log("OneSignal: user logged in", userId);
    } catch (e) {
      console.error("OneSignal login error:", e);
    }
  },

  logout: async (): Promise<void> => {
    if (!_os) return;
    try { await _os.logout(); } catch {}
  },

  checkStatus: async (): Promise<{ permission: string; optedIn: boolean; subscriptionId: string | null }> => {
    if (!_os) return { permission: Notification.permission, optedIn: false, subscriptionId: null };
    return {
      permission: Notification.permission,
      optedIn: _os.User.PushSubscription.optedIn ?? false,
      subscriptionId: _os.User.PushSubscription.id ?? null,
    };
  },

  requestPermission: async (): Promise<boolean> => {
    if (!_os) return false;
    try {
      await _os.Notifications.requestPermission();
      return _os.User.PushSubscription.optedIn ?? false;
    } catch (e) {
      console.error("OneSignal permission error:", e);
      return false;
    }
  },

  sendNotification: async (
    title: string,
    message: string,
    targetUserIds?: string[],
    url?: string,
  ): Promise<any> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ title, message, userIds: targetUserIds, url }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`send-notification ${response.status}: ${JSON.stringify(err)}`);
      }
      const data = await response.json();
      console.log("OneSignal push sent:", data);
      return data;
    } catch (error) {
      console.error("OneSignal send failed:", error);
      throw error;
    }
  },
};
