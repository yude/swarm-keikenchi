import { type Checkin } from "./swarmParser";

export type VisitLevel = 
  | "lived"      // 居住
  | "stayed"     // 宿泊
  | "visited"    // 訪問
  | "landed"     // 接地
  | "passed"     // 通過
  | "unvisited"; // 未踏

export interface PrefectureAnalysis {
  level: VisitLevel;
  checkinCount: number;
  uniqueDays: number;
  hasNightStay: boolean;
  totalHours: number;
}

export function analyzeCheckins(checkins: Checkin[]): PrefectureAnalysis {
  if (checkins.length === 0) {
    return {
      level: "unvisited",
      checkinCount: 0,
      uniqueDays: 0,
      hasNightStay: false,
      totalHours: 0,
    };
  }

  // ユニークな日付を計算
  const uniqueDays = new Set(
    checkins.map((c) => new Date(c.createdAt * 1000).toDateString())
  ).size;

  // 夜間（22時-6時）のチェックインを確認
  const hasNightStay = checkins.some((c) => {
    const hour = new Date(c.createdAt * 1000).getHours();
    return hour >= 22 || hour < 6;
  });

  // 滞在時間を推定（チェックイン間隔から）
  const sortedCheckins = [...checkins].sort((a, b) => a.createdAt - b.createdAt);
  let totalHours = 0;
  
  for (let i = 0; i < sortedCheckins.length - 1; i++) {
    const current = sortedCheckins[i];
    const next = sortedCheckins[i + 1];
    const diffHours = (next.createdAt - current.createdAt) / 3600;
    
    // 24時間以内のチェックイン間隔を滞在時間として加算
    if (diffHours < 24) {
      totalHours += diffHours;
    }
  }
  
  // 最後のチェックインは最低1時間滞在と仮定
  totalHours += 1;

  // 訪問レベルを判定
  const level = determineVisitLevel({
    checkinCount: checkins.length,
    uniqueDays,
    hasNightStay,
    totalHours,
  });

  return {
    level,
    checkinCount: checkins.length,
    uniqueDays,
    hasNightStay,
    totalHours: Math.round(totalHours),
  };
}

function determineVisitLevel(params: {
  checkinCount: number;
  uniqueDays: number;
  hasNightStay: boolean;
  totalHours: number;
}): VisitLevel {
  const { checkinCount, uniqueDays, hasNightStay, totalHours } = params;

  // 居住: 3日以上滞在 + 夜間滞在あり、または総滞在時間が48時間以上
  if ((uniqueDays >= 3 && hasNightStay) || totalHours >= 48) {
    return "lived";
  }

  // 宿泊: 夜間滞在あり、または2日以上滞在
  if (hasNightStay || uniqueDays >= 2) {
    return "stayed";
  }

  // 訪問: 2回以上チェックイン
  if (checkinCount >= 2) {
    return "visited";
  }

  // 接地: 1回チェックイン + 滞在時間が長い（2時間以上）
  if (checkinCount === 1 && totalHours >= 2) {
    return "landed";
  }

  // 通過: 1回チェックイン + 滞在時間が短い
  if (checkinCount === 1) {
    return "passed";
  }

  return "unvisited";
}

export function getVisitLevelLabel(level: VisitLevel): string {
  const labels: Record<VisitLevel, string> = {
    lived: "居住",
    stayed: "宿泊",
    visited: "訪問",
    landed: "接地",
    passed: "通過",
    unvisited: "未踏",
  };
  return labels[level];
}

export function getVisitLevelColor(level: VisitLevel): string {
  const colors: Record<VisitLevel, string> = {
    lived: "#dc2626",      // 赤
    stayed: "#ea580c",     // オレンジ
    visited: "#16a34a",    // 緑
    landed: "#2563eb",     // 青
    passed: "#7c3aed",     // 紫
    unvisited: "#e5e7eb",  // グレー
  };
  return colors[level];
}
