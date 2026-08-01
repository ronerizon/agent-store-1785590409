import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <header className="bakery-nav">
        <nav className="content-container flex items-center justify-between h-full text-sm">
          <div className="flex-1 basis-0 flex items-center gap-4">
            <div className="md:hidden"><SideMenu regions={regions} locales={locales} currentLocale={currentLocale} /></div>
            <LocalizedClientLink href="/store" className="hidden md:block bakery-nav-link">Shop</LocalizedClientLink>
            <a href="#fresh-from-the-oven" className="hidden md:block bakery-nav-link">Today's bake</a>
          </div>
          <LocalizedClientLink href="/" className="bakery-logo" data-testid="nav-store-link">
            Golden <span>Crumb</span>
          </LocalizedClientLink>
          <div className="flex items-center gap-5 flex-1 basis-0 justify-end">
            <LocalizedClientLink className="hidden md:block bakery-nav-link" href="/account">My account</LocalizedClientLink>
            <Suspense fallback={<LocalizedClientLink className="bakery-nav-link" href="/cart">Bag (0)</LocalizedClientLink>}><CartButton /></Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
