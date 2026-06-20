self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pusty event listener (nie robimy żadnego cache, by aplikacja zawsze korzystała z sieci)
  // Przeglądarki wymagają zarejestrowanego fetch listenera, aby uznać aplikację za PWA
});
