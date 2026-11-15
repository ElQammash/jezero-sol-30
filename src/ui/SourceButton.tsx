import { useState } from "react";
import { createPortal } from "react-dom";
import { NASA, type DataEntry, type NasaKey } from "../data/nasa";
import { useT } from "../game/useT";

export default function SourceButton({
  keys,
  small,
}: {
  keys: NasaKey[];
  small?: boolean;
}) {
  const { t, n, dir } = useT();
  const [open, setOpen] = useState(false);
  if (keys.length === 0) return null;
  return (
    <>
      <button
        type="button"
        className={`src-btn ${small ? "small" : ""}`}
        onClick={(e) => (e.stopPropagation(), setOpen(true))}
      >
        ⓘ {t("common.source")}
      </button>
      {open &&
        createPortal(
          <div className="overlay top" dir={dir} onClick={() => setOpen(false)}>
            <div
              className="panel source-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{t("source.title")}</h3>
              {keys.map((k) => {
                const e = NASA[k] as DataEntry;
                return (
                  <section key={k} className="src-entry">
                    <div className="src-value">
                      <strong>{n(e.value, 3)}</strong>{" "}
                      <span dir="ltr">{e.unit}</span>
                    </div>
                    <div className="badges">
                      {e.simplified && (
                        <span className="badge warn">
                          {t("source.simplified")}
                        </span>
                      )}
                      {!e.nasa && (
                        <span className="badge bad">{t("source.notNasa")}</span>
                      )}
                      <span className="badge">
                        {t(`source.${e.verification}`)}
                      </span>
                    </div>
                    <p dir="ltr" className="src-name">
                      {e.sourceName}
                    </p>
                    {e.note && (
                      <p dir="ltr" className="src-note">
                        {e.note}
                      </p>
                    )}
                    <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                      {t("source.open")} ↗
                    </a>
                  </section>
                );
              })}
              <button
                type="button"
                className="btn"
                onClick={() => setOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
