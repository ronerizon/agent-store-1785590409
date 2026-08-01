import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow, createSalesChannelsWorkflow, createShippingProfilesWorkflow } from "@medusajs/medusa/core-flows"

/** Creates the small, shippable bakery catalog once; safe to run on every boot. */
export default async function seedBakeryCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  let salesChannels = await salesChannelModule.listSalesChannels({}, { take: 1 })
  let profiles = await fulfillmentModule.listShippingProfiles({ type: "default" })

  if (!salesChannels[0]) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Golden Crumb Counter" }] },
    })
    salesChannels = result
  }

  if (!profiles[0]) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    profiles = result
  }

  // Bootstrap creates the publishable key before this catalog runs on a fresh
  // install. Link the key after ensuring this sales channel exists, otherwise
  // store API requests correctly reject the key as channel-less.
  const publishableKeys = await apiKeyModule.listApiKeys({ type: "publishable" })
  if (publishableKeys[0]) {
    try {
      await link.create({
        [Modules.API_KEY]: { publishable_key_id: publishableKeys[0].id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannels[0].id },
      })
    } catch {
      // The link already exists on every later boot.
    }
  }

  const catalog = [
    {
      title: "Butter Cloud Croissant",
      handle: "butter-cloud-croissant",
      description: "A deeply laminated, all-butter croissant with a shattering golden crust.",
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85",
      price: 450,
    },
    {
      title: "Midnight Chocolate Babka",
      handle: "midnight-chocolate-babka",
      description: "Twisted brioche, dark chocolate, and a glossy cocoa syrup finish.",
      image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1200&q=85",
      price: 1600,
    },
    {
      title: "Strawberry Silk Tart",
      handle: "strawberry-silk-tart",
      description: "Vanilla bean pastry cream, ripe berries, and a crisp almond sablé shell.",
      image: "https://images.unsplash.com/photo-1461009683693-342af2f2d6ce?auto=format&fit=crop&w=1200&q=85",
      price: 825,
    },
    {
      title: "Sunday Sourdough",
      handle: "sunday-sourdough",
      description: "Naturally leavened country loaf with a caramelized crust and open crumb.",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85",
      price: 750,
    },
  ]

  const existing = await productModule.listProducts({
    handle: catalog.map((product) => product.handle),
  })
  const existingHandles = new Set(existing.map((product) => product.handle))
  const products = catalog.filter((product) => !existingHandles.has(product.handle))

  if (!products.length) {
    logger.info("bakery catalog: already present")
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: products.map((product) => ({
        title: product.title,
        handle: product.handle,
        description: product.description,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: profiles[0].id,
        thumbnail: product.image,
        images: [{ url: product.image }],
        options: [{ title: "Size", values: ["One size"] }],
        variants: [
          {
            title: "One size",
            sku: `BAKERY-${product.handle.toUpperCase()}`,
            options: { Size: "One size" },
            manage_inventory: false,
            prices: [{ amount: product.price, currency_code: "usd" }],
          },
        ],
        sales_channels: [{ id: salesChannels[0].id }],
      })),
    },
  })

  logger.info(`bakery catalog: created ${products.length} products`)
}
