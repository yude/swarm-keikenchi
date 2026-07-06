const FOURSQUARE_CLIENT_ID = import.meta.env.VITE_FOURSQUARE_CLIENT_ID || '';
const FOURSQUARE_REDIRECT_URI = window.location.origin + '/callback';

export interface FoursquareCheckin {
  id: string;
  createdAt: number;
  venue: {
    name: string;
    location: {
      lat: number;
      lng: number;
      state?: string;
      country?: string;
      city?: string;
    };
  };
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: FOURSQUARE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: FOURSQUARE_REDIRECT_URI,
  });
  return `https://foursquare.com/oauth2/authenticate?${params}`;
}

export async function getAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: FOURSQUARE_CLIENT_ID,
    client_secret: import.meta.env.VITE_FOURSQUARE_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    redirect_uri: FOURSQUARE_REDIRECT_URI,
    code,
  });

  const response = await fetch(`/oauth/foursquare/oauth2/access_token?${params}`);
  if (!response.ok) {
    throw new Error('アクセストークンの取得に失敗しました');
  }
  const data = await response.json();
  return data.access_token;
}

export async function fetchCheckins(
  accessToken: string,
  limit: number = 250,
  offset: number = 0
): Promise<FoursquareCheckin[]> {
  const params = new URLSearchParams({
    oauth_token: accessToken,
    v: '20240101',
    limit: limit.toString(),
    offset: offset.toString(),
    sort: 'newestfirst',
  });

  const response = await fetch(
    `/api/foursquare/v2/users/self/checkins?${params}`
  );
  if (!response.ok) {
    throw new Error('チェックインデータの取得に失敗しました');
  }
  const data = await response.json();
  return data.response.checkins.items || [];
}

export async function fetchAllCheckins(
  accessToken: string,
  onProgress?: (fetched: number) => void
): Promise<FoursquareCheckin[]> {
  const allCheckins: FoursquareCheckin[] = [];
  let offset = 0;
  const batchSize = 250;

  while (true) {
    const batch = await fetchCheckins(accessToken, batchSize, offset);
    allCheckins.push(...batch);
    onProgress?.(allCheckins.length);

    if (batch.length < batchSize) {
      break;
    }
    offset += batchSize;

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allCheckins;
}

export function saveToken(token: string): void {
  localStorage.setItem('foursquare_token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('foursquare_token');
}

export function clearToken(): void {
  localStorage.removeItem('foursquare_token');
}
