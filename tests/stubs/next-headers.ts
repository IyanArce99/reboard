// Stub de next/headers para tests de integración (sin petición: sin cookies ni cabeceras).
export const cookies = async () => ({ getAll: () => [], get: () => undefined, set: () => {} });
export const headers = async () => new Headers();
