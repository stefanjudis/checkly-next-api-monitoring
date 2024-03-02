import { ApiCheck, CheckGroup, Frequency } from "checkly/constructs"
import { globSync } from "glob"

function slugifyRoutePath(path: string) {
  return path.replace(/\//g, "-").replace(/\.[jt]s/, "")
}

function getPublicPath(path: string) {
  return path.replace("app/", "").replace(/route\.[jt]s/, "")
}

async function importModule(path: string) {
  return import(`../${path}`).then((module) => {
    return {
      path,
      module,
    }
  })
}

function getEndpointFiles() {
  return globSync("**/route.{js,ts}", {
    ignore: "node_modules/**",
  })
}

async function getAllGetEndpoints() {
  // read all `route.ts` files
  const allEndpointFiles = await getEndpointFiles()
  // import all `route.ts` exports
  const allEndpoints = await Promise.all(
    allEndpointFiles.map((path) => importModule(path))
  )
  // filter out all `GET` exports
  const getEndpoints = allEndpoints.filter(({ module }) => !!module.GET)

  // map items to id, path and publicPath
  return getEndpoints.map(({ path, module }) => {
    return {
      filePath: path, // app/items/route.ts
      id: slugifyRoutePath(path), // app-items-route
      publicPath: getPublicPath(path), // items/
    }
  })
}

// -----------------------------------------------------------------------------

const BASE_URL =
  process.env.ENVIRONMENT_URL ||
  `https://checkly-next-api-monitoring.vercel.app`

const group = new CheckGroup("checkly-next", {
  name: "Checkly Next.js API Monitoring",
  locations: ["us-east-1", "eu-west-1"],
  frequency: Frequency.EVERY_1H,
})

new ApiCheck("items", {
  name: "app/items/route.ts",
  request: {
    url: `${BASE_URL}/items/`,
    method: "GET",
  },
  group: group,
})
