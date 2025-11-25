import { Metadata } from "next";
import { fetchDomainInfo } from "@/app/actions";
import ClientPage from "./ClientPage";

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

    if (result.success && result.data) {
        const { domainInfo } = result.data;
        const title = `Domain: ${domainInfo.name || domainId}`;
        const description = `Click to see the ${domainInfo.name || domainId} through the eyes of AI`;

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
                site: "@solar_axons",
                title,
                description,
                images: ["/images/og-image.png"],
                players: [
                    {
                        playerUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://preview-on-x.ngrok.app'}/${domainId}`,
                        streamUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://preview-on-x.ngrok.app'}/${domainId}`,
                        width: 1200,
                        height: 630,
                    },
                ],
            },
        };
    }

    return {
        title: "Auki Domain Viewer",
        description: "View and analyze spatial domain information in 3D",
    };
}

export default function Page({ params }: Props) {
    return <ClientPage params={params} />;
}
