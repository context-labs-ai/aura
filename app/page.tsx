"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import "@/styles/hud.css";
import CameraFeed, { CameraFeedHandle } from "@/components/CameraFeed";
import { BUILDING_RECORD_MAP, BUILDING_RECORDS } from "@/data/buildings";
import { generatePersonaSummary } from "@/lib/ai-summary";
import { rankBuildings, scoreToConfidence } from "@/lib/building-matcher";
import { useLocation } from "@/hooks/useLocation";
import { useOrientation } from "@/hooks/useOrientation";
import type { BuildingRecord, Persona } from "@/types/reality";

type ViewState = "landing" | "scan" | "details";
type CaptureState = "idle" | "capturing" | "analyzing";
type ExportFormat = "pdf" | "slides";
type DeliveryChannel = "email" | "whatsapp" | "local";

const PERSONA_META: Record<Persona, { label: string; helper: string; detail: string; prompt: string }> = {
  explore: {
    label: "Visit",
    helper: "travel, history",
    detail: "Travel / History",
    prompt: "See why this building matters, what happened here, and what to notice nearby.",
  },
  live: {
    label: "Live",
    helper: "buy or rent",
    detail: "Buy / Rent",
    prompt: "Understand comfort, rent, transit, and daily living signals in one glance.",
  },
  invest: {
    label: "Invest",
    helper: "yield, upside",
    detail: "Yield / Upside",
    prompt: "Move from the camera view to upside, valuation, and risk framing instantly.",
  },
  build: {
    label: "Build",
    helper: "business fit",
    detail: "Business Fit",
    prompt: "Judge foot traffic, infrastructure, accessibility, and business fit fast.",
  },
};

interface SavedSession {
  id: string;
  title: string;
  summary: string;
  persona: string;
  description: string;
  createdAt: string;
  exportFormat: ExportFormat;
}

function formatHeading(heading: number | null): string {
  if (heading === null) return "n/a";
  return `${Math.round(heading)}deg`;
}

