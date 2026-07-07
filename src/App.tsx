import { useState, useCallback, useEffect } from "react";
import JapanMap from "./components/JapanMap";
import { parseFile, type ParsedData, type Checkin } from "./utils/swarmParser";
import { prefectures, regions } from "./data/prefectures";
import { analyzeCheckins, type PrefectureAnalysis } from "./utils/visitLevelAnalyzer";
import {
  getAuthUrl,
  getToken,
  clearToken,
  saveToken,
  fetchAllCheckins,
  type FoursquareCheckin,
} from "./utils/foursquareApi";
import "./App.css";

function convertFoursquareCheckins(items: FoursquareCheckin[]): Checkin[] {
  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    venueName: item.venue.name,
    lat: item.venue.location.lat,
    lng: item.venue.location.lng,
    state: item.venue.location.state,
    country: item.venue.location.country,
    city: item.venue.location.city,
  }));
}

function processCheckins(checkins: Checkin[]): ParsedData {
  const visitedPrefectures = new Set<string>();
  const prefectureCheckins = new Map<string, Checkin[]>();

  const stateToPrefecture: Record<string, string> = {
    Hokkaido: "01", Aomori: "02", Iwate: "03", Miyagi: "04",
    Akita: "05", Yamagata: "06", Fukushima: "07", Ibaraki: "08",
    Tochigi: "09", Gunma: "10", Saitama: "11", Chiba: "12",
    Tokyo: "13", Kanagawa: "14", Niigata: "15", Toyama: "16",
    Ishikawa: "17", Fukui: "18", Yamanashi: "19", Nagano: "20",
    Gifu: "21", Shizuoka: "22", Aichi: "23", Mie: "24",
    Shiga: "25", Kyoto: "26", Osaka: "27", Hyogo: "28",
    Nara: "29", Wakayama: "30", Tottori: "31", Shimane: "32",
    Okayama: "33", Hiroshima: "34", Yamaguchi: "35", Tokushima: "36",
    Kagawa: "37", Ehime: "38", Kochi: "39", Fukuoka: "40",
    Saga: "41", Nagasaki: "42", Kumamoto: "43", Oita: "44",
    Miyazaki: "45", Kagoshima: "46", Okinawa: "47",
    "北海道": "01", "青森県": "02", "岩手県": "03", "宮城県": "04",
    "秋田県": "05", "山形県": "06", "福島県": "07", "茨城県": "08",
    "栃木県": "09", "群馬県": "10", "埼玉県": "11", "千葉県": "12",
    "東京都": "13", "神奈川県": "14", "新潟県": "15", "富山県": "16",
    "石川県": "17", "福井県": "18", "山梨県": "19", "長野県": "20",
    "岐阜県": "21", "静岡県": "22", "愛知県": "23", "三重県": "24",
    "滋賀県": "25", "京都府": "26", "大阪府": "27", "兵庫県": "28",
    "奈良県": "29", "和歌山県": "30", "鳥取県": "31", "島根県": "32",
    "岡山県": "33", "広島県": "34", "山口県": "35", "徳島県": "36",
    "香川県": "37", "愛媛県": "38", "高知県": "39", "福岡県": "40",
    "佐賀県": "41", "長崎県": "42", "熊本県": "43", "大分県": "44",
    "宮崎県": "45", "鹿児島県": "46", "沖縄県": "47",
  };

  const unmatchedStates = new Set<string>();

  for (const checkin of checkins) {
    let prefCode: string | undefined;
    if (checkin.state) {
      prefCode = stateToPrefecture[checkin.state];
      if (!prefCode) {
        unmatchedStates.add(checkin.state);
      }
    }
    if (prefCode) {
      visitedPrefectures.add(prefCode);
      const existing = prefectureCheckins.get(prefCode) || [];
      existing.push(checkin);
      prefectureCheckins.set(prefCode, existing);
    }
  }

  if (unmatchedStates.size > 0) {
    console.warn('Unmatched states:', Array.from(unmatchedStates));
  }

  // 各都道府県の訪問レベルを分析
  const prefectureAnalysis = new Map<string, PrefectureAnalysis>();
  for (const [prefCode, checkins] of prefectureCheckins.entries()) {
    const analysis = analyzeCheckins(checkins);
    prefectureAnalysis.set(prefCode, analysis);
  }

  return { checkins, visitedPrefectures, prefectureCheckins, prefectureAnalysis };
}

