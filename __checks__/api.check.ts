import { ApiCheck } from "checkly/constructs"
import { globSync } from "glob"

function slugifyRoutePath(path: string) {
  return path.replace(/\//g, "-").replace(/\.[jt]s/, "")
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

const BASE_URL =
  process.env.ENVIRONMENT_URL ||
  `https://checkly-next-api-monitoring.vercel.app/`

export default async function createChecks() {
  try {
    const allEndpointFiles = await getEndpointFiles()
    const allEndpoints = await Promise.all(
      allEndpointFiles.map((path) => importModule(path))
    )
    const getEndpoints = allEndpoints.filter(({ module }) => !!module.GET)

    for (const endpoint of getEndpoints) {
      new ApiCheck(slugifyRoutePath(endpoint.path), {
        name: endpoint.path,
        request: {
          url: `${BASE_URL}${slugifyRoutePath(endpoint.path)}`,
          method: "GET",
        },
      })
    }
  } catch (error) {
    console.error(error)
  }
}
