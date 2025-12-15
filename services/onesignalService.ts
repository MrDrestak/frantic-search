
// Native OneSignal Integration
declare global {
    interface Window {
        OneSignal: any;
    }
}

const APP_ID = "181d9c5a-7cfd-4fc7-961e-b58799cd476e";
const REST_API_KEY = "77jtdhkfgegxeg5hyrq4tknyn";

export const oneSignalService = {
    init: async () => {
        // Initialize the command queue if the SDK hasn't loaded yet
        window.OneSignal = window.OneSignal || [];
        
        window.OneSignal.push(() => {
            window.OneSignal.init({
                appId: APP_ID,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: {
                    enable: true,
                },
            });
            console.log("OneSignal Initialized (Native)");
        });
    },

    login: async (userId: string) => {
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => {
            window.OneSignal.login(userId);
        });
    },

    logout: async () => {
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => {
            window.OneSignal.logout();
        });
    },

    // Send a notification via REST API (Admin or System Triggered)
    sendNotification: async (
        title: string, 
        message: string, 
        targetUserIds?: string[], // If null/empty, sends to ALL subscribed users
        url?: string
    ) => {
        const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Basic ${REST_API_KEY}`
        };

        const body: any = {
            app_id: APP_ID,
            headings: { en: title },
            contents: { en: message },
            url: url || "https://frantic-search.vercel.app/" // Default to home
        };

        if (targetUserIds && targetUserIds.length > 0) {
            // Target specific users by their Firebase UID (External ID)
            body.include_aliases = {
                external_id: targetUserIds
            };
            body.target_channel = "push";
        } else {
            // Target everyone
            body.included_segments = ["Total Subscriptions"];
        }

        try {
            // FIX: Use corsproxy.io to bypass browser CORS restrictions.
            // Note: In a production environment, this request should be made from a secure backend server.
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = "https://onesignal.com/api/v1/notifications";
            
            const response = await fetch(proxyUrl + targetUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OneSignal API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to send OneSignal notification", error);
            throw error;
        }
    }
};
