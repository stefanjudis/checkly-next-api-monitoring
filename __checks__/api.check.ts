import {
  ApiCheck,
  AssertionBuilder,
  CheckGroup,
  Frequency,
} from "checkly/constructs"
import { globSync } from "glob"

const BASE_URL =
  process.env.ENVIRONMENT_URL ||
  `https://checkly-next-api-monitoring.vercel.app`

export default async function createChecks() {
  try {
    const group = new CheckGroup("checkly-next", {
      name: "Checkly Next.js API Monitoring",
      locations: ["us-east-1", "eu-west-1"],
      frequency: Frequency.EVERY_1H,
    })

    const endpoints = await getAllGetEndpoints()

    for (const endpoint of endpoints) {
      const { id, filePath, publicPath } = endpoint

      new ApiCheck(id, {
        name: filePath,
        request: {
          url: `${BASE_URL}/${publicPath}`,
          method: "GET",
          assertions: [AssertionBuilder.statusCode().equals(200)],
        },
        group: group,
      })
    }
  } catch (error) {
    console.error(error)
  }
}

// -----------------------------------------------------------------------------

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
