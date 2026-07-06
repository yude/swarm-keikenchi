declare global {
  interface Window {
    __CONFIG__?: {
      foursquareClientId?: string;
      foursquareClientSecret?: string;
    };
  }
}

const FOURSQUARE_CLIENT_ID =
  window.__CONFIG__?.foursquareClientId ||
  import.meta.env.VITE_FOURSQUARE_CLIENT_ID ||
  '';
const FOURSQUARE_CLIENT_SECRET =
  window.__CONFIG__?.foursquareClientSecret ||
  import.meta.env.VITE_FOURSQUARE_CLIENT_SECRET ||
  '';
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
  const state = Math.random().toString(36).substring(7);
  sessionStorage.setItem('oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: FOURSQUARE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: FOURSQUARE_REDIRECT_URI,
    state: state,
  });
  return `https://foursquare.com/oauth2/authenticate?${params}`;
}

export function validateState(state: string): boolean {
  const savedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return savedState === state;
}

export async function getAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: FOURSQUARE_CLIENT_ID,
    client_secret: FOURSQUARE_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: FOURSQUARE_REDIRECT_URI,
    code: code,
  });

  const response = await fetch('/oauth/foursquare/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OAuth token error:', errorText);
    throw new Error(`アクセストークンの取得に失敗しました: ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('アクセストークンがレスポンスに含まれていません');
  }
  return data.access_token;
}

export async function fetchCheckins(
  accessToken: string,
  limit: number = 250,
  beforeTimestamp?: number
): Promise<{ items: FoursquareCheckin[]; earliestTimestamp?: number }> {
  const params = new URLSearchParams({
    oauth_token: accessToken,
    v: '20221002',
    limit: limit.toString(),
  });

  if (beforeTimestamp) {
    params.append('beforeTimestamp', beforeTimestamp.toString());
  }

  const url = `https://api.foursquare.com/v2/users/self/historysearch?${params}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  const text = await response.text();
  
  if (!response.ok) {
    console.error('API Error Response:', text);
    throw new Error(`APIエラー (${response.status}): ${text.substring(0, 200)}`);
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Invalid JSON Response:', text);
    throw new Error(`無効なレスポンス: ${text.substring(0, 200)}`);
  }
  
  if (!data.response?.checkins?.items) {
    console.error('Unexpected Response Structure:', data);
    throw new Error(`予期しないレスポンス形式: ${JSON.stringify(data).substring(0, 200)}`);
  }
  
  const response = data.response;
  const checkins = response.checkins;
  const items = checkins.items || [];
  
  console.log('API Response Details:', {
    responseKeys: Object.keys(response),
    itemsCount: items.length,
    earliestTimestamp: response.earliestTimestamp,
    checkinsCount: checkins.count,
    checkinsKeys: Object.keys(checkins),
    firstItemTimestamp: items[0]?.createdAt,
    lastItemTimestamp: items[items.length - 1]?.createdAt,
    fullResponseJSON: JSON.stringify(response, null, 2),
  });
  
  return {
    items: items,
    earliestTimestamp: response.earliestTimestamp,
  };
}

export async function fetchAllCheckins(
  accessToken: string,
  onProgress?: (fetched: number) => void
): Promise<FoursquareCheckin[]> {
  const allCheckins: FoursquareCheckin[] = [];
  let beforeTimestamp: number | undefined;
  const batchSize = 100;
  let pageCount = 0;

  while (true) {
    pageCount++;
    console.log(`Fetching page ${pageCount}, beforeTimestamp: ${beforeTimestamp}`);
    
    const result = await fetchCheckins(accessToken, batchSize, beforeTimestamp);
    console.log(`Page ${pageCount}: got ${result.items.length} items, earliestTimestamp: ${result.earliestTimestamp}`);
    
    allCheckins.push(...result.items);
    onProgress?.(allCheckins.length);

    if (result.items.length < batchSize || !result.earliestTimestamp) {
      console.log(`Stopping pagination: items=${result.items.length}, batchSize=${batchSize}, hasTimestamp=${!!result.earliestTimestamp}`);
      break;
    }
    
    beforeTimestamp = result.earliestTimestamp;

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Total pages fetched: ${pageCount}, total checkins: ${allCheckins.length}`);
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
