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

const BASE_URL =
  process.env.ENVIRONMENT_URL ||
  `https://checkly-next-api-monitoring.vercel.app`

export default async function createChecks() {
  try {
    const group = new CheckGroup("checkly-next", {
      name: "Checkly Next.js API Monitoring",
      locations: ["us-east-1", "eu-west-1"],
    })

    const allEndpointFiles = await getEndpointFiles()
    const allEndpoints = await Promise.all(
      allEndpointFiles.map((path) => importModule(path))
    )
    const getEndpoints = allEndpoints.filter(({ module }) => !!module.GET)

    for (const endpoint of getEndpoints) {
      new ApiCheck(slugifyRoutePath(endpoint.path), {
        name: endpoint.path,
        request: {
          url: `${BASE_URL}/${getPublicPath(endpoint.path)}`,
          method: "GET",
        },
        group: group,
      })
    }
  } catch (error) {
    console.error(error)
  }
}
