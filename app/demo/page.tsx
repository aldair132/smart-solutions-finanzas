import Link from "next/link";
export default function Page() {
  return (
    <main className="page demo-exit">
      <span className="exit-symbol">✧</span>
      <p className="eyebrow">HASTA PRONTO</p>
      <h1>Todo empieza con claridad.</h1>
      <p>
        Saliste de la demostración. Tus cambios temporales se han reiniciado.
      </p>
      <Link className="button primary" href="/">
        Volver a la demostración
      </Link>
    </main>
  );
}
