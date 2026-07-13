export type GpsCoords = { lat: number; lng: number };

export function getCurrentPosition(timeoutMs = 12000): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS לא נתמך בדפדפן"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("לא ניתן לקבל מיקום GPS")),
      { enableHighAccuracy: true, timeout: timeoutMs }
    );
  });
}

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
