import { ApiCheck, CheckGroup } from "checkly/constructs"
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
      path,
      id: slugifyRoutePath(path),
      publicPath: getPublicPath(path),
    }
  })
}

const BASE_URL =
  process.env.ENVIRONMENT_URL ||
  `https://checkly-next-api-monitoring.vercel.app`

export default async function createChecks() {
  try {
    const group = new CheckGroup("checkly-next", {
      name: "Checkly Next.js API Monitoring",
      locations: ["us-east-1", "eu-west-1"],
    })

    const endpoints = await getAllGetEndpoints()

    for (const endpoint of endpoints) {
      const { path, id, publicPath } = endpoint

      new ApiCheck(id, {
        name: path,
        request: {
          url: `${BASE_URL}/${publicPath}`,
          method: "GET",
        },
        group: group,
      })
    }
  } catch (error) {
    console.error(error)
  }
}
