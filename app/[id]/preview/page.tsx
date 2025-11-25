"use client";

import ClientPage from "../ClientPage";

export default function PreviewPage({ params }: { params: { id: string } }) {
    return <ClientPage params={params} hideUI={true} />;
}
