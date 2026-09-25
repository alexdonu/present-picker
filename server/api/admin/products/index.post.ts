import { products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const { input, file } = await readProductForm(event)

  // An uploaded file wins over a pasted image address.
  const image = file ? await saveUpload(file) : (input.imageUrl ?? null)

  const created = useDb()
    .insert(products)
    .values({
      name: input.name,
      description: input.description ?? null,
      link: input.link ?? null,
      price: input.price ?? null,
      image,
    })
    .returning({ id: products.id })
    .get()

  setResponseStatus(event, 201)
  return { id: created.id }
})
