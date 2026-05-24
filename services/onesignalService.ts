// Native OneSignal Integration — preserved as-is from pre-migration codebase.
// TODO: move APP_ID and REST_API_KEY to env vars before going to production.
declare global {
    interface Window {
        OneSignal: any;
    }
}

const APP_ID = "181d9c5a-7cfd-4fc7-961e-b58799cd476e";
const REST_API_KEY = "os_v2_app_daozywt47vh4pfq6wwdzttkhny7nuawlmkkehqvtshtldyxplfcnqrpn4erbbxqr2mxvyglagogh6zn6zcgfixviffxrns7a3t7otvi";

export const oneSignalService = {
    isInitialized: false,
    init: async () => {
        window.OneSignal = window.OneSignal || [];

        const allowedDomain = "frantic-search.vercel.app";
        const isAllowedDomain = window.location.hostname === allowedDomain;
        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

        if (!isAllowedDomain && !isLocalhost) {
            console.warn(`OneSignal: skipped on ${window.location.hostname}`);
            return false;
        }

        return new Promise((resolve) => {
            window.OneSignal.push(() => {
                window.OneSignal.init({
                    appId: APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerParam: { scope: "/" },
                    serviceWorkerPath: "OneSignalSDKWorker.js",
                    notifyButton: { enable: false },
                }).then(() => {
                    oneSignalService.isInitialized = true;
                    resolve(true);
                }).catch((e: unknown) => {
                    console.error("OneSignal Init Error:", e);
                    resolve(false);
                });
            });
        });
    },

    login: async (userId: string) => {
        if (!userId || !oneSignalService.isInitialized) return;
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(async () => {
            try {
                await window.OneSignal.login(userId);
                await window.OneSignal.User.addTag("user_id", userId);
            } catch (e) {
                console.error("OneSignal Login Error:", e);
            }
        });
    },

    logout: async () => {
        if (!oneSignalService.isInitialized) return;
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => { window.OneSignal.logout(); });
    },

    checkStatus: async (): Promise<{ permission: string; optedIn: boolean; subscriptionId: string | null }> => {
        if (!oneSignalService.isInitialized) {
            return { permission: "default", optedIn: false, subscriptionId: null };
        }
        return new Promise((resolve) => {
            window.OneSignal = window.OneSignal || [];
            window.OneSignal.push(() => {
                const permission = Notification.permission;
                const pushSubscription = window.OneSignal.User.PushSubscription;
                resolve({ permission, optedIn: pushSubscription?.optedIn || false, subscriptionId: pushSubscription?.id || null });
            });
        });
    },

    requestPermission: async (): Promise<boolean> => {
        if (!oneSignalService.isInitialized) return false;
        return new Promise((resolve) => {
            window.OneSignal = window.OneSignal || [];
            window.OneSignal.push(async () => {
                try {
                    await window.OneSignal.Notifications.requestPermission();
                    resolve(window.OneSignal.User.PushSubscription.optedIn);
                } catch (e) {
                    console.error("Permission Request Error:", e);
                    resolve(false);
                }
            });
        });
    },

    sendNotification: async (title: string, message: string, targetUserIds?: string[], url?: string) => {
        const body: Record<string, unknown> = {
            app_id: APP_ID,
            headings: { en: title },
            contents: { en: message },
            url: url || window.location.origin,
            priority: 10,
        };

        if (targetUserIds?.length) {
            body.include_aliases = { external_id: targetUserIds };
            body.target_channel = "push";
        } else {
            body.included_segments = ["Total Subscriptions"];
        }

        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://onesignal.com/api/v1/notifications");
        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Basic ${REST_API_KEY}` },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`OneSignal ${response.status}`);
        return response.json();
    },
};
