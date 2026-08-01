import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="bakery-empty-cart py-48 px-2 flex flex-col justify-center items-start" data-testid="empty-cart-message">
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        Your bag is waiting
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        Nothing delicious in here yet. Find a warm pastry or a fresh loaf for your table.
      </Text>
      <div>
        <InteractiveLink href="/store">Visit the counter →</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
