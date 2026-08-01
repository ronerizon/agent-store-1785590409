import { Metadata } from "next"

import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

export const metadata: Metadata = {
  title: "Golden Crumb Bakery | Baked with intention",
  description: "Small-batch pastries, bread, and cakes from Golden Crumb Bakery.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) return null

  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: { limit: 8, fields: "*variants.calculated_price" },
  })

  return (
    <div className="bakery-page">
      <section className="bakery-hero">
        <div className="bakery-hero-copy">
          <p className="bakery-kicker">EST. 2012 · BAKED DAILY</p>
          <h1>Good things<br />take <em>butter.</em></h1>
          <p className="bakery-intro">
            Warm, slow-made pastries and naturally leavened bread, prepared fresh each morning in our little neighborhood kitchen.
          </p>
          <div className="bakery-actions">
            <a className="bakery-button" href="#fresh-from-the-oven">Order today <span>→</span></a>
            <LocalizedClientLink className="bakery-text-link" href="/store">Explore the bakery</LocalizedClientLink>
          </div>
          <div className="bakery-note"><span>✦</span> Pickup & local delivery, Tuesday—Sunday</div>
        </div>
        <div className="bakery-hero-art" role="img" aria-label="Freshly baked pastries">
          <div className="bakery-stamp">MADE<br />WITH<br />CARE</div>
        </div>
      </section>

      <section className="bakery-promise">
        <p><span>01</span> Real butter, never shortcuts</p>
        <p><span>02</span> Flour milled for flavor</p>
        <p><span>03</span> A little joy, daily</p>
      </section>

      <section id="fresh-from-the-oven" className="bakery-products content-container">
        <div className="bakery-section-head">
          <div>
            <p className="bakery-kicker">THE COUNTER</p>
            <h2>Fresh from<br /><em>the oven.</em></h2>
          </div>
          <p className="bakery-section-copy">The small-batch favorites we make fresh every morning. Add a little something delicious to your day.</p>
        </div>
        {products.length ? (
          <ul className="bakery-product-grid">
            {products.map((product, index) => (
              <li key={product.id} className={index === 1 ? "bakery-card-offset" : ""}>
                <ProductPreview product={product} region={region} isFeatured />
              </li>
            ))}
          </ul>
        ) : (
          <p className="bakery-empty">Our ovens are warming up. Please check back shortly.</p>
        )}
        <div className="bakery-all-link"><LocalizedClientLink href="/store">See everything in the bakery <span>→</span></LocalizedClientLink></div>
      </section>

      <section className="bakery-story">
        <div className="bakery-story-image" />
        <div className="bakery-story-copy">
          <p className="bakery-kicker">OUR DAILY RITUAL</p>
          <h2>Made slowly.<br />Enjoyed <em>fully.</em></h2>
          <p>Before the city wakes, our bakers are folding dough, feeding starters, and filling the kitchen with the kind of scent that makes you pause at the door.</p>
          <LocalizedClientLink href="/store" className="bakery-text-link">Meet today's bake <span>→</span></LocalizedClientLink>
        </div>
      </section>
    </div>
  )
}
