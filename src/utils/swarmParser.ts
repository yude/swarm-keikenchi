import { prefectureByName, type Prefecture } from "../data/prefectures";

export interface Checkin {
  id?: string;
  createdAt: number;
  venueName: string;
  lat: number;
  lng: number;
  state?: string;
  country?: string;
  city?: string;
}

export interface ParsedData {
  checkins: Checkin[];
  visitedPrefectures: Set<string>;
  prefectureCheckins: Map<string, Checkin[]>;
}

const stateToPrefecture: Record<string, string> = {
  Hokkaido: "北海道",
  Aomori: "青森県",
  Iwate: "岩手県",
  Miyagi: "宮城県",
  Akita: "秋田県",
  Yamagata: "山形県",
  Fukushima: "福島県",
  Ibaraki: "茨城県",
  Tochigi: "栃木県",
  Gunma: "群馬県",
  Saitama: "埼玉県",
  Chiba: "千葉県",
  Tokyo: "東京都",
  Kanagawa: "神奈川県",
  Niigata: "新潟県",
  Toyama: "富山県",
  Ishikawa: "石川県",
  Fukui: "福井県",
  Yamanashi: "山梨県",
  Nagano: "長野県",
  Gifu: "岐阜県",
  Shizuoka: "静岡県",
  Aichi: "愛知県",
  Mie: "三重県",
  Shiga: "滋賀県",
  Kyoto: "京都府",
  Osaka: "大阪府",
  Hyogo: "兵庫県",
  Nara: "奈良県",
  Wakayama: "和歌山県",
  Tottori: "鳥取県",
  Shimane: "島根県",
  Okayama: "岡山県",
  Hiroshima: "広島県",
  Yamaguchi: "山口県",
  Tokushima: "徳島県",
  Kagawa: "香川県",
  Ehime: "愛媛県",
  Kochi: "高知県",
  Fukuoka: "福岡県",
  Saga: "佐賀県",
  Nagasaki: "長崎県",
  Kumamoto: "熊本県",
  Oita: "大分県",
  Miyazaki: "宮崎県",
  Kagoshima: "鹿児島県",
  Okinawa: "沖縄県",
  "北海道": "北海道",
  "青森県": "青森県",
  "岩手県": "岩手県",
  "宮城県": "宮城県",
  "秋田県": "秋田県",
  "山形県": "山形県",
  "福島県": "福島県",
  "茨城県": "茨城県",
  "栃木県": "栃木県",
  "群馬県": "群馬県",
  "埼玉県": "埼玉県",
  "千葉県": "千葉県",
  "東京都": "東京都",
  "神奈川県": "神奈川県",
  "新潟県": "新潟県",
  "富山県": "富山県",
  "石川県": "石川県",
  "福井県": "福井県",
  "山梨県": "山梨県",
  "長野県": "長野県",
  "岐阜県": "岐阜県",
  "静岡県": "静岡県",
  "愛知県": "愛知県",
  "三重県": "三重県",
  "滋賀県": "滋賀県",
  "京都府": "京都府",
  "大阪府": "大阪府",
  "兵庫県": "兵庫県",
  "奈良県": "奈良県",
  "和歌山県": "和歌山県",
  "鳥取県": "鳥取県",
  "島根県": "島根県",
  "岡山県": "岡山県",
  "広島県": "広島県",
  "山口県": "山口県",
  "徳島県": "徳島県",
  "香川県": "香川県",
  "愛媛県": "愛媛県",
  "高知県": "高知県",
  "福岡県": "福岡県",
  "佐賀県": "佐賀県",
  "長崎県": "長崎県",
  "熊本県": "熊本県",
  "大分県": "大分県",
  "宮崎県": "宮崎県",
  "鹿児島県": "鹿児島県",
  "沖縄県": "沖縄県",
};

function findPrefectureFromState(state: string): Prefecture | undefined {
  if (stateToPrefecture[state]) {
    return prefectureByName[stateToPrefecture[state]];
  }
  return prefectureByName[state];
}

function findPrefectureFromVenueName(name: string): Prefecture | undefined {
  for (const [jpName, pref] of Object.entries(prefectureByName)) {
    const normalized = jpName.replace("県", "").replace("府", "").replace("都", "").replace("道", "");
    if (name.includes(normalized)) {
      return pref;
    }
  }
  return undefined;
}

export async function parseSwarmJson(file: File): Promise<ParsedData> {
  const text = await file.text();
  const data = JSON.parse(text);

  const checkins: Checkin[] = [];

  const items = data.checkins || data.items || data;
  const checkinArray = Array.isArray(items) ? items : [items];

  for (const item of checkinArray) {
    const venue = item.venue;
    if (!venue) continue;

    const location = venue.location || {};
    const lat = location.lat;
    const lng = location.lng;

    if (lat === undefined || lng === undefined) continue;

    checkins.push({
      id: item.id,
      createdAt: item.createdAt || item.ts || Date.now(),
      venueName: venue.name || "",
      lat,
      lng,
      state: location.state,
      country: location.country,
      city: location.city,
    });
  }

  return processCheckins(checkins);
}

export async function parseSwarmCsv(file: File): Promise<ParsedData> {
  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    throw new Error("CSV ファイルが空または不正です");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const checkins: Checkin[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const lat = parseFloat(row["lat"] || row["latitude"] || "");
    const lng = parseFloat(row["lng"] || row["longitude"] || row["lon"] || "");

    if (isNaN(lat) || isNaN(lng)) continue;

    checkins.push({
      createdAt: parseInt(row["createdat"] || row["timestamp"] || row["date"] || "0"),
      venueName: row["venuename"] || row["venue"] || row["name"] || "",
      lat,
      lng,
      state: row["state"] || row["prefecture"],
      country: row["country"],
      city: row["city"],
    });
  }

  return processCheckins(checkins);
}

function processCheckins(checkins: Checkin[]): ParsedData {
  const visitedPrefectures = new Set<string>();
  const prefectureCheckins = new Map<string, Checkin[]>();

  for (const checkin of checkins) {
    let pref: Prefecture | undefined;

    if (checkin.state) {
      pref = findPrefectureFromState(checkin.state);
    }

    if (!pref && checkin.venueName) {
      pref = findPrefectureFromVenueName(checkin.venueName);
    }

    if (pref) {
      visitedPrefectures.add(pref.code);
      const existing = prefectureCheckins.get(pref.code) || [];
      existing.push(checkin);
      prefectureCheckins.set(pref.code, existing);
    }
  }

  return { checkins, visitedPrefectures, prefectureCheckins };
}

export function parseFile(file: File): Promise<ParsedData> {
  if (file.name.endsWith(".json")) {
    return parseSwarmJson(file);
  } else if (file.name.endsWith(".csv")) {
    return parseSwarmCsv(file);
  }
  throw new Error("JSON または CSV ファイルのみ対応しています");
}
