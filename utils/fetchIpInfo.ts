export async function fetchIpInfo(ip: string) {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`)
    const data = await response.json()
    if (data.country) {
      return data
    } else {
      throw new Error("Failed to fetch IP information")
    }
  } catch (error) {
    console.error("Error fetching IP info:", error)
    return null
  }
}

