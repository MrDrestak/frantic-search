import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { title, message, userIds, url } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title and message required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      app_id: Deno.env.get("ONESIGNAL_APP_ID"),
      headings: { en: title },
      contents: { en: message },
      url: url || "https://frantic-search.vercel.app",
      priority: 10,
    };

    if (Array.isArray(userIds) && userIds.length > 0) {
      body.include_aliases = { external_id: userIds };
      body.target_channel = "push";
    } else {
      body.included_segments = ["Total Subscriptions"];
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Deno.env.get("ONESIGNAL_REST_KEY")}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
