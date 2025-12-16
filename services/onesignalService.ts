
// Native OneSignal Integration
declare global {
    interface Window {
        OneSignal: any;
    }
}

const APP_ID = "181d9c5a-7cfd-4fc7-961e-b58799cd476e";
// Updated Key provided by user
const REST_API_KEY = "os_v2_app_daozywt47vh4pfq6wwdzttkhny7nuawlmkkehqvtshtldyxplfcnqrpn4erbbxqr2mxvyglagogh6zn6zcgfixviffxrns7a3t7otvi";

export const oneSignalService = {
    init: async () => {
        // Initialize the command queue if the SDK hasn't loaded yet
        window.OneSignal = window.OneSignal || [];
        
        window.OneSignal.push(() => {
            window.OneSignal.init({
                appId: APP_ID,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: {
                    enable: false, // We will use custom UI in Profile
                },
            });
            console.log("OneSignal Initialized (Native)");
        });
    },

    login: async (userId: string) => {
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => {
            console.log("OneSignal: Logging in as", userId);
            window.OneSignal.login(userId);
            // Explicitly tag to ensure immediate segmentation availability
            window.OneSignal.User.addTag("firebase_uid", userId);
        });
    },

    logout: async () => {
        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => {
            window.OneSignal.logout();
        });
    },

    // NEW: Check if notifications are enabled
    checkStatus: async (): Promise<{ permission: string, optedIn: boolean, subscriptionId: string | null }> => {
        return new Promise((resolve) => {
            window.OneSignal = window.OneSignal || [];
            window.OneSignal.push(async () => {
                const permission = Notification.permission; // 'default', 'denied', 'granted'
                const optedIn = window.OneSignal.User.PushSubscription.optedIn;
                const subscriptionId = window.OneSignal.User.PushSubscription.id;
                resolve({ permission, optedIn, subscriptionId });
            });
        });
    },

    // NEW: Manually Trigger Prompt
    requestPermission: async (): Promise<boolean> => {
        return new Promise((resolve) => {
            window.OneSignal = window.OneSignal || [];
            window.OneSignal.push(async () => {
                await window.OneSignal.Slidedown.promptPush();
                // Alternatively use native:
                // await Notification.requestPermission();
                resolve(window.OneSignal.User.PushSubscription.optedIn);
            });
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
            url: url || "https://frantic-search.vercel.app/",
            
            // ANDROID WAKE UP SETTINGS
            priority: 10, // High priority
            // android_channel_id removed to prevent 400 errors
            android_visibility: 1, // Public (show on lock screen)
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
            // Switched to corsproxy.io which is generally more stable than thingproxy.
            // Using encodeURIComponent ensures the target URL is passed correctly.
            const targetUrl = "https://onesignal.com/api/v1/notifications";
            const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);
            
            console.log("Sending Notification Body:", JSON.stringify(body));

            const response = await fetch(proxyUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // 403 usually means Key is invalid or Proxy stripped the header
                if (response.status === 403) {
                    console.error("Access Denied: Please check if your REST_API_KEY is correct.");
                }
                throw new Error(`OneSignal API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            
            // CRITICAL CHECK: Did OneSignal actually find the user?
            if (data.recipients === 0) {
                console.warn("OneSignal Response:", data);
                if (data.errors && data.errors.length > 0) {
                     // If explicit errors exist
                     throw new Error(`OneSignal Error: ${JSON.stringify(data.errors)}`);
                }
                // Recipients 0 means valid request but no matching user found
                throw new Error("Notification sent, but 0 recipients found. The user likely has not clicked 'Allow' on notifications yet, or the ID mapping hasn't synced.");
            }

            console.log("OneSignal Success:", data);
            return data;
        } catch (error) {
            console.error("Failed to send OneSignal notification", error);
            throw error;
        }
    }
};
