// Service Worker for ChoreTracker push notifications

self.addEventListener("push", (event) => {
    let data = { title: "ChoreTracker", body: "You have chores to do!" };
    try {
        data = event.data.json();
    } catch (e) {
        // fallback to default
    }

    event.waitUntil(
        self.registration.showNotification(data.title || "ChoreTracker", {
            body: data.body || "Time to check your chores!",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: data.tag || "chore-reminder",
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
