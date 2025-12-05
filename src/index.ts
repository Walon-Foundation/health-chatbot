import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

import query from "./routes/query.js"


const app = new Hono().basePath("/api/v1/")

//middlewares
app.use(logger())
app.use(secureHeaders())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

//query route
app.route("/", query)
//webhook route
// app.post("/webhook", webhook)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})