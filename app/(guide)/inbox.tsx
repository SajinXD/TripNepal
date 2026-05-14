import { SafeScreen } from "@/components/layout/SafeScreen";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { ChevronRight, MessageCircle, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
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
	const [loadingB, setLoadingB] = useState(true);
	const [loadingT, setLoadingT] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [stats, setStats] = useState({ response: 100, completion: 100 });
	const [pendingCount, setPendingCount] = useState(0);
	const [guideStats, setGuideStats] = useState({ trips: 0, reviews: 0 });
	const [showTripsModal, setShowTripsModal] = useState(false);
	const [showReviewsModal, setShowReviewsModal] = useState(false);
	const [completedBookings, setCompletedBookings] = useState<any[]>([]);
	const [reviewsList, setReviewsList] = useState<any[]>([]);
	const [loadingModal, setLoadingModal] = useState(false);

	const load = useCallback(async () => {
		if (!user) return;
		try {
			const [bRes, tRes, cntRes] = await Promise.all([
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
			]);
			setBookings(bRes.data || []);
			setThreads(tRes.data || []);
			setPendingCount(cntRes.count || 0);

			// Response rate: % of booking requests that have been acted on (not still 'requested')
			const { data: bkReqs } = await (supabase.from("bookings") as any)
				.select("status")
				.eq("guide_id", user.id)
				.in("status", [
					"requested",
					"accepted",
					"rejected",
					"in_progress",
					"completed",
					"cancelled",
				]);
			const totalReqs = bkReqs?.length ?? 0;
			const responded = (bkReqs || []).filter(
				(b: any) => b.status !== "requested",
			).length;
			const responseRate =
				totalReqs > 0 ? Math.round((responded / totalReqs) * 100) : 100;

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

			const { data: gp } = await (supabase.from("guide_profiles") as any)
				.select("total_trips_completed, total_reviews")
				.eq("user_id", user.id)
				.single();
			setGuideStats({
				trips: gp?.total_trips_completed ?? 0,
				reviews: gp?.total_reviews ?? 0,
			});
		} catch (e) {
			console.warn("Inbox load error", e);
		} finally {
			setLoadingB(false);
			setLoadingT(false);
			setRefreshing(false);
		}
	}, [user]);

	async function openTripsModal() {
		setShowTripsModal(true);
		setLoadingModal(true);
		const { data } = await (supabase.from("bookings") as any)
			.select("*, tourist:profiles!tourist_id(full_name)")
			.eq("guide_id", user!.id)
			.eq("status", "completed")
			.order("created_at", { ascending: false });
		setCompletedBookings(data || []);
		setLoadingModal(false);
	}

	async function openReviewsModal() {
		setShowReviewsModal(true);
		setLoadingModal(true);
		const { data } = await (supabase.from("reviews") as any)
			.select("*, profiles!reviewer_id(full_name)")
			.eq("reviewee_id", user!.id)
			.order("created_at", { ascending: false });
		setReviewsList(data || []);
		setLoadingModal(false);
	}

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

		return () => {
			supabase.removeChannel(bookingsChannel);
			supabase.removeChannel(threadsChannel);
		};
	}, [user, load]);

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
												{booking.start_date
													? new Date(
															booking.start_date,
														).getDate()
													: "—"}
											</Text>
											<Text className="text-[9px] font-semibold text-primary uppercase">
												{booking.start_date
													? new Date(
															booking.start_date,
														).toLocaleString(
															"default",
															{ month: "short" },
														)
													: ""}
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
								No active chats yet.
							</Text>
						</View>
					) : (
						threads.map((thread) => {
							const tourist = thread.tourist as any;
							const name = tourist?.full_name || "Tourist";
							const rawTime = thread.last_message_at;
							const lastMsgTime = rawTime
								? new Date(rawTime)
								: null;
							const validDate =
								lastMsgTime && !isNaN(lastMsgTime.getTime());
							const timeStr = validDate
								? lastMsgTime!.toDateString() ===
									new Date().toDateString()
									? lastMsgTime!.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})
									: lastMsgTime!.toLocaleDateString([], {
											month: "short",
											day: "numeric",
										})
								: "";

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
						{/* Tappable counters */}
						<View className="flex-row mb-4" style={{ gap: 10 }}>
							<TouchableOpacity
								onPress={openTripsModal}
								activeOpacity={0.7}
								className="flex-1 bg-primary/10 rounded-xl p-3 items-center"
							>
								<Text className="text-xl font-bold text-primary">
									{guideStats.trips}
								</Text>
								<Text className="text-xs text-text-secondary mt-0.5">
									Trips Completed
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={openReviewsModal}
								activeOpacity={0.7}
								className="flex-1 bg-primary/10 rounded-xl p-3 items-center"
							>
								<Text className="text-xl font-bold text-primary">
									{guideStats.reviews}
								</Text>
								<Text className="text-xs text-text-secondary mt-0.5">
									Reviews
								</Text>
							</TouchableOpacity>
						</View>

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

			{/* Completed Trips Modal */}
			<Modal
				visible={showTripsModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowTripsModal(false)}
			>
				<Pressable
					style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
					onPress={() => setShowTripsModal(false)}
				/>
				<View
					style={{
						backgroundColor: "#fff",
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						padding: 20,
						maxHeight: "75%",
					}}
				>
					<View className="flex-row justify-between items-center mb-4">
						<Text className="font-semibold text-lg text-text">
							Completed Trips
						</Text>
						<TouchableOpacity
							onPress={() => setShowTripsModal(false)}
						>
							<X size={22} color="#9CA3AF" />
						</TouchableOpacity>
					</View>
					{loadingModal ? (
						<ActivityIndicator
							color="#8B1A1A"
							style={{ paddingVertical: 32 }}
						/>
					) : (
						<ScrollView showsVerticalScrollIndicator={false}>
							{completedBookings.length === 0 ? (
								<Text className="text-text-secondary text-center py-8">
									No completed trips yet.
								</Text>
							) : (
								completedBookings.map((b) => (
									<View
										key={b.id}
										className="border-b border-border py-3"
									>
										<Text className="font-semibold text-text">
											{(b.tourist as any)?.full_name ||
												"Tourist"}
										</Text>
										<Text className="text-xs text-text-secondary mt-0.5">
											{b.start_date
												? new Date(
														b.start_date,
													).toLocaleDateString()
												: "No date"}{" "}
											· {b.total_days} days · रू{" "}
											{b.total_amount_npr?.toLocaleString()}
										</Text>
									</View>
								))
							)}
							<View className="h-4" />
						</ScrollView>
					)}
				</View>
			</Modal>

			{/* Customer Reviews Modal */}
			<Modal
				visible={showReviewsModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowReviewsModal(false)}
			>
				<Pressable
					style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
					onPress={() => setShowReviewsModal(false)}
				/>
				<View
					style={{
						backgroundColor: "#fff",
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						padding: 20,
						maxHeight: "75%",
					}}
				>
					<View className="flex-row justify-between items-center mb-4">
						<Text className="font-semibold text-lg text-text">
							Customer Reviews
						</Text>
						<TouchableOpacity
							onPress={() => setShowReviewsModal(false)}
						>
							<X size={22} color="#9CA3AF" />
						</TouchableOpacity>
					</View>
					{loadingModal ? (
						<ActivityIndicator
							color="#8B1A1A"
							style={{ paddingVertical: 32 }}
						/>
					) : (
						<ScrollView showsVerticalScrollIndicator={false}>
							{reviewsList.length === 0 ? (
								<Text className="text-text-secondary text-center py-8">
									No reviews yet.
								</Text>
							) : (
								reviewsList.map((r) => (
									<View
										key={r.id}
										className="border-b border-border py-3"
									>
										<View className="flex-row justify-between mb-1">
											<Text className="font-semibold text-text">
												{(r.profiles as any)
													?.full_name || "Anonymous"}
											</Text>
											<Text className="text-xs text-text-secondary">
												{new Date(
													r.created_at,
												).toLocaleDateString()}
											</Text>
										</View>
										<View className="flex-row mb-1">
											{[1, 2, 3, 4, 5].map((n) => (
												<Text
													key={n}
													style={{
														color:
															n <= r.rating
																? "#F4A261"
																: "#E5E7EB",
														fontSize: 14,
													}}
												>
													★
												</Text>
											))}
										</View>
										{r.comment ? (
											<Text className="text-sm text-text-secondary">
												{r.comment}
											</Text>
										) : null}
									</View>
								))
							)}
							<View className="h-4" />
						</ScrollView>
					)}
				</View>
			</Modal>
		</SafeScreen>
	);
}
