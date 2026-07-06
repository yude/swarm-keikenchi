export interface Prefecture {
  code: string;
  name: string;
  nameEn: string;
  region: string;
}

export const prefectures: Prefecture[] = [
  { code: "01", name: "北海道", nameEn: "Hokkaido", region: "北海道" },
  { code: "02", name: "青森県", nameEn: "Aomori", region: "東北" },
  { code: "03", name: "岩手県", nameEn: "Iwate", region: "東北" },
  { code: "04", name: "宮城県", nameEn: "Miyagi", region: "東北" },
  { code: "05", name: "秋田県", nameEn: "Akita", region: "東北" },
  { code: "06", name: "山形県", nameEn: "Yamagata", region: "東北" },
  { code: "07", name: "福島県", nameEn: "Fukushima", region: "東北" },
  { code: "08", name: "茨城県", nameEn: "Ibaraki", region: "関東" },
  { code: "09", name: "栃木県", nameEn: "Tochigi", region: "関東" },
  { code: "10", name: "群馬県", nameEn: "Gunma", region: "関東" },
  { code: "11", name: "埼玉県", nameEn: "Saitama", region: "関東" },
  { code: "12", name: "千葉県", nameEn: "Chiba", region: "関東" },
  { code: "13", name: "東京都", nameEn: "Tokyo", region: "関東" },
  { code: "14", name: "神奈川県", nameEn: "Kanagawa", region: "関東" },
  { code: "15", name: "新潟県", nameEn: "Niigata", region: "中部" },
  { code: "16", name: "富山県", nameEn: "Toyama", region: "中部" },
  { code: "17", name: "石川県", nameEn: "Ishikawa", region: "中部" },
  { code: "18", name: "福井県", nameEn: "Fukui", region: "中部" },
  { code: "19", name: "山梨県", nameEn: "Yamanashi", region: "中部" },
  { code: "20", name: "長野県", nameEn: "Nagano", region: "中部" },
  { code: "21", name: "岐阜県", nameEn: "Gifu", region: "中部" },
  { code: "22", name: "静岡県", nameEn: "Shizuoka", region: "中部" },
  { code: "23", name: "愛知県", nameEn: "Aichi", region: "中部" },
  { code: "24", name: "三重県", nameEn: "Mie", region: "近畿" },
  { code: "25", name: "滋賀県", nameEn: "Shiga", region: "近畿" },
  { code: "26", name: "京都府", nameEn: "Kyoto", region: "近畿" },
  { code: "27", name: "大阪府", nameEn: "Osaka", region: "近畿" },
  { code: "28", name: "兵庫県", nameEn: "Hyogo", region: "近畿" },
  { code: "29", name: "奈良県", nameEn: "Nara", region: "近畿" },
  { code: "30", name: "和歌山県", nameEn: "Wakayama", region: "近畿" },
  { code: "31", name: "鳥取県", nameEn: "Tottori", region: "中国" },
  { code: "32", name: "島根県", nameEn: "Shimane", region: "中国" },
  { code: "33", name: "岡山県", nameEn: "Okayama", region: "中国" },
  { code: "34", name: "広島県", nameEn: "Hiroshima", region: "中国" },
  { code: "35", name: "山口県", nameEn: "Yamaguchi", region: "中国" },
  { code: "36", name: "徳島県", nameEn: "Tokushima", region: "四国" },
  { code: "37", name: "香川県", nameEn: "Kagawa", region: "四国" },
  { code: "38", name: "愛媛県", nameEn: "Ehime", region: "四国" },
  { code: "39", name: "高知県", nameEn: "Kochi", region: "四国" },
  { code: "40", name: "福岡県", nameEn: "Fukuoka", region: "九州" },
  { code: "41", name: "佐賀県", nameEn: "Saga", region: "九州" },
  { code: "42", name: "長崎県", nameEn: "Nagasaki", region: "九州" },
  { code: "43", name: "熊本県", nameEn: "Kumamoto", region: "九州" },
  { code: "44", name: "大分県", nameEn: "Oita", region: "九州" },
  { code: "45", name: "宮崎県", nameEn: "Miyazaki", region: "九州" },
  { code: "46", name: "鹿児島県", nameEn: "Kagoshima", region: "九州" },
  { code: "47", name: "沖縄県", nameEn: "Okinawa", region: "九州" },
];

export const prefectureByCode = Object.fromEntries(
  prefectures.map((p) => [p.code, p])
);

export const prefectureByName = Object.fromEntries(
  prefectures.map((p) => [p.name, p])
);

export const regions = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
];
