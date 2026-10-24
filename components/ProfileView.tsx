"use client";
import { MessageDialog } from "./MessageDialog";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";
type ProfilePanel =
  | "customer"
  | "support"
  | "password"
  | "terms"
  | "privacy"
  | "settings"
  | "logout";
const panelTitles: Record<ProfilePanel, string> = {
  customer: "Datos del cliente",
  support: "Atención al cliente",
  password: "Cambiar clave",
  terms: "Términos y condiciones",
  privacy: "Política de privacidad",
  settings: "Configuración del espacio",
  logout: "Salir y reiniciar demo",
};
export function ProfileView({ spaceId }: { spaceId: string }) {
  const {
    user,
    spaces,
    movements,
    receivables,
    updateUser,
    updateSpace,
    removeSpace,
    reset,
  } = useDemo();
  const router = useRouter();
  const space = spaces.find((item) => item.id === spaceId);
  const spaceMovementCount = movements.filter(
    (movement) => movement.spaceId === spaceId,
  ).length;
  const spaceReceivableCount = receivables.filter(
    (receivable) => receivable.spaceId === spaceId,
  ).length;
  const [panel, setPanel] = useState<ProfilePanel | null>(null);
  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  function openPanel(panel: ProfilePanel) {
    setName(panel === "customer" ? user.fullName : (space?.name ?? ""));
    setDirty(false);
    setError("");
    setIsConfirmingDelete(false);
    setPanel(panel);
  }
  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (panel === "customer") updateUser(name);
      else updateSpace(name, spaceId);
      setPanel(null);
      setNotice("Cambios aplicados a esta demo.");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
    }
  }
  function handleDeleteSpace() {
    try {
      router.push("/");
      removeSpace(spaceId);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo eliminar.",
      );
    }
  }
  function option(panel: ProfilePanel, icon: IconName, label?: string) {
    return (
      <button className="profile-option" onClick={() => openPanel(panel)}>
        <Icon name={icon} />
        <span>{label ?? panelTitles[panel]}</span>
        <Icon name="arrow" />
      </button>
    );
  }
  if (!space) return null;
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">TU CUENTA, SIEMPRE CONTIGO</p>
        <h1>Perfil</h1>
      </div>
      <div className="profile-grid">
        <aside>
          <div className="profile-summary">
            <span className="avatar">
              <Icon name="user" />
            </span>
            <div>
              <h2>{user.fullName}</h2>
              <p>Tu cuenta para todos tus espacios</p>
            </div>
          </div>
          <p className="profile-intro">
            Un mismo perfil para acompañarte
            <br />
            en cada uno de tus negocios.
          </p>
        </aside>
        <section className="profile-options">
          <div className="option-group">
            {option("customer", "user")}
            {option("support", "help")}
            <button
              className="profile-option disabled"
              disabled
              aria-describedby="biometry-note"
            >
              <Icon name="fingerprint" />
              <span>
                Biometría digital
                <small id="biometry-note">
                  Próximamente · No disponible en la demo
                </small>
              </span>
              <span className="switch-off" />
            </button>
          </div>
          <div className="option-group">
            {option("password", "lock")}
            {option("terms", "receipt")}
            {option("privacy", "shield")}
          </div>
          <div className="option-group">
            {option("settings", "settings", `Configuración de ${space.name}`)}
          </div>
          <div className="option-group">{option("logout", "logout")}</div>
          {notice && <MessageDialog message={notice} onClose={() => setNotice("")} />}
        </section>
      </div>
      {panel && (
        <Dialog
          title={panelTitles[panel]}
          onClose={() => setPanel(null)}
          dirty={dirty}
        >
          {panel === "customer" || panel === "settings" ? (
            <form onSubmit={handleSave}>
              <p className="muted">
                {panel === "settings"
                  ? "Moneda: PEN · Soles peruanos"
                  : "Este nombre se comparte entre todos tus espacios."}
              </p>
              <label>
                Nombre
                <input
                  autoFocus
                  required
                  maxLength={60}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              {error && (
                <MessageDialog tone="error" message={error} onClose={() => setError("")} />
              )}
              <button className="button primary">Guardar cambios</button>
            </form>
          ) : null}
          {panel === "settings" && space?.type === "business" && (
            <div className="danger-zone">
              <h3>Eliminar este negocio</h3>
              <p className="muted">
                Se borrarán {spaceMovementCount} movimiento
                {spaceMovementCount === 1 ? "" : "s"} y {spaceReceivableCount}{" "}
                fiado{spaceReceivableCount === 1 ? "" : "s"} de «{space.name}».
                No se puede deshacer.
              </p>
              {isConfirmingDelete ? (
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button danger"
                    onClick={handleDeleteSpace}
                  >
                    Sí, eliminar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="button danger-outline"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  Eliminar negocio
                </button>
              )}
            </div>
          )}
          {panel === "support" && (
            <div className="help-content">
              <h3>¿Cómo registro una venta o gasto?</h3>
              <p>
                En Inicio toca Voz y dicta varias ventas y gastos a la vez, o
                Foto para leer una boleta o tu cuaderno. La IA prepara los
                registros y tú confirmas.
              </p>
              <h3>¿Se conservan mis cambios?</h3>
              <p>
                Se guardan en este navegador si el almacenamiento está disponible.
                No se sincronizan con otros dispositivos. Al elegir «Salir y
                reiniciar demo» se restablecen los datos de ejemplo.
              </p>
              <p className="extraction-box">Canal de contacto pendiente.</p>
            </div>
          )}
          {panel === "password" && (
            <p className="muted">
              Disponible al conectar el inicio de sesión. Esta demostración no
              solicita ni guarda contraseñas.
            </p>
          )}
          {(panel === "terms" || panel === "privacy") && (
            <>
              <p className="extraction-box">Documento pendiente de revisión</p>
              <p className="muted">
                El contenido aprobado estará disponible cuando se definan las
                condiciones del servicio y el tratamiento real de los datos.
              </p>
              {panel === "privacy" && (
                <p className="muted">
                  Los registros de esta demo se guardan localmente. Al usar la IA
                  configurada, se envían audio, imágenes o un resumen de tus
                  registros a su proveedor para procesarlos.
                </p>
              )}
            </>
          )}
          {panel === "logout" && (
            <>
              <p className="muted">
                Se borrarán los cambios de esta demo guardados en este navegador
                y volverán los datos de ejemplo. Esta acción no se puede deshacer.
              </p>
              <div className="dialog-actions">
                <button
                  className="button outline"
                  onClick={() => setPanel(null)}
                >
                  Cancelar
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    reset();
                    router.push("/demo");
                  }}
                >
                  Salir y reiniciar
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
