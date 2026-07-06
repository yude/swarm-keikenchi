import { useEffect, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import * as topojson from "topojson-client";
import { prefectures } from "../data/prefectures";

interface JapanMapProps {
  visitedPrefectures: Set<string>;
  prefectureCheckins: Map<string, unknown[]>;
  onPrefectureClick?: (code: string) => void;
}

interface GeoFeature {
  type: string;
  properties: {
    nam: string;
    nam_ja?: string;
    id?: string | number;
    code?: string;
    N03_001?: string;
    N03_004?: string;
  };
  geometry: GeoPermissibleObjects;
}

interface GeoFeatureCollection {
  type: string;
  features: GeoFeature[];
}

const prefectureNameToCode: Record<string, string> = Object.fromEntries(
  prefectures.map((p) => [p.name, p.code])
);

function normalizePrefectureName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .replace("県", "")
    .replace("府", "")
    .replace("都", "")
    .replace("道", "");
}

function findPrefectureCode(feature: GeoFeature): string | undefined {
  const props = feature.properties;

  if (props.N03_004) {
    return props.N03_004;
  }
  if (props.code) {
    return String(props.code).padStart(2, "0");
  }
  if (props.id) {
    return String(props.id).padStart(2, "0");
  }

  const name = props.nam_ja || props.nam || "";
  const normalized = normalizePrefectureName(name);

  for (const pref of prefectures) {
    const prefNormalized = normalizePrefectureName(pref.name);
    if (prefNormalized === normalized) {
      return pref.code;
    }
  }

  return prefectureNameToCode[name] || prefectureNameToCode[name + "県"];
}

export default function JapanMap({
  visitedPrefectures,
  prefectureCheckins,
  onPrefectureClick,
}: JapanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [hoveredPref, setHoveredPref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/japan.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      })
      .then((data) => {
        if (data.type === "Topology") {
          const objectKeys = Object.keys(data.objects);
          const geojson = topojson.feature(
            data,
            data.objects[objectKeys[0]]
          ) as unknown as GeoFeatureCollection;
          setGeoData(geojson);
        } else {
          setGeoData(data as GeoFeatureCollection);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Map data load error:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 600;
    const height = svg.clientHeight || 800;

    const projection = geoMercator()
      .center([137, 38])
      .scale(1600)
      .translate([width / 2, height / 2]);

    const path = geoPath().projection(projection);

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(g);

    geoData.features.forEach((feature, i) => {
      const prefCode = findPrefectureCode(feature);
      const isVisited = prefCode && visitedPrefectures.has(prefCode);
      const checkinCount = prefCode
        ? prefectureCheckins.get(prefCode)?.length || 0
        : 0;

      const pathEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const d = path(feature.geometry as GeoPermissibleObjects);
      if (d) {
        pathEl.setAttribute("d", d);
      }

      let fillColor = "#e5e7eb";
      if (isVisited) {
        if (checkinCount >= 10) fillColor = "#1d4ed8";
        else if (checkinCount >= 5) fillColor = "#3b82f6";
        else if (checkinCount >= 2) fillColor = "#60a5fa";
        else fillColor = "#93c5fd";
      }

      pathEl.setAttribute("fill", fillColor);
      pathEl.setAttribute("stroke", "#fff");
      pathEl.setAttribute("stroke-width", "0.5");
      pathEl.setAttribute("cursor", "pointer");
      pathEl.dataset.prefCode = prefCode || "";
      pathEl.dataset.index = String(i);

      pathEl.addEventListener("mouseenter", () => {
        if (prefCode) {
          setHoveredPref(prefCode);
          pathEl.setAttribute("fill-opacity", "0.8");
        }
      });
      pathEl.addEventListener("mouseleave", () => {
        setHoveredPref(null);
        pathEl.setAttribute("fill-opacity", "1");
      });
      pathEl.addEventListener("click", () => {
        if (prefCode && onPrefectureClick) {
          onPrefectureClick(prefCode);
        }
      });

      g.appendChild(pathEl);
    });
  }, [geoData, visitedPrefectures, prefectureCheckins, onPrefectureClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">地図データを読み込み中...</div>
      </div>
    );
  }

  const hoveredPrefName = hoveredPref
    ? prefectures.find((p) => p.code === hoveredPref)?.name
    : null;
  const hoveredCheckinCount = hoveredPref
    ? prefectureCheckins.get(hoveredPref)?.length || 0
    : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox="0 0 600 800"
        className="w-full h-auto max-h-[80vh]"
      />
      {hoveredPrefName && (
        <div className="absolute top-4 left-4 bg-white shadow-lg rounded-lg px-4 py-2 pointer-events-none">
          <div className="font-bold">{hoveredPrefName}</div>
          <div className="text-sm text-gray-600">
            {hoveredCheckinCount > 0
              ? `${hoveredCheckinCount}回のチェックイン`
              : "未訪問"}
          </div>
        </div>
      )}
    </div>
  );
}
