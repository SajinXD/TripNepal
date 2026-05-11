import { SafeScreen } from "@/components/layout/SafeScreen";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { ChevronRight, MessageCircle, UserPlus } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> =
	{
		requested: { label: "New Request", color: "#D97706", bg: "#FEF3C7" },
		accepted: { label: "Accepted", color: "#059669", bg: "#D1FAE5" },
		rejected: { label: "Declined", color: "#DC2626", bg: "#FEE2E2" },
		in_progress: { label: "Active", color: "#2563EB", bg: "#DBEAFE" },
		completed: { label: "Completed", color: "#8B1A1A", bg: "#D1FAE5" },
		cancelled: { label: "Cancelled", color: "#6B7280", bg: "#F3F4F6" },
	};

export default function GuideInbox() {
	const router = useRouter();
	const { user } = useAuth();
	const [bookings, setBookings] = useState<any[]>([]);
	const [threads, setThreads] = useState<any[]>([]);
	const [chatRequests, setChatRequests] = useState<any[]>([]);
	const [loadingB, setLoadingB] = useState(true);
	const [loadingT, setLoadingT] = useState(true);
	const [loadingR, setLoadingR] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [stats, setStats] = useState({ response: 98, completion: 100 });
	const [pendingCount, setPendingCount] = useState(0);

	const load = useCallback(async () => {
		if (!user) return;
		try {
			const [bRes, tRes, cntRes, rRes] = await Promise.all([
				(supabase.from("bookings") as any)
					.select(
						"*, tourist:profiles!tourist_id(full_name, avatar_url)",
					)
					.eq("guide_id", user.id)
					.order("created_at", { ascending: false })
					.limit(10),
				(supabase.from("chat_threads") as any)
					.select(
						"*, tourist:profiles!tourist_id(full_name, avatar_url)",
					)
					.eq("guide_id", user.id)
					.order("last_message_at", { ascending: false })
					.limit(5),
				(supabase.from("bookings") as any)
					.select("id", { count: "exact", head: true })
					.eq("guide_id", user.id)
					.eq("status", "requested"),
				(supabase.from("chat_requests") as any)
					.select(
						"*, tourist:profiles!tourist_id(full_name, avatar_url)",
					)
					.eq("guide_id", user.id)
					.eq("status", "pending")
					.order("created_at", { ascending: false }),
			]);
			setBookings(bRes.data || []);
			setThreads(tRes.data || []);
			setPendingCount(cntRes.count || 0);
			setChatRequests(rRes.data || []);

			// Response rate: % of chat requests that guide has responded to (not still pending)
			const { data: crAll } = await (
				supabase.from("chat_requests") as any
			)
				.select("status")
				.eq("guide_id", user.id);
			const totalRequests = crAll?.length ?? 0;
			const responded = (crAll || []).filter(
				(r: any) => r.status !== "pending",
			).length;
			const responseRate =
				totalRequests > 0
					? Math.round((responded / totalRequests) * 100)
					: 100;

			// Completion rate: completed / (accepted + in_progress + completed)
			const { data: bkAll } = await (supabase.from("bookings") as any)
				.select("status")
				.eq("guide_id", user.id)
				.in("status", ["accepted", "in_progress", "completed"]);
			const totalActive = bkAll?.length ?? 0;
			const completedCount = (bkAll || []).filter(
				(b: any) => b.status === "completed",
			).length;
			const completionRate =
				totalActive > 0
					? Math.round((completedCount / totalActive) * 100)
					: 100;

			setStats({ response: responseRate, completion: completionRate });
		} catch (e) {
			console.warn("Inbox load error", e);
		} finally {
			setLoadingB(false);
			setLoadingT(false);
			setLoadingR(false);
			setRefreshing(false);
		}
	}, [user]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (!user) return;

		const bookingsChannel = supabase
			.channel(`guide_bookings_${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "bookings",
					filter: `guide_id=eq.${user.id}`,
				},
				() => load(),
			)
			.subscribe();

		const threadsChannel = supabase
			.channel(`guide_threads_${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "chat_threads",
					filter: `guide_id=eq.${user.id}`,
				},
				() => load(),
			)
			.subscribe();

		const requestsChannel = supabase
			.channel(`guide_requests_${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "chat_requests",
					filter: `guide_id=eq.${user.id}`,
				},
				() => load(),
			)
			.subscribe();

		return () => {
			supabase.removeChannel(bookingsChannel);
			supabase.removeChannel(threadsChannel);
			supabase.removeChannel(requestsChannel);
		};
	}, [user, load]);

	const activeBookings = bookings.filter((b) =>
		["accepted", "in_progress"].includes(b.status),
	);

	async function acceptRequest(req: any) {
		try {
			// Check if a thread already exists for this pair
			const { data: existing } = await (
				supabase.from("chat_threads") as any
			)
				.select("id")
				.eq("tourist_id", req.tourist_id)
				.eq("guide_id", user!.id)
				.maybeSingle();

			let threadId: string;
			if (existing) {
				threadId = existing.id;
			} else {
				const { data: newThread, error } = await (
					supabase.from("chat_threads") as any
				)
					.insert({ tourist_id: req.tourist_id, guide_id: user!.id })
					.select()
					.single();
				if (error) throw error;
				threadId = newThread.id;
			}

			await (supabase.from("chat_requests") as any)
				.update({ status: "accepted" })
				.eq("id", req.id);
			load();
			router.push(`/chat/${threadId}` as any);
		} catch (e: any) {
			Alert.alert(
				"Error",
				e?.message || "Could not accept request. Please try again.",
			);
		}
	}

	async function declineRequest(req: any) {
		Alert.alert(
			"Decline Request",
			`Decline chat request from ${(req.tourist as any)?.full_name || "this tourist"}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Decline",
					style: "destructive",
					onPress: async () => {
						await (supabase.from("chat_requests") as any)
							.update({ status: "rejected" })
							.eq("id", req.id);
						load();
					},
				},
			],
		);
	}

	return (
		<SafeScreen edges={["top"]} bg="#F7F7F4">
			<View className="px-6 py-4 flex-row justify-between items-center bg-background border-b border-border">
				<Text className="font-display text-2xl text-text">
					Workspace
				</Text>
				{pendingCount > 0 && (
					<View className="bg-red-500 px-2.5 py-1 rounded-full">
						<Text className="text-white font-bold text-xs">
							{pendingCount} new
						</Text>
					</View>
				)}
			</View>

			<ScrollView
				className="flex-1 px-6 pt-4"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							setRefreshing(true);
							load();
						}}
						tintColor="#8B1A1A"
					/>
				}
			>
				{/* ── Chat Requests ── */}
				{(loadingR || chatRequests.length > 0) && (
					<View className="mb-6">
						<View className="flex-row justify-between items-center mb-3">
							<View className="flex-row items-center">
								<UserPlus size={18} color="#8B1A1A" />
								<Text className="font-semibold text-lg text-text ml-2">
									Connect Requests
								</Text>
							</View>
							{chatRequests.length > 0 && (
								<View className="bg-red-500 px-2 py-0.5 rounded-full">
									<Text className="text-white text-xs font-bold">
										{chatRequests.length}
									</Text>
								</View>
							)}
						</View>

						{loadingR ? (
							<View className="items-center py-4">
								<ActivityIndicator color="#8B1A1A" />
							</View>
						) : (
							chatRequests.map((req) => {
								const tourist = req.tourist as any;
								const name = tourist?.full_name || "Tourist";
								const initial = name[0].toUpperCase();
								return (
									<View
										key={req.id}
										className="bg-card rounded-2xl border border-border p-4 shadow-sm mb-3"
									>
										<View className="flex-row items-center mb-3">
											<View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-3">
												<Text className="font-bold text-primary text-base">
													{initial}
												</Text>
											</View>
											<View className="flex-1">
												<Text className="font-semibold text-text">
													{name}
												</Text>
												<Text className="text-xs text-text-secondary mt-0.5">
													Wants to connect with you
												</Text>
											</View>
										</View>
										{req.message ? (
											<Text
												className="text-sm text-text-secondary bg-background rounded-xl px-3 py-2 mb-3"
												numberOfLines={2}
											>
												{req.message}
											</Text>
										) : null}
										<View className="flex-row gap-3">
											<TouchableOpacity
												activeOpacity={0.8}
												onPress={() =>
													declineRequest(req)
												}
												className="flex-1 border border-border rounded-xl py-2.5 items-center"
											>
												<Text className="font-semibold text-text-secondary text-sm">
													Decline
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												activeOpacity={0.8}
												onPress={() =>
													acceptRequest(req)
												}
												className="flex-1 bg-primary rounded-xl py-2.5 items-center"
											>
												<Text className="font-semibold text-white text-sm">
													Accept & Chat
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							})
						)}
					</View>
				)}

				{/* ── Booking Requests ── */}
				<View className="mb-6">
					<View className="flex-row justify-between items-center mb-3">
						<Text className="font-semibold text-lg text-text">
							Booking Requests
						</Text>
						<TouchableOpacity
							onPress={() =>
								router.push("/(guide)/dashboard" as any)
							}
						>
							<Text className="text-primary font-medium text-sm">
								View All
							</Text>
						</TouchableOpacity>
					</View>

					{loadingB ? (
						<View className="items-center py-8">
							<ActivityIndicator color="#8B1A1A" />
						</View>
					) : bookings.length === 0 ? (
						<View className="bg-card rounded-2xl border border-border p-6 items-center">
							<Text className="text-text-secondary text-sm text-center">
								No booking requests yet. Make sure your profile
								is verified!
							</Text>
						</View>
					) : (
						bookings.slice(0, 5).map((booking) => {
							const cfg =
								STATUS_CFG[booking.status] ??
								STATUS_CFG.requested;
							const touristName =
								(booking.tourist as any)?.full_name ||
								"Tourist";
							return (
								<TouchableOpacity
									key={booking.id}
									activeOpacity={0.7}
									onPress={() =>
										router.push(
											`/booking/${booking.id}` as any,
										)
									}
									className="bg-card rounded-2xl border border-border p-4 shadow-sm mb-3"
								>
									<View className="flex-row items-center">
										<View className="bg-primary/10 rounded-xl p-3 items-center justify-center w-14 h-14 mr-4">
											<Text className="font-display text-base text-primary">
												{new Date(
													booking.start_date,
												).getDate()}
											</Text>
											<Text className="text-[9px] font-semibold text-primary uppercase">
												{new Date(
													booking.start_date,
												).toLocaleString("default", {
													month: "short",
												})}
											</Text>
										</View>
										<View className="flex-1">
											<View className="flex-row items-center mb-1">
												<View
													style={{
														backgroundColor: cfg.bg,
													}}
													className="px-2 py-0.5 rounded-md mr-2"
												>
													<Text
														style={{
															color: cfg.color,
														}}
														className="text-[9px] font-bold uppercase"
													>
														{cfg.label}
													</Text>
												</View>
											</View>
											<Text className="font-semibold text-text text-sm">
												{touristName}
											</Text>
											<Text className="text-xs text-text-secondary mt-0.5">
												{booking.total_days} days ·{" "}
												{booking.travelers_count} pax ·
												रू{" "}
												{booking.total_amount_npr?.toLocaleString()}
											</Text>
										</View>
										<ChevronRight
											size={18}
											color="#9CA3AF"
										/>
									</View>
								</TouchableOpacity>
							);
						})
					)}
				</View>

				{/* ── Active Chats ── */}
				<View className="mb-6">
					<Text className="font-semibold text-lg text-text mb-3">
						Active Chats
					</Text>
					{loadingT ? (
						<View className="items-center py-6">
							<ActivityIndicator color="#8B1A1A" />
						</View>
					) : threads.length === 0 ? (
						<View className="bg-card rounded-2xl border border-border p-5 items-center">
							<MessageCircle size={28} color="#9CA3AF" />
							<Text className="text-text-secondary text-sm mt-2 text-center">
								No active chats. Accept a booking to start
								chatting.
							</Text>
						</View>
					) : (
						threads.map((thread) => {
							const tourist = thread.tourist as any;
							const name = tourist?.full_name || "Tourist";
							const initial = name[0].toUpperCase();
							const lastMsgTime = new Date(
								thread.last_message_at,
							);
							const isToday =
								lastMsgTime.toDateString() ===
								new Date().toDateString();
							const timeStr = isToday
								? lastMsgTime.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})
								: lastMsgTime.toLocaleDateString([], {
										month: "short",
										day: "numeric",
									});

							return (
								<TouchableOpacity
									key={thread.id}
									activeOpacity={0.7}
									onPress={() =>
										router.push(`/chat/${thread.id}` as any)
									}
									className="bg-card rounded-2xl border border-border p-4 shadow-sm flex-row items-center mb-3"
								>
									<View className="w-12 h-12 bg-mint rounded-full items-center justify-center mr-4">
										<Avatar
											size={48}
											src={tourist?.avatar_url}
										/>
									</View>
									<View className="flex-1">
										<View className="flex-row justify-between items-center mb-1">
											<Text className="font-semibold text-text text-base">
												{name}
											</Text>
											<Text className="text-xs text-text-secondary">
												{timeStr}
											</Text>
										</View>
										<Text
											className="text-sm text-text-secondary"
											numberOfLines={1}
										>
											Tap to open conversation
										</Text>
									</View>
									<ChevronRight size={18} color="#9CA3AF" />
								</TouchableOpacity>
							);
						})
					)}
				</View>

				{/* ── Performance ── */}
				<View className="mb-6">
					<Text className="font-semibold text-lg text-text mb-3">
						Performance
					</Text>
					<View className="bg-card rounded-2xl border border-border p-5 shadow-sm">
						<View className="mb-4">
							<View className="flex-row justify-between mb-1">
								<Text className="text-xs text-text-secondary font-medium">
									Response Rate
								</Text>
								<Text className="text-xs text-text font-bold">
									{stats.response}%
								</Text>
							</View>
							<View className="h-2 bg-background rounded-full overflow-hidden">
								<View
									className="h-full bg-success rounded-full"
									style={{ width: `${stats.response}%` }}
								/>
							</View>
						</View>
						<View>
							<View className="flex-row justify-between mb-1">
								<Text className="text-xs text-text-secondary font-medium">
									Completion Rate
								</Text>
								<Text className="text-xs text-text font-bold">
									{stats.completion}%
								</Text>
							</View>
							<View className="h-2 bg-background rounded-full overflow-hidden">
								<View
									className="h-full bg-primary rounded-full"
									style={{ width: `${stats.completion}%` }}
								/>
							</View>
						</View>
					</View>
				</View>

				<View className="h-6" />
			</ScrollView>
		</SafeScreen>
	);
}
