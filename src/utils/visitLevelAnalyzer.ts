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

  // 連続する2日間で、2日目の朝（8時以降）にチェックインがあるか確認
  const hasConsecutiveOvernightStay = (() => {
    if (uniqueDays < 2) return false;
    
    const sortedByDate = [...checkins].sort((a, b) => a.createdAt - b.createdAt);
    
    // 日付ごとにグループ化
    const checkinsByDate = new Map<string, number[]>();
    for (const c of sortedByDate) {
      const date = new Date(c.createdAt * 1000).toDateString();
      const hour = new Date(c.createdAt * 1000).getHours();
      const existing = checkinsByDate.get(date) || [];
      existing.push(hour);
      checkinsByDate.set(date, existing);
    }
    
    // 連続する日付のペアを探す
    const dates = Array.from(checkinsByDate.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    for (let i = 0; i < dates.length - 1; i++) {
      const currentDate = new Date(dates[i]);
      const nextDate = new Date(dates[i + 1]);
      
      // 翌日かどうかを確認（ミリ秒の差が1日以内）
      const diffMs = nextDate.getTime() - currentDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (diffDays >= 0.9 && diffDays <= 1.1) {
        // 翌日の朝8時以降のチェックインを確認
        const nextDayHours = checkinsByDate.get(dates[i + 1]) || [];
        if (nextDayHours.some(hour => hour >= 8)) {
          return true;
        }
      }
    }
    
    return false;
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
    hasConsecutiveOvernightStay,
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
  hasConsecutiveOvernightStay: boolean;
  totalHours: number;
}): VisitLevel {
  const { checkinCount, uniqueDays, hasConsecutiveOvernightStay, totalHours } = params;

  // 宿泊: 連続する2日間で、2日目の朝（8時以降）にチェックインがある
  if (uniqueDays >= 2 && hasConsecutiveOvernightStay) {
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
