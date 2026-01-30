import { Metadata } from "next";
import { fetchDomainInfo } from "@/app/actions";
import ClientPage from "./ClientPage";
import { headers } from "next/headers";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const domainId = resolvedParams.id;
    // Use a temporary client ID for metadata fetching
    const posemeshClientId = "metadata-fetcher-" + Math.random().toString(36).substring(7);

    const result = await fetchDomainInfo(domainId, posemeshClientId);

    // Compute absolute base URL from incoming request headers
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    if (result.success && result.data) {
        const { domainInfo } = result.data;
        const title = `Domain: ${domainInfo.name || domainId}`;
        const description = `Click to see this Real World Web domain`;

        const imageUrl = `${baseUrl}/images/og-image.png`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: [
                    {
                        url: imageUrl, // We could potentially generate a dynamic image here later
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
                images: [imageUrl],
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

export default async function Page({ params }: Props) {
    const resolvedParams = await params;
    return <ClientPage params={resolvedParams} />;
}
