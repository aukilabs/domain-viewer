import { Metadata } from "next";
import { fetchDomainInfo } from "@/app/actions";
import ClientPage from "./ClientPage";
import { headers } from "next/headers";

interface Props {
    params: {
        id: string;
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const domainId = params.id;
    // Use a temporary client ID for metadata fetching
    const posemeshClientId = "metadata-fetcher-" + Math.random().toString(36).substring(7);

    const result = await fetchDomainInfo(domainId, posemeshClientId);

    // Compute absolute base URL from incoming request headers
    const h = headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    if (result.success && result.data) {
        const { domainInfo } = result.data;
        const title = `Domain: ${domainInfo.name || domainId}`;
        const description = `Click to see this Real World Web domain`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: [
                    {
                        url: "/images/og-image.png", // We could potentially generate a dynamic image here later
                        width: 1200,
                        height: 630,
                        alt: `3D visualization of domain ${domainInfo.name}`,
                    },
                ],
            },
            twitter: {
                card: "player",
                site: "@Auki",
                title,
                description,
                images: ["/images/og-image.png"],
                players: [
                    {
                        playerUrl: `${baseUrl}/${domainId}`,
                        streamUrl: `${baseUrl}/${domainId}`,
                        width: 1200,
                        height: 630,
                    },
                ],
            },
        };
    }

    return {
        title: "Real World Web domain viewer",
        description: "RWW domain visualizer",
    };
}

export default function Page({ params }: Props) {
    return <ClientPage params={params} />;
}
