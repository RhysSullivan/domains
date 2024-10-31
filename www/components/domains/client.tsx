"use client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { AlertCircle, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { getDomainStatus, addDomain } from "./actions";
import { useQuery } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function DNSRecordDisplay({
	type,
	name,
	value,
	ttl,
}: { type: string; name: string; value: string; ttl?: string }) {
	return (
		<div className="flex items-center justify-start space-x-10 overflow-x-scroll max-w-[80vw] md:max-w-full bg-background p-4 rounded-md border-2 font-mono">
			<div>
				<p className="text-sm text-muted-foreground">Type</p>
				<p className="mt-2 text-sm">{type}</p>
			</div>
			<div>
				<p className="text-sm text-muted-foreground">Name</p>
				<p className="mt-2 text-sm">{name}</p>
			</div>
			<div>
				<p className="text-sm text-muted-foreground">Value</p>
				<p className="mt-2 text-sm">{value}</p>
			</div>
			{ttl && (
				<div>
					<p className="text-sm text-muted-foreground">TTL</p>
					<p className="mt-2 text-sm">{ttl}</p>
				</div>
			)}
		</div>
	);
}

export function useDomainStatus(domain: string) {
	const query = useQuery({
		queryKey: [`custom-domain-status-${domain}`],
		queryFn: () => getDomainStatus(domain),
		refetchInterval: 5000,
	});

	return {
		status: query.data?.status,
		domainJson: query.data?.domainJson,
		loading: query.isLoading,
	};
}

const getSubdomain = (name: string, apexName: string) => {
	if (name === apexName) return null;
	return name.slice(0, name.length - apexName.length - 1);
};

