function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceIdentity() {
  let deviceId = localStorage.getItem('rabis_device_id');
  if (!deviceId) {
    deviceId = createDeviceId();
    localStorage.setItem('rabis_device_id', deviceId);
  }
  let fingerprint = localStorage.getItem('rabis_device_fingerprint');
  if (!fingerprint) {
    const source = [navigator.userAgent, `${screen.width}x${screen.height}`, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone, deviceId].join('|');
    const bytes = new TextEncoder().encode(source);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    fingerprint = btoa(binary).replace(/=+$/, '').slice(0, 64);
    localStorage.setItem('rabis_device_fingerprint', fingerprint);
  }
  return { deviceId, fingerprint };
}
