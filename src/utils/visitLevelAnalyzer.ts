import { type Checkin } from "./swarmParser";

export type VisitLevel = 
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

  // 2日目に朝（6時以降）のチェックインがあるか確認
  const hasMorningCheckinOnSecondDay = (() => {
    if (uniqueDays < 2) return false;
    
    const sortedByDate = [...checkins].sort((a, b) => a.createdAt - b.createdAt);
    const firstDay = new Date(sortedByDate[0].createdAt * 1000).toDateString();
    
    // 最初のチェックインとは異なる日で、かつ朝6時以降のチェックインを探す
    return sortedByDate.some((c) => {
      const date = new Date(c.createdAt * 1000);
      const hour = date.getHours();
      return date.toDateString() !== firstDay && hour >= 6 && hour < 12;
    });
  })();

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
    hasMorningCheckinOnSecondDay,
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
  hasMorningCheckinOnSecondDay: boolean;
  totalHours: number;
}): VisitLevel {
  const { checkinCount, uniqueDays, hasMorningCheckinOnSecondDay, totalHours } = params;

  // 宿泊: 2日以上滞在 + 2日目の朝（6時-12時）にチェックインがある
  if (uniqueDays >= 2 && hasMorningCheckinOnSecondDay) {
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
    stayed: "#ea580c",     // オレンジ
    visited: "#16a34a",    // 緑
    landed: "#2563eb",     // 青
    passed: "#7c3aed",     // 紫
    unvisited: "#e5e7eb",  // グレー
  };
  return colors[level];
}
