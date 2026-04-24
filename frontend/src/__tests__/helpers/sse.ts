export function createSSEResponse(events: object[], options?: { status?: number }) {
  const body = events.map(e => `data: ${JSON.stringify(e)}\n`).join('')
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    }
  })
  return new Response(stream, {
    status: options?.status ?? 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
