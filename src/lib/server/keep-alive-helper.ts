export const defaultRandomStringLength = 12;

export function generateRandomString(length: number = defaultRandomStringLength): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
  return result;
}

export async function pingEndpoint(url: string): Promise<{
  url: string;
  ok: boolean;
  status: number;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache"
      }
    });
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, status: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}


