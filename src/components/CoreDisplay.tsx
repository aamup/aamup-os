import { brand } from '../core/config/brand'

export function CoreDisplay() {
  return (
    <main className="core-display">
      <div className="grid-field" />
      <div className="scanner scanner--one" />
      <div className="scanner scanner--two" />
      <div className="core-orbit core-orbit--outer" />
      <div className="core-orbit core-orbit--inner" />
      <div className="core-mark">
        <span className="core-mark__eyebrow">SYSTEM CORE</span>
        <h1>{brand.name}<span> // {brand.product}</span></h1>
        <p>{brand.tagline.toUpperCase()}</p>
        <div className="core-mark__status"><span /> COMMAND CENTER ONLINE</div>
      </div>
      <div className="coordinate coordinate--nw">43.6591 / -70.2568</div>
      <div className="coordinate coordinate--se">BUILD {brand.version}</div>
    </main>
  )
}