function formatGps(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return "GPS unavailable";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatDateTime(timestamp: number | null): string {
  const value = new Date(timestamp ?? Date.now());
  return value.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeFileStamp(timestamp: number | null): string {
  const value = new Date(timestamp ?? Date.now()).toISOString();
  return value.replace(/[T:]/g, "-").split(".")[0];
}

function getLocationStatus(lat: number | null, lng: number | null, isLoading: boolean): string {
  if (isLoading) return "Acquiring GPS";
  if (lat !== null && lng !== null) return `GPS ${formatGps(lat, lng)}`;
  return "Manual shortlist";
}

function getNearLocationLabel(record: BuildingRecord | null, lat: number | null, lng: number | null): string {
  if (record) return record.building.address;
  if (lat !== null && lng !== null) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  return "current location";
}

function getDetailCards(record: BuildingRecord, persona: Persona): { label: string; value: string; note: string }[] {
  if (persona === "explore") {
    return [
      {
        label: "Historic pulse",
        value: record.explorer.history[0] ?? "Historic context ready",
        note: record.explorer.history[1] ?? "Second-layer city memory available",
      },
      {
        label: "What to notice",
        value: record.explorer.nearbyAttractions[0] ?? "Local signal",
        note: record.explorer.hiddenSpots[0] ?? "Hidden spot unavailable",
      },
      {
        label: "Visit energy",
        value: `${record.explorer.crowdLevel}/100`,
        note: `Travel score ${record.explorer.rating.toFixed(1)}`,
      },
    ];
  }

  if (persona === "live") {
    return [
      {
        label: "Rent now",
        value: record.home.estimatedRent,
        note: record.home.estimatedValue,
      },
      {
        label: "Daily flow",
        value: `${record.home.transitScore}/100 transit`,
        note: `${record.home.occupancy}% occupancy nearby`,
      },
      {
        label: "Living fit",
        value: record.home.amenities.slice(0, 2).join(" | "),
        note: `Structural ${record.home.structuralScore}/10`,
      },
    ];
  }

  if (persona === "invest") {
    return [
      {
        label: "Upside score",
        value: `${record.investor.investmentScore}/100`,
        note: record.investor.forecast,
      },
      {
        label: "Valuation",
        value: record.investor.valuation,
        note: `Cap ${record.investor.capRate} | Yield ${record.investor.rentalYield}`,
      },
      {
        label: "Risk watch",
        value: record.investor.riskNotes[0] ?? "Risk note ready",
        note: record.investor.futureDevelopments[0] ?? "Future development signal pending",
      },
    ];
  }

  return [
    {
      label: "Foot traffic",
      value: record.business.footTrafficDaily.toLocaleString(),
      note: `Peak ${record.business.peakHours.join(" | ")}`,
    },
    {
      label: "Infrastructure",
      value: `${record.business.infrastructureScore}/100`,
      note: `Energy ${record.business.energyScore}`,
    },
    {
      label: "Business fit",
      value: record.business.accessibilityNotes[0] ?? "Accessibility note ready",
      note: `Competitor density ${Object.values(record.business.competitorCounts).reduce((sum, value) => sum + value, 0)}`,
    },
  ];
}

function createDownload(blob: Blob, fileName: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export default function Home() {
  const cameraRef = useRef<CameraFeedHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<ViewState>("landing");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [persona, setPersona] = useState<Persona>("explore");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState("low");
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [summary, setSummary] = useState(PERSONA_META.explore.prompt);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [capturedLat, setCapturedLat] = useState<number | null>(null);
  const [capturedLng, setCapturedLng] = useState<number | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const { lat, lng, isLoading: isLocationLoading, requestLocation } = useLocation();
  const { heading, requestPermission: requestOrientationPermission } = useOrientation();

  const selectedRecord = useMemo(
    () => (selectedBuildingId ? BUILDING_RECORD_MAP.get(selectedBuildingId) ?? null : null),
    [selectedBuildingId],
  );

  const detailCards = useMemo(
    () => (selectedRecord ? getDetailCards(selectedRecord, persona) : []),
    [persona, selectedRecord],
  );

  const detailBackground = frozenFrame ?? uploadedPreview ?? null;

  const nearLocation = useMemo(
    () => getNearLocationLabel(selectedRecord, capturedLat ?? lat, capturedLng ?? lng),
    [capturedLat, capturedLng, lat, lng, selectedRecord],
  );

  const sessionDescription = useMemo(() => {
    const scanTime = formatDateTime(capturedAt);
    return `${scanTime} | Near ${nearLocation} via phone GPS`;
  }, [capturedAt, nearLocation]);

  const exportLabel = exportFormat === "slides" ? "Architecture Slides" : "Architecture PDF";

  const shareText = useMemo(() => {
    if (!selectedRecord) return "";
    const insightLines = detailCards.map((card) => `${card.label}: ${card.value} (${card.note})`).join("\n");

    return [
      `AURA Scan: ${selectedRecord.building.name}`,
      `Persona: ${PERSONA_META[persona].label}`,
      `Session: ${sessionDescription}`,
      `Package: ${exportLabel}`,
      "",
      summary,
      "",
      insightLines,
    ].join("\n");
  }, [detailCards, exportLabel, persona, selectedRecord, sessionDescription, summary]);

  useEffect(() => {
    if (selectedRecord) {
      setSummary(generatePersonaSummary(selectedRecord, persona));
    } else {
      setSummary(PERSONA_META[persona].prompt);
    }
  }, [persona, selectedRecord]);

  const startScan = () => {
    setCaptureState("idle");
    setUploadedPreview(null);
    setExportFormat(null);
    setView("scan");
    requestLocation();
    requestOrientationPermission();
  };

  const retake = () => {
    setCaptureState("idle");
    setFrozenFrame(null);
    setUploadedPreview(null);
    setSelectedBuildingId(null);
    setConfidence("low");
    setExportFormat(null);
    setView("scan");
  };

  const runInference = (frame: string | null) => {
    if (!frame || captureState !== "idle") return;

    setFrozenFrame(frame);
    setCaptureState("capturing");
    setCapturedAt(Date.now());
    setCapturedLat(lat);
    setCapturedLng(lng);

    window.setTimeout(() => {
      setCaptureState("analyzing");

      window.setTimeout(() => {
        const ranked = lat !== null && lng !== null
          ? rankBuildings(BUILDING_RECORDS, lat, lng, heading ?? undefined)
          : BUILDING_RECORDS.map((entry, index) => ({ id: entry.building.id, score: 1 - index * 0.12 }));

        const topCandidate = ranked[0];
        const matchedId = topCandidate?.id ?? BUILDING_RECORDS[0].building.id;
        const matchedRecord = BUILDING_RECORD_MAP.get(matchedId) ?? BUILDING_RECORDS[0];

        setSelectedBuildingId(matchedRecord.building.id);
        setConfidence(topCandidate ? scoreToConfidence(topCandidate.score) : "low");
        setSummary(generatePersonaSummary(matchedRecord, persona));
        setUploadedPreview(null);
        setCaptureState("idle");
        setView("details");
      }, 950);
    }, 280);
  };

  const captureFrame = () => {
    if (uploadedPreview) {
      runInference(uploadedPreview);
      return;
    }

    const frame = cameraRef.current?.captureFrame() ?? null;
    runInference(frame);
  };

  const openPhotoLibrary = () => {
    if (captureState !== "idle") return;
    fileInputRef.current?.click();
  };

  const clearUploadedPreview = () => {
    if (captureState !== "idle") return;
    setUploadedPreview(null);
  };

  const handleLibraryFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const flipCamera = () => {
    if (captureState !== "idle") return;
    cameraRef.current?.flipCamera();
  };

  const buildReportHtml = (): string => {
    if (!selectedRecord) return "";

    const cards = detailCards
      .map(
        (card) => `<article class="card"><p class="label">${card.label}</p><h3>${card.value}</h3><p>${card.note}</p></article>`,
      )
      .join("");

    const image = frozenFrame
      ? `<img class="thumb" src="${frozenFrame}" alt="Captured frame" />`
      : "<div class=\"thumb thumb--empty\"></div>";

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AURA Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; color: #13223a; background: #fff; }
      .wrap { max-width: 920px; margin: 24px auto; padding: 0 24px 32px; }
      .kicker { letter-spacing: 0.16em; text-transform: uppercase; color: #4285F4; font-size: 11px; }
      h1 { margin: 10px 0 0; font-size: 34px; color: #202124; }
      .meta { margin: 8px 0 22px; color: #5f6368; }
      .hero { display: grid; grid-template-columns: 220px 1fr; gap: 16px; margin-bottom: 20px; }
      .thumb { width: 220px; height: 140px; object-fit: cover; border-radius: 12px; border: 1px solid #dbe6ff; }
      .thumb--empty { background: #eef4ff; }
      .summary { background: #f7fbff; border: 1px solid #dbe6ff; border-radius: 12px; padding: 14px; }
      .summary h2 { margin: 6px 0 10px; font-size: 22px; }
      .summary p { margin: 0; line-height: 1.6; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
      .card { border: 1px solid #dbe6ff; border-radius: 12px; padding: 12px; background: #fff; }
      .card .label { margin: 0; color: #34A853; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
      .card h3 { margin: 8px 0; font-size: 20px; color: #202124; }
      .card p { margin: 0; color: #5f6368; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <p class="kicker">AURA | Augmented Urban Reality Architecture</p>
      <h1>${selectedRecord.building.name}</h1>
      <p class="meta">${sessionDescription}</p>
      <section class="hero">
        ${image}
        <article class="summary">
          <p class="kicker">${exportLabel}</p>
          <h2>${PERSONA_META[persona].prompt}</h2>
          <p>${summary}</p>
        </article>
      </section>
      <section class="grid">${cards}</section>
    </main>
  </body>
</html>`;
  };

  const exportPdf = () => {
    if (!selectedRecord) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildReportHtml());
    printWindow.document.close();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 200);
  };

  const exportSlides = () => {
    if (!selectedRecord) return;

    const cards = detailCards
      .map((card) => `<li><strong>${card.label}</strong>: ${card.value} - ${card.note}</li>`)
      .join("");

    const image = frozenFrame
      ? `<img src="${frozenFrame}" alt="Captured frame" />`
      : "<div class=\"placeholder\"></div>";

    const slideDoc = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AURA Slides</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #101623; color: #fff; }
      .slide { height: 100vh; padding: 56px; box-sizing: border-box; page-break-after: always; }
      .slide h1 { margin: 0 0 16px; font-size: 56px; }
      .slide h2 { margin: 0 0 12px; font-size: 42px; }
      .kicker { text-transform: uppercase; letter-spacing: 0.14em; font-size: 13px; color: #FBBC05; margin: 0 0 8px; }
      .meta { font-size: 22px; color: #d2e3fc; }
      .image-row { display: grid; grid-template-columns: 44% 1fr; gap: 28px; align-items: start; }
      .image-row img, .placeholder { width: 100%; border-radius: 18px; border: 2px solid rgba(255,255,255,0.2); }
      .placeholder { aspect-ratio: 4 / 3; background: rgba(255,255,255,0.08); }
      ul { margin: 0; padding-left: 24px; font-size: 30px; line-height: 1.6; }
      p { font-size: 30px; line-height: 1.45; max-width: 44ch; }
    </style>
  </head>
  <body>
    <section class="slide" style="background: linear-gradient(135deg, #4285F4, #34A853)">
      <p class="kicker">AURA | City Intelligence Snapshot</p>
      <h1>${selectedRecord.building.name}</h1>
      <p class="meta">${sessionDescription}</p>
    </section>
    <section class="slide" style="background: #162032">
      <p class="kicker">${exportLabel}</p>
      <div class="image-row">
        ${image}
        <div>
          <h2>${PERSONA_META[persona].label} Lens</h2>
          <p>${summary}</p>
        </div>
      </div>
    </section>
    <section class="slide" style="background: #101623">
      <p class="kicker">Key Signals</p>
      <ul>${cards}</ul>
    </section>
  </body>
</html>`;

    createDownload(
      new Blob([slideDoc], { type: "text/html;charset=utf-8" }),
      `aura-slides-${safeFileStamp(capturedAt)}.html`,
    );
  };

  const sendToEmail = () => {
    if (!selectedRecord || !exportFormat) return;

    const subject = encodeURIComponent(`${exportLabel} | ${selectedRecord.building.name}`);
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const sendToWhatsApp = () => {
    if (!selectedRecord || !exportFormat) return;

    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const saveConversation = () => {
    if (!selectedRecord || !exportFormat) return;

    const saved: SavedSession = {
      id: `session-${Date.now()}`,
      title: selectedRecord.building.name,
      summary,
      persona: PERSONA_META[persona].label,
      description: sessionDescription,
      createdAt: new Date().toISOString(),
      exportFormat,
    };

    try {
      const key = "aura.savedSessions";
      const existingRaw = window.localStorage.getItem(key);
      const existing = existingRaw ? (JSON.parse(existingRaw) as SavedSession[]) : [];
      existing.unshift(saved);
      window.localStorage.setItem(key, JSON.stringify(existing.slice(0, 40)));
      setSaveNotice(`Saved locally: ${sessionDescription}`);
      window.setTimeout(() => setSaveNotice(null), 2600);
    } catch {
      setSaveNotice("Unable to save in this browser session.");
      window.setTimeout(() => setSaveNotice(null), 2600);
    }
  };

  const handleDelivery = (channel: DeliveryChannel) => {
    if (!exportFormat) return;

    if (channel === "local") {
      if (exportFormat === "pdf") {
        exportPdf();
      } else {
        exportSlides();
      }
      saveConversation();
      return;
    }

    if (channel === "email") {
      sendToEmail();
      return;
    }

    sendToWhatsApp();
  };

  return (
    <main className={`rb-app-shell rb-app-shell--${view}`}>
      {view === "details" && detailBackground && (
        <img src={detailBackground} alt="Captured frame" className="rb-details-bg" />
      )}

      <div className="rb-static-bg" aria-hidden>
        <div className="rb-static-bg__grid" />
        <div className="rb-static-bg__glow rb-static-bg__glow--orange" />
        <div className="rb-static-bg__glow rb-static-bg__glow--cyan" />
        <div className="rb-static-bg__ring" />
      </div>

      <div className="rb-stage-frame" aria-hidden>
        <span className="rb-stage-frame__corner rb-stage-frame__corner--tl" />
        <span className="rb-stage-frame__corner rb-stage-frame__corner--tr" />
        <span className="rb-stage-frame__corner rb-stage-frame__corner--bl" />
        <span className="rb-stage-frame__corner rb-stage-frame__corner--br" />
      </div>

      {view === "landing" && (
        <section className="rb-landing">
          <div className="rb-landing-skyline" aria-hidden />
          <div className="rb-landing__content">
            <p className="rb-kicker">Augmented Urban Reality Architecture</p>
            <h1>AURA reads the city in real time.</h1>
            <p className="rb-landing-copy">
              <span>Point at a building to reveal business, neighborhood, and opportunity signals.</span>
              <span>See why it matters in a single scan.</span>
            </p>
            <button className="rb-primary-button" onClick={startScan}>Start Scan</button>
          </div>
        </section>
      )}

      {view === "scan" && (
        <section className="rb-scan-page">
          <header className="rb-scan-page__header">
            <p className="rb-kicker">Reality browser</p>
            <h2>Align the frame and capture.</h2>
            <span>{getLocationStatus(lat, lng, isLocationLoading)}</span>
          </header>

          <div className={`rb-camera-window rb-camera-window--${captureState}`}>
            {uploadedPreview ? (
              <img src={uploadedPreview} alt="Selected from library" className="rb-camera-preview rb-camera-preview--uploaded" />
            ) : (
              <CameraFeed ref={cameraRef} className="rb-camera-preview" />
            )}
            <div className="rb-camera-window__frame" />
            <div className="rb-camera-window__guides" />
            <div className="rb-camera-window__focus" />
            <div className="rb-camera-window__scanline" />
            <div className="rb-camera-window__caption">{uploadedPreview ? "Photo ready" : "Live preview"}</div>
          </div>

          {uploadedPreview && captureState === "idle" && (
            <div className="rb-upload-preview-row">
              <span>Photo loaded from library</span>
              <button className="rb-inline-link" onClick={clearUploadedPreview}>Clear</button>
            </div>
          )}

          <div className="rb-capture-dock">
            <p className="rb-capture-dock__status">
              {captureState === "capturing"
                ? "Freezing frame"
                : captureState === "analyzing"
                  ? "Reading urban signals"
                  : uploadedPreview
                    ? "Tap shutter to analyze this photo"
                    : "Hold steady and take a photo"}
            </p>
            <div className="rb-capture-dock__controls">
              <button className="rb-control-button" onClick={openPhotoLibrary} disabled={captureState !== "idle"}>Library</button>
              <button
                className="rb-shutter-button"
                onClick={captureFrame}
                disabled={captureState !== "idle"}
                aria-label={uploadedPreview ? "Analyze selected photo" : "Take photo"}
              >
                <span className="rb-shutter-button__inner" />
              </button>
              <button className="rb-control-button" onClick={flipCamera} disabled={captureState !== "idle"}>Flip</button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleLibraryFile}
            style={{ display: "none" }}
          />
        </section>
      )}

      {view === "details" && selectedRecord && (
        <section className="rb-details-page">
          <section className="rb-details-sheet">
            <div className="rb-details-sheet__header">
              <div>
                <p className="rb-kicker">Detected building</p>
                <h2>{selectedRecord.building.name}</h2>
                <p className="rb-details-sheet__subline">{sessionDescription}</p>
              </div>
              <div className="rb-details-meta">
                <span className={`rb-confidence rb-confidence--${confidence}`}>{confidence}</span>
                <span>{formatHeading(heading)}</span>
              </div>
            </div>

            <article className="rb-summary-card">
              <p className="rb-kicker">{PERSONA_META[persona].label} lens</p>
              <h3>{PERSONA_META[persona].prompt}</h3>
              <p>{summary}</p>
            </article>

            <div className="rb-detail-grid">
              {detailCards.map((card) => (
                <article key={card.label} className="rb-detail-card">
                  <p className="rb-kicker">{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.note}</span>
                </article>
              ))}
            </div>

            <article className="rb-export-panel">
              <p className="rb-kicker">Export and share</p>
              <div className="rb-export-panel__package-grid rb-export-panel__package-grid--single">
                <button className="rb-export-option" onClick={() => setExportFormat("pdf")}>
                  <span>Generate PDF</span>
                  <small>Architecture snapshot report</small>
                </button>
                <button className="rb-export-option" onClick={() => setExportFormat("slides")}>
                  <span>Generate Slides</span>
                  <small>Stage-ready architecture deck</small>
                </button>
              </div>
              {exportFormat && (
                <div className="rb-export-delivery">
                  <p className="rb-export-delivery__label">Choose destination for {exportLabel}</p>
                  <div className="rb-export-panel__actions">
                    <button className="rb-secondary-button rb-secondary-button--mini" onClick={() => handleDelivery("email")}>Email</button>
                    <button className="rb-secondary-button rb-secondary-button--mini" onClick={() => handleDelivery("whatsapp")}>WhatsApp</button>
                    <button className="rb-secondary-button rb-secondary-button--mini" onClick={() => handleDelivery("local")}>Save to Local</button>
                  </div>
                </div>
              )}
              {saveNotice && <p className="rb-export-panel__notice">{saveNotice}</p>}
            </article>
            <div className="rb-persona-cluster rb-persona-cluster--bottom">
              {(Object.keys(PERSONA_META) as Persona[]).map((entry) => (
                <button
                  key={entry}
                  className={`rb-persona-chip ${persona === entry ? "rb-persona-chip--active" : ""}`}
                  onClick={() => setPersona(entry)}
                >
                  <span>{PERSONA_META[entry].label}</span>
                  <small>{PERSONA_META[entry].detail}</small>
                </button>
              ))}
            </div>

            <div className="rb-details-actions">
              <button className="rb-secondary-button" onClick={retake}>Retake</button>
              <button className="rb-primary-button rb-primary-button--compact" onClick={() => setView("scan")}>Scan Another</button>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}






