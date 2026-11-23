const maxDimension = 192
const maxEncodedSize = 150000

export async function encodeProfileImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not process that photo.')

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const image = canvas.toDataURL('image/webp', 0.82)
    if (image.length > maxEncodedSize) {
      throw new Error('That photo could not be compressed enough. Choose another image.')
    }

    return image
  } finally {
    bitmap.close()
  }
}
