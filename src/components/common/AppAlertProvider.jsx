import { useCallback, useEffect, useState } from "react";

function AppAlertProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);
  const activeDialog = dialogs[0] || null;

  const closeDialog = useCallback(() => {
    setDialogs((current) => current.slice(1));
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message = "") => {
      setDialogs((current) => [
        ...current,
        {
          id: `${Date.now()}_${Math.random()}`,
          message: String(message),
        },
      ]);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    if (!activeDialog) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, closeDialog]);

  return (
    <>
      {children}

      {activeDialog && (
        <div className="app-alert-overlay" role="presentation">
          <div
            className="app-alert-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-alert-title"
            aria-describedby="app-alert-message"
          >
            <h2 id="app-alert-title">Notifikasi</h2>
            <p id="app-alert-message">{activeDialog.message}</p>

            <div className="app-alert-actions">
              <button className="secondary-button" type="button" onClick={closeDialog}>
                Batal
              </button>
              <button className="primary-button" type="button" onClick={closeDialog} autoFocus>
                Oke
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppAlertProvider;
