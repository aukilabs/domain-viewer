"use client";

import { use } from "react";
import ClientPage from "../ClientPage";

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return <ClientPage params={resolvedParams} hideUI={true} />;
}
