import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  return (
    <footer className="bakery-footer">
      <div className="content-container">
        <div className="bakery-footer-top">
          <div>
            <p className="bakery-kicker">COME SAY HELLO</p>
            <h2>There&apos;s always<br />something <em>warm.</em></h2>
          </div>
          <LocalizedClientLink href="/store" className="bakery-button">Shop the counter <span>→</span></LocalizedClientLink>
        </div>
        <div className="bakery-footer-bottom">
          <div className="bakery-logo">Golden <span>Crumb</span></div>
          <p>© {new Date().getFullYear()} Golden Crumb Bakery</p>
          <p>Made fresh, with love.</p>
        </div>
      </div>
    </footer>
  )
}
