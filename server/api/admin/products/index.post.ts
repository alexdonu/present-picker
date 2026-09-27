import { products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const { input, file } = await readProductForm(event)

  // An uploaded file wins over a pasted image address.
  const imageId = file ? saveImage(file) : undefined

  const created = useDb()
    .insert(products)
    .values({
      name: input.name,
      description: input.description ?? null,
      link: input.link ?? null,
      price: input.price ?? null,
      imageId: imageId ?? null,
      imageUrl: imageId ? null : (input.imageUrl ?? null),
    })
    .returning({ id: products.id })
    .get()

  setResponseStatus(event, 201)
  return { id: created.id }
})
