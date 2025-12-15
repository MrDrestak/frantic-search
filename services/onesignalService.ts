
import OneSignal from 'react-onesignal';

const APP_ID = "181d9c5a-7cfd-4fc7-961e-b58799cd476e";
const REST_API_KEY = "77jtdhkfgegxeg5hyrq4tknyn"; // Note: In a production environment, this should be behind a secure backend proxy.

export const oneSignalService = {
    init: async () => {
        try {
            await OneSignal.init({
                appId: APP_ID,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: {
                    enable: true,
                },
            });
            console.log("OneSignal Initialized");
        } catch (error) {
            console.error("OneSignal Init Error:", error);
        }
    },

    login: async (userId: string) => {
        try {
            // Associates the device with the Firebase UID
            await OneSignal.login(userId);
        } catch (error) {
            console.error("OneSignal Login Error:", error);
        }
    },

    logout: async () => {
        try {
            await OneSignal.logout();
        } catch (error) {
            console.error("OneSignal Logout Error:", error);
        }
    },

    // Send a notification via REST API (Admin or System Triggered)
    // We use 'include_aliases' with 'external_id' to target specific Firebase UIDs
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
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to send OneSignal notification", error);
            throw error;
        }
    }
};