const InlineSnippet = ({
	className,
	children,
}: {
	className?: string;
	children: string;
}) => {
	return (
		<span
			className={cn(
				"inline-block rounded-md px-1 py-0.5 font-mono bg-primary-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
};

function DomainConfiguration(props: { domain: string }) {
	const { domain } = props;
	const [tab, setTab] = useState<string | null>(null);

	const { status, domainJson } = useDomainStatus(domain);

	if (!status || status === "Valid Configuration" || !domainJson) return null;

	const subdomain = getSubdomain(domainJson.name, domainJson.apexName);

	const txtVerification =
		(status === "Pending Verification" &&
			domainJson.verification.find((x) => x.type === "TXT")) ||
		null;

	if (status === "Unknown Error") {
		return <p className="mb-5 text-sm">{domainJson.error.message}</p>;
	}

	console.log(domainJson, domainJson.name, domainJson.apexName);
	const selectedTab = tab
		? tab
		: txtVerification
			? "txt"
			: domainJson.name === domainJson.apexName
				? "apex"
				: "subdomain";
	const isApexName = domainJson.name === domainJson.apexName;
	return (
		<Tabs
			onValueChange={(value) => setTab(value)}
			value={selectedTab}
			className="w-full"
		>
			<TabsList className="bg-background border-b-2 rounded-none  border-b-muted w-full justify-start ">
				{txtVerification ? (
					<TabsTrigger
						value="txt"
						className={cn(
							"bg-background p-2  text-muted-foreground rounded-none border-b-muted",
							selectedTab === "txt" &&
								"border-b-primary border-b-2 text-primary",
						)}
					>
						Domain Verification
					</TabsTrigger>
				) : (
					<>
						<TabsTrigger
							value="subdomain"
							className={cn(
								"bg-background p-2 text-muted-foreground  rounded-none border-b-muted",
								selectedTab === "subdomain" &&
									"border-b-primary border-b-2 text-primary",
							)}
						>
							CNAME (Recommended)
						</TabsTrigger>
						{isApexName && (
							<TabsTrigger
								value="apex"
								className={cn(
									"bg-background   p-2 text-muted-foreground rounded-none border-b-muted",
									selectedTab === "apex" &&
										"border-b-primary border-b-2  text-primary",
								)}
							>
								Apex
							</TabsTrigger>
						)}
					</>
				)}
			</TabsList>

			{txtVerification && (
				<TabsContent value="txt">
					<div className="flex flex-col space-y-4 pt-4">
						<p className="text-sm text-muted-foreground ">
							Please set the following TXT record on{" "}
							<InlineSnippet>{domainJson.apexName}</InlineSnippet> to prove
							ownership of <InlineSnippet>{domainJson.name}</InlineSnippet>:
						</p>
						<DNSRecordDisplay
							name={txtVerification.domain.slice(
								0,
								txtVerification.domain.length - domainJson.apexName.length - 1,
							)}
							type={txtVerification.type}
							value={txtVerification.value}
						/>
						<p className="text-sm text-muted-foreground mt-4">
							Warning: if you are using this domain for another site, setting
							this TXT record will transfer domain ownership away from that site
							and break it. Please exercise caution when setting this record.
						</p>
					</div>
				</TabsContent>
			)}

			<TabsContent value="subdomain">
				<div className="flex flex-col gap-4 pt-4">
					<span className="text-sm">
						To configure your subdomain{" "}
						<InlineSnippet>{domainJson.name}</InlineSnippet>, set the following
						CNAME record on your DNS provider to continue:
					</span>
					<DNSRecordDisplay
						type={"CNAME"}
						name={subdomain ?? "www"}
						value={`cname.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "vercel-dns.com"}`}
						ttl="86400"
					/>
				</div>
			</TabsContent>
			<TabsContent value="apex">
				<div className="flex flex-col gap-4 pt-4">
					<span className="text-sm">
						To configure your domain{" "}
						<InlineSnippet>{domainJson.apexName}</InlineSnippet>, set the
						following A record on your DNS provider to continue:
					</span>
					<DNSRecordDisplay type="A" name="@" value="76.76.21.21" ttl="86400" />
				</div>
			</TabsContent>
			{selectedTab !== "txt" && (
				<div className="my-3 text-left">
					<p className="mt-5 text-sm dark:text-white">
						Note: for TTL, if <InlineSnippet>86400</InlineSnippet> is not
						available, set the highest value possible. Also, domain propagation
						can take up to an hour.
					</p>
				</div>
			)}
		</Tabs>
	);
}

export function DomainStatus({ domain }: { domain: string }) {
	const { status, loading } = useDomainStatus(domain);
	if (loading) {
		return <LoaderCircle className="dark:text-white text-black animate-spin" />;
	}
	if (status === "Valid Configuration") {
		return (
			<CheckCircle2
				fill="#2563EB"
				stroke="currentColor"
				className="text-white dark:text-white"
			/>
		);
	}
	if (status === "Pending Verification") {
		return (
			<AlertCircle
				fill="#FBBF24"
				stroke="currentColor"
				className="text-white dark:text-black"
			/>
		);
	}
	if (status === "Domain Not Found") {
		return (
			<XCircle
				fill="#DC2626"
				stroke="currentColor"
				className="text-white dark:text-black"
			/>
		);
	}
	if (status === "Invalid Configuration") {
		return (
			<XCircle
				fill="#DC2626"
				stroke="currentColor"
				className="text-white dark:text-black"
			/>
		);
	}
	return null;
}

export function SiteSettingsDomains(props: {
	defaultDomain?: string;
}) {
	const [domain, setDomain] = useState<string | null>(
		props.defaultDomain ?? null,
	);
	const { pending } = useFormStatus();
	return (
		<Card className="flex flex-col space-y-6">
			<form
				onSubmit={async (event) => {
					event.preventDefault(); // Prevent form from reloading the page
					const data = new FormData(event.currentTarget);
					const domain = data.get("customDomain") as string;
					setDomain(domain);
					await addDomain(domain);
				}}
			>
				<CardHeader>
					<CardTitle className="text-lg font-semibold">Custom Domain</CardTitle>
					<CardDescription>The custom domain for your site.</CardDescription>
				</CardHeader>
				<CardContent className="relative bg-background flex flex-row items-center justify-between w-full">
					<Input
						type="text"
						name="customDomain"
						placeholder={"example.com"}
						maxLength={64}
						className="max-w-sm bg-background"
						defaultValue={props.defaultDomain}
					/>
					<div className="flex items-center space-x-2">
						{domain && <DomainStatus domain={domain} />}

						<Button type="submit" variant="outline">
							{pending ? <LoaderCircle className="animate-spin" /> : "Save"}
						</Button>
					</div>
				</CardContent>
				{domain && (
					<CardFooter className="border-t-2 border-muted flex justify-start flex-grow pt-4">
						<DomainConfiguration domain={domain} />
					</CardFooter>
				)}
			</form>
		</Card>
	);
}