function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPref, setSelectedPref] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [displayMode, setDisplayMode] = useState<"count" | "level">("count");

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    try {
      const parsed = await parseFile(file);
      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ファイルの読み込みに失敗しました");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleFoursquareLogin = useCallback(() => {
    window.location.href = getAuthUrl();
  }, []);

  const handleFoursquareFetch = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("アクセストークンを入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFetchProgress(0);

    try {
      const items = await fetchAllCheckins(token, (count) => {
        setFetchProgress(count);
      });
      console.log('Fetched checkins:', items.length);
      if (items.length > 0) {
        console.log('Sample checkin:', items[0]);
      }
      const checkins = convertFoursquareCheckins(items);
      console.log('Converted checkins:', checkins.length);
      if (checkins.length > 0) {
        console.log('Sample converted checkin:', checkins[0]);
      }
      const parsed = processCheckins(checkins);
      console.log('Parsed data:', {
        totalCheckins: parsed.checkins.length,
        visitedPrefectures: parsed.visitedPrefectures.size,
        prefectureCheckins: parsed.prefectureCheckins.size,
      });
      setData(parsed);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        clearToken();
        setError("トークンが無効です。再度入力してください。");
      } else {
        setError(err instanceof Error ? err.message : "データ取得に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTokenInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const token = e.target.value.trim();
    if (token) {
      saveToken(token);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setIsLoggedIn(false);
    setData(null);
  }, []);

  const handleLoadSample = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/sample-swarm.json");
      const json = await res.json();
      const file = new File([JSON.stringify(json)], "sample.json", {
        type: "application/json",
      });
      const parsed = await parseFile(file);
      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "サンプルデータの読み込みに失敗しました");
    }
  }, []);

  const visitedCount = data?.visitedPrefectures.size || 0;
  const percentage = ((visitedCount / 47) * 100).toFixed(1);

  const regionStats = regions.map((region) => {
    const regionPrefs = prefectures.filter((p) => p.region === region);
    const visited = regionPrefs.filter((p) =>
      data?.visitedPrefectures.has(p.code)
    ).length;
    return { region, visited, total: regionPrefs.length };
  });

  const selectedPrefData = selectedPref
    ? prefectures.find((p) => p.code === selectedPref)
    : null;
  const selectedCheckins = selectedPref
    ? data?.prefectureCheckins.get(selectedPref) || []
    : [];

  const topVenues = selectedCheckins.reduce((acc, checkin) => {
    const venue = checkin.venueName;
    acc.set(venue, (acc.get(venue) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  const sortedVenues = Array.from(topVenues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">経県値マップ</h1>
            <p className="text-sm text-gray-500 mt-1">
              Foursquare Swarm のチェックインデータから訪問した都道府県を可視化
            </p>
          </div>
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!data && !isLoading ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Foursquare Swarm とデータを連携する
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Foursquare アカウントでログインして、チェックイン履歴を取得します。
              </p>
              {isLoggedIn ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    トークン設定済み
                  </div>
                  <button
                    onClick={handleFoursquareFetch}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    チェックインデータを取得
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleFoursquareLogin}
                    className="w-full px-6 py-3 bg-[#F94877] text-white rounded-lg hover:bg-[#e03d68] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm0-8H9V7h6v2z"/>
                    </svg>
                    Foursquare でログイン
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-xs text-gray-500">または</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  <div>
                    <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                      アクセストークンを手動入力
                    </label>
                    <input
                      type="text"
                      id="token"
                      placeholder="Foursquare API アクセストークンを入力"
                      onChange={handleTokenInput}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">
                      トークンの取得方法
                    </summary>
                    <div className="mt-2 bg-gray-50 p-3 rounded">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          <a
                            href="https://foursquare.com/developers/explore#req=users/self/checkins"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Foursquare API Explorer
                          </a>
                          にアクセス
                        </li>
                        <li>Foursquare アカウントでログイン</li>
                        <li>ページ上部の「OAuth Token」をコピー</li>
                      </ol>
                    </div>
                  </details>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">または</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-700">
                Swarm のエクスポートファイルをドロップ
              </p>
              <p className="mt-2 text-sm text-gray-500">または</p>
              <label className="mt-4 inline-block">
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  ファイルを選択
                </span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>
              <p className="mt-4 text-xs text-gray-400">JSON / CSV 形式に対応</p>
              <div className="mt-4">
                <button
                  onClick={handleLoadSample}
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  サンプルデータで試す
                </button>
              </div>
              {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
            </div>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">チェックインデータを取得中...</p>
            <p className="mt-2 text-sm text-gray-500">{fetchProgress}件取得済み</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setDisplayMode("count")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      displayMode === "count"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    訪問回数
                  </button>
                  <button
                    onClick={() => setDisplayMode("level")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      displayMode === "level"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    訪問レベル
                  </button>
                </div>
                <JapanMap
                  visitedPrefectures={data!.visitedPrefectures}
                  prefectureCheckins={data!.prefectureCheckins}
                  prefectureAnalysis={data!.prefectureAnalysis}
                  onPrefectureClick={setSelectedPref}
                  displayMode={displayMode}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">統計</h2>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {visitedCount}
                    <span className="text-lg text-gray-500">/ 47</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    都道府県訪問済み ({percentage}%)
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>総チェックイン数: {data!.checkins.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-bold text-gray-900 mb-2">地方別</h3>
                <div className="space-y-2">
                  {regionStats.map(({ region, visited, total }) => (
                    <div key={region} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${(visited / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {visited}/{total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">凡例</h3>
                  <button
                    onClick={() => setData(null)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    リセット
                  </button>
                </div>
                {displayMode === "count" ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#1d4ed8]" />
                      <span className="text-gray-700">10回以上</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#3b82f6]" />
                      <span className="text-gray-700">5-9回</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#60a5fa]" />
                      <span className="text-gray-700">2-4回</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#93c5fd]" />
                      <span className="text-gray-700">1回</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#e5e7eb]" />
                      <span className="text-gray-700">未訪問</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#dc2626]" />
                      <span className="text-gray-700">居住</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#ea580c]" />
                      <span className="text-gray-700">宿泊</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#16a34a]" />
                      <span className="text-gray-700">訪問</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#2563eb]" />
                      <span className="text-gray-700">接地</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#7c3aed]" />
                      <span className="text-gray-700">通過</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-[#e5e7eb]" />
                      <span className="text-gray-700">未踏</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedPrefData && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                  onClick={() => setSelectedPref(null)}
                >
                  <div
                    className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="text-lg font-bold text-gray-900">
                        {selectedPrefData.name}
                      </h3>
                      <button
                        onClick={() => setSelectedPref(null)}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
                      {sortedVenues.length > 0 ? (
                        <>
                          <p className="text-sm text-gray-600 mb-3">
                            よく訪れた場所（上位{sortedVenues.length}件）
                          </p>
                          <div className="space-y-2">
                            {sortedVenues.map(([venue, count], i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-bold text-blue-600 w-6">
                                    {i + 1}
                                  </span>
                                  <span className="font-medium text-gray-800">
                                    {venue}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                                  {count}回
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-8">
                          チェックイン記録なし
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